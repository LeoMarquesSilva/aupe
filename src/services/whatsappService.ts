import { supabase } from './supabaseClient';

// ─── Admin credentials (from .env — set once by the system owner) ───────────
const EVOLUTION_BASE_URL = (process.env.REACT_APP_EVOLUTION_BASE_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY  = process.env.REACT_APP_EVOLUTION_API_KEY  || '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsappConfig {
  id?: string;
  organizationId?: string;
  instanceName: string;
  phoneNumber: string;
  /** Se preenchido, avisos do link de aprovação do cliente vão para este destino; senão usa `phoneNumber`. */
  clientApprovalPhone?: string | null;
  /** Destino quando o gestor responde ao link de revisão interna; vazio = não envia WhatsApp nesse fluxo. */
  internalApprovalPhone?: string | null;
  enabled: boolean;
}

export type InstanceConnectionState = 'open' | 'close' | 'connecting' | 'unknown';

export interface InstanceStateResponse {
  state: InstanceConnectionState;
}

export interface QRCodeResponse {
  base64?: string;
  code?: string;
  pairingCode?: string | null;
}

export interface WhatsAppGroup {
  id: string;      // JID like "120363xxxxxxxx@g.us"
  subject: string; // Group name
  size?: number;   // Number of participants
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInstanceName(organizationId: string): string {
  return `aupe_${organizationId.replace(/-/g, '').slice(0, 16)}`;
}

async function getCurrentOrganizationId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Usuário não autenticado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', data.user.id)
    .single();
  if (!profile?.organization_id) throw new Error('Usuário não possui organização.');
  return profile.organization_id;
}

function evolutionHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
  };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function fromDb(row: Record<string, unknown>): WhatsappConfig {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    instanceName: (row.instance_name as string) || '',
    phoneNumber: (row.phone_number as string) || '',
    clientApprovalPhone: (row.client_approval_phone as string) ?? null,
    internalApprovalPhone: (row.internal_approval_phone as string) ?? null,
    enabled: (row.enabled as boolean) ?? false,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const whatsappService = {
  /** URL da Evolution API configurada pelo admin */
  get baseUrl() { return EVOLUTION_BASE_URL; },
  /** API Key da Evolution configurada pelo admin */
  get apiKey() { return EVOLUTION_API_KEY; },

  /** Retorna true se as credenciais do admin estão preenchidas no .env */
  isAdminConfigured(): boolean {
    return !!(EVOLUTION_BASE_URL && EVOLUTION_API_KEY);
  },

  /** Busca a config da organização do usuário atual */
  async getConfig(): Promise<WhatsappConfig | null> {
    const orgId = await getCurrentOrganizationId();
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return fromDb(data as Record<string, unknown>);
  },

  /** Salva números de destino e o toggle de notificações da organização */
  async saveConfig(params: {
    phoneNumber: string;
    enabled: boolean;
    clientApprovalPhone?: string | null;
    internalApprovalPhone?: string | null;
  }): Promise<WhatsappConfig> {
    const orgId = await getCurrentOrganizationId();
    const instanceName = buildInstanceName(orgId);
    const clientPh = (params.clientApprovalPhone ?? '').trim() || null;
    const internalPh = (params.internalApprovalPhone ?? '').trim() || null;
    const { data, error } = await supabase
      .from('whatsapp_config')
      .upsert(
        {
          organization_id: orgId,
          instance_name: instanceName,
          phone_number: params.phoneNumber.trim(),
          enabled: params.enabled,
          client_approval_phone: clientPh,
          internal_approval_phone: internalPh,
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return fromDb(data as Record<string, unknown>);
  },

  /** Cria a instância na Evolution API se ainda não existir */
  async createInstance(instanceName: string): Promise<void> {
    const url = `${EVOLUTION_BASE_URL}/instance/create`;
    const res = await fetch(url, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });
    if (!res.ok) {
      const text = await res.text();
      // Ignore "already exists" errors
      if (!text.toLowerCase().includes('already') && !text.toLowerCase().includes('exists')) {
        throw new Error(`Erro ao criar instância: ${text}`);
      }
    }
  },

  /** Retorna o estado de conexão da instância */
  async getConnectionState(instanceName: string): Promise<InstanceStateResponse> {
    const url = `${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`;
    const res = await fetch(url, { headers: evolutionHeaders() });
    if (!res.ok) return { state: 'unknown' };
    const json = await res.json() as Record<string, unknown>;
    const state = (
      (json.instance as Record<string, unknown>)?.state ??
      json.state ??
      'unknown'
    ) as InstanceConnectionState;
    return { state };
  },

  /** Obtém o QR code para conexão (cria a instância antes se necessário) */
  async getQRCode(instanceName: string): Promise<QRCodeResponse> {
    // Ensure instance exists first
    await this.createInstance(instanceName);

    const url = `${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`;
    const res = await fetch(url, { headers: evolutionHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao obter QR code: ${text}`);
    }
    const json = await res.json() as Record<string, unknown>;
    return {
      base64: json.base64 as string | undefined,
      code: json.code as string | undefined,
      pairingCode: (json.pairingCode as string | null | undefined) ?? null,
    };
  },

  /** Desconecta e remove a instância */
  async disconnectInstance(instanceName: string): Promise<void> {
    await fetch(`${EVOLUTION_BASE_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
    });
  },

  /** Retorna o instanceName gerado para a organização do usuário atual */
  async getInstanceName(): Promise<string> {
    const orgId = await getCurrentOrganizationId();
    return buildInstanceName(orgId);
  },

  /** Busca todos os grupos do WhatsApp conectado nessa instância */
  async fetchGroups(instanceName: string): Promise<WhatsAppGroup[]> {
    const url = `${EVOLUTION_BASE_URL}/group/fetchAllGroups/${instanceName}?getParticipants=false`;
    const res = await fetch(url, { headers: evolutionHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao buscar grupos: ${text}`);
    }
    const json = await res.json() as unknown;
    const raw = Array.isArray(json) ? json : [];
    return (raw as Record<string, unknown>[]).map((g) => ({
      id: String(g.id ?? ''),
      subject: String(g.subject ?? g.name ?? '(sem nome)'),
      size: typeof g.size === 'number' ? g.size : undefined,
    })).filter((g) => g.id.endsWith('@g.us'));
  },

  /** Envia uma mensagem de texto para o número/grupo configurado */
  async sendTestMessage(instanceName: string, number: string): Promise<void> {
    const url = `${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        number,
        text: '✅ *Teste de notificação AUPE*\n\nSua integração com WhatsApp está funcionando! Você receberá notificações de aprovação neste número/grupo.',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao enviar mensagem: ${text}`);
    }
  },
};

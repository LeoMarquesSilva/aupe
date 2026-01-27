// Subscription Limits Service
// Valida limites de subscription antes de criar posts/clients
// INSYT - Instagram Scheduler

import { supabase } from './supabaseClient';
import { subscriptionService, Subscription } from './subscriptionService';
import { roleService } from './roleService';

export interface SubscriptionLimits {
  canCreateClient: boolean;
  canSchedulePost: boolean;
  currentClients: number;
  maxClients: number;
  currentPostsThisMonth: number;
  maxPostsPerMonth: number;
  subscription: Subscription | null;
  error?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  limits?: SubscriptionLimits;
}

/** Extrai clients_count e posts_count da resposta da RPC (array, objeto ou coluna nomeada). */
function parseUsageRpcResponse(raw: unknown): { clients_count: number; posts_count: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let c = o.clients_count;
  let p = o.posts_count;
  if (c === undefined || p === undefined) {
    const nested = o.get_my_organization_usage_counts ?? o.get_organization_usage_counts;
    if (nested && typeof nested === 'object') {
      const n = nested as Record<string, unknown>;
      c = n.clients_count;
      p = n.posts_count;
    }
  }
  const clients = Number(c ?? 0);
  const posts = Number(p ?? 0);
  return { clients_count: Number.isFinite(clients) ? clients : 0, posts_count: Number.isFinite(posts) ? posts : 0 };
}

class SubscriptionLimitsService {
  /**
   * Obter limites da subscription atual do usuário
   */
  async getCurrentLimits(): Promise<SubscriptionLimits> {
    try {
      // 1. Obter perfil do usuário para pegar organization_id
      const profile = await roleService.getCurrentUserProfile();
      if (!profile || !(profile as any).organization_id) {
        return {
          canCreateClient: false,
          canSchedulePost: false,
          currentClients: 0,
          maxClients: 0,
          currentPostsThisMonth: 0,
          maxPostsPerMonth: 0,
          subscription: null,
          error: 'Organização não encontrada. Faça upgrade do seu plano.'
        };
      }

      const organizationId = (profile as any).organization_id;

      // 2. Contagem via RPC (sempre cedo, para ter números reais em qualquer plano)
      let currentClients = 0;
      let currentPostsThisMonth = 0;
      const { data: myUsage, error: myErr } = await supabase.rpc('get_my_organization_usage_counts');
      if (myErr) {
        console.warn('[subscriptionLimits] RPC get_my_organization_usage_counts failed:', myErr.message);
      }
      const raw = Array.isArray(myUsage) ? myUsage[0] : myUsage;
      const parsed = parseUsageRpcResponse(raw);
      if (parsed) {
        currentClients = parsed.clients_count;
        currentPostsThisMonth = parsed.posts_count;
      }
      if (currentClients === 0 && currentPostsThisMonth === 0) {
        const { data: usageCounts, error: rpcError } = await supabase.rpc('get_organization_usage_counts', { p_organization_id: organizationId });
        if (rpcError) console.warn('[subscriptionLimits] RPC get_organization_usage_counts (fallback) failed:', rpcError.message);
        const raw2 = Array.isArray(usageCounts) ? usageCounts[0] : usageCounts;
        const parsed2 = parseUsageRpcResponse(raw2);
        if (parsed2) {
          currentClients = parsed2.clients_count;
          currentPostsThisMonth = parsed2.posts_count;
        }
      }
      if (currentClients === 0 && currentPostsThisMonth === 0) {
        const resClients = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
        currentClients = resClients.count ?? 0;
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        const resPosts = await supabase.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('scheduled_date', start.toISOString()).lte('scheduled_date', end.toISOString()).eq('grandfathered', false);
        currentPostsThisMonth = resPosts.count ?? 0;
      }

      // 3. Buscar subscription ativa
      let subscription: Subscription | null = null;
      try {
        subscription = await subscriptionService.getSubscriptionByOrganization(organizationId);
      } catch (error: any) {
        console.error('❌ Erro ao buscar subscription:', error);
        // Continuar mesmo com erro para verificar se há subscription sem status 'active'
      }
      
      // Se não encontrou subscription ativa, tentar buscar qualquer subscription (pode ser enterprise sem status específico)
      if (!subscription) {
        // Tentar primeiro sem join (mais confiável) - pegar a mais recente
        const { data: anySubscriptions, error: anyError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!anyError && anySubscriptions && anySubscriptions.length > 0) {
          subscription = anySubscriptions[0] as Subscription;
          
          // Buscar plan separadamente
          if (subscription.plan_id) {
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('id', subscription.plan_id)
              .single();

            if (planData) {
              subscription.plan = planData as any;
            }
          }
        }
      }
      
      if (!subscription) {
        return {
          canCreateClient: false,
          canSchedulePost: false,
          currentClients: 0,
          maxClients: 0,
          currentPostsThisMonth: 0,
          maxPostsPerMonth: 0,
          subscription: null,
          error: 'Você não possui uma assinatura ativa. Faça upgrade do seu plano para continuar.'
        };
      }

      // Buscar plan se não veio no join
      let plan = subscription.plan;
      if (!plan && subscription.plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subscription.plan_id)
          .single();

        if (planData) {
          plan = planData as any;
          subscription.plan = plan;
        }
      }

      if (!plan) {
        return {
          canCreateClient: false,
          canSchedulePost: false,
          currentClients: 0,
          maxClients: 0,
          currentPostsThisMonth: 0,
          maxPostsPerMonth: 0,
          subscription,
          error: 'Plano não encontrado.'
        };
      }

      // Verificar se é Enterprise (limites ilimitados) — contagens já obtidas acima
      const planName = plan.name?.toLowerCase() || '';
      const isEnterprise = planName === 'enterprise';

      if (isEnterprise) {
        return {
          canCreateClient: true,
          canSchedulePost: true,
          currentClients,
          maxClients: 999999,
          currentPostsThisMonth,
          maxPostsPerMonth: 999999,
          subscription
        };
      }

      const maxClients = plan.max_clients || 0;
      const maxPostsPerMonth = plan.max_posts_per_month || 0;

      // 5. Verificar se pode criar client
      const canCreateClient = currentClients < maxClients;

      // 6. Verificar se pode agendar post
      const canSchedulePost = currentPostsThisMonth < maxPostsPerMonth;

      return {
        canCreateClient,
        canSchedulePost,
        currentClients,
        maxClients,
        currentPostsThisMonth,
        maxPostsPerMonth,
        subscription
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter limites:', error);
      return {
        canCreateClient: false,
        canSchedulePost: false,
        currentClients: 0,
        maxClients: 0,
        currentPostsThisMonth: 0,
        maxPostsPerMonth: 0,
        subscription: null,
        error: error.message || 'Erro ao verificar limites da assinatura.'
      };
    }
  }

  /**
   * Verificar se pode criar um novo client
   */
  async canCreateClient(): Promise<LimitCheckResult> {
    const limits = await this.getCurrentLimits();
    
    if (limits.error) {
      return {
        allowed: false,
        message: limits.error,
        limits
      };
    }

    if (!limits.canCreateClient) {
      return {
        allowed: false,
        message: `Limite de contas Instagram atingido (${limits.currentClients}/${limits.maxClients}). Faça upgrade do seu plano para adicionar mais contas.`,
        limits
      };
    }

    return {
      allowed: true,
      limits
    };
  }

  /**
   * Verificar se pode agendar um novo post
   */
  async canSchedulePost(): Promise<LimitCheckResult> {
    const limits = await this.getCurrentLimits();
    
    if (limits.error) {
      return {
        allowed: false,
        message: limits.error,
        limits
      };
    }

    if (!limits.canSchedulePost) {
      return {
        allowed: false,
        message: `Limite de posts do mês atingido (${limits.currentPostsThisMonth}/${limits.maxPostsPerMonth}). Faça upgrade do seu plano para agendar mais posts.`,
        limits
      };
    }

    return {
      allowed: true,
      limits
    };
  }

  /**
   * Obter mensagem formatada sobre limites
   */
  getLimitsMessage(limits: SubscriptionLimits): string {
    if (limits.error) {
      return limits.error;
    }

    const parts: string[] = [];
    
    if (limits.subscription?.plan) {
      parts.push(`Plano: ${limits.subscription.plan.name}`);
    }
    
    parts.push(`Contas Instagram: ${limits.currentClients}/${limits.maxClients}`);
    parts.push(`Posts este mês: ${limits.currentPostsThisMonth}/${limits.maxPostsPerMonth}`);
    
    return parts.join(' • ');
  }
}

export const subscriptionLimitsService = new SubscriptionLimitsService();

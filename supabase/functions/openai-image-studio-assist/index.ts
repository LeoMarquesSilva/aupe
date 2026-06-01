// Edge Function: assistente de texto para Estúdio de Imagens (briefing + brand kit)
// Segredos: GPT_IMAGES_API_KEY ou OPENAI_API_KEY; opcional GPT_ASSIST_MODEL (default gpt-4o-mini)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from './_shared/cors.ts';
import { clientIp, rateLimitByKey } from './_shared/rateLimit.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_ASSIST_MODEL = 'gpt-4o-mini';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

type AssistAction = 'suggest_brief' | 'suggest_brand_kit';

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function resolveAssistModel(): string {
  return (Deno.env.get('GPT_ASSIST_MODEL') || DEFAULT_ASSIST_MODEL).trim();
}

async function callOpenAiJson(apiKey: string, system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveAssistModel(),
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const data = await res.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI chat ${res.status}`);
  }

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Resposta vazia da OpenAI');

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('JSON inválido retornado pela OpenAI');
  }
}

function buildBriefSystemPrompt(): string {
  return [
    'You are a senior social media strategist for Instagram agencies in Brazil.',
    'Return ONLY valid JSON (no markdown) with keys for a post briefing in Brazilian Portuguese.',
    'Keys: topic, audience, offer, cta, tone, notes (all strings).',
    'Be specific, concise, and actionable. Avoid generic filler.',
    'notes should include 2-3 creative direction bullets separated by semicolons.',
    'Do not invent fake statistics or client names not provided in context.',
  ].join(' ');
}

function buildBrandKitSystemPrompt(): string {
  return [
    'You are a brand strategist helping fill a Brand Kit for Instagram content generation in Brazil.',
    'Return ONLY valid JSON (no markdown) with string fields:',
    'brandName, tagline, brandStory, audience, valueProposition, toneOfVoice, visualStyle,',
    'primaryColor, secondaryColor, accentColor (hex when possible), fontHeadline, fontBody,',
    'logoUsage, wordsToUse, wordsToAvoid, hashtags, promptGuardrails.',
    'Write in Brazilian Portuguese. Be practical and specific to the niche implied by context.',
    'promptGuardrails: 1-2 sentences on what the AI image generator must avoid.',
  ].join(' ');
}

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders:
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer',
    allowMethods: 'POST, OPTIONS',
  });
  if (co instanceof Response) return co;
  const cors = co;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405, cors);
  }

  const apiKey = Deno.env.get('GPT_IMAGES_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';
  if (!apiKey) {
    return json({ error: 'Chave OpenAI não configurada nos secrets da Edge Function.' }, 503, cors);
  }

  const rlIp = rateLimitByKey(`openai-assist:${clientIp(req)}`, 30, 60_000);
  if (!rlIp.ok) {
    return json({ error: 'Muitas requisições. Tente mais tarde.' }, 429, {
      ...cors,
      'Retry-After': String(rlIp.retryAfterSec),
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401, cors);
    }

    const jwt = authHeader.slice(7).trim();
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ error: 'Sessão inválida' }, 401, cors);
    }

    const rlUser = rateLimitByKey(`openai-assist:user:${userData.user.id}`, 20, 60_000);
    if (!rlUser.ok) {
      return json({ error: 'Limite de sugestões por minuto. Aguarde um instante.' }, 429, {
        ...cors,
        'Retry-After': String(rlUser.retryAfterSec),
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null) as {
      action?: AssistAction;
      clientId?: string;
      brief?: Record<string, unknown>;
      brandKit?: Record<string, unknown>;
      seedText?: string;
    } | null;

    const action = body?.action;
    if (!action || !body?.clientId) {
      return json({ error: 'action e clientId são obrigatórios' }, 400, cors);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.organization_id) {
      return json({ error: 'Organização não encontrada' }, 403, cors);
    }

    const organizationId = profile.organization_id as string;

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id, name, instagram, brand_guidelines, brand_primary_color, brand_secondary_color, brand_font_notes')
      .eq('id', body.clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientErr || !client) {
      return json({ error: 'Cliente não encontrado' }, 404, cors);
    }

    const { data: kitRow } = await supabaseAdmin
      .from('client_brand_kits')
      .select('*')
      .eq('client_id', body.clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    const contextBlock = JSON.stringify({
      client: {
        name: client.name,
        instagram: client.instagram,
        legacyGuidelines: client.brand_guidelines,
        legacyPrimaryColor: client.brand_primary_color,
        legacySecondaryColor: client.brand_secondary_color,
        legacyFontNotes: client.brand_font_notes,
      },
      savedBrandKit: kitRow || null,
      partialBrief: body.brief || null,
      partialBrandKit: body.brandKit || null,
      userSeed: body.seedText || null,
    }, null, 2);

    if (action === 'suggest_brief') {
      const userPrompt = [
        'Com base no contexto abaixo, complete o briefing do post para Instagram.',
        'Respeite objective e format se já informados em partialBrief.',
        'Se topic já existir em partialBrief, refine e expanda os outros campos em torno dele.',
        'Se topic estiver vazio, proponha um topic forte baseado na marca.',
        '',
        contextBlock,
      ].join('\n');

      const result = await callOpenAiJson(apiKey, buildBriefSystemPrompt(), userPrompt);
      return json({ action, suggestions: result }, 200, cors);
    }

    if (action === 'suggest_brand_kit') {
      const userPrompt = [
        'Com base no contexto abaixo, proponha um Brand Kit inicial ou complemente campos vazios.',
        'Mantenha coerência com dados já preenchidos em partialBrandKit ou savedBrandKit.',
        'Se userSeed existir, use como ponto de partida (nicho, serviços, posicionamento).',
        '',
        contextBlock,
      ].join('\n');

      const result = await callOpenAiJson(apiKey, buildBrandKitSystemPrompt(), userPrompt);
      return json({ action, suggestions: result }, 200, cors);
    }

    return json({ error: 'action inválida' }, 400, cors);
  } catch (e) {
    console.error('openai-image-studio-assist:', e);
    return json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      500,
      cors,
    );
  }
});

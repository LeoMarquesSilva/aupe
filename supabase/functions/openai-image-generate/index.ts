// Edge Function: gerar imagens (gpt-image-2 por defeito; opcional dall-e-3 / dall-e-2) para um cliente da org.
// Segredos: GPT_IMAGES_API_KEY (ou OPENAI_API_KEY); opcional GPT_IMAGES_MODEL = gpt-image-2 | dall-e-3 | dall-e-2

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { Image } from 'jsr:@matmen/imagescript@1.3.1';
import { resolveCors } from './_shared/cors.ts';
import { clientIp, rateLimitByKey } from './_shared/rateLimit.ts';

const OPENAI_URL = 'https://api.openai.com/v1';

/** Requer org OpenAI verificada; use dall-e-3 via GPT_IMAGES_MODEL se não tiver acesso. */
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

/** Entrega final Instagram (redimensionada após geração). */
const OUTPUT_FEED = { width: 1080, height: 1350 };
const OUTPUT_STORY = { width: 1080, height: 1920 };

/** gpt-image-2: WIDTHxHEIGHT com múltiplos de 16 (1080→1088, 1350→1360, 1920 ok). */
const API_SIZE_GPT_FEED = '1088x1360';
const API_SIZE_GPT_STORY = '1088x1920';

function resolveImageModel(): string {
  return (Deno.env.get('GPT_IMAGES_MODEL') || DEFAULT_IMAGE_MODEL).trim();
}

function outputDimensions(format: 'feed' | 'story'): { width: number; height: number } {
  return format === 'story' ? OUTPUT_STORY : OUTPUT_FEED;
}

function apiSizeFor(model: string, format: 'feed' | 'story'): string {
  if (model === 'dall-e-3') {
    return format === 'story' ? '1024x1792' : '1024x1024';
  }
  if (model === 'dall-e-2') {
    return '1024x1024';
  }
  return format === 'story' ? API_SIZE_GPT_STORY : API_SIZE_GPT_FEED;
}

function normalizeUiQuality(raw: string): string {
  return ['low', 'medium', 'high', 'auto'].includes(raw) ? raw : 'medium';
}

function sanitizeLine(raw: string | null | undefined, fallback = ''): string {
  const value = (raw || '').replace(/\s+/g, ' ').trim();
  return value || fallback;
}

function splitTokens(raw: string | null | undefined): string[] {
  return (raw || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function objectiveLabel(objective: ImageStudioBrief['objective']): string {
  const labels: Record<string, string> = {
    educate: 'educar e gerar autoridade',
    sell: 'vender ou promover uma oferta',
    announce: 'anunciar uma novidade',
    engage: 'gerar conversa e interação',
    brand: 'reforçar posicionamento de marca',
  };
  return labels[objective || 'brand'] || labels.brand;
}

function buildFallbackSlides(brief: ImageStudioBrief, brandName: string): CreativeSlide[] {
  const format = brief.format === 'carousel' || brief.postType === 'carousel' ? 'carousel' : 'single';
  const count = format === 'carousel' ? Math.min(10, Math.max(2, Number(brief.slideCount) || 5)) : Math.min(4, Math.max(1, Number(brief.imageCount) || 1));
  const topic = sanitizeLine(brief.topic, 'conteúdo da marca');
  const audience = sanitizeLine(brief.audience, 'público ideal');
  const cta = sanitizeLine(brief.cta, 'fale com a gente');

  if (format !== 'carousel') {
    return Array.from({ length: count }, (_, i) => ({
      slideNumber: i + 1,
      title: topic,
      body: `${brandName} para ${audience}.`,
      visualDirection: `Imagem social premium sobre "${topic}", com foco claro, composição limpa e espaço para CTA "${cta}". Variação ${i + 1}.`,
    }));
  }

  const middleCount = Math.max(0, count - 2);
  const slides: CreativeSlide[] = [
    {
      slideNumber: 1,
      title: `Pare para ver: ${topic}`,
      body: `Um gancho direto para ${audience}.`,
      visualDirection: `Capa de carrossel com gancho forte sobre "${topic}", hierarquia tipográfica clara e visual de alto impacto.`,
    },
  ];

  for (let i = 0; i < middleCount; i++) {
    slides.push({
      slideNumber: i + 2,
      title: `${i + 1}. Ideia principal`,
      body: `Explique um ponto prático sobre ${topic} para ${audience}.`,
      visualDirection: `Slide ${i + 2} educativo, com composição organizada, elemento visual de apoio e pouco texto.`,
    });
  }

  slides.push({
    slideNumber: count,
    title: cta,
    body: `Fechamento com chamada clara para ação.`,
    visualDirection: `Último slide com CTA "${cta}", visual limpo, sensação de conclusão e espaço de respiro.`,
  });

  return slides;
}

function buildCreativePlan(
  brief: ImageStudioBrief,
  client: ClientRow,
  kit: BrandKitRow | null,
): CreativePlan {
  const brandName = sanitizeLine(kit?.brand_name, client.name);
  const topic = sanitizeLine(brief.topic, 'conteúdo da marca');
  const audience = sanitizeLine(brief.audience || kit?.audience, 'público ideal');
  const cta = sanitizeLine(brief.cta, 'Saiba mais');
  const hashtags = splitTokens(kit?.hashtags);
  const fallbackTags = [brandName, topic, 'marketing']
    .map((tag) => `#${tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '')}`)
    .filter((tag) => tag.length > 1);

  return {
    headline: `${topic} para ${audience}`,
    caption: [
      `${topic}`,
      '',
      `Criado para ${objectiveLabel(brief.objective)} com uma linguagem ${sanitizeLine(brief.tone || kit?.tone_of_voice, 'profissional e próxima')}.`,
      brief.offer ? `Oferta/destaque: ${brief.offer}` : '',
      '',
      cta,
    ].filter(Boolean).join('\n'),
    cta,
    hashtags: hashtags.length ? hashtags : fallbackTags.slice(0, 6),
    slides: buildFallbackSlides(brief, brandName),
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

type ClientRow = {
  id: string;
  organization_id: string;
  name: string;
  instagram: string | null;
  logo_url: string | null;
  brand_guidelines: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_font_notes: string | null;
};

type BrandKitRow = {
  id: string;
  brand_name: string | null;
  tagline: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  brand_story: string | null;
  audience: string | null;
  value_proposition: string | null;
  tone_of_voice: string | null;
  visual_style: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_headline: string | null;
  font_body: string | null;
  logo_usage: string | null;
  words_to_use: string | null;
  words_to_avoid: string | null;
  hashtags: string | null;
  prompt_guardrails: string | null;
};

type BrandAssetRow = {
  asset_type: string;
  label: string | null;
  file_url: string;
};

type ImageStudioBrief = {
  format?: 'feed' | 'story' | 'carousel';
  platform?: 'instagram' | 'linkedin';
  objective?: 'educate' | 'sell' | 'announce' | 'engage' | 'brand';
  postType?: 'single' | 'carousel';
  topic?: string;
  audience?: string;
  offer?: string;
  tone?: string;
  slideCount?: number;
  imageCount?: number;
  cta?: string;
  inImageTextMode?: 'none' | 'short' | 'per-slide';
  notes?: string;
  backgroundImageUrl?: string;
  backgroundImageName?: string;
};

type CreativeSlide = {
  slideNumber: number;
  title: string;
  body: string;
  visualDirection: string;
  imageUrl?: string;
  path?: string;
};

type CreativePlan = {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  slides: CreativeSlide[];
};

/**
 * Prompt em inglês, estrutura alinhada ao “GPT Image Generation Models Prompting Guide” (OpenAI):
 * objetivo → marca → cena → composição → restrições / invariâncias.
 */
function buildComposedPrompt(
  client: ClientRow,
  format: 'feed' | 'story',
  userPrompt: string,
  opts?: {
    reserveCornerForLogoOverlay?: boolean;
    brief?: ImageStudioBrief;
    brandKit?: BrandKitRow | null;
    assets?: BrandAssetRow[];
    slide?: CreativeSlide;
  },
): string {
  const kit = opts?.brandKit;
  const brief = opts?.brief;
  const ig = kit?.instagram_handle?.trim() || client.instagram?.trim() || '(not provided)';
  const guidelines =
    kit?.visual_style?.trim() ||
    kit?.brand_story?.trim() ||
    client.brand_guidelines?.trim() ||
    'Professional aesthetic appropriate to the brand; avoid generic stock look.';
  const primary = kit?.primary_color?.trim() || client.brand_primary_color?.trim() || 'not specified';
  const secondary = kit?.secondary_color?.trim() || client.brand_secondary_color?.trim() || 'not specified';
  const accent = kit?.accent_color?.trim() || 'not specified';
  const fontNotes =
    [kit?.font_headline, kit?.font_body].filter(Boolean).join(' / ') ||
    client.brand_font_notes?.trim() ||
    'Legible, modern type if any text appears; strong contrast on background.';
  const assetNotes = (opts?.assets || [])
    .filter((asset) => asset.asset_type !== 'logo')
    .slice(0, 6)
    .map((asset) => `- ${asset.asset_type}: ${asset.label || 'reference'} (${asset.file_url})`)
    .join('\n');
  const slideNotes = opts?.slide
    ? [
        '',
        'Current slide/image brief:',
        `- Slide/image number: ${opts.slide.slideNumber}`,
        `- Title: ${opts.slide.title}`,
        `- Body intent: ${opts.slide.body}`,
        `- Visual direction: ${opts.slide.visualDirection}`,
      ].join('\n')
    : '';
  const briefNotes = brief
    ? [
        '',
        'Structured campaign brief:',
        `- Platform: ${brief.platform || 'instagram'}`,
        `- Objective: ${objectiveLabel(brief.objective)}`,
        `- Audience: ${sanitizeLine(brief.audience || kit?.audience, 'not specified')}`,
        `- Offer/product: ${sanitizeLine(brief.offer, 'not specified')}`,
        `- Tone: ${sanitizeLine(brief.tone || kit?.tone_of_voice, 'not specified')}`,
        `- CTA: ${sanitizeLine(brief.cta, 'not specified')}`,
        `- In-image text mode: ${brief.inImageTextMode || 'short'}`,
        brief.backgroundImageUrl
          ? `- Specific background image for this post: ${sanitizeLine(brief.backgroundImageName, 'uploaded background')} (${brief.backgroundImageUrl})`
          : '- Specific background image for this post: none',
        `- Extra notes: ${sanitizeLine(brief.notes, 'none')}`,
      ].join('\n')
    : '';
  const specificBackgroundNotes = brief?.backgroundImageUrl
    ? [
        '',
        'Post-specific background reference (important):',
        `- The marketer uploaded this background only for the current post: ${brief.backgroundImageUrl}`,
        `- File/name: ${sanitizeLine(brief.backgroundImageName, 'uploaded background image')}`,
        '- Treat it as the main background reference: preserve the general environment, mood, texture, color temperature, and spatial feeling.',
        '- Compose brand elements, text hierarchy, CTA space, and subject matter on top of or around that background direction.',
        '- If exact pixel copying is not possible, keep the result visibly inspired by this background rather than replacing it with an unrelated scene.',
      ].join('\n')
    : '';

  const textModeHint =
    brief?.inImageTextMode === 'none'
      ? 'Do not render readable text in the image unless the marketer quoted exact copy in the creative direction.'
      : brief?.inImageTextMode === 'per-slide'
        ? 'Render short, legible headline text per slide when the slide brief includes a title; keep typography on-brand.'
        : 'You may include one short headline or CTA line if it improves clarity; keep text minimal and legible.';

  const formatComposition =
    format === 'story'
      ? [
          'Canvas: vertical 9:16 Instagram Story (1080×1920 px). Leave safe margins for stickers and UI overlays.',
          'Framing: clear focal subject; intentional negative space where appropriate.',
          textModeHint,
        ].join('\n')
      : [
          'Canvas: vertical 4:5 Instagram feed portrait (1080×1350 px). This is NOT square — compose tall, mobile-first, with strong top-to-bottom hierarchy.',
          'Framing: premium campaign layout; subject and text zones balanced for thumb-stopping scroll.',
          textModeHint,
        ].join('\n');

  const logoInvariant = opts?.reserveCornerForLogoOverlay
    ? [
        '',
        'Logo placement (invariants — critical):',
        '- The real brand logo file will be composited after generation. Do NOT draw, redraw, approximate, stylize, or invent any logo, wordmark, monogram, emblem, or trademark symbol anywhere in the image.',
        '- Reserve the bottom-right region (roughly 24% of image width × 22% of image height, measured from the bottom-right corner) as quiet negative space only: soft gradient, flat color, or very subtle texture.',
        '- Do not place faces, products, busy patterns, icons, or readable text inside that reserved corner.',
        '- Match lighting and color temperature of the scene so a sharp PNG logo can sit there without clashing.',
      ].join('\n')
    : '';

  const constraintFooter = opts?.reserveCornerForLogoOverlay
    ? [
        '',
        'Constraints (must follow):',
        '- No watermarks, no unrelated third-party logos, no fake brand marks.',
        '- Preserve the reserved bottom-right zone unchanged except for simple background — same idea as “do not change logos/icons” in translation workflows.',
        '- If the marketer asks for text in-image, render quoted copy verbatim; otherwise avoid extra stray characters.',
      ].join('\n')
    : [
        '',
        'Constraints (must follow):',
        '- No watermarks; no unrelated logos or trademarks unless described in the brand facts.',
        '- Respect brand identity; do not parody or distort official marks.',
      ].join('\n');

  return [
    'Goal:',
    'Create one polished, brand-safe social image for Instagram (organic or paid). Production quality suitable for a real client deliverable.',
    '',
    'Brand facts (do not invent competitor marks or unrelated trademarks):',
    `- Name: ${kit?.brand_name?.trim() || client.name}`,
    `- Instagram handle: ${ig}`,
    `- Tagline: ${sanitizeLine(kit?.tagline, 'not specified')}`,
    `- Website: ${sanitizeLine(kit?.website_url, 'not specified')}`,
    `- Audience: ${sanitizeLine(kit?.audience, 'not specified')}`,
    `- Value proposition: ${sanitizeLine(kit?.value_proposition, 'not specified')}`,
    `- Tone of voice: ${sanitizeLine(kit?.tone_of_voice, 'not specified')}`,
    `- Visual guidelines: ${guidelines}`,
    `- Primary color: ${primary}; secondary: ${secondary}; accent: ${accent}`,
    `- Typography / type notes: ${fontNotes}`,
    `- Logo usage: ${sanitizeLine(kit?.logo_usage, 'Use the real logo only when composited by the system.')}`,
    `- Words to use: ${sanitizeLine(kit?.words_to_use, 'not specified')}`,
    `- Words to avoid: ${sanitizeLine(kit?.words_to_avoid, 'not specified')}`,
    `- Additional guardrails: ${sanitizeLine(kit?.prompt_guardrails, 'none')}`,
    assetNotes ? `\nAdditional brand/product references:\n${assetNotes}` : '',
    briefNotes,
    specificBackgroundNotes,
    slideNotes,
    '',
    'Scene and creative direction (from the marketer — follow closely):',
    userPrompt.trim(),
    '',
    'Format and composition:',
    formatComposition,
    '- Quality cue: photorealistic or premium photography when the scene calls for realism; otherwise follow the marketer’s stated style (illustration, flat, 3D, etc.).',
    logoInvariant,
    constraintFooter,
  ].join('\n');
}

async function fetchLogoBytes(url: string): Promise<Uint8Array | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 20 * 1024 * 1024) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

type OpenAiImageItem = { b64_json?: string; url?: string };

async function bytesFromImageItem(item: OpenAiImageItem): Promise<Uint8Array> {
  if (item.b64_json) {
    try {
      return Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0));
    } catch {
      throw new Error('OpenAI retornou base64 inválido');
    }
  }
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`Falha ao baixar imagem da OpenAI (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }
  throw new Error('Resposta OpenAI sem b64_json nem url');
}

/**
 * Sobrepõe a logo decodificada sem passar pela OpenAI — arte da logo preservada (só escala uniforme + posição).
 */
async function resizePngToExact(png: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const img = await Image.decode(png);
  img.resize(width, height);
  return new Uint8Array(await img.encode(2));
}

async function compositeLogoOntoPng(basePng: Uint8Array, logoImage: Image): Promise<Uint8Array> {
  const base = await Image.decode(basePng);
  const bw = base.width;
  const bh = base.height;
  const maxW = Math.max(32, Math.round(bw * 0.24));
  const maxH = Math.max(32, Math.round(bh * 0.22));
  const overlay = logoImage.clone();
  overlay.contain(maxW, maxH);
  const pad = Math.round(Math.min(bw, bh) * 0.035);
  let x = bw - overlay.width - pad;
  let y = bh - overlay.height - pad;
  if (x < 0) x = pad;
  if (y < 0) y = pad;
  base.composite(overlay, x, y);
  const out = await base.encode(2);
  return new Uint8Array(out);
}

async function openAiGenerationsOnce(
  apiKey: string,
  model: string,
  prompt: string,
  apiSize: string,
  uiQuality: string,
  n: number,
): Promise<{ items: OpenAiImageItem[] }> {
  let payload: Record<string, unknown>;
  if (model === 'dall-e-3') {
    payload = {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: apiSize,
      quality: uiQuality === 'high' ? 'hd' : 'standard',
      response_format: 'b64_json',
    };
  } else if (model === 'dall-e-2') {
    payload = {
      model: 'dall-e-2',
      prompt,
      n: Math.min(10, Math.max(1, n)),
      size: '1024x1024',
      response_format: 'b64_json',
    };
  } else {
    payload = {
      model: 'gpt-image-2',
      prompt,
      n: Math.min(4, Math.max(1, n)),
      size: apiSize,
      quality: normalizeUiQuality(uiQuality),
    };
  }

  const res = await fetch(`${OPENAI_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: OpenAiImageItem[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `OpenAI generations ${res.status}`);
  }
  const items = json.data || [];
  if (items.length === 0) throw new Error('OpenAI não retornou imagens');
  return { items };
}

async function generateImagesBatched(
  apiKey: string,
  model: string,
  prompt: string,
  apiSize: string,
  uiQuality: string,
  nRequested: number,
): Promise<{ items: OpenAiImageItem[] }> {
  const count = Math.min(4, Math.max(1, nRequested));
  if (model === 'dall-e-3') {
    const items: OpenAiImageItem[] = [];
    for (let i = 0; i < count; i++) {
      const { items: one } = await openAiGenerationsOnce(apiKey, model, prompt, apiSize, uiQuality, 1);
      items.push(...one);
    }
    return { items };
  }
  const nOnce = model === 'dall-e-2' ? Math.min(10, count) : Math.min(4, count);
  return openAiGenerationsOnce(apiKey, model, prompt, apiSize, uiQuality, nOnce);
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
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
    return json(
      {
        error:
          'Chave OpenAI não configurada no Supabase. Em Project Settings → Edge Functions → Secrets, adicione GPT_IMAGES_API_KEY (ou OPENAI_API_KEY) e faça redeploy da função.',
      },
      503,
      cors,
    );
  }

  const rlIp = rateLimitByKey(`openai-image:${clientIp(req)}`, 20, 60_000);
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
    if (!jwt) {
      return json({ error: 'Não autenticado' }, 401, cors);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ error: 'Sessão inválida' }, 401, cors);
    }
    const userId = userData.user.id;

    const rlUser = rateLimitByKey(`openai-image:user:${userId}`, 40, 60_000);
    if (!rlUser.ok) {
      return json({ error: 'Limite de gerações por minuto. Tente em instantes.' }, 429, {
        ...cors,
        'Retry-After': String(rlUser.retryAfterSec),
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileErr || !profile?.organization_id) {
      return json({ error: 'Organização não encontrada' }, 403, cors);
    }
    const organizationId = profile.organization_id as string;

    const body = await req.json().catch(() => null) as {
      clientId?: string;
      userPrompt?: string;
      brief?: ImageStudioBrief;
      format?: 'feed' | 'story' | 'carousel';
      quality?: string;
      n?: number;
      /** Carrossel: gera só este slide (0-based). Obrigatório para evitar timeout da Edge (150s). */
      slideIndex?: number;
      /** Índice da variação em posts com múltiplas imagens (0-based). */
      imageIndex?: number;
    } | null;

    const brief = body?.brief || null;
    const userPrompt = typeof body?.userPrompt === 'string'
      ? body.userPrompt.trim()
      : sanitizeLine(brief?.topic, '');

    if (!body?.clientId || !userPrompt) {
      return json({ error: 'clientId e tópico/prompt são obrigatórios' }, 400, cors);
    }

    const requestedFormat = brief?.format || body.format || 'feed';
    const format = requestedFormat === 'story' ? 'story' : 'feed';
    const imageModel = resolveImageModel();
    const apiSize = apiSizeFor(imageModel, format);
    const qRaw = body.quality || 'medium';
    const uiQuality = normalizeUiQuality(qRaw);
    const nRequested = 1;

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select(
        'id, organization_id, name, instagram, logo_url, brand_guidelines, brand_primary_color, brand_secondary_color, brand_font_notes',
      )
      .eq('id', body.clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientErr || !client) {
      return json({ error: 'Cliente não encontrado ou sem permissão' }, 404, cors);
    }

    const row = client as ClientRow;
    const { data: kitData } = await supabaseAdmin
      .from('client_brand_kits')
      .select('*')
      .eq('client_id', row.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    const kit = (kitData || null) as BrandKitRow | null;

    const { data: assetsData } = kit?.id
      ? await supabaseAdmin
          .from('client_brand_assets')
          .select('asset_type, label, file_url')
          .eq('brand_kit_id', kit.id)
          .eq('organization_id', organizationId)
          .order('sort_order', { ascending: true })
      : { data: [] as BrandAssetRow[] };

    const assets = (assetsData || []) as BrandAssetRow[];
    const preferredLogo =
      assets.find((asset) => asset.asset_type === 'logo')?.file_url ||
      assets.find((asset) => asset.asset_type === 'logo_light')?.file_url ||
      assets.find((asset) => asset.asset_type === 'logo_dark')?.file_url ||
      row.logo_url;
    const logoUrl = preferredLogo?.trim();
    const logoBytes = logoUrl ? await fetchLogoBytes(logoUrl) : null;

    const normalizedBrief: ImageStudioBrief = {
      format: requestedFormat === 'carousel' ? 'carousel' : format,
      platform: brief?.platform || 'instagram',
      objective: brief?.objective || 'brand',
      postType: requestedFormat === 'carousel' || brief?.postType === 'carousel' ? 'carousel' : 'single',
      topic: userPrompt,
      audience: brief?.audience || kit?.audience || '',
      offer: brief?.offer || '',
      tone: brief?.tone || kit?.tone_of_voice || '',
      slideCount: brief?.slideCount,
      imageCount: nRequested,
      cta: brief?.cta || '',
      inImageTextMode: brief?.inImageTextMode || 'short',
      notes: brief?.notes || '',
      backgroundImageUrl: brief?.backgroundImageUrl || '',
      backgroundImageName: brief?.backgroundImageName || '',
    };
    const creativePlan = buildCreativePlan(normalizedBrief, row, kit);
    const prompt = buildComposedPrompt(row, format, userPrompt, {
      reserveCornerForLogoOverlay: !!logoBytes,
      brief: normalizedBrief,
      brandKit: kit,
      assets,
    });

    const isCarousel = normalizedBrief.format === 'carousel' || normalizedBrief.postType === 'carousel';
    let items: OpenAiImageItem[] = [];
    let targetSlideIndex = 0;

    if (isCarousel) {
      if (typeof body.slideIndex !== 'number' || !Number.isInteger(body.slideIndex)) {
        return json(
          {
            error:
              'Carrossel exige slideIndex (0-based) em cada requisição. Gere um slide por vez no cliente para evitar timeout.',
          },
          400,
          cors,
        );
      }
      targetSlideIndex = body.slideIndex;
      if (targetSlideIndex < 0 || targetSlideIndex >= creativePlan.slides.length) {
        return json({ error: `slideIndex inválido (0-${creativePlan.slides.length - 1})` }, 400, cors);
      }
      const slide = creativePlan.slides[targetSlideIndex];
      const slidePrompt = buildComposedPrompt(
        row,
        format,
        `${userPrompt}\n\nCreate this specific carousel slide: ${slide.title}. ${slide.body}. ${slide.visualDirection}`,
        {
          reserveCornerForLogoOverlay: !!logoBytes,
          brief: normalizedBrief,
          brandKit: kit,
          assets,
          slide,
        },
      );
      const { items: slideItems } = await openAiGenerationsOnce(apiKey, imageModel, slidePrompt, apiSize, uiQuality, 1);
      items = slideItems;
    } else {
      const generated = await generateImagesBatched(apiKey, imageModel, prompt, apiSize, uiQuality, nRequested);
      items = generated.items;
    }

    let logoDecoded: InstanceType<typeof Image> | null = null;
    if (logoBytes) {
      try {
        logoDecoded = await Image.decode(logoBytes);
      } catch (e) {
        console.warn('openai-image-generate: decode logo para composição falhou', e);
      }
    }
    const usedComposite = !!logoDecoded;

    const outDims = outputDimensions(format);
    const images: Array<{ publicUrl: string; path: string }> = [];
    for (let i = 0; i < items.length; i++) {
      let binary = await bytesFromImageItem(items[i]);
      try {
        binary = await resizePngToExact(binary, outDims.width, outDims.height);
      } catch (e) {
        console.warn('openai-image-generate: resize para output falhou', e);
      }
      if (logoDecoded) {
        try {
          binary = await compositeLogoOntoPng(binary, logoDecoded);
        } catch (e) {
          console.error('openai-image-generate: composite logo falhou', e);
          return json(
            {
              error: 'Falha ao aplicar a logo na imagem (composição)',
              detail: e instanceof Error ? e.message : String(e),
            },
            500,
            cors,
          );
        }
      }
      const suffix = isCarousel
        ? `slide-${targetSlideIndex}`
        : typeof body.imageIndex === 'number'
          ? `var-${body.imageIndex}`
          : `${i}`;
      const filePath = `${organizationId}/${userId}/ai-gen/${Date.now()}-${suffix}.png`;
      const { error: upErr } = await supabaseAdmin.storage.from('post-images').upload(filePath, binary, {
        contentType: 'image/png',
        upsert: false,
      });
      if (upErr) {
        console.error('Storage upload failed:', upErr.message);
        return json(
          { error: 'Falha ao salvar imagem no storage', detail: upErr.message },
          500,
          cors,
        );
      }
      const { data: pub } = supabaseAdmin.storage.from('post-images').getPublicUrl(filePath);
      images.push({ publicUrl: pub.publicUrl, path: filePath });
      if (isCarousel && creativePlan.slides[targetSlideIndex]) {
        creativePlan.slides[targetSlideIndex] = {
          ...creativePlan.slides[targetSlideIndex],
          imageUrl: pub.publicUrl,
          path: filePath,
        };
      } else if (creativePlan.slides[i]) {
        creativePlan.slides[i] = {
          ...creativePlan.slides[i],
          imageUrl: pub.publicUrl,
          path: filePath,
        };
      }
    }

    return json(
      {
        images,
        creativePlan,
        mode: usedComposite ? 'composite' : 'generate',
        model: imageModel,
        size: apiSize,
        outputSize: `${outDims.width}x${outDims.height}`,
        quality: uiQuality,
      },
      200,
      cors,
    );
  } catch (e) {
    console.error('openai-image-generate:', e);
    const isTimeout =
      e instanceof DOMException && e.name === 'TimeoutError' ||
      (e instanceof Error && /timeout|aborted/i.test(e.message));
    if (isTimeout) {
      return json(
        {
          error:
            'A geração demorou demais (limite ~2 min por imagem). Tente qualidade "low", menos slides ou defina GPT_IMAGES_MODEL=dall-e-3 nos secrets da Edge Function.',
        },
        504,
        cors,
      );
    }
    return json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      500,
      cors,
    );
  }
});

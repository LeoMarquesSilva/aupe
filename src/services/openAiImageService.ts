import { supabase } from './supabaseClient';
import type { ImageStudioBrief, ImageStudioCreativePlan } from '../types';

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || '';

export type BrandImageFormat = ImageStudioBrief['format'];

export type GenerateBrandImagesResult = {
  images: Array<{ publicUrl: string; path: string }>;
  creativePlan?: ImageStudioCreativePlan;
  /** generate = só IA; composite = logo do cliente sobreposta sem alterar pixels da logo. */
  mode: 'generate' | 'composite';
  /** Modelo usado na Edge (ex.: gpt-image-2, dall-e-3). */
  model?: string;
  size: string;
  outputSize?: string;
  quality: string;
};

function fnUrl(): string {
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/openai-image-generate`;
}

function isCarouselBrief(brief?: ImageStudioBrief): boolean {
  return brief?.format === 'carousel' || brief?.postType === 'carousel';
}

function expectedImageTotal(brief?: ImageStudioBrief, n?: number): number {
  if (isCarouselBrief(brief)) {
    return Math.max(2, brief?.slideCount || 5);
  }
  return Math.min(4, Math.max(1, n ?? brief?.imageCount ?? 1));
}

function mergeCreativePlans(
  base: ImageStudioCreativePlan | null,
  next: ImageStudioCreativePlan | undefined,
): ImageStudioCreativePlan | null {
  if (!next) return base;
  if (!base) return next;
  return {
    ...next,
    slides: next.slides.map((slide, slideIndex) =>
      base.slides[slideIndex]?.imageUrl ? base.slides[slideIndex] : slide,
    ),
  };
}

async function generateBrandImagesOnce(params: {
  clientId: string;
  userPrompt?: string;
  brief?: ImageStudioBrief;
  format?: BrandImageFormat;
  quality?: string;
  slideIndex?: number;
  imageIndex?: number;
  revisionNotes?: string;
}): Promise<GenerateBrandImagesResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY).');
  }

  const body: Record<string, unknown> = {
    clientId: params.clientId,
    userPrompt: params.userPrompt ?? params.brief?.topic,
    brief: params.brief,
    format: params.format ?? params.brief?.format ?? 'feed',
    quality: params.quality ?? 'medium',
    n: 1,
  };
  if (typeof params.slideIndex === 'number') {
    body.slideIndex = params.slideIndex;
  }
  if (typeof params.imageIndex === 'number') {
    body.imageIndex = params.imageIndex;
  }
  if (params.revisionNotes?.trim()) {
    body.revisionNotes = params.revisionNotes.trim();
  }

  const res = await fetch(fnUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  let payload: {
    error?: string;
    detail?: string;
    images?: GenerateBrandImagesResult['images'];
    creativePlan?: ImageStudioCreativePlan;
    mode?: string;
    model?: string;
    size?: string;
    outputSize?: string;
    quality?: string;
  };
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Resposta inválida da Edge Function (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const parts = [payload?.error, payload?.detail].filter(Boolean);
    let msg = parts.length > 0 ? parts.join(': ') : `HTTP ${res.status}`;
    if (res.status === 504) {
      msg =
        payload?.error ||
        'A geração excedeu o tempo limite do servidor (~2 min por imagem). Tente qualidade menor ou gere uma imagem por vez.';
    }
    throw new Error(msg);
  }

  if (payload?.error) {
    throw new Error([payload.error, payload.detail].filter(Boolean).join(': '));
  }
  if (!payload?.images?.length) {
    throw new Error('Resposta sem imagens');
  }

  const modeRaw = payload.mode === 'composite' ? 'composite' : 'generate';
  return {
    images: payload.images,
    creativePlan: payload.creativePlan,
    mode: modeRaw,
    model: payload.model,
    size: payload.size || '',
    outputSize: payload.outputSize,
    quality: payload.quality || '',
  };
}

export async function generateBrandImages(params: {
  clientId: string;
  userPrompt?: string;
  brief?: ImageStudioBrief;
  format?: BrandImageFormat;
  quality?: string;
  n?: number;
  slideIndex?: number;
  imageIndex?: number;
  onProgress?: (current: number, total: number) => void;
  revisionNotes?: string;
  /** Carrossel: regerar apenas este slide (0-based). */
  onlySlideIndex?: number;
}): Promise<GenerateBrandImagesResult> {
  const explicitSingle =
    typeof params.slideIndex === 'number' || typeof params.imageIndex === 'number';
  const carousel = isCarouselBrief(params.brief);
  let total = expectedImageTotal(params.brief, params.n);

  if (carousel && typeof params.onlySlideIndex === 'number') {
    total = 1;
  }

  if (explicitSingle || total <= 1) {
    const slideIndex =
      typeof params.onlySlideIndex === 'number'
        ? params.onlySlideIndex
        : params.slideIndex;
    const res = await generateBrandImagesOnce({
      ...params,
      slideIndex: carousel ? slideIndex : params.slideIndex,
      imageIndex: carousel ? undefined : params.imageIndex,
    });
    return res;
  }

  const collectedImages: GenerateBrandImagesResult['images'] = [];
  let mergedPlan: ImageStudioCreativePlan | null = null;
  let lastMode: 'generate' | 'composite' = 'generate';
  let lastModel: string | undefined;
    let lastSize = '';
    let lastOutputSize: string | undefined;
    let lastQuality = '';

  for (let index = 0; index < total; index += 1) {
    params.onProgress?.(index + 1, total);
    const res = await generateBrandImagesOnce({
      ...params,
      slideIndex: carousel ? index : undefined,
      imageIndex: carousel ? undefined : index,
    });
    lastMode = res.mode;
    lastModel = res.model;
    lastSize = res.size;
    lastOutputSize = res.outputSize;
    lastQuality = res.quality;
    collectedImages.push(...res.images);
    mergedPlan = mergeCreativePlans(mergedPlan, res.creativePlan);
  }

  return {
    images: collectedImages,
    creativePlan: mergedPlan || undefined,
    mode: lastMode,
    model: lastModel,
    size: lastSize,
    outputSize: lastOutputSize,
    quality: lastQuality,
  };
}

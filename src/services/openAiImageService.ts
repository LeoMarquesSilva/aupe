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
  quality: string;
};

function fnUrl(): string {
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/openai-image-generate`;
}

export async function generateBrandImages(params: {
  clientId: string;
  userPrompt?: string;
  brief?: ImageStudioBrief;
  format?: BrandImageFormat;
  quality?: string;
  n?: number;
}): Promise<GenerateBrandImagesResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY).');
  }

  const res = await fetch(fnUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      clientId: params.clientId,
      userPrompt: params.userPrompt ?? params.brief?.topic,
      brief: params.brief,
      format: params.format ?? params.brief?.format ?? 'feed',
      quality: params.quality ?? 'medium',
      n: params.n ?? params.brief?.imageCount ?? 1,
    }),
  });

  let payload: {
    error?: string;
    detail?: string;
    images?: GenerateBrandImagesResult['images'];
    creativePlan?: ImageStudioCreativePlan;
    mode?: string;
    model?: string;
    size?: string;
    quality?: string;
  };
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Resposta inválida da Edge Function (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const parts = [payload?.error, payload?.detail].filter(Boolean);
    const msg = parts.length > 0 ? parts.join(': ') : `HTTP ${res.status}`;
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
    quality: payload.quality || '',
  };
}

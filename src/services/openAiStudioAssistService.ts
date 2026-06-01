import { supabase } from './supabaseClient';
import type { ClientBrandKit, ImageStudioBrief } from '../types';

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || '';

export type BriefSuggestions = Pick<
  ImageStudioBrief,
  'topic' | 'audience' | 'offer' | 'cta' | 'tone' | 'notes'
>;

export type BrandKitSuggestions = Partial<
  Pick<
    ClientBrandKit,
    | 'brandName'
    | 'tagline'
    | 'brandStory'
    | 'audience'
    | 'valueProposition'
    | 'toneOfVoice'
    | 'visualStyle'
    | 'primaryColor'
    | 'secondaryColor'
    | 'accentColor'
    | 'fontHeadline'
    | 'fontBody'
    | 'logoUsage'
    | 'wordsToUse'
    | 'wordsToAvoid'
    | 'hashtags'
    | 'promptGuardrails'
  >
>;

type AssistAction = 'suggest_brief' | 'suggest_brand_kit';

async function callAssist<T>(payload: {
  action: AssistAction;
  clientId: string;
  brief?: Partial<ImageStudioBrief>;
  brandKit?: Partial<ClientBrandKit>;
  seedText?: string;
}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente.');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/openai-image-studio-assist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(payload),
  });

  let body: { error?: string; suggestions?: T };
  try {
    body = await res.json();
  } catch {
    throw new Error(`Resposta inválida (HTTP ${res.status}).`);
  }

  if (!res.ok || body.error) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (!body.suggestions) {
    throw new Error('Resposta sem sugestões');
  }
  return body.suggestions;
}

function pickStrings<T extends Record<string, unknown>>(raw: Record<string, unknown>, keys: (keyof T)[]): T {
  const out = {} as T;
  for (const key of keys) {
    const v = raw[key as string];
    if (typeof v === 'string' && v.trim()) {
      out[key] = v.trim() as T[keyof T];
    }
  }
  return out;
}

export async function suggestImageStudioBrief(params: {
  clientId: string;
  brief?: Partial<ImageStudioBrief>;
  brandKit?: Partial<ClientBrandKit> | null;
}): Promise<BriefSuggestions> {
  const raw = await callAssist<Record<string, unknown>>({
    action: 'suggest_brief',
    clientId: params.clientId,
    brief: params.brief,
    brandKit: params.brandKit || undefined,
  });
  return pickStrings<BriefSuggestions>(raw, ['topic', 'audience', 'offer', 'cta', 'tone', 'notes']);
}

export async function suggestBrandKit(params: {
  clientId: string;
  brandKit?: Partial<ClientBrandKit>;
  seedText?: string;
}): Promise<BrandKitSuggestions> {
  const raw = await callAssist<Record<string, unknown>>({
    action: 'suggest_brand_kit',
    clientId: params.clientId,
    brandKit: params.brandKit,
    seedText: params.seedText,
  });
  return pickStrings<BrandKitSuggestions>(raw, [
    'brandName',
    'tagline',
    'brandStory',
    'audience',
    'valueProposition',
    'toneOfVoice',
    'visualStyle',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'fontHeadline',
    'fontBody',
    'logoUsage',
    'wordsToUse',
    'wordsToAvoid',
    'hashtags',
    'promptGuardrails',
  ]);
}

/** Dimensões finais entregues ao usuário (Instagram). */
export const IMAGE_STUDIO_OUTPUT = {
  feed: { width: 1080, height: 1350, label: 'Feed portrait 4:5', ratioLabel: '1080 × 1350 px' },
  story: { width: 1080, height: 1920, label: 'Story 9:16', ratioLabel: '1080 × 1920 px' },
} as const;

/** gpt-image-2 exige múltiplos de 16; geramos neste tamanho e redimensionamos para o output. */
export const IMAGE_STUDIO_API_SIZE = {
  feed: '1088x1360',
  story: '1088x1920',
} as const;

export const IMAGE_STUDIO_OBJECTIVES: Array<{
  value: 'brand' | 'educate' | 'sell' | 'announce' | 'engage';
  label: string;
  hint: string;
}> = [
  { value: 'brand', label: 'Marca / posicionamento', hint: 'Reforçar identidade e autoridade' },
  { value: 'educate', label: 'Educar', hint: 'Explicar, ensinar ou quebrar objeções' },
  { value: 'sell', label: 'Vender', hint: 'Destacar oferta, produto ou promoção' },
  { value: 'announce', label: 'Anunciar', hint: 'Novidade, lançamento ou evento' },
  { value: 'engage', label: 'Engajar', hint: 'Pergunta, enquete ou convite à conversa' },
];

export const CAROUSEL_SLIDE_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const DEFAULT_CAROUSEL_SLIDES = 4;

export const BRAND_KIT_ESSENTIAL_FIELDS = [
  'brandName',
  'visualStyle',
  'primaryColor',
  'toneOfVoice',
  'audience',
  'valueProposition',
  'logoUsage',
  'brandStory',
] as const;

export function aspectRatioSx(format: 'feed' | 'story' | 'carousel'): { aspectRatio: string; maxHeight?: number | object } {
  if (format === 'story') {
    return { aspectRatio: '9 / 16', maxHeight: { xs: 520, md: 640 } };
  }
  return { aspectRatio: '4 / 5', maxHeight: { xs: 480, md: 560 } };
}

/** Presets de correção pós-geração — aplicados no prompt de revisão. */
export const IMAGE_REVISION_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  instruction: string;
  /** Ajustes automáticos no briefing quando aplicável */
  briefPatch?: Partial<{
    inImageTextMode: 'none' | 'short' | 'per-slide';
    notes: string;
  }>;
}> = [
  {
    id: 'less_text',
    label: 'Menos texto',
    description: 'Reduzir ou remover textos na arte',
    instruction:
      'CRITICAL REVISION: Remove most in-image text. Keep at most one short headline OR none. No bullet lists, no paragraphs, no tiny copy blocks.',
    briefPatch: { inImageTextMode: 'none' },
  },
  {
    id: 'less_clutter',
    label: 'Menos informação',
    description: 'Menos elementos visuais competindo',
    instruction:
      'CRITICAL REVISION: Simplify drastically. One clear focal point only. Remove secondary icons, extra badges, charts, and visual noise. Less is more.',
  },
  {
    id: 'cleaner',
    label: 'Visual mais limpo',
    description: 'Mais respiro e composição minimalista',
    instruction:
      'CRITICAL REVISION: Minimalist layout with generous negative space. Clean background, fewer layers, premium editorial feel.',
  },
  {
    id: 'more_focus',
    label: 'Mais foco no produto',
    description: 'Destaque único no produto/serviço',
    instruction:
      'CRITICAL REVISION: Hero the main product or service. Reduce decorative elements. Clear visual hierarchy toward the offer.',
  },
  {
    id: 'softer_colors',
    label: 'Cores mais suaves',
    description: 'Paleta menos saturada e agressiva',
    instruction:
      'CRITICAL REVISION: Softer color palette, lower saturation, refined contrast. Avoid loud gradients and rainbow clutter.',
  },
  {
    id: 'stronger_cta',
    label: 'CTA mais evidente',
    description: 'Chamada para ação mais clara',
    instruction:
      'CRITICAL REVISION: Make the call-to-action the clearest element after the main subject. One CTA zone, high contrast, no competing messages.',
    briefPatch: { inImageTextMode: 'short' },
  },
];

export type ImageRevisionPresetId = (typeof IMAGE_REVISION_PRESETS)[number]['id'];

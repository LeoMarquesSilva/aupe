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

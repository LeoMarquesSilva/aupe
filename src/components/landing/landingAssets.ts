/**
 * Paths under `public/` with spaces/brackets — encode each segment for reliable loading.
 */
export function publicAsset(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '');
  return '/' + trimmed.split('/').map((seg) => encodeURIComponent(seg)).join('/');
}

/** Marca principal: logo horizontal fundo transparente (uso global na landing). */
export const LOGO_PRIMARY = publicAsset(
  'Fundo transparente [digital]/logo-insyt-fundo-transparente-04.png'
);

/** Variações para strip de confiança / marcas (opcional). */
export const LOGO_ALT_MARKS = [
  publicAsset('Fundo transparente [digital]/logo-insyt-fundo-transparente-01.png'),
  publicAsset('Fundo transparente [digital]/logo-insyt-fundo-transparente-02.png'),
  publicAsset('Fundo transparente [digital]/logo-insyt-fundo-transparente-03.png'),
];

/** Avatares estilo “perfil redes” — narrativa Instagram. */
export const PROFILE_MARK_SOCIAL = [
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-01.png'),
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-03.png'),
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-04.png'),
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-06.png'),
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-08.png'),
  publicAsset('Perfel redes sociais [digital]/logo-insyt-perfil-redes-sociais-10.png'),
];

/** Decoração leve — SVGs vetoriais (baixo peso). */
export const VECTOR_MARK_ORANGE = publicAsset('Vetor [digital e impresso]/logo-insyt-vetor-01.svg');
export const VECTOR_MARK_ICON = publicAsset('Vetor [digital e impresso]/logo-insyt-vetor-04.svg');
export const VECTOR_MARK_CORNER = publicAsset('Vetor [digital e impresso]/logo-insyt-vetor-07.svg');

/** Referência de paleta (só documentação visual; UI usa BRAND_COLORS). */
export const PALETTE_REFERENCE = publicAsset('Paleta de cores/Paleta de cores INSYT.png');

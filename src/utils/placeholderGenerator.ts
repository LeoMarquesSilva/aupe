/**
 * Gera uma URL de placeholder usando um serviço externo ou SVG inline
 */
export class PlaceholderGenerator {
  /**
   * Gera um SVG placeholder como data URL
   */
  static generateSvgPlaceholder(
    width: number = 400,
    height: number = 400,
    text: string = 'Imagem',
    bgColor: string = '#f0f0f0',
    textColor: string = '#666666'
  ): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
              fill="${textColor}" text-anchor="middle" dy=".3em">${text}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Gera uma URL de placeholder usando um serviço externo
   */
  static generateExternalPlaceholder(
    width: number = 400,
    height: number = 400,
    text?: string
  ): string {
    const baseUrl = `https://via.placeholder.com/${width}x${height}`;
    return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
  }

  /**
   * Gera um placeholder com base nas preferências
   */
  static generate(
    width: number = 400,
    height: number = 400,
    text?: string,
    useExternal: boolean = false
  ): string {
    if (useExternal) {
      return this.generateExternalPlaceholder(width, height, text);
    } else {
      return this.generateSvgPlaceholder(width, height, text || 'Sem imagem');
    }
  }
}

export const placeholderGenerator = PlaceholderGenerator;
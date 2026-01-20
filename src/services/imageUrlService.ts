import { supabaseStorageService } from './supabaseStorageService';

interface ImageData {
  url?: string;
  path?: string;
  fileName?: string;
}

export class ImageUrlService {
  private static readonly DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwVjI1ME0xNTAgMjAwSDI1MCIgc3Ryb2tlPSIjQ0NDIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
  
  /**
   * Gera uma URL de placeholder personalizada
   */
  static getPlaceholder(width: number = 400, height: number = 400, text: string = 'Imagem'): string {
    const encodedText = encodeURIComponent(text);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#F5F5F5"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#999" font-family="Arial, sans-serif" font-size="14">${text}</text>
      </svg>
    `)}`;
  }
  
  /**
   * Verifica se uma URL é do Facebook/Instagram
   */
  static isFacebookImage(url: string): boolean {
    if (!url) return false;
    return url.includes('fbcdn.net') || 
           url.includes('facebook.com') || 
           url.includes('instagram.com') ||
           url.includes('scontent-');
  }

  /**
   * Converte uma URL de imagem para URL pública do Supabase Storage
   * Versão melhorada com melhor tratamento de erros e URLs do Facebook
   */
  static getPublicUrl(imageData: string | ImageData | null | undefined): string {
    try {
      // Verificação mais robusta para valores nulos/vazios
      if (!imageData) {
        return this.DEFAULT_PLACEHOLDER;
      }

      if (typeof imageData === 'string') {
        const trimmedData = imageData.trim();
        
        // Se for uma string vazia, retorna placeholder
        if (!trimmedData) {
          return this.DEFAULT_PLACEHOLDER;
        }
        
        // Se já for uma URL completa
        if (trimmedData.startsWith('http')) {
          return trimmedData;
        }
        
        // Se for um path relativo, converte para URL pública do Supabase
        if (trimmedData.startsWith('/') || !trimmedData.includes('://')) {
          return supabaseStorageService.getPublicUrl(trimmedData);
        }
        
        return trimmedData;
      } 
      
      // Se for um objeto ImageData
      if (typeof imageData === 'object' && imageData !== null) {
        // Priorizar url se existir
        if (imageData.url && imageData.url.trim()) {
          return this.getPublicUrl(imageData.url);
        }
        
        // Fallback para path
        if (imageData.path && imageData.path.trim()) {
          return supabaseStorageService.getPublicUrl(imageData.path);
        }
      }
      
      // Fallback final
      return this.DEFAULT_PLACEHOLDER;
      
    } catch (error) {
      console.warn('Erro ao processar URL da imagem:', error, { imageData });
      return this.DEFAULT_PLACEHOLDER;
    }
  }

  /**
   * Processa dados de imagem de forma mais robusta
   * Lida com arrays, objetos e strings de forma mais segura
   */
  static processImageData(imageData: any): string {
    try {
      if (!imageData) {
        return this.DEFAULT_PLACEHOLDER;
      }

      // Se for uma string
      if (typeof imageData === 'string') {
        return this.getPublicUrl(imageData);
      }

      // Se for um array, pega o primeiro item válido
      if (Array.isArray(imageData)) {
        for (const item of imageData) {
          if (item && (typeof item === 'string' || typeof item === 'object')) {
            const processed = this.processImageData(item);
            if (processed !== this.DEFAULT_PLACEHOLDER) {
              return processed;
            }
          }
        }
        return this.DEFAULT_PLACEHOLDER;
      }

      // Se for um objeto
      if (typeof imageData === 'object' && imageData !== null) {
        // Tentar diferentes propriedades comuns
        const possibleUrls = [
          imageData.url,
          imageData.path,
          imageData.src,
          imageData.href,
          imageData.link
        ];
        
        for (const url of possibleUrls) {
          if (url && typeof url === 'string' && url.trim()) {
            return this.getPublicUrl(url);
          }
        }
      }

      return this.DEFAULT_PLACEHOLDER;
    } catch (error) {
      console.warn('Erro ao processar dados da imagem:', error, { imageData });
      return this.DEFAULT_PLACEHOLDER;
    }
  }

  /**
   * Processa especificamente dados de posts agendados
   * Lida com os diferentes formatos que podem vir do banco
   */
  static processScheduledPostImage(post: any): string {
    try {
      // Para Reels, priorizar coverImage
      if (post.postType === 'reels' && post.coverImage) {
        const coverUrl = this.processImageData(post.coverImage);
        if (coverUrl !== this.DEFAULT_PLACEHOLDER) {
          return coverUrl;
        }
      }

      // Para outros tipos ou fallback, usar images
      if (post.images) {
        const imageUrl = this.processImageData(post.images);
        if (imageUrl !== this.DEFAULT_PLACEHOLDER) {
          return imageUrl;
        }
      }

      // Fallback específico por tipo
      const fallbackText = this.getPostTypeFallbackText(post.postType);
      return this.getPlaceholder(400, 400, fallbackText);
      
    } catch (error) {
      console.warn('Erro ao processar imagem do post:', error, { post });
      return this.getPlaceholder(400, 400, 'Erro na imagem');
    }
  }

  /**
   * Obtém texto de fallback baseado no tipo de post
   */
  private static getPostTypeFallbackText(postType: string): string {
    switch (postType) {
      case 'stories': return 'Story';
      case 'reels': return 'Reel';
      case 'carousel': return 'Carrossel';
      case 'post': return 'Post';
      default: return 'Conteúdo';
    }
  }

  /**
   * Converte um array de imagens para URLs públicas
   */
  static getPublicUrls(images: (string | ImageData)[]): string[] {
    if (!Array.isArray(images)) {
      return [this.DEFAULT_PLACEHOLDER];
    }
    
    return images.map(image => this.getPublicUrl(image));
  }

  /**
   * Verifica se uma URL é válida
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida se uma URL de imagem existe e pode ser carregada
   * Versão melhorada que lida com CORS
   */
  static async validateImageUrl(url: string): Promise<boolean> {
    try {
      if (!url || this.isPlaceholder(url)) {
        return true; // Placeholders sempre "existem"
      }

      // Para imagens do Facebook/Instagram, assumir que existem (devido ao CORS)
      if (this.isFacebookImage(url)) {
        console.info('🔗 Imagem do Facebook/Instagram - assumindo como válida devido ao CORS');
        return true;
      }

      // Timeout mais curto para não travar a interface
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Tentar sem CORS primeiro
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Para erros de CORS, assumir que a imagem existe
      if (error instanceof Error && error.name === 'TypeError' && this.isFacebookImage(url)) {
        console.info('🔗 Erro de CORS detectado para imagem do Facebook/Instagram - assumindo como válida');
        return true;
      }
      return false;
    }
  }

  /**
   * Verifica se uma URL é um placeholder
   */
  static isPlaceholder(url: string): boolean {
    return url === this.DEFAULT_PLACEHOLDER || 
           url.includes('placeholder') || 
           url.startsWith('data:image/svg+xml') ||
           url.includes('via.placeholder.com');
  }

  /**
   * Gera uma URL de thumbnail otimizada
   */
  static getThumbnailUrl(imageData: string | ImageData, width: number = 300, height: number = 300): string {
    const publicUrl = this.getPublicUrl(imageData);
    
    // Se for do Supabase Storage, podemos adicionar parâmetros de transformação
    if (publicUrl.includes('supabase')) {
      try {
        const url = new URL(publicUrl);
        url.searchParams.set('width', width.toString());
        url.searchParams.set('height', height.toString());
        url.searchParams.set('resize', 'cover');
        url.searchParams.set('quality', '80');
        return url.toString();
      } catch {
        return publicUrl;
      }
    }
    
    return publicUrl;
  }

  /**
   * Carrega uma imagem com fallback para placeholder
   */
  static async loadImageWithFallback(url: string): Promise<string> {
    try {
      const isValid = await this.validateImageUrl(url);
      return isValid ? url : this.DEFAULT_PLACEHOLDER;
    } catch {
      return this.DEFAULT_PLACEHOLDER;
    }
  }
}

// Exportar uma instância para uso direto
export const imageUrlService = ImageUrlService;
import { supabaseStorageService } from './supabaseStorageService';
import { placeholderGenerator } from '../utils/placeholderGenerator';

export interface ImageData {
  url: string;
  path?: string;
  fileName?: string;
}

export class ImageUrlService {
  private static readonly DEFAULT_PLACEHOLDER = placeholderGenerator.generate(400, 400, 'Sem imagem');
  
  /**
   * Converte uma URL de imagem para URL pública do Supabase Storage
   * Se já for uma URL do Supabase, retorna como está
   * Se for um path relativo, converte para URL pública
   */
  static getPublicUrl(imageData: string | ImageData): string {
    try {
      if (typeof imageData === 'string') {
        // Se for uma string vazia ou null, retorna placeholder
        if (!imageData || imageData.trim() === '') {
          return this.DEFAULT_PLACEHOLDER;
        }
        
        // Se for uma string, pode ser uma URL completa ou um path
        if (imageData.startsWith('http')) {
          // Se já for uma URL completa, verifica se é do Supabase
          if (imageData.includes('supabase')) {
            return imageData;
          }
          // Se for uma URL externa, retorna como está
          return imageData;
        } else {
          // Se for um path relativo, converte para URL pública
          return supabaseStorageService.getPublicUrl(imageData);
        }
      } else {
        // Se for um objeto ImageData
        if (!imageData || (!imageData.url && !imageData.path)) {
          return this.DEFAULT_PLACEHOLDER;
        }
        
        if (imageData.url && imageData.url.startsWith('http')) {
          // Se já for uma URL completa
          if (imageData.url.includes('supabase')) {
            return imageData.url;
          }
          return imageData.url;
        } else if (imageData.path) {
          // Se tiver path, usa o path para gerar URL pública
          return supabaseStorageService.getPublicUrl(imageData.path);
        } else if (imageData.url) {
          // Se tiver URL mas não for HTTP, trata como path
          return supabaseStorageService.getPublicUrl(imageData.url);
        } else {
          // Fallback para placeholder
          return this.DEFAULT_PLACEHOLDER;
        }
      }
    } catch (error) {
      console.warn('Erro ao processar URL da imagem:', error);
      return this.DEFAULT_PLACEHOLDER;
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
   * Processa dados de imagem do banco de dados
   * Lida com diferentes formatos que podem vir do banco
   */
  static processImageData(imageData: any): ImageData {
    try {
      if (!imageData) {
        return {
          url: this.DEFAULT_PLACEHOLDER
        };
      }

      if (typeof imageData === 'string') {
        return {
          url: this.getPublicUrl(imageData)
        };
      }

      if (Array.isArray(imageData) && imageData.length > 0) {
        // Se for um array, pega o primeiro item
        return this.processImageData(imageData[0]);
      }

      if (imageData && typeof imageData === 'object') {
        return {
          url: this.getPublicUrl(imageData.url || imageData.path || imageData),
          path: imageData.path,
          fileName: imageData.fileName || imageData.name
        };
      }

      // Fallback para placeholder
      return {
        url: this.DEFAULT_PLACEHOLDER
      };
    } catch (error) {
      console.warn('Erro ao processar dados da imagem:', error);
      return {
        url: this.DEFAULT_PLACEHOLDER
      };
    }
  }

  /**
   * Processa um array de dados de imagem
   */
  static processImageArray(imagesData: any): ImageData[] {
    try {
      if (!imagesData) return [];

      if (Array.isArray(imagesData)) {
        return imagesData.map(img => this.processImageData(img));
      }

      // Se não for array, trata como uma única imagem
      return [this.processImageData(imagesData)];
    } catch (error) {
      console.warn('Erro ao processar array de imagens:', error);
      return [];
    }
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
   * Gera uma URL de thumbnail se disponível
   */
  static getThumbnailUrl(imageData: string | ImageData, width: number = 300, height: number = 300): string {
    const publicUrl = this.getPublicUrl(imageData);
    
    // Se for do Supabase Storage, podemos adicionar parâmetros de transformação
    if (publicUrl.includes('supabase')) {
      // Adiciona parâmetros para redimensionar a imagem
      return `${publicUrl}?width=${width}&height=${height}&resize=cover`;
    }
    
    return publicUrl;
  }

  /**
   * Verifica se uma URL é um placeholder
   */
  static isPlaceholder(url: string): boolean {
    return url === this.DEFAULT_PLACEHOLDER || url.includes('placeholder') || url.startsWith('data:image/svg+xml');
  }

  /**
   * Obtém uma URL de placeholder personalizada
   */
  static getPlaceholder(width: number = 400, height: number = 400, text?: string): string {
    return placeholderGenerator.generate(width, height, text);
  }

  /**
   * Valida se uma imagem existe e é acessível
   */
  static async validateImageUrl(url: string): Promise<boolean> {
    try {
      if (this.isPlaceholder(url)) {
        return true; // Placeholders sempre "existem"
      }

      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
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

  /**
   * Extrai informações de uma URL de imagem do Supabase
   */
  static extractSupabaseImageInfo(url: string): { bucket?: string; path?: string; fileName?: string } | null {
    try {
      if (!url.includes('supabase')) {
        return null;
      }

      // Padrão típico: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Encontrar o índice onde começa o bucket
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex === -1 || publicIndex >= pathParts.length - 1) {
        return null;
      }

      const bucket = pathParts[publicIndex + 1];
      const filePath = pathParts.slice(publicIndex + 2).join('/');
      const fileName = filePath.split('/').pop();

      return {
        bucket,
        path: filePath,
        fileName
      };
    } catch (error) {
      console.warn('Erro ao extrair informações da URL do Supabase:', error);
      return null;
    }
  }

  /**
   * Converte uma URL antiga (local ou de outro serviço) para o formato do Supabase
   */
  static convertToSupabaseUrl(oldUrl: string, userId: string): string {
    try {
      // Se já for uma URL do Supabase, retorna como está
      if (oldUrl.includes('supabase')) {
        return oldUrl;
      }

      // Se for uma URL local ou relativa, assume que precisa ser migrada
      if (oldUrl.startsWith('/') || !oldUrl.startsWith('http')) {
        // Extrai o nome do arquivo
        const fileName = oldUrl.split('/').pop() || 'image.jpg';
        const filePath = `${userId}/${fileName}`;
        return supabaseStorageService.getPublicUrl(filePath);
      }

      // Para URLs externas, retorna como está (pode ser migrada posteriormente)
      return oldUrl;
    } catch (error) {
      console.warn('Erro ao converter URL para Supabase:', error);
      return this.DEFAULT_PLACEHOLDER;
    }
  }

  /**
   * Gera uma URL de download para uma imagem
   */
  static getDownloadUrl(imageData: string | ImageData): string {
    const publicUrl = this.getPublicUrl(imageData);
    
    // Se for do Supabase, adiciona parâmetro de download
    if (publicUrl.includes('supabase')) {
      const url = new URL(publicUrl);
      url.searchParams.set('download', 'true');
      return url.toString();
    }
    
    return publicUrl;
  }

  /**
   * Otimiza uma URL de imagem para diferentes contextos
   */
  static optimizeImageUrl(
    imageData: string | ImageData, 
    context: 'thumbnail' | 'preview' | 'full' = 'full'
  ): string {
    const publicUrl = this.getPublicUrl(imageData);
    
    if (!publicUrl.includes('supabase')) {
      return publicUrl;
    }

    const url = new URL(publicUrl);
    
    switch (context) {
      case 'thumbnail':
        url.searchParams.set('width', '150');
        url.searchParams.set('height', '150');
        url.searchParams.set('resize', 'cover');
        url.searchParams.set('quality', '80');
        break;
        
      case 'preview':
        url.searchParams.set('width', '600');
        url.searchParams.set('height', '600');
        url.searchParams.set('resize', 'contain');
        url.searchParams.set('quality', '85');
        break;
        
      case 'full':
        // Mantém a imagem original, mas pode adicionar compressão
        url.searchParams.set('quality', '90');
        break;
    }
    
    return url.toString();
  }

  /**
   * Verifica se uma imagem precisa ser migrada para o Supabase
   */
  static needsMigration(url: string): boolean {
    if (!url || this.isPlaceholder(url)) {
      return false;
    }
    
    // Se já for do Supabase, não precisa migrar
    if (url.includes('supabase')) {
      return false;
    }
    
    // URLs locais ou de outros serviços precisam ser migradas
    return url.startsWith('/') || url.startsWith('http');
  }

  /**
   * Gera metadados de uma imagem
   */
  static generateImageMetadata(imageData: string | ImageData): {
    url: string;
    isPlaceholder: boolean;
    isSupabase: boolean;
    needsMigration: boolean;
    optimizedUrls: {
      thumbnail: string;
      preview: string;
      full: string;
    };
  } {
    const url = this.getPublicUrl(imageData);
    
    return {
      url,
      isPlaceholder: this.isPlaceholder(url),
      isSupabase: url.includes('supabase'),
      needsMigration: this.needsMigration(url),
      optimizedUrls: {
        thumbnail: this.optimizeImageUrl(imageData, 'thumbnail'),
        preview: this.optimizeImageUrl(imageData, 'preview'),
        full: this.optimizeImageUrl(imageData, 'full')
      }
    };
  }
}

export const imageUrlService = ImageUrlService;
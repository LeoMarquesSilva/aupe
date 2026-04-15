import { supabase } from './supabaseClient';

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

/**
 * Instagram Graph API image constraints (official docs):
 * - Max image size: 8 MiB on /{ig-user-id}/media (including carousel items)
 * - Oversize error subcode: 2207004
 */
export const INSTAGRAM_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const INSTAGRAM_TARGET_IMAGE_BYTES = Math.floor(7.8 * 1024 * 1024);

export type InstagramOversizeStrategy = 'auto_compress' | 'reject';

export interface InstagramImagePreparationOptions {
  oversizeStrategy?: InstagramOversizeStrategy;
  maxBytes?: number;
  targetBytes?: number;
}

export interface InstagramImagePreparationResult {
  file: File | null;
  originalSize: number;
  finalSize: number;
  wasCompressed: boolean;
  skipped: boolean;
  reason?: string;
}

export class SupabaseStorageService {
  private bucketName = 'post-images';

  /**
   * Faz upload de uma imagem para o Supabase Storage
   */
  async uploadImage(
    file: File,
    userId: string,
    preparationOptions: InstagramImagePreparationOptions = { oversizeStrategy: 'auto_compress' }
  ): Promise<UploadResult> {
    try {
      console.log('🚀 Iniciando upload para Supabase Storage:', file.name);

      const prepared = await this.prepareImageForInstagram(file, preparationOptions);
      if (prepared.skipped || !prepared.file) {
        throw new Error(prepared.reason || 'Nao foi possivel preparar a imagem para o Instagram.');
      }
      const uploadFile = prepared.file;
      
      // Gerar nome único para o arquivo
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log('📂 Caminho do arquivo:', filePath);

      // Fazer upload do arquivo
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw new Error(`Erro ao fazer upload: ${error.message}`);
      }

      console.log('✅ Upload realizado:', data);

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      console.log('🔗 URL pública gerada:', publicUrl);

      return {
        url: publicUrl,
        path: filePath,
        fileName: fileName
      };

    } catch (error) {
      console.error('💥 Erro fatal no upload:', error);
      throw error;
    }
  }

  /**
   * Faz upload de múltiplas imagens
   */
  async uploadMultipleImages(
    files: File[],
    userId: string,
    preparationOptions: InstagramImagePreparationOptions = { oversizeStrategy: 'auto_compress' }
  ): Promise<UploadResult[]> {
    console.log(`📦 Iniciando upload de ${files.length} imagens`);
    
    const results: UploadResult[] = [];
    const errors: Error[] = [];

    // Upload sequencial para evitar sobrecarga
    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`⏳ Processando imagem ${i + 1}/${files.length}`);
        const result = await this.uploadImage(files[i], userId, preparationOptions);
        results.push(result);
        console.log(`✅ Imagem ${i + 1} processada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro na imagem ${i + 1}:`, error);
        errors.push(error as Error);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new Error(`Falha no upload de todas as imagens: ${errors[0].message}`);
    }

    console.log(`🎉 Upload concluído: ${results.length}/${files.length} imagens processadas`);
    return results;
  }

  /**
   * Faz upload de uma imagem a partir de uma URL (data URL ou URL externa)
   */
  async uploadImageFromUrl(
    imageUrl: string,
    userId: string,
    originalFileName?: string,
    preparationOptions: InstagramImagePreparationOptions = { oversizeStrategy: 'auto_compress' }
  ): Promise<UploadResult> {
    try {
      console.log('🔄 Convertendo URL para arquivo:', imageUrl.substring(0, 50) + '...');

      let file: File;

      if (imageUrl.startsWith('data:')) {
        // Converter data URL para File
        file = this.dataUrlToFile(imageUrl, originalFileName || 'image.jpg');
      } else {
        // Baixar imagem de URL externa
        file = await this.downloadImageAsFile(imageUrl, originalFileName || 'image.jpg');
      }

      return await this.uploadImage(file, userId, preparationOptions);
    } catch (error) {
      console.error('💥 Erro ao processar URL:', error);
      throw error;
    }
  }

  /**
   * Prepara uma imagem para os limites de publish do Instagram.
   */
  async prepareImageForInstagram(
    file: File,
    options: InstagramImagePreparationOptions = {}
  ): Promise<InstagramImagePreparationResult> {
    const maxBytes = options.maxBytes ?? INSTAGRAM_MAX_IMAGE_BYTES;
    const targetBytes = options.targetBytes ?? INSTAGRAM_TARGET_IMAGE_BYTES;
    const oversizeStrategy = options.oversizeStrategy ?? 'auto_compress';

    if (!file.type.startsWith('image/')) {
      return {
        file,
        originalSize: file.size,
        finalSize: file.size,
        wasCompressed: false,
        skipped: false,
      };
    }

    if (file.size <= maxBytes) {
      return {
        file,
        originalSize: file.size,
        finalSize: file.size,
        wasCompressed: false,
        skipped: false,
      };
    }

    if (oversizeStrategy === 'reject') {
      return {
        file: null,
        originalSize: file.size,
        finalSize: file.size,
        wasCompressed: false,
        skipped: true,
        reason: `A imagem "${file.name}" excede 8 MiB (erro Instagram 2207004).`,
      };
    }

    const compressed = await this.compressImageToTarget(file, targetBytes, maxBytes);
    if (!compressed) {
      return {
        file: null,
        originalSize: file.size,
        finalSize: file.size,
        wasCompressed: false,
        skipped: true,
        reason: `Nao foi possivel comprimir "${file.name}" para menos de 8 MiB.`,
      };
    }

    if (compressed.size > maxBytes) {
      return {
        file: null,
        originalSize: file.size,
        finalSize: compressed.size,
        wasCompressed: true,
        skipped: true,
        reason: `A imagem "${file.name}" ainda ficou acima de 8 MiB apos compressao.`,
      };
    }

    return {
      file: compressed,
      originalSize: file.size,
      finalSize: compressed.size,
      wasCompressed: true,
      skipped: false,
    };
  }

  private async compressImageToTarget(file: File, targetBytes: number, hardMaxBytes: number): Promise<File | null> {
    const dimensions = [2160, 1920, 1600, 1440, 1280];
    const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
    const image = await this.loadImageElement(file);
    let bestAttempt: File | null = null;

    for (const maxWidth of dimensions) {
      for (const quality of qualities) {
        const candidate = await this.renderJpegFile(image, maxWidth, quality, baseName);
        if (!candidate) continue;

        if (!bestAttempt || candidate.size < bestAttempt.size) {
          bestAttempt = candidate;
        }

        if (candidate.size <= targetBytes) {
          return candidate;
        }
      }
    }

    if (bestAttempt && bestAttempt.size <= hardMaxBytes) {
      return bestAttempt;
    }

    return null;
  }

  private async loadImageElement(file: File): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Falha ao carregar imagem "${file.name}" para compressao.`));
        image.src = objectUrl;
      });

      return img;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async renderJpegFile(
    image: HTMLImageElement,
    maxWidth: number,
    quality: number,
    baseName: string
  ): Promise<File | null> {
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await this.canvasToBlob(canvas, quality);
    if (!blob) return null;

    return new File([blob], `${baseName}-optimized.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  private async canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * Converte data URL para File
   */
  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], fileName, { type: mime });
  }

  /**
   * Baixa imagem de URL externa e converte para File
   */
  private async downloadImageAsFile(url: string, fileName: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao baixar imagem: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  }

  /**
   * Deleta uma imagem do storage
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      console.log('🗑️ Deletando imagem:', filePath);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erro ao deletar:', error);
        throw new Error(`Erro ao deletar imagem: ${error.message}`);
      }

      console.log('✅ Imagem deletada com sucesso');
    } catch (error) {
      console.error('💥 Erro ao deletar imagem:', error);
      throw error;
    }
  }

  /**
   * Deleta múltiplas imagens
   */
  async deleteMultipleImages(filePaths: string[]): Promise<void> {
    try {
      console.log(`🗑️ Deletando ${filePaths.length} imagens`);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (error) {
        console.error('❌ Erro ao deletar imagens:', error);
        throw new Error(`Erro ao deletar imagens: ${error.message}`);
      }

      console.log('✅ Imagens deletadas com sucesso');
    } catch (error) {
      console.error('💥 Erro ao deletar imagens:', error);
      throw error;
    }
  }

  /**
   * Lista imagens de um usuário
   */
  async listUserImages(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(userId, {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('❌ Erro ao listar imagens:', error);
        throw new Error(`Erro ao listar imagens: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('💥 Erro ao listar imagens:', error);
      throw error;
    }
  }

  /**
   * Obter URL pública de uma imagem
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Verificar se uma imagem existe
   */
  async imageExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(filePath.split('/')[0], {
          search: filePath.split('/')[1]
        });

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter informações de uma imagem
   */
  async getImageInfo(filePath: string): Promise<any> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(filePath.split('/')[0], {
          search: filePath.split('/')[1]
        });

      if (error || !data || data.length === 0) {
        throw new Error('Imagem não encontrada');
      }

      return data[0];
    } catch (error) {
      console.error('💥 Erro ao obter info da imagem:', error);
      throw error;
    }
  }
}

// Instância singleton
export const supabaseStorageService = new SupabaseStorageService();
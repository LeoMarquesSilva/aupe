import { supabase } from './supabaseClient';

export interface VideoUploadResult {
  url: string;
  publicUrl: string;
  path: string;
  fileName: string;
  size: number;
  duration?: number;
  thumbnail?: string;
}

export interface VideoProcessingOptions {
  maxSize?: number; // em MB
  maxDuration?: number; // em segundos
  quality?: 'low' | 'medium' | 'high';
  generateThumbnail?: boolean;
}

export class SupabaseVideoStorageService {
  // ✅ Usar o bucket existente
  private bucketName = 'post-images';
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (2048MB)
  private readonly ALLOWED_TYPES = [
    'video/mp4', 
    'video/mov', 
    'video/avi', 
    'video/quicktime',
    'video/webm'
  ];

  /**
   * Faz upload de um vídeo para o Supabase Storage
   */
  async uploadVideo(
    file: File, 
    userId: string,
    options: VideoProcessingOptions = {}
  ): Promise<VideoUploadResult> {
    try {
      console.log('🎬 Iniciando upload de vídeo para Supabase Storage:', file.name);
      
      // ✅ REMOVIDO: Não precisa verificar bucket, já existe
      
      // Validações básicas
      this.validateVideoFile(file, options);

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      // ✅ Pasta 'videos' dentro do bucket existente
      const filePath = `${userId}/videos/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

      console.log('📂 Caminho do arquivo:', filePath);

      // Obter informações do vídeo antes do upload
      const videoInfo = await this.getVideoInfo(file);
      console.log('📊 Informações do vídeo:', videoInfo);

      // Fazer upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw new Error(`Falha no upload: ${error.message}`);
      }

      console.log('✅ Upload realizado:', data);

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Não foi possível obter URL pública do vídeo');
      }

      const result: VideoUploadResult = {
        url: publicUrlData.publicUrl,
        publicUrl: publicUrlData.publicUrl,
        path: filePath,
        fileName: fileName,
        size: file.size,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail
      };

      console.log('🎯 Resultado do upload:', result);
      return result;

    } catch (error) {
      console.error('💥 Erro no upload de vídeo:', error);
      throw error;
    }
  }

  /**
   * Faz upload de múltiplos vídeos
   */
  async uploadMultipleVideos(
    files: File[], 
    userId: string,
    options: VideoProcessingOptions = {}
  ): Promise<VideoUploadResult[]> {
    console.log(`📦 Iniciando upload de ${files.length} vídeos`);
    
    const results: VideoUploadResult[] = [];
    const errors: Error[] = [];
    
    // Upload sequencial para evitar sobrecarga
    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`📹 Processando vídeo ${i + 1}/${files.length}: ${files[i].name}`);
        const result = await this.uploadVideo(files[i], userId, options);
        results.push(result);
        console.log(`✅ Vídeo ${i + 1} processado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro no vídeo ${i + 1}:`, error);
        errors.push(error as Error);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new Error(`Falha no upload de todos os vídeos: ${errors[0].message}`);
    }

    console.log(`🎉 Upload concluído: ${results.length}/${files.length} vídeos processados`);
    return results;
  }

  /**
   * Valida se o arquivo de vídeo é válido
   */
  private validateVideoFile(file: File, options: VideoProcessingOptions = {}): void {
    // Verificar tipo de arquivo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Tipo de arquivo não suportado. Use: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    // Verificar tamanho
    const maxSize = options.maxSize ? options.maxSize * 1024 * 1024 : this.MAX_FILE_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      const maxSizeGB = maxSize / (1024 * 1024 * 1024);
      
      // Mostrar em GB se for maior que 1GB, senão em MB
      const displaySize = maxSizeGB >= 1 ? `${maxSizeGB.toFixed(1)}GB` : `${maxSizeMB}MB`;
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${displaySize}`);
    }

    // Verificar se é realmente um arquivo
    if (file.size === 0) {
      throw new Error('Arquivo vazio ou corrompido');
    }
  }

  /**
   * Obtém informações do vídeo (duração, thumbnail, etc.)
   */
  private async getVideoInfo(file: File): Promise<{ duration?: number; thumbnail?: string }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        
        // Gerar thumbnail
        if (ctx && duration > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Capturar frame no meio do vídeo
          video.currentTime = duration / 2;
          
          video.onseeked = () => {
            try {
              ctx.drawImage(video, 0, 0);
              const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
              
              resolve({
                duration: Math.round(duration),
                thumbnail
              });
            } catch (error) {
              console.warn('Erro ao gerar thumbnail:', error);
              resolve({
                duration: Math.round(duration)
              });
            }
          };
        } else {
          resolve({
            duration: Math.round(duration)
          });
        }
      };

      video.onerror = (error) => {
        console.warn('Não foi possível obter informações do vídeo:', error);
        resolve({});
      };

      // Limpar URL após uso
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      
      // Cleanup após 30 segundos para evitar memory leaks
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 30000);
    });
  }

  /**
   * Remove um vídeo do storage
   */
  async deleteVideo(filePath: string): Promise<void> {
    try {
      console.log('🗑️ Removendo vídeo:', filePath);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erro ao remover vídeo:', error);
        throw new Error(`Falha ao remover vídeo: ${error.message}`);
      }

      console.log('✅ Vídeo removido com sucesso');
    } catch (error) {
      console.error('💥 Erro ao remover vídeo:', error);
      throw error;
    }
  }

  /**
   * Remove múltiplos vídeos do storage
   */
  async deleteMultipleVideos(filePaths: string[]): Promise<void> {
    try {
      console.log(`🗑️ Removendo ${filePaths.length} vídeos`);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (error) {
        console.error('❌ Erro ao remover vídeos:', error);
        throw new Error(`Falha ao remover vídeos: ${error.message}`);
      }

      console.log('✅ Vídeos removidos com sucesso');
    } catch (error) {
      console.error('💥 Erro ao remover vídeos:', error);
      throw error;
    }
  }

  /**
   * Verifica se um vídeo existe no storage
   */
  async videoExists(filePath: string): Promise<boolean> {
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folderPath);

      if (error) {
        return false;
      }

      return data?.some(file => file.name === fileName) || false;
    } catch (error) {
      console.error('Erro ao verificar existência do vídeo:', error);
      return false;
    }
  }

  /**
   * Obtém URL assinada para vídeo privado (se necessário)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error);
      throw error;
    }
  }

  /**
   * Lista vídeos de um usuário
   */
  async listUserVideos(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(`${userId}/videos`, {
          limit: 100,
          offset: 0
        });

      if (error) {
        throw new Error(`Erro ao listar vídeos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao listar vídeos:', error);
      throw error;
    }
  }

  /**
   * Obtém URL pública de um vídeo
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Obtém informações de um vídeo no storage (metadados do arquivo)
   */
  async getStorageVideoInfo(filePath: string): Promise<any> {
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folderPath, {
          search: fileName
        });

      if (error || !data || data.length === 0) {
        throw new Error('Vídeo não encontrado');
      }

      return data[0];
    } catch (error) {
      console.error('💥 Erro ao obter info do vídeo:', error);
      throw error;
    }
  }

  /**
   * Comprime um vídeo (placeholder para implementação futura)
   */
  async compressVideo(file: File, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<File> {
    // Por enquanto, retorna o arquivo original
    // Implementação futura: usar WebCodecs API ou similar
    console.log(`🔄 Compressão de vídeo (${quality}) - funcionalidade futura`);
    return file;
  }

  /**
   * Otimiza vídeo para Instagram/Reels
   */
  async optimizeForInstagram(file: File): Promise<File> {
    // Por enquanto retorna o arquivo original
    // Implementação futura: otimizações específicas para Instagram
    console.log('🎬 Otimização para Instagram - funcionalidade futura');
    return file;
  }
}

// Instância singleton
export const supabaseVideoStorageService = new SupabaseVideoStorageService();

// Função auxiliar para validar vídeos de Reels (agora usando o serviço).
// API aceita MOV e MP4; para maior confiabilidade recomenda-se MP4 (H.264 + AAC).
export const validateReelsVideo = (file: File): { valid: boolean; error?: string } => {
  try {
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB para Reels

    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: 'Vídeo muito grande para Reels. Máximo: 2GB'
      };
    }

    const allowedTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Formato não suportado. Use MP4, MOV ou WEBM'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Erro ao validar vídeo'
    };
  }
};
import { supabase } from './supabaseClient';

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

export class SupabaseStorageService {
  private bucketName = 'post-images';

  /**
   * Faz upload de uma imagem para o Supabase Storage
   */
  async uploadImage(file: File, userId: string): Promise<UploadResult> {
    try {
      console.log('🚀 Iniciando upload para Supabase Storage:', file.name);
      
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log('📂 Caminho do arquivo:', filePath);

      // Fazer upload do arquivo
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
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
  async uploadMultipleImages(files: File[], userId: string): Promise<UploadResult[]> {
    console.log(`📦 Iniciando upload de ${files.length} imagens`);
    
    const results: UploadResult[] = [];
    const errors: Error[] = [];

    // Upload sequencial para evitar sobrecarga
    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`⏳ Processando imagem ${i + 1}/${files.length}`);
        const result = await this.uploadImage(files[i], userId);
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
  async uploadImageFromUrl(imageUrl: string, userId: string, originalFileName?: string): Promise<UploadResult> {
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

      return await this.uploadImage(file, userId);
    } catch (error) {
      console.error('💥 Erro ao processar URL:', error);
      throw error;
    }
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
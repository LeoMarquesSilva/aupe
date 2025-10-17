import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { Client, PostImage } from '../types';
import { uploadImageToImgBB } from './imgbbService';

export interface PostData {
  clientId: string;
  caption: string;
  images: string[];
  scheduledDate: string;
  immediate?: boolean;
  credentials?: {
    appId: string;
    accessToken: string;
    username: string;
  };
}

// Função para fazer upload de todas as imagens para o ImgBB
export const uploadImagesToImgBB = async (images: PostImage[]): Promise<string[]> => {
  console.log(`Iniciando upload de ${images.length} imagens para ImgBB`);
  
  const results: string[] = [];
  const errors: Error[] = [];
  
  // Processar as imagens uma por uma (sequencialmente) para evitar sobrecarga
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    try {
      console.log(`Processando imagem ${i + 1}/${images.length} (ID: ${image.id})`);
      
      // Se a imagem já tiver uma URL do ImgBB, adicioná-la diretamente
      if (typeof image.url === 'string' && (
        image.url.startsWith('https://i.ibb.co/') || 
        image.url.startsWith('https://image.ibb.co/')
      )) {
        console.log(`Imagem ${i + 1} já é uma URL do ImgBB:`, image.url);
        results.push(image.url);
        continue;
      }
      
      // Tentar fazer upload da imagem
      let imgbbUrl: string;
      
      // Preferir o arquivo original, se disponível
      if (image.file) {
        console.log(`Enviando arquivo original da imagem ${i + 1}`);
        imgbbUrl = await uploadImageToImgBB(image.file);
      } else {
        // Caso contrário, usar a URL (que pode ser uma data URL)
        console.log(`Enviando URL da imagem ${i + 1}`);
        imgbbUrl = await uploadImageToImgBB(image.url);
      }
      
      console.log(`Upload da imagem ${i + 1} concluído:`, imgbbUrl);
      results.push(imgbbUrl);
    } catch (error) {
      console.error(`Erro ao processar imagem ${i + 1} (ID: ${image.id}):`, error);
      errors.push(error as Error);
    }
  }
  
  // Se não conseguimos fazer upload de nenhuma imagem, lançar erro
  if (results.length === 0 && errors.length > 0) {
    throw new Error(`Falha ao fazer upload das imagens: ${errors[0].message}`);
  }
  
  // Retornar as URLs das imagens que conseguimos fazer upload
  console.log(`Upload concluído. ${results.length}/${images.length} imagens processadas com sucesso`);
  return results;
};

export const scheduleInstagramPost = async (postData: PostData, client: Client): Promise<any> => {
  try {
    // Adicionar as credenciais do cliente aos dados da postagem
    const dataToSend = {
      ...postData,
      credentials: {
        appId: client.appId,
        accessToken: client.accessToken,
        username: client.instagram
      }
    };

    console.log('Enviando dados para o webhook:', {
      ...dataToSend,
      credentials: { ...dataToSend.credentials, accessToken: '***redacted***' } // Não logar o token por segurança
    });

    const response = await axios.post(API_CONFIG.webhookUrl, dataToSend);
    return response.data;
  } catch (error) {
    console.error('Erro ao agendar postagem:', error);
    throw error;
  }
};
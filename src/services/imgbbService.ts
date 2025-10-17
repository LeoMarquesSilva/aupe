import axios from 'axios';
import { API_CONFIG } from '../config/api';

export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    delete_url: string;
  };
  success: boolean;
  status: number;
}

/**
 * Converte uma Data URL para um Blob
 */
const dataURLtoBlob = (dataURL: string): Blob => {
  try {
    const arr = dataURL.split(',');
    if (arr.length !== 2) {
      throw new Error('Data URL inválida');
    }
    
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      throw new Error('Tipo MIME não encontrado na Data URL');
    }
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Erro ao converter Data URL para Blob:', error);
    throw new Error('Falha ao converter imagem');
  }
};

/**
 * Faz upload de uma imagem para o ImgBB e retorna a URL da imagem
 */
export const uploadImageToImgBB = async (image: File | string): Promise<string> => {
  // Se já for uma URL do ImgBB, retornar diretamente
  if (typeof image === 'string' && (
    image.startsWith('https://i.ibb.co/') || 
    image.startsWith('https://image.ibb.co/')
  )) {
    console.log('URL do ImgBB já existente, retornando:', image);
    return image;
  }
  
  try {
    // Preparar o FormData para envio
    const formData = new FormData();
    
    // Adicionar a chave da API
    formData.append('key', API_CONFIG.imgbb.apiKey);
    
    // Processar a imagem de acordo com seu tipo
    if (typeof image === 'string') {
      // Se for uma data URL
      if (image.startsWith('data:image/')) {
        console.log('Convertendo data URL para blob');
        
        // Extrair a parte base64 da data URL
        const base64Image = image.split(',')[1];
        
        // Enviar diretamente como base64
        formData.append('image', base64Image);
      } else {
        console.error('Formato de URL não suportado:', image.substring(0, 20) + '...');
        throw new Error('Formato de imagem não suportado');
      }
    } else {
      // Se for um File
      console.log('Enviando arquivo:', image.name, 'tamanho:', image.size);
      formData.append('image', image);
    }
    
    console.log('Enviando imagem para ImgBB...');
    
    // Fazer a requisição para o ImgBB
    const response = await axios.post<ImgBBResponse>(
      API_CONFIG.imgbb.apiUrl,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    // Verificar resposta
    if (response.data && response.data.success) {
      console.log('Upload bem-sucedido! URL:', response.data.data.display_url);
      return response.data.data.display_url;
    } else {
      console.error('Resposta do ImgBB indica falha:', response.data);
      throw new Error('Falha no upload da imagem para ImgBB');
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload para ImgBB:', error);
    
    // Verificar se temos detalhes da resposta
    if (error.response) {
      console.error('Detalhes da resposta de erro:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw new Error(`Falha no upload da imagem: ${error.message}`);
  }
};
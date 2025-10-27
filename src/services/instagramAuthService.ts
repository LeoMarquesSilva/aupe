import axios from 'axios';

// Interface para os dados de retorno da autenticação
export interface InstagramAuthData {
  instagramAccountId: string;
  accessToken: string;
  username: string;
  profilePicture: string;
  tokenExpiry: Date;
  pageId: string;
  pageName: string;
}

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
// Usando a URL validada no Facebook Developer
const META_REDIRECT_URI = 'https://aupe.vercel.app/callback';

// Configuração da URL base da API
// Ajuste esta URL para corresponder ao seu ambiente
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aupe.vercel.app';

// Função para gerar a URL de autorização
export const getAuthorizationUrl = (): string => {
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement',
    'pages_show_list',
    'business_management'
  ].join(',');
  
  const state = generateRandomState();
  
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${state}`;
};

// Gera state aleatório para proteção CSRF
function generateRandomState(): string {
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('oauth_state', state);
  return state;
}

// Valida o state retornado
export function validateState(returnedState: string): boolean {
  const savedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return savedState === returnedState;
}

// Função para buscar páginas do Facebook vinculadas à conta
export const getFacebookPages = async (accessToken: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/instagram/pages`, {
      params: { accessToken }
    });
    return response.data.pages || [];
  } catch (error: any) {
    console.error('Erro ao buscar páginas do Facebook:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Falha ao buscar páginas do Facebook');
  }
};

// Função para buscar dados da conta do Instagram
export const getInstagramAccountData = async (instagramAccountId: string, accessToken: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/instagram/account`, {
      params: { instagramAccountId, accessToken }
    });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar dados da conta do Instagram:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Falha ao buscar dados da conta do Instagram');
  }
};

// Função que completa o fluxo de autenticação chamando nossa API segura
export const completeInstagramAuth = async (code: string): Promise<InstagramAuthData> => {
  try {
    console.log('Enviando código para o servidor:', code);
    console.log('URL de redirecionamento:', META_REDIRECT_URI);
    
    // Usando a implementação direta no cliente como fallback
    // Isso permite que a autenticação funcione mesmo que o servidor não esteja configurado corretamente
    try {
      // Tentar usar a API do servidor primeiro
      const response = await axios.post(`${API_BASE_URL}/instagram/auth`, { 
        code,
        redirectUri: META_REDIRECT_URI
      });
      
      console.log('Resposta do servidor:', response.data);
      
      // Converter a string de data para um objeto Date
      const data = response.data;
      data.tokenExpiry = new Date(data.tokenExpiry);
      
      return data;
    } catch (serverError) {
      console.error('Erro ao chamar API do servidor:', serverError);
      console.log('Tentando processar autenticação diretamente no cliente...');
      
      // Implementação direta no cliente como fallback
      // 1. Trocar o código por um token de acesso de curta duração
      const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: META_APP_ID,
          client_secret: '8a664b53de209acea8e0efb5d554e873', // Não é ideal expor o segredo no cliente
          redirect_uri: META_REDIRECT_URI,
          code
        }
      });
      
      const shortLivedToken = tokenResponse.data.access_token;
      console.log('Token de curta duração obtido');
      
      // 2. Converter para token de longa duração (60 dias)
      const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: META_APP_ID,
          client_secret: '8a664b53de209acea8e0efb5d554e873',
          fb_exchange_token: shortLivedToken
        }
      });
      
      const accessToken = longLivedTokenResponse.data.access_token;
      const expiresIn = longLivedTokenResponse.data.expires_in;
      console.log('Token de longa duração obtido');
      
      // 3. Buscar as páginas do Facebook vinculadas
      const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: {
          access_token: accessToken,
          fields: 'instagram_business_account,name,id,access_token'
        }
      });
      
      const pages = pagesResponse.data.data || [];
      console.log('Páginas do Facebook obtidas:', pages.length);
      
      if (pages.length === 0) {
        throw new Error('Nenhuma página do Facebook encontrada. Você precisa ter uma página do Facebook vinculada à sua conta.');
      }
      
      // Encontrar a primeira página com uma conta do Instagram vinculada
      const pageWithInstagram = pages.find(page => page.instagram_business_account);
      
      if (!pageWithInstagram) {
        throw new Error('Nenhuma conta do Instagram Business encontrada. Você precisa vincular uma conta do Instagram à sua página do Facebook.');
      }
      
      console.log('Página com Instagram encontrada:', pageWithInstagram.name);
      
      // 4. Buscar dados da conta do Instagram
      const instagramAccountId = pageWithInstagram.instagram_business_account.id;
      const instagramResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
        params: {
          access_token: pageWithInstagram.access_token,
          fields: 'username,profile_picture_url,followers_count,media_count'
        }
      });
      
      const instagramData = instagramResponse.data;
      console.log('Dados da conta do Instagram obtidos:', instagramData.username);
      
      // Calcular data de expiração do token
      const tokenExpiry = new Date();
      tokenExpiry.setFullYear(tokenExpiry.getFullYear() + 1); // Definir para 1 ano no futuro
      
      return {
        instagramAccountId,
        accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
        username: instagramData.username,
        profilePicture: instagramData.profile_picture_url,
        tokenExpiry,
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name
      };
    }
  } catch (error: any) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    console.error('Detalhes da resposta:', error.response?.data);
    throw error;
  }
};

// Função para verificar se um token ainda é válido
export const verifyToken = async (accessToken: string): Promise<boolean> => {
  try {
    try {
      // Tentar usar a API do servidor primeiro
      const response = await axios.post(`${API_BASE_URL}/instagram/verify-token`, { accessToken });
      return response.data.isValid;
    } catch (serverError) {
      console.error('Erro ao chamar API do servidor para verificar token:', serverError);
      console.log('Tentando verificar token diretamente...');
      
      // Verificação direta como fallback
      const response = await axios.get('https://graph.facebook.com/v21.0/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name'
        }
      });
      
      // Se chegou aqui, o token é válido
      return true;
    }
  } catch (error: any) {
    console.error('Erro ao verificar token:', error);
    return false;
  }
};
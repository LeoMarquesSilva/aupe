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
const META_REDIRECT_URI = 'https://aupe.vercel.app/auth/callback';

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
    const response = await axios.get('/api/instagram/pages', {
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
    const response = await axios.get('/api/instagram/account', {
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
    const response = await axios.post('/api/instagram/auth', { code });
    
    // Converter a string de data para um objeto Date
    const data = response.data;
    data.tokenExpiry = new Date(data.tokenExpiry);
    
    return data;
  } catch (error: any) {
    console.error('Erro no fluxo de autenticação do Instagram:', error.response?.data || error);
    throw new Error(
      error.response?.data?.message || 
      'Falha na autenticação do Instagram. Por favor, tente novamente.'
    );
  }
};

// Função para verificar se um token ainda é válido
export const verifyToken = async (accessToken: string): Promise<boolean> => {
  try {
    const response = await axios.post('/api/instagram/verify-token', { accessToken });
    return response.data.isValid;
  } catch (error: any) {
    console.error('Erro ao verificar token:', error);
    return false;
  }
};
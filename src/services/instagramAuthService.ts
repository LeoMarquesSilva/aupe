import axios from 'axios';

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
const META_REDIRECT_URI = 'https://aupe.vercel.app/auth/callback';

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

// Função para gerar a URL de autorização
export const getAuthorizationUrl = (): string => {
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement',
    'pages_show_list'
  ].join(',');

  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${scopes}&response_type=code`;
};

// Função para trocar o código por um token de acesso de curta duração
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  try {
    const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: META_REDIRECT_URI,
        code
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao trocar código por token:', error);
    throw new Error('Falha ao obter token de acesso');
  }
};

// Função para converter token de curta duração para longa duração (60 dias)
export const getLongLivedToken = async (shortLivedToken: string): Promise<{ accessToken: string, expiresIn: number }> => {
  try {
    const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('Erro ao obter token de longa duração:', error);
    throw new Error('Falha ao obter token de longa duração');
  }
};

// Função para buscar páginas do Facebook vinculadas à conta
export const getFacebookPages = async (accessToken: string): Promise<any[]> => {
  try {
    const response = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'instagram_business_account,name,id,access_token'
      }
    });

    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar páginas do Facebook:', error);
    throw new Error('Falha ao buscar páginas do Facebook');
  }
};

// Função para buscar dados da conta do Instagram
export const getInstagramAccountData = async (instagramAccountId: string, accessToken: string): Promise<any> => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
      params: {
        access_token: accessToken,
        fields: 'username,profile_picture_url'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dados da conta do Instagram:', error);
    throw new Error('Falha ao buscar dados da conta do Instagram');
  }
};

// Função principal que realiza todo o fluxo de autenticação
export const completeInstagramAuth = async (code: string): Promise<InstagramAuthData> => {
  try {
    // 1. Trocar o código por um token de acesso de curta duração
    const shortLivedToken = await exchangeCodeForToken(code);
    
    // 2. Converter para token de longa duração (60 dias)
    const { accessToken, expiresIn } = await getLongLivedToken(shortLivedToken);
    
    // 3. Buscar as páginas do Facebook vinculadas
    const pages = await getFacebookPages(accessToken);
    
    if (pages.length === 0) {
      throw new Error('Nenhuma página do Facebook encontrada. Você precisa ter uma página do Facebook vinculada à sua conta.');
    }
    
    // Encontrar a primeira página com uma conta do Instagram vinculada
    const pageWithInstagram = pages.find(page => page.instagram_business_account);
    
    if (!pageWithInstagram) {
      throw new Error('Nenhuma conta do Instagram Business encontrada. Você precisa vincular uma conta do Instagram à sua página do Facebook.');
    }
    
    // 4. Buscar dados da conta do Instagram
    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const instagramData = await getInstagramAccountData(instagramAccountId, accessToken);
    
    // Calcular data de expiração do token
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
    
    // Retornar todos os dados necessários
    return {
      instagramAccountId,
      accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
      username: instagramData.username,
      profilePicture: instagramData.profile_picture_url,
      tokenExpiry,
      pageId: pageWithInstagram.id,
      pageName: pageWithInstagram.name
    };
  } catch (error) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    throw error;
  }
};

// Função para verificar se um token ainda é válido
export const verifyToken = async (accessToken: string): Promise<boolean> => {
  try {
    const response = await axios.get(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: `${META_APP_ID}|${META_APP_SECRET}`
      }
    });
    
    return response.data.data.is_valid;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return false;
  }
};
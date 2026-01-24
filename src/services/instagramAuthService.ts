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

// Interface para representar uma conta do Instagram disponível
export interface AvailableInstagramAccount {
  instagramAccountId: string;
  username: string;
  profilePicture: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  followersCount?: number;
  mediaCount?: number;
}

// Interface para uma página do Facebook retornada pela API
interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

// Interface para dados da conta do Instagram retornados pela API
interface InstagramAccountData {
  id: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
}

// Interface para resposta da API de páginas do Facebook
interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
const META_REDIRECT_URI = 'https://aupe.vercel.app/callback';

// Configuração da URL base da API
const API_BASE_URL = window.location.origin;

// Função para gerar a URL de autorização COM state para passar o clientId
export const getAuthorizationUrl = (clientId?: string): string => {
  const scopes = [
    'instagram_basic',
    'instagram_manage_insights', // ✅ NECESSÁRIO para acessar insights (impressões, reach, etc.)
    'instagram_content_publish',
    'pages_read_engagement',
    'pages_show_list',
    'business_management'
  ].join(',');
  
  // Construir URL base
  let url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${scopes}&response_type=code`;
  
  // Adicionar state se clientId for fornecido
  if (clientId) {
    url += `&state=${encodeURIComponent(clientId)}`;
    console.log(`🔗 URL de autorização gerada com clientId: ${clientId}`);
  } else {
    console.log('🔗 URL de autorização gerada sem clientId');
  }
  
  return url;
};

// Função de validação simplificada (sempre retorna true agora)
export function validateState(returnedState: string): boolean {
  // Como removemos o state da URL de autorização, sempre validamos como true
  // O código de autorização do Facebook já é uma validação suficiente
  console.log('Validação de state desabilitada - usando apenas código de autorização');
  return true;
}

// Função para buscar todas as contas do Instagram disponíveis
export const getAvailableInstagramAccounts = async (code: string): Promise<AvailableInstagramAccount[]> => {
  try {
    console.log('Buscando contas do Instagram disponíveis...');
    
    // 1. Trocar o código por um token de acesso de curta duração
    console.log('Trocando código por token de acesso...');
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: '8a664b53de209acea8e0efb5d554e873',
        redirect_uri: META_REDIRECT_URI,
        code
      }
    });
    
    const shortLivedToken = tokenResponse.data.access_token;
    console.log('✅ Token de curta duração obtido');
    
    // 2. Converter para token de longa duração (60 dias)
    console.log('Convertendo para token de longa duração...');
    const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: '8a664b53de209acea8e0efb5d554e873',
        fb_exchange_token: shortLivedToken
      }
    });
    
    const accessToken = longLivedTokenResponse.data.access_token;
    console.log('✅ Token de longa duração obtido');
    
    // 3. Buscar todas as páginas do Facebook vinculadas
    console.log('Buscando páginas do Facebook...');
    const pagesResponse = await axios.get<FacebookPagesResponse>('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'instagram_business_account,name,id,access_token'
      }
    });
    
    const pages: FacebookPage[] = pagesResponse.data.data || [];
    console.log(`✅ ${pages.length} páginas do Facebook encontradas`);
    
    if (pages.length === 0) {
      throw new Error('Nenhuma página do Facebook encontrada. Você precisa ter uma página do Facebook vinculada à sua conta.');
    }
    
    // 4. Filtrar páginas que têm contas do Instagram vinculadas
    const pagesWithInstagram: FacebookPage[] = pages.filter((page: FacebookPage) => 
      page.instagram_business_account && page.instagram_business_account.id
    );
    
    console.log(`✅ ${pagesWithInstagram.length} páginas com Instagram vinculado`);
    
    if (pagesWithInstagram.length === 0) {
      throw new Error('Nenhuma conta do Instagram Business encontrada. Você precisa vincular uma conta do Instagram às suas páginas do Facebook.');
    }
    
    // 5. Buscar dados detalhados de cada conta do Instagram
    console.log('Carregando dados das contas do Instagram...');
    const availableAccounts: AvailableInstagramAccount[] = [];
    
    for (const page of pagesWithInstagram) {
      try {
        if (!page.instagram_business_account?.id) {
          console.warn(`⚠️ Página ${page.name} não tem ID da conta do Instagram`);
          continue;
        }
        
        const instagramAccountId = page.instagram_business_account.id;
        console.log(`Carregando dados da conta Instagram para página: ${page.name}`);
        
        // Buscar dados da conta do Instagram
        const instagramResponse = await axios.get<InstagramAccountData>(
          `https://graph.facebook.com/v21.0/${instagramAccountId}`,
          {
            params: {
              access_token: page.access_token,
              fields: 'username,profile_picture_url,followers_count,media_count'
            }
          }
        );
        
        const instagramData = instagramResponse.data;
        
        availableAccounts.push({
          instagramAccountId,
          username: instagramData.username,
          profilePicture: instagramData.profile_picture_url,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          followersCount: instagramData.followers_count,
          mediaCount: instagramData.media_count
        });
        
        console.log(`✅ Conta adicionada: @${instagramData.username} (${page.name})`);
      } catch (error: any) {
        console.error(`❌ Erro ao buscar dados da conta do Instagram para a página ${page.name}:`, error.response?.data || error.message);
        // Continuar com as outras contas mesmo se uma falhar
      }
    }
    
    if (availableAccounts.length === 0) {
      throw new Error('Não foi possível carregar os dados de nenhuma conta do Instagram. Verifique se suas contas estão configuradas corretamente no Facebook Business.');
    }
    
    console.log(`🎉 Total de contas do Instagram disponíveis: ${availableAccounts.length}`);
    return availableAccounts;
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar contas do Instagram disponíveis:', error);
    
    // Melhor tratamento de erros específicos
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      throw new Error(`Erro do Facebook: ${fbError.message} (Código: ${fbError.code})`);
    }
    
    throw error;
  }
};

// Função para conectar uma conta específica do Instagram
export const connectSpecificInstagramAccount = async (account: AvailableInstagramAccount): Promise<InstagramAuthData> => {
  try {
    console.log(`🔗 Conectando conta do Instagram: @${account.username}`);
    
    // Calcular data de expiração do token (1 ano no futuro)
    const tokenExpiry = new Date();
    tokenExpiry.setFullYear(tokenExpiry.getFullYear() + 1);
    
    const authData: InstagramAuthData = {
      instagramAccountId: account.instagramAccountId,
      accessToken: account.pageAccessToken,
      username: account.username,
      profilePicture: account.profilePicture,
      tokenExpiry,
      pageId: account.pageId,
      pageName: account.pageName
    };
    
    console.log('✅ Conta conectada com sucesso!');
    return authData;
    
  } catch (error: any) {
    console.error('❌ Erro ao conectar conta específica do Instagram:', error);
    throw error;
  }
};

// Função legada para manter compatibilidade (agora conecta automaticamente a primeira conta)
export const completeInstagramAuth = async (code: string): Promise<InstagramAuthData> => {
  try {
    console.log('🔄 Usando fluxo de autenticação legado - conectando primeira conta disponível');
    
    const availableAccounts = await getAvailableInstagramAccounts(code);
    
    if (availableAccounts.length === 0) {
      throw new Error('Nenhuma conta do Instagram disponível para conectar.');
    }
    
    // Conectar automaticamente a primeira conta disponível
    return await connectSpecificInstagramAccount(availableAccounts[0]);
    
  } catch (error: any) {
    console.error('❌ Erro no fluxo de autenticação legado do Instagram:', error);
    throw error;
  }
};

// Função para buscar páginas do Facebook vinculadas à conta
export const getFacebookPages = async (accessToken: string): Promise<FacebookPage[]> => {
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
export const getInstagramAccountData = async (instagramAccountId: string, accessToken: string): Promise<InstagramAccountData> => {
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
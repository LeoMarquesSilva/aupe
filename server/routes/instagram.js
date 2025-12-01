const express = require('express');
const axios = require('axios');
const router = express.Router();

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
const META_REDIRECT_URI = 'https://aupedigital.com.br/callback';

// Endpoint para trocar o código por tokens e completar o fluxo de autenticação
router.post('/auth', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização não fornecido' });
    }
    
    console.log('Código recebido:', code);
    console.log('URL de redirecionamento:', redirectUri || META_REDIRECT_URI);
    
    // Usar a URL de redirecionamento fornecida pelo cliente ou a padrão
    const finalRedirectUri = redirectUri || META_REDIRECT_URI;
    
    try {
      // 1. Trocar o código por um token de acesso de curta duração
      const shortLivedToken = await exchangeCodeForToken(code, finalRedirectUri);
      console.log('Token de curta duração obtido');
      
      // 2. Converter para token de longa duração (60 dias)
      const { accessToken, expiresIn } = await getLongLivedToken(shortLivedToken);
      console.log('Token de longa duração obtido, expira em:', expiresIn, 'segundos');
      
      // 3. Buscar as páginas do Facebook vinculadas
      const pages = await getFacebookPages(accessToken);
      console.log('Páginas do Facebook obtidas:', pages.length);
      
      if (pages.length === 0) {
        return res.status(400).json({ 
          message: 'Nenhuma página do Facebook encontrada. Você precisa ter uma página do Facebook vinculada à sua conta.' 
        });
      }
      
      // Encontrar a primeira página com uma conta do Instagram vinculada
      const pageWithInstagram = pages.find(page => page.instagram_business_account);
      
      if (!pageWithInstagram) {
        return res.status(400).json({ 
          message: 'Nenhuma conta do Instagram Business encontrada. Você precisa vincular uma conta do Instagram à sua página do Facebook.' 
        });
      }
      
      console.log('Página com Instagram encontrada:', pageWithInstagram.name);
      console.log('Token da página obtido, este token não expira a menos que as permissões sejam revogadas');
      
      // 4. Buscar dados da conta do Instagram
      const instagramAccountId = pageWithInstagram.instagram_business_account.id;
      const instagramData = await getInstagramAccountData(instagramAccountId, pageWithInstagram.access_token);
      console.log('Dados da conta do Instagram obtidos:', instagramData.username);
      
      // Calcular data de expiração do token
      // Para tokens de página, definimos uma data bem no futuro, pois eles não expiram automaticamente
      const tokenExpiry = new Date();
      tokenExpiry.setFullYear(tokenExpiry.getFullYear() + 1); // Definir para 1 ano no futuro
      
      // Retornar todos os dados necessários
      return res.json({
        instagramAccountId,
        accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
        username: instagramData.username,
        profilePicture: instagramData.profile_picture_url,
        tokenExpiry: tokenExpiry.toISOString(), // Convertendo para string para transmissão JSON
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name,
        expiresIn: 31536000 // Aproximadamente 1 ano em segundos
      });
    } catch (error) {
      console.error('Erro detalhado no fluxo de autenticação:', error);
      if (error.response) {
        console.error('Resposta de erro:', error.response.data);
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    return res.status(500).json({ 
      message: error.message || 'Erro interno no servidor durante a autenticação',
      details: error.response?.data || 'Sem detalhes adicionais'
    });
  }
});

// Endpoint para buscar páginas do Facebook
router.get('/pages', async (req, res) => {
  try {
    const { accessToken } = req.query;
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token de acesso não fornecido' });
    }
    
    const pages = await getFacebookPages(accessToken);
    return res.json({ pages });
  } catch (error) {
    console.error('Erro ao buscar páginas:', error);
    return res.status(500).json({ 
      message: error.message || 'Erro ao buscar páginas do Facebook' 
    });
  }
});

// Endpoint para buscar dados da conta do Instagram
router.get('/account', async (req, res) => {
  try {
    const { instagramAccountId, accessToken } = req.query;
    
    if (!instagramAccountId || !accessToken) {
      return res.status(400).json({ message: 'ID da conta ou token de acesso não fornecido' });
    }
    
    const accountData = await getInstagramAccountData(instagramAccountId, accessToken);
    return res.json(accountData);
  } catch (error) {
    console.error('Erro ao buscar dados da conta:', error);
    return res.status(500).json({ 
      message: error.message || 'Erro ao buscar dados da conta do Instagram' 
    });
  }
});

// Endpoint para verificar se um token é válido
router.post('/verify-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Token de acesso não fornecido' });
    }
    
    const isValid = await verifyToken(accessToken);
    return res.json({ isValid });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(500).json({ 
      message: error.message || 'Erro ao verificar token' 
    });
  }
});

// Função para trocar o código por um token de acesso de curta duração
async function exchangeCodeForToken(code, redirectUri) {
  try {
    console.log('Trocando código por token com URL de redirecionamento:', redirectUri);
    const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao trocar código por token:', error.response?.data || error);
    throw new Error(error.response?.data?.error?.message || 'Falha ao obter token de acesso');
  }
}

// Função para converter token de curta duração para longa duração (60 dias)
async function getLongLivedToken(shortLivedToken) {
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
    console.error('Erro ao obter token de longa duração:', error.response?.data || error);
    throw new Error(error.response?.data?.error?.message || 'Falha ao obter token de longa duração');
  }
}

// Função para buscar páginas do Facebook vinculadas à conta
async function getFacebookPages(accessToken) {
  try {
    const response = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'instagram_business_account,name,id,access_token'
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar páginas do Facebook:', error.response?.data || error);
    throw new Error(error.response?.data?.error?.message || 'Falha ao buscar páginas do Facebook');
  }
}

// Função para buscar dados da conta do Instagram
async function getInstagramAccountData(instagramAccountId, accessToken) {
  try {
    const response = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
      params: {
        access_token: accessToken,
        fields: 'username,profile_picture_url,followers_count,media_count'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dados da conta do Instagram:', error.response?.data || error);
    throw new Error(error.response?.data?.error?.message || 'Falha ao buscar dados da conta do Instagram');
  }
}

// Função para verificar se um token ainda é válido
async function verifyToken(accessToken) {
  try {
    // Método melhorado para verificar token
    // Primeiro tentamos fazer uma chamada simples para a API
    const response = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name'
      }
    });
    
    // Se chegou aqui, o token é válido
    return true;
  } catch (error) {
    console.error('Erro ao verificar token:', error.response?.data || error);
    
    // Verificar se o erro é devido a token inválido
    if (error.response && 
        (error.response.status === 400 || error.response.status === 401) && 
        error.response.data && 
        error.response.data.error) {
      
      // Verificar código de erro específico
      const errorCode = error.response.data.error.code;
      const errorType = error.response.data.error.type;
      
      if (errorCode === 190 || errorType === 'OAuthException') {
        console.log('Token inválido ou expirado');
        return false;
      }
    }
    
    // Para outros tipos de erro, vamos tentar o método de debug_token
    try {
      const debugResponse = await axios.get(`https://graph.facebook.com/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${META_APP_ID}|${META_APP_SECRET}`
        }
      });
      return debugResponse.data.data.is_valid;
    } catch (debugError) {
      console.error('Erro ao verificar token via debug_token:', debugError.response?.data || debugError);
      return false;
    }
  }
}

module.exports = router;
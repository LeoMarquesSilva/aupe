const express = require('express');
const axios = require('axios');
const router = express.Router();

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
// Não definimos um valor padrão aqui, pois receberemos do cliente

// Endpoint para trocar o código por tokens e completar o fluxo de autenticação
router.post('/auth', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização não fornecido' });
    }
    
    if (!redirectUri) {
      return res.status(400).json({ message: 'URL de redirecionamento não fornecida' });
    }
    
    // 1. Trocar o código por um token de acesso de curta duração
    const shortLivedToken = await exchangeCodeForToken(code, redirectUri);
    
    // 2. Converter para token de longa duração (60 dias)
    const { accessToken, expiresIn } = await getLongLivedToken(shortLivedToken);
    
    // 3. Buscar as páginas do Facebook vinculadas
    const pages = await getFacebookPages(accessToken);
    
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
    
    // 4. Buscar dados da conta do Instagram
    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const instagramData = await getInstagramAccountData(instagramAccountId, pageWithInstagram.access_token);
    
    // Calcular data de expiração do token
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
    
    // Retornar todos os dados necessários
    return res.json({
      instagramAccountId,
      accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
      username: instagramData.username,
      profilePicture: instagramData.profile_picture_url,
      tokenExpiry,
      pageId: pageWithInstagram.id,
      pageName: pageWithInstagram.name
    });
  } catch (error) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    return res.status(500).json({ 
      message: error.message || 'Erro interno no servidor durante a autenticação' 
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
    const response = await axios.get(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: `${META_APP_ID}|${META_APP_SECRET}`
      }
    });
    return response.data.data.is_valid;
  } catch (error) {
    console.error('Erro ao verificar token:', error.response?.data || error);
    return false;
  }
}

module.exports = router;
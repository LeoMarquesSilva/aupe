const express = require('express');
const axios = require('axios');
const router = express.Router();

function instagramAppId() {
  const id = (process.env.INSTAGRAM_APP_ID || '').trim();
  if (!id) {
    throw new Error('INSTAGRAM_APP_ID não configurado');
  }
  return id;
}

function instagramAppSecret() {
  return process.env.INSTAGRAM_APP_SECRET || '';
}

const META_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'https://aupedigital.com.br/callback';

// Business Login for Instagram — troca code → long-lived (Node 18+ fetch/FormData)
router.post('/auth', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const appId = instagramAppId();
    const appSecret = instagramAppSecret();

    if (!code) {
      return res.status(400).json({ message: 'Código de autorização não fornecido' });
    }
    if (!appSecret) {
      return res.status(500).json({ message: 'INSTAGRAM_APP_SECRET não configurado' });
    }

    const finalRedirectUri = redirectUri || META_REDIRECT_URI;
    const cleanCode = String(code).trim().replace(/#_$/, '').replace(/#$/, '');

    const form = new FormData();
    form.append('client_id', appId);
    form.append('client_secret', appSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', finalRedirectUri);
    form.append('code', cleanCode);

    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortJson = await shortRes.json();

    if (!shortRes.ok) {
      return res.status(400).json({
        message: shortJson.error_message || 'Falha OAuth Instagram',
        details: shortJson,
      });
    }

    const row = Array.isArray(shortJson.data) ? shortJson.data[0] : shortJson;
    const shortLivedToken = row?.access_token;
    const scopedUserId = row?.user_id != null ? String(row.user_id) : '';

    if (!shortLivedToken) {
      return res.status(502).json({ message: 'Resposta sem access_token', details: shortJson });
    }

    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('access_token', shortLivedToken);

    const longRes = await fetch(longUrl.toString());
    const longJson = await longRes.json();

    if (!longRes.ok || !longJson.access_token) {
      return res.status(502).json({
        message: longJson.error?.message || 'Falha token longo',
        details: longJson,
      });
    }

    const longLivedToken = longJson.access_token;
    const expiresIn = Number(longJson.expires_in) || 5184000;

    let username = '';
    let profilePicture = '';
    let instagramAccountId = scopedUserId;

    const profileUrl = new URL(`https://graph.facebook.com/v21.0/${scopedUserId}`);
    profileUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count,media_count');
    profileUrl.searchParams.set('access_token', longLivedToken);
    const profRes = await fetch(profileUrl.toString());
    const profJson = await profRes.json();

    if (profRes.ok && profJson && !profJson.error) {
      username = profJson.username || '';
      profilePicture = profJson.profile_picture_url || '';
      if (profJson.id) instagramAccountId = String(profJson.id);
    } else {
      const meUrl = new URL('https://graph.instagram.com/v21.0/me');
      meUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count,media_count');
      meUrl.searchParams.set('access_token', longLivedToken);
      const meRes = await fetch(meUrl.toString());
      const meJson = await meRes.json();
      if (meRes.ok && meJson && !meJson.error) {
        username = meJson.username || '';
        profilePicture = meJson.profile_picture_url || '';
        if (meJson.id) instagramAccountId = String(meJson.id);
      }
    }

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    return res.json({
      instagramAccountId,
      accessToken: longLivedToken,
      username: username || `user_${scopedUserId}`,
      profilePicture,
      tokenExpiry: tokenExpiry.toISOString(),
      pageId: null,
      pageName: 'Instagram',
      expiresIn,
      issuedAt: new Date().toISOString(),
      authMethod: 'instagram_business_login',
    });
  } catch (error) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    return res.status(500).json({
      message: error.message || 'Erro interno no servidor durante a autenticação',
      details: error.response?.data || 'Sem detalhes adicionais',
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
          access_token: `${instagramAppId()}|${instagramAppSecret()}`
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
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Constantes para autenticação - mantidas no servidor para segurança
const META_APP_ID = '1087259016929287';
const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
const META_REDIRECT_URI = 'https://aupedigital.com.br/callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Permitir apenas solicitações POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
      const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: finalRedirectUri,
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
          client_secret: META_APP_SECRET,
          fb_exchange_token: shortLivedToken
        }
      });

      const accessToken = longLivedTokenResponse.data.access_token;
      const expiresIn = longLivedTokenResponse.data.expires_in;
      console.log('Token de longa duração obtido, expira em:', expiresIn, 'segundos');

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
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);

      // Retornar todos os dados necessários
      return res.status(200).json({
        instagramAccountId,
        accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
        username: instagramData.username,
        profilePicture: instagramData.profile_picture_url,
        tokenExpiry: tokenExpiry.toISOString(), // Convertendo para string para transmissão JSON
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name,
        expiresIn // Incluindo o tempo de expiração em segundos para depuração
      });
    } catch (error: any) {
      console.error('Erro detalhado no fluxo de autenticação:', error);
      if (error.response) {
        console.error('Resposta de erro:', error.response.data);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Erro no fluxo de autenticação do Instagram:', error);
    return res.status(500).json({
      message: error.message || 'Erro interno no servidor durante a autenticação',
      details: error.response?.data || 'Sem detalhes adicionais'
    });
  }
}
import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

// Constantes para autenticação
const META_APP_ID = '1087259016929287';
const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
const META_REDIRECT_URI = 'https://aupe.vercel.app/callback';

const Callback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obter o código e state da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (error) {
          throw new Error('Autorização negada ou cancelada pelo usuário.');
        }
        
        if (!code) {
          throw new Error('Código de autorização não encontrado na URL.');
        }
        
        // Validar o state para proteção CSRF
        const savedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');
        if (state && savedState !== state) {
          throw new Error('Validação de segurança falhou. Por favor, tente novamente.');
        }
        
        console.log('Código de autorização obtido:', code);
        
        // 1. Trocar o código por um token de acesso de curta duração
        try {
          console.log('Trocando código por token...');
          const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
              client_id: META_APP_ID,
              client_secret: META_APP_SECRET,
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
              client_secret: META_APP_SECRET,
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
          tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
          
          // Salvar dados no localStorage para que possam ser acessados pelo componente ConnectInstagram
          const authData = {
            instagramAccountId,
            accessToken: pageWithInstagram.access_token, // Usamos o token da página, não o token do usuário
            username: instagramData.username,
            profilePicture: instagramData.profile_picture_url,
            tokenExpiry,
            pageId: pageWithInstagram.id,
            pageName: pageWithInstagram.name
          };
          
          localStorage.setItem('instagram_auth_temp_data', JSON.stringify(authData));
          
          setSuccess(true);
          
          // Fechar a janela de popup após um breve atraso
          setTimeout(() => {
            window.close();
          }, 2000);
        } catch (authError: any) {
          console.error('Erro detalhado na autenticação:', authError);
          setDetailedError(JSON.stringify(authError.response?.data || authError.message));
          throw authError;
        }
      } catch (err: any) {
        console.error('Erro no callback do Instagram:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        
        // Salvar mensagem de erro no localStorage para que possa ser acessada pelo componente ConnectInstagram
        localStorage.setItem('instagram_auth_error', errorMessage);
        
        // Fechar a janela de popup após um breve atraso
        setTimeout(() => {
          window.close();
        }, 10000); // Aumentando o tempo para 10 segundos para poder ver o erro detalhado
      } finally {
        setLoading(false);
      }
    };
    
    processCallback();
  }, []);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      {loading && (
        <>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            Processando autenticação do Instagram...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Por favor, aguarde enquanto conectamos sua conta.
          </Typography>
        </>
      )}
      
      {error && (
        <>
          <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
            {error}
          </Alert>
          {detailedError && (
            <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: 500, textAlign: 'left', overflowX: 'auto' }}>
              <Typography variant="subtitle2">Detalhes do erro:</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{detailedError}</pre>
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Não foi possível conectar sua conta do Instagram.
          </Typography>
          <Typography variant="body2">
            Esta janela será fechada automaticamente...
          </Typography>
        </>
      )}
      
      {success && (
        <>
          <Alert severity="success" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
            Conta conectada com sucesso!
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta janela será fechada automaticamente...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default Callback;
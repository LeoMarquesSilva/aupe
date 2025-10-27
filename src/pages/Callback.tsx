import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { completeInstagramAuth } from '../services/instagramAuthService';

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
        
        try {
          // Chamar a API para processar a autenticação no servidor
          const authData = await completeInstagramAuth(code);
          
          console.log('Autenticação concluída com sucesso:', authData.username);
          console.log('Token expira em:', new Date(authData.tokenExpiry));
          
          // Salvar dados no localStorage para que possam ser acessados pelo componente ConnectInstagram
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
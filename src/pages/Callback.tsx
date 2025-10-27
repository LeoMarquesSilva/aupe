import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { completeInstagramAuth, validateState } from '../services/instagramAuthService';

const Callback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
        if (state && !validateState(state)) {
          throw new Error('Validação de segurança falhou. Por favor, tente novamente.');
        }
        
        // Completar o fluxo de autenticação
        const instagramData = await completeInstagramAuth(code);
        
        // Salvar dados no localStorage para que possam ser acessados pelo componente ConnectInstagram
        localStorage.setItem('instagram_auth_temp_data', JSON.stringify(instagramData));
        
        setSuccess(true);
        
        // Fechar a janela de popup após um breve atraso
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err) {
        console.error('Erro no callback do Instagram:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        
        // Salvar mensagem de erro no localStorage para que possa ser acessada pelo componente ConnectInstagram
        localStorage.setItem('instagram_auth_error', errorMessage);
        
        // Fechar a janela de popup após um breve atraso
        setTimeout(() => {
          window.close();
        }, 3000);
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
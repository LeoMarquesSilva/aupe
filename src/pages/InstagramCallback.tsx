import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { completeInstagramAuth } from '../services/instagramAuthService';

const InstagramCallback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obter o código da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          throw new Error('Autorização negada ou cancelada pelo usuário.');
        }
        
        if (!code) {
          throw new Error('Código de autorização não encontrado na URL.');
        }
        
        // Completar o fluxo de autenticação
        const instagramData = await completeInstagramAuth(code);
        
        // Salvar dados no localStorage para que a janela principal possa acessá-los
        localStorage.setItem('instagram_auth_temp_data', JSON.stringify(instagramData));
        
        setSuccess(true);
        
        // Fechar a janela após um breve atraso
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err) {
        console.error('Erro no callback do Instagram:', err);
        setError((err as Error).message || 'Erro desconhecido durante a autenticação');
        
        // Salvar erro no localStorage para que a janela principal possa acessá-lo
        localStorage.setItem('instagram_auth_error', (err as Error).message);
        
        // Fechar a janela após um breve atraso mesmo em caso de erro
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
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Erro na autenticação
          </Typography>
          <Typography variant="body1">
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Esta janela será fechada automaticamente...
          </Typography>
        </>
      )}
      
      {success && (
        <>
          <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
            Conta conectada com sucesso!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Esta janela será fechada automaticamente...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default InstagramCallback;
import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { completeInstagramAuth, validateState } from '../services/instagramAuthService';
import { useNavigate } from 'react-router-dom';

const InstagramCallback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

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
        
        // Salvar dados no localStorage para que possam ser acessados posteriormente
        localStorage.setItem('instagram_auth_data', JSON.stringify(instagramData));
        
        setSuccess(true);
        
        // Redirecionar após um breve atraso
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (err) {
        console.error('Erro no callback do Instagram:', err);
        setError((err as Error).message || 'Erro desconhecido durante a autenticação');
      } finally {
        setLoading(false);
      }
    };
    
    processCallback();
  }, [navigate]);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
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
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
          >
            Voltar para o início
          </Button>
        </>
      )}
      
      {success && (
        <>
          <Alert severity="success" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
            Conta conectada com sucesso!
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Você será redirecionado automaticamente...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default InstagramCallback;
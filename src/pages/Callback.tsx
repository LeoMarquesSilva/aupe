import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InstagramAccountSelector from '../components/InstagramAccountSelector';

const Callback: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obter o código da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        console.log('🔍 Processando callback do Instagram:', { 
          hasCode: !!code, 
          error, 
          errorDescription 
        });
        
        if (error) {
          let errorMessage = 'Autorização negada ou cancelada pelo usuário.';
          
          if (error === 'access_denied') {
            errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para continuar.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }
          
          throw new Error(errorMessage);
        }
        
        if (!code) {
          throw new Error('Código de autorização não encontrado na URL. Por favor, tente novamente.');
        }
        
        console.log('✅ Código de autorização recebido, iniciando seletor de contas');
        
        // Ir direto para o seletor de contas (sem validação CSRF)
        setAuthCode(code);
        setShowAccountSelector(true);
        
      } catch (err) {
        console.error('❌ Erro no callback do Instagram:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        
        // Salvar mensagem de erro no localStorage
        localStorage.setItem('instagram_auth_error', errorMessage);
        
        // Fechar a janela de popup após um breve atraso
        setTimeout(() => {
          if (window.opener) {
            window.close();
          }
        }, 5000);
      } finally {
        setLoading(false);
      }
    };
    
    processCallback();
  }, [navigate]);

  const handleAccountSelected = (instagramData: any) => {
    console.log('✅ Conta selecionada:', instagramData);
    
    // Salvar dados no localStorage
    localStorage.setItem('instagram_auth_temp_data', JSON.stringify(instagramData));
    localStorage.setItem('instagram_auth_success', 'true');
    
    setSuccess(true);
    setShowAccountSelector(false);
    
    // Fechar a janela de popup após um breve atraso
    setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 2000);
  };

  const handleSelectorClose = () => {
    console.log('❌ Seleção de conta cancelada');
    setShowAccountSelector(false);
    setError('Seleção de conta cancelada pelo usuário.');
    
    localStorage.setItem('instagram_auth_error', 'Seleção cancelada pelo usuário');
    
    // Fechar a janela de popup após um breve atraso
    setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 3000);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Reprocessar o callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      setAuthCode(code);
      setShowAccountSelector(true);
      setLoading(false);
    } else {
      setError('Código de autorização não encontrado. Por favor, feche esta janela e tente novamente.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        p: 3,
        textAlign: 'center',
        bgcolor: 'background.default'
      }}
    >
      {loading && (
        <>
          <CircularProgress size={60} sx={{ mb: 3, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Processando autenticação do Instagram...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Por favor, aguarde enquanto carregamos suas contas.
          </Typography>
        </>
      )}
      
      {error && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Erro na Autenticação
            </Typography>
            {error}
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button 
              variant="contained" 
              onClick={handleRetry}
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                '&:hover': { bgcolor: theme.palette.primary.dark } 
              }}
            >
              Tentar Novamente
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleClose}
            >
              Fechar
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Esta janela será fechada automaticamente em alguns segundos...
          </Typography>
        </Box>
      )}
      
      {success && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sucesso!
            </Typography>
            Conta do Instagram conectada com sucesso!
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            Esta janela será fechada automaticamente...
          </Typography>
        </Box>
      )}

      {/* Seletor de contas do Instagram */}
      {authCode && (
        <InstagramAccountSelector
          open={showAccountSelector}
          onClose={handleSelectorClose}
          onAccountSelected={handleAccountSelected}
          authCode={authCode}
        />
      )}
    </Box>
  );
};

export default Callback;
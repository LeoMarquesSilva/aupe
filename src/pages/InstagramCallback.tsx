import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InstagramAccountSelector from '../components/InstagramAccountSelector';

const getClientIdFromCallback = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawClientId = urlParams.get('state') || urlParams.get('client_id');
  if (!rawClientId) return null;
  const clientId = rawClientId.trim();
  if (!clientId) return null;
  return clientId;
};

const InstagramCallback: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [callbackClientId, setCallbackClientId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        console.log('Processando callback do Instagram:', {
          hasCode: !!code,
          error: errorParam,
          errorDescription,
        });

        if (errorParam) {
          let errorMessage = 'Autorização negada ou cancelada pelo usuário.';
          if (errorParam === 'access_denied') {
            errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para continuar.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }
          throw new Error(errorMessage);
        }

        if (!code) {
          throw new Error('Código de autorização não encontrado na URL. Por favor, tente novamente.');
        }

        const cId = getClientIdFromCallback();
        if (!cId) {
          throw new Error('ID do cliente não encontrado no callback. Feche e inicie a conexão novamente pelo cliente correto.');
        }

        console.log('Código de autorização recebido, clientId:', cId);

        setAuthCode(code);
        setCallbackClientId(cId);
        setShowAccountSelector(true);
      } catch (err) {
        console.error('Erro no callback do Instagram:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        localStorage.setItem('instagram_auth_error', errorMessage);
        setTimeout(() => closeWindow(), 5000);
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [navigate]);

  const closeWindow = () => {
    try {
      if (window.opener && window.opener !== window) {
        window.close();
      } else {
        window.location.href = window.location.origin;
      }
    } catch {
      window.location.href = window.location.origin;
    }
  };

  const handleAccountSelected = async (instagramData: any) => {
    console.log('Conta selecionada:', instagramData);

    setIsProcessing(true);
    setSelectedUsername(instagramData.username);

    try {
      localStorage.setItem('instagram_auth_temp_data', JSON.stringify(instagramData));
      localStorage.setItem('instagram_auth_success', 'true');

      setSuccess(true);
      setShowAccountSelector(false);

      console.log('Dados salvos pela Edge Function (server-side). Fechando janela em 3s...');

      try {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'INSTAGRAM_AUTH_SUCCESS',
              data: instagramData,
              clientId: callbackClientId,
            },
            window.location.origin,
          );
        }
      } catch (msgErr) {
        console.warn('postMessage bloqueado (COOP):', msgErr);
      }

      setTimeout(() => closeWindow(), 3000);
    } catch (err) {
      console.error('Erro ao processar dados:', err);
      setError(`Erro: ${(err as Error).message}`);
      setIsProcessing(false);
    }
  };

  const handleSelectorClose = () => {
    if (isProcessing) return;

    setShowAccountSelector(false);
    setError('Seleção de conta cancelada pelo usuário.');
    localStorage.setItem('instagram_auth_error', 'Seleção cancelada pelo usuário');
    setTimeout(() => closeWindow(), 3000);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setIsProcessing(false);

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setAuthCode(code);
      setShowAccountSelector(true);
      setLoading(false);
    } else {
      setError('Código de autorização não encontrado. Feche esta janela e tente novamente.');
      setLoading(false);
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
        bgcolor: 'background.default',
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
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Tentar Novamente
            </Button>
            <Button variant="outlined" onClick={() => closeWindow()}>
              Fechar
            </Button>
          </Box>
        </Box>
      )}

      {success && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sucesso!
            </Typography>
            Conta <strong>@{selectedUsername}</strong> conectada e salva com sucesso!
          </Alert>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Finalizando e fechando janela...
            </Typography>
          </Box>
        </Box>
      )}

      {authCode && (
        <InstagramAccountSelector
          open={showAccountSelector}
          onClose={handleSelectorClose}
          onAccountSelected={handleAccountSelected}
          authCode={authCode}
          clientId={callbackClientId || undefined}
        />
      )}
    </Box>
  );
};

export default InstagramCallback;

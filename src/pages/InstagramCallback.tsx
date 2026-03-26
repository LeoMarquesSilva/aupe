import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Avatar, useTheme } from '@mui/material';
import { Instagram as InstagramIcon } from '@mui/icons-material';
import { exchangeInstagramAuthCode, getAuthorizationUrl } from '../services/instagramAuthService';

const getClientIdFromCallback = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const raw = urlParams.get('state') || urlParams.get('client_id');
  return raw?.trim() || null;
};

const InstagramCallback: React.FC = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Conectando conta do Instagram...');
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');

  useEffect(() => {
    const process = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDesc = urlParams.get('error_description');

        if (errorParam) {
          throw new Error(
            errorParam === 'access_denied'
              ? 'Acesso negado. Autorize o aplicativo para continuar.'
              : errorDesc || 'Autorização cancelada.',
          );
        }

        if (!code) {
          throw new Error('Código de autorização não encontrado. Tente novamente.');
        }

        const clientId = getClientIdFromCallback();
        if (!clientId) {
          throw new Error('ID do cliente não encontrado. Feche e inicie a conexão novamente.');
        }

        setMessage('Trocando código por token e salvando...');

        // Chama Edge Function que troca code → token → salva no banco
        const result = await exchangeInstagramAuthCode(code, undefined, clientId);

        setUsername(result.username);
        setProfilePic(result.profilePicture);
        setStatus('success');
        setMessage(`@${result.username} conectado com sucesso!`);

        // Salvar no localStorage para fallback da janela pai
        localStorage.setItem('instagram_auth_success', 'true');
        localStorage.setItem('instagram_auth_temp_data', JSON.stringify(result));

        // Notificar janela pai
        try {
          if (window.opener) {
            window.opener.postMessage(
              { type: 'INSTAGRAM_AUTH_SUCCESS', data: result, clientId },
              window.location.origin,
            );
          }
        } catch {
          // COOP pode bloquear postMessage — janela pai usa fallback via localStorage
        }

        setTimeout(() => closeWindow(), 2500);
      } catch (err) {
        const msg = (err as Error).message || 'Erro desconhecido';
        setStatus('error');
        setMessage(msg);
        localStorage.setItem('instagram_auth_error', msg);
      }
    };

    process();
  }, []);

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

  const handleRetry = () => {
    const clientId = getClientIdFromCallback();
    if (clientId) {
      window.location.href = getAuthorizationUrl(clientId);
    } else {
      closeWindow();
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
      {status === 'loading' && (
        <>
          <CircularProgress size={60} sx={{ mb: 3, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aguarde, estamos processando a autenticação.
          </Typography>
        </>
      )}

      {status === 'success' && (
        <Box sx={{ maxWidth: 400, width: '100%' }}>
          {profilePic && (
            <Avatar
              src={profilePic}
              sx={{ width: 80, height: 80, mx: 'auto', mb: 2, border: `3px solid ${theme.palette.success.main}` }}
            >
              <InstagramIcon />
            </Avatar>
          )}
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Conta conectada!
            </Typography>
            <strong>@{username}</strong> foi vinculado ao cliente.
          </Alert>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={18} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Fechando janela...
            </Typography>
          </Box>
        </Box>
      )}

      {status === 'error' && (
        <Box sx={{ maxWidth: 450, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {message}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleRetry}>
              Tentar Novamente
            </Button>
            <Button variant="outlined" onClick={() => closeWindow()}>
              Fechar
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default InstagramCallback;

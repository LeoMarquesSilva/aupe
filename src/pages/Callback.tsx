import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, useTheme } from '@mui/material';
import InstagramAccountSelector from '../components/InstagramAccountSelector';
import { getAuthorizationUrl, InstagramAuthData } from '../services/instagramAuthService';
import { clientService } from '../services/supabaseClient';

const Callback: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [oauthClientId, setOauthClientId] = useState<string | null>(null);
  const [closing, setClosing] = useState<boolean>(false);

  const normalizeAuthPayload = (raw: Record<string, unknown>): InstagramAuthData => {
    const tokenExpiryRaw = raw.tokenExpiry;
    const tokenExpiry =
      typeof tokenExpiryRaw === 'string'
        ? new Date(tokenExpiryRaw)
        : tokenExpiryRaw instanceof Date
          ? tokenExpiryRaw
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    return {
      instagramAccountId: String(raw.instagramAccountId || ''),
      accessToken: String(raw.accessToken || ''),
      username: String(raw.username || ''),
      profilePicture: String(raw.profilePicture || ''),
      tokenExpiry,
      pageId: (raw.pageId as string) ?? null,
      pageName: (raw.pageName as string) ?? null,
      issuedAt: typeof raw.issuedAt === 'string' ? raw.issuedAt : undefined,
      profileName: typeof raw.profileName === 'string' ? raw.profileName : undefined,
    };
  };

  const tryCloseWindow = () => {
    // Tentar fechar mesmo sem opener; popups abertas por script normalmente podem fechar.
    try {
      window.close();
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const state = urlParams.get('state')?.trim() || null;
        setOauthClientId(state);

        console.log('Processando callback Facebook/Graph:', {
          hasCode: !!code,
          error: errParam,
          errorDescription,
          hasState: !!state,
        });

        if (errParam) {
          let errorMessage = 'Autorização negada ou cancelada pelo usuário.';
          if (errParam === 'access_denied') {
            errorMessage = 'Acesso negado. Autorize o aplicativo para continuar.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }
          throw new Error(errorMessage);
        }

        if (!code) {
          throw new Error('Código de autorização não encontrado na URL. Tente novamente.');
        }

        setAuthCode(code);
        setShowAccountSelector(true);
      } catch (err) {
        console.error('Erro no callback Facebook/Graph:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        localStorage.setItem('instagram_auth_error', errorMessage);
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
  }, []);

  const handleAccountSelected = async (instagramData: Record<string, unknown>) => {
    console.log('Conta selecionada:', instagramData);

    const normalized = normalizeAuthPayload(instagramData);
    const serializable = {
      ...normalized,
      tokenExpiry: normalized.tokenExpiry.toISOString(),
    };

    localStorage.setItem('instagram_auth_temp_data', JSON.stringify(serializable));
    localStorage.setItem('instagram_auth_success', 'true');

    const clientId =
      oauthClientId || localStorage.getItem('current_client_id') || '';

    if (!clientId) {
      setError('Cliente de destino não encontrado (state ausente). Feche e tente conectar novamente.');
      return;
    }

    try {
      // Persistência principal: salva direto no backend nesta própria janela callback.
      await clientService.saveInstagramAuth(clientId, normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados Instagram no cliente';
      setError(msg);
      localStorage.setItem('instagram_auth_error', msg);
      return;
    }

    try {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'INSTAGRAM_AUTH_SUCCESS', data: serializable, clientId },
          window.location.origin,
        );
      }
    } catch {
      // COOP pode bloquear postMessage — janela pai usa localStorage
    }

    setClosing(true);
    setSuccess(true);
    setShowAccountSelector(false);

    // Fechar automaticamente em qualquer cenário.
    setTimeout(() => {
      tryCloseWindow();
      // fallback visual caso o browser bloqueie close
      setTimeout(() => {
        if (!window.closed) {
          window.location.replace('/');
        }
      }, 700);
    }, 1200);
  };

  const handleSelectorClose = () => {
    setShowAccountSelector(false);
    setError('Seleção de conta cancelada pelo usuário.');
    localStorage.setItem('instagram_auth_error', 'Seleção cancelada pelo usuário');
    setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 3000);
  };

  const handleRetry = () => {
    setError(null);
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('state')?.trim() || oauthClientId || localStorage.getItem('current_client_id');
    if (clientId) {
      window.location.href = getAuthorizationUrl(clientId);
      return;
    }
    setLoading(true);
    const code = params.get('code');
    if (code) {
      setAuthCode(code);
      setShowAccountSelector(true);
      setLoading(false);
    } else {
      setError('Código não encontrado. Feche a janela e inicie a conexão novamente.');
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
        bgcolor: 'background.default',
      }}
    >
      {loading && (
        <>
          <CircularProgress size={60} sx={{ mb: 3, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Processando login Facebook…
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Carregando páginas e contas Instagram vinculadas.
          </Typography>
        </>
      )}

      {error && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Erro na autenticação
            </Typography>
            {error}
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button variant="contained" onClick={handleRetry} sx={{ bgcolor: theme.palette.primary.main }}>
              Tentar novamente
            </Button>
            <Button variant="outlined" onClick={handleClose}>
              Fechar
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Esta janela pode fechar automaticamente em alguns segundos…
          </Typography>
        </Box>
      )}

      {success && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sucesso
            </Typography>
            Conta Instagram conectada. Fechando…
          </Alert>
          {!closing && (
            <Button variant="outlined" onClick={handleClose}>
              Fechar agora
            </Button>
          )}
        </Box>
      )}

      {authCode && (
        <InstagramAccountSelector
          open={showAccountSelector}
          onClose={handleSelectorClose}
          onAccountSelected={handleAccountSelected}
          authCode={authCode}
          clientId={oauthClientId || undefined}
        />
      )}
    </Box>
  );
};

export default Callback;

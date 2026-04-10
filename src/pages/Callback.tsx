import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, alpha } from '@mui/material';
import InstagramAccountSelector from '../components/InstagramAccountSelector';
import { getAuthorizationUrl, InstagramAuthData } from '../services/instagramAuthService';
import { clientService } from '../services/supabaseClient';
import { devLog, logClientError } from '../utils/clientLogger';
import { GLASS } from '../theme/glassTokens';

const Callback: React.FC = () => {
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

  const postSuccessToOpener = (serializable: Record<string, unknown>, clientId: string) => {
    if (!window.opener) return;
    let targetOrigin = window.location.origin;
    try {
      const oo = (window.opener as Window).location?.origin;
      if (oo && oo !== 'null') {
        targetOrigin = oo;
      }
    } catch {
      // COOP pode impedir ler opener; popup e pai devem ser mesma origem — usar origem desta janela.
    }
    window.opener.postMessage(
      { type: 'INSTAGRAM_AUTH_SUCCESS', data: serializable, clientId },
      targetOrigin,
    );
  };

  const isMissingSessionError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false;
    const name = (err as { name?: string }).name;
    if (name === 'AuthSessionMissingError') return true;
    const msg = err instanceof Error ? err.message : String(err);
    return /session missing|não autenticado|auth session missing/i.test(msg);
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

        devLog('Processando callback Facebook/Graph:', {
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
        logClientError('Erro no callback Facebook/Graph', err);
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
    const normalized = normalizeAuthPayload(instagramData);
    devLog('Conta selecionada (sem token):', {
      instagramAccountId: normalized.instagramAccountId,
      username: normalized.username,
      hasAccessToken: Boolean(normalized.accessToken),
    });
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
      await clientService.saveInstagramAuth(clientId, normalized);
    } catch (err) {
      if (isMissingSessionError(err) && window.opener) {
        postSuccessToOpener(serializable, clientId);
        setClosing(true);
        setSuccess(true);
        setShowAccountSelector(false);
        setTimeout(() => {
          tryCloseWindow();
          setTimeout(() => {
            if (!window.closed) {
              window.location.replace('/');
            }
          }, 700);
        }, 1200);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados Instagram no cliente';
      setError(msg);
      localStorage.setItem('instagram_auth_error', msg);
      return;
    }

    try {
      postSuccessToOpener(serializable, clientId);
    } catch {
      /* noop */
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
        background: `linear-gradient(135deg, ${alpha(GLASS.accent.orange, 0.08)} 0%, ${alpha(GLASS.accent.orangeLight, 0.05)} 100%)`,
      }}
    >
      {loading && (
        <Box
          sx={{
            p: 5,
            borderRadius: GLASS.radius.card,
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            maxWidth: 500,
            width: '100%',
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3, color: GLASS.accent.orange }} />
          <Typography variant="h6" sx={{ mb: 1, color: GLASS.text.heading }}>
            Processando login Facebook…
          </Typography>
          <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
            Carregando páginas e contas Instagram vinculadas.
          </Typography>
        </Box>
      )}

      {error && (
        <Box
          sx={{
            maxWidth: 500,
            width: '100%',
            p: 4,
            borderRadius: GLASS.radius.card,
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}
        >
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: GLASS.radius.button,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Erro na autenticação
            </Typography>
            {error}
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleRetry}
              sx={{
                borderRadius: GLASS.radius.button,
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(45deg, ${GLASS.accent.orange}, ${GLASS.accent.orangeLight})`,
                boxShadow: `0 4px 14px ${alpha(GLASS.accent.orange, 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${GLASS.accent.orangeDark}, ${GLASS.accent.orange})`,
                  boxShadow: `0 6px 20px ${alpha(GLASS.accent.orange, 0.4)}`,
                },
              }}
            >
              Tentar novamente
            </Button>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                borderRadius: GLASS.radius.button,
                textTransform: 'none',
                borderColor: GLASS.border.outer,
                color: GLASS.text.body,
                '&:hover': {
                  borderColor: GLASS.accent.orange,
                  background: alpha(GLASS.accent.orange, 0.05),
                },
              }}
            >
              Fechar
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
            Esta janela pode fechar automaticamente em alguns segundos…
          </Typography>
        </Box>
      )}

      {success && (
        <Box
          sx={{
            maxWidth: 500,
            width: '100%',
            p: 4,
            borderRadius: GLASS.radius.card,
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}
        >
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderRadius: GLASS.radius.button,
              backgroundColor: alpha(GLASS.accent.orange, 0.08),
              border: `1px solid ${alpha(GLASS.accent.orange, 0.2)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sucesso
            </Typography>
            Conta Instagram conectada. Fechando…
          </Alert>
          {!closing && (
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                borderRadius: GLASS.radius.button,
                textTransform: 'none',
                borderColor: GLASS.accent.orange,
                color: GLASS.accent.orange,
                '&:hover': {
                  borderColor: GLASS.accent.orangeDark,
                  background: alpha(GLASS.accent.orange, 0.05),
                },
              }}
            >
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

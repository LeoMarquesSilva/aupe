import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import {
  exchangeInstagramBusinessCode,
  persistInstagramBusinessAuthToClient,
  saveInstagramBusinessToken,
} from '../services/instagramBusinessAuthService';
import { GLASS } from '../theme/glassTokens';

type Status = 'loading' | 'error';

const InstagramBusinessCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const oauthError = params.get('error');
      const oauthErrorReason = params.get('error_reason') || params.get('error_description');
      const returnedState = params.get('state');

      if (oauthError) {
        setStatus('error');
        setErrorMessage(
          oauthErrorReason
            ? `${oauthError}: ${oauthErrorReason}`
            : `Authorization was cancelled or denied (${oauthError}).`,
        );
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Missing authorization code in the callback URL.');
        return;
      }

      const expectedState = window.sessionStorage.getItem('ig_business_oauth_state');
      if (expectedState && returnedState && expectedState !== returnedState) {
        setStatus('error');
        setErrorMessage('OAuth state mismatch. Please try again.');
        return;
      }

      try {
        const token = await exchangeInstagramBusinessCode(code);
        saveInstagramBusinessToken(token);
        window.sessionStorage.removeItem('ig_business_oauth_state');

        // If we started from an authenticated "connect this client" flow,
        // persist the token onto the chosen client row so the n8n scheduler
        // can publish posts for it. Otherwise fall back to the public App
        // Review demo page (sessionStorage-only).
        const pendingClientId = window.sessionStorage.getItem(
          'ig_business_oauth_client_id',
        );
        if (pendingClientId) {
          window.sessionStorage.removeItem('ig_business_oauth_client_id');
          try {
            await persistInstagramBusinessAuthToClient(pendingClientId, token);
            navigate(`/clients/${pendingClientId}`, { replace: true });
            return;
          } catch (persistErr) {
            setStatus('error');
            setErrorMessage(
              persistErr instanceof Error
                ? `Instagram signed in, but we couldn't save it to your client: ${persistErr.message}`
                : "Instagram signed in, but we couldn't save it to your client.",
            );
            return;
          }
        }

        navigate('/connect/instagram-business/demo', { replace: true });
      } catch (e) {
        setStatus('error');
        setErrorMessage(e instanceof Error ? e.message : 'Token exchange failed');
      }
    };

    void run();
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f6f6',
        display: 'flex',
        alignItems: 'center',
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: GLASS.radius.card,
            bgcolor: '#ffffff',
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: GLASS.shadow.card,
            textAlign: 'center',
          }}
        >
          {status === 'loading' && (
            <Stack spacing={2} alignItems="center">
              <CircularProgress sx={{ color: GLASS.accent.orange }} />
              <Typography variant="h6" sx={{ color: GLASS.text.heading, fontWeight: 600 }}>
                Finishing Instagram sign-in
              </Typography>
              <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                Exchanging the authorization code for a long-lived access token.
              </Typography>
            </Stack>
          )}

          {status === 'error' && (
            <Stack spacing={2} alignItems="center">
              <ErrorIcon sx={{ fontSize: 48, color: '#dc2626' }} />
              <Typography variant="h6" sx={{ color: GLASS.text.heading, fontWeight: 600 }}>
                We couldn&apos;t complete the login
              </Typography>
              <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                {errorMessage || 'Unexpected error while contacting Instagram.'}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/connect/instagram-business', { replace: true })}
                sx={{
                  bgcolor: GLASS.accent.orange,
                  '&:hover': { bgcolor: GLASS.accent.orangeDark },
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Try again
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default InstagramBusinessCallback;

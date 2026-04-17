import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  PersonOutline as PersonIcon,
  PublishOutlined as PublishIcon,
  InsightsOutlined as InsightsIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import {
  getInstagramBusinessAuthUrl,
  getInstagramBusinessAppId,
  getInstagramBusinessRedirectUri,
} from '../services/instagramBusinessAuthService';
import { supabase } from '../services/supabaseClient';
import { isMetaAppReviewEmail } from '../config/metaAppReview';
import { ensureMetaAppReviewClient } from '../services/metaAppReviewClientService';
import { GLASS } from '../theme/glassTokens';

/**
 * English-language entry page shown in the App Review screencast.
 *
 * Reviewers land here, click "Continue with Instagram", complete the Meta
 * consent dialog, are redirected to /callback/instagram-business, and end
 * up on the demo page where each requested permission is exercised.
 */
const ConnectInstagramBusiness: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { clientId: clientIdFromPath } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  // Accept clientId from either the path (/clients/:clientId/connect-instagram-business)
  // or a query string (?clientId=...). When set, the callback will persist the
  // resulting token onto this client and route into the scheduler dashboard
  // instead of the public App Review demo page.
  const clientIdFromUrl = clientIdFromPath || searchParams.get('clientId') || undefined;
  // `effectiveClientId` can be filled in dynamically for the Meta App Review
  // reviewer (see the effect below), so we track it in state.
  const [effectiveClientId, setEffectiveClientId] = useState<string | undefined>(
    clientIdFromUrl,
  );
  const [reviewerEnsuring, setReviewerEnsuring] = useState<boolean>(false);

  useEffect(() => {
    // Reviewer auto-provisioning: when the dedicated App Review reviewer lands
    // here without a clientId in the URL, find or create a dedicated
    // "Meta App Review Client" inside their own organization and feed its id
    // into the OAuth session. This mirrors what a normal user gets from the
    // /clients/:id/connect-instagram-business entry point, so the callback can
    // persist the token onto a real clients row (token_type='instagram_business')
    // and the production scheduler/n8n pipeline can publish for it.
    if (clientIdFromUrl) return;

    let cancelled = false;
    const provision = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (!email || !isMetaAppReviewEmail(email)) return;
        setReviewerEnsuring(true);
        const client = await ensureMetaAppReviewClient();
        if (cancelled) return;
        setEffectiveClientId(client.id);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `Could not prepare the review client row: ${e.message}`
              : 'Could not prepare the review client row.',
          );
        }
      } finally {
        if (!cancelled) setReviewerEnsuring(false);
      }
    };
    void provision();
    return () => {
      cancelled = true;
    };
  }, [clientIdFromUrl]);

  // Resolve config eagerly so config errors (missing env var) surface on
  // mount instead of after the user clicks Continue. We also expose the
  // masked App ID + redirect URI in a small debug panel so we can verify
  // — without opening DevTools — that the build picked up the right env.
  let resolvedAppId = '';
  let resolvedRedirectUri = '';
  let configError: string | null = null;
  try {
    resolvedAppId = getInstagramBusinessAppId();
    resolvedRedirectUri = getInstagramBusinessRedirectUri();
  } catch (e) {
    configError = e instanceof Error ? e.message : String(e);
  }
  const maskedAppId = resolvedAppId
    ? `***${resolvedAppId.slice(-4)} (len=${resolvedAppId.length})`
    : '(missing)';

  const handleConnect = () => {
    try {
      const state = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      window.sessionStorage.setItem('ig_business_oauth_state', state);
      if (effectiveClientId) {
        window.sessionStorage.setItem('ig_business_oauth_client_id', effectiveClientId);
      } else {
        window.sessionStorage.removeItem('ig_business_oauth_client_id');
      }
      const url = getInstagramBusinessAuthUrl(state);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start login flow');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f6f6',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 4, md: 8 },
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
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Chip
                icon={<InstagramIcon sx={{ fontSize: '1rem !important' }} />}
                label="Instagram Business Login"
                size="small"
                sx={{
                  bgcolor: 'rgba(247, 66, 17, 0.08)',
                  color: GLASS.accent.orange,
                  fontWeight: 600,
                  mb: 2,
                }}
              />
              <Typography
                variant="h4"
                sx={{ color: GLASS.text.heading, fontWeight: 700, mb: 1 }}
              >
                Connect your Instagram account
              </Typography>
              <Typography variant="body1" sx={{ color: GLASS.text.muted }}>
                AUPE Manager helps you schedule posts, publish content and
                monitor performance for your Instagram professional account.
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: GLASS.text.heading, fontWeight: 600, mb: 1 }}
              >
                What we&apos;ll ask you to allow
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <PersonIcon sx={{ color: GLASS.accent.blue }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Read your profile
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        Username, profile picture and account type (scope: instagram_business_basic)
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <PublishIcon sx={{ color: GLASS.accent.orange }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Publish content on your behalf
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        Create and publish images to your feed (scope: instagram_business_content_publish)
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <InsightsIcon sx={{ color: GLASS.accent.green }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Read insights for your media
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        Reach, interactions and other metrics (scope: instagram_business_manage_insights)
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </Box>

            {(error || configError) && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  borderRadius: GLASS.radius.inner,
                }}
              >
                <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                  {error || configError}
                </Typography>
              </Paper>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                border: '1px dashed rgba(0, 0, 0, 0.12)',
                borderRadius: GLASS.radius.inner,
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{ color: GLASS.text.muted, fontFamily: 'monospace', fontSize: '0.7rem' }}
              >
                Build config (debug)
                <br />
                client_id: {maskedAppId}
                <br />
                redirect_uri: {resolvedRedirectUri || '(no window.origin)'}
              </Typography>
            </Paper>

            <Button
              variant="contained"
              size="large"
              startIcon={<InstagramIcon />}
              onClick={handleConnect}
              disabled={Boolean(configError) || reviewerEnsuring}
              fullWidth
              sx={{
                bgcolor: GLASS.accent.orange,
                color: '#ffffff',
                fontWeight: 600,
                py: 1.5,
                borderRadius: GLASS.radius.button,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: GLASS.shadow.button,
                '&:hover': {
                  bgcolor: GLASS.accent.orangeDark,
                  boxShadow: GLASS.shadow.buttonHover,
                },
              }}
            >
              {reviewerEnsuring ? 'Preparing…' : 'Continue with Instagram'}
            </Button>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CheckIcon sx={{ fontSize: 16, color: GLASS.accent.green }} />
              <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                You can revoke access any time from your Instagram settings.
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ConnectInstagramBusiness;

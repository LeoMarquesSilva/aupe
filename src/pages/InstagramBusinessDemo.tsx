import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  PersonOutline as PersonIcon,
  PublishOutlined as PublishIcon,
  InsightsOutlined as InsightsIcon,
  Logout as LogoutIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  clearInstagramBusinessToken,
  getInstagramBusinessMedia,
  getInstagramBusinessProfile,
  getInstagramMediaInsights,
  publishInstagramImage,
  readInstagramBusinessToken,
  type InstagramBusinessMedia,
  type InstagramBusinessProfile,
  type InstagramMediaInsight,
} from '../services/instagramBusinessAuthService';
import { GLASS } from '../theme/glassTokens';

interface MediaWithInsights extends InstagramBusinessMedia {
  insights?: InstagramMediaInsight[];
  insightsError?: string;
}

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  scope: string;
  description: string;
}> = ({ icon, title, scope, description }) => (
  <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        bgcolor: 'rgba(247, 66, 17, 0.08)',
        color: GLASS.accent.orange,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Chip
          label={scope}
          size="small"
          sx={{
            bgcolor: 'rgba(62, 84, 181, 0.08)',
            color: GLASS.accent.blue,
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            height: 20,
          }}
        />
      </Stack>
      <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
        {description}
      </Typography>
    </Box>
  </Stack>
);

const InstagramBusinessDemo: React.FC = () => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<InstagramBusinessProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [mediaList, setMediaList] = useState<MediaWithInsights[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);

  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    id: string;
    permalink?: string;
  } | null>(null);

  useEffect(() => {
    const stored = readInstagramBusinessToken();
    if (!stored || !stored.access_token) {
      navigate('/connect/instagram-business', { replace: true });
      return;
    }
    setAccessToken(stored.access_token);
    setUserId(String(stored.user_id));
  }, [navigate]);

  const loadProfile = useCallback(async (token: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const p = await getInstagramBusinessProfile(token);
      setProfile(p);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadMediaWithInsights = useCallback(async (token: string) => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const media = await getInstagramBusinessMedia(token, 5);
      const enriched: MediaWithInsights[] = await Promise.all(
        media.map(async (m) => {
          try {
            const insights = await getInstagramMediaInsights(m.id, m.media_type, token);
            return { ...m, insights };
          } catch (err) {
            return {
              ...m,
              insightsError: err instanceof Error ? err.message : 'Insights unavailable',
            };
          }
        }),
      );
      setMediaList(enriched);
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    void loadProfile(accessToken);
    void loadMediaWithInsights(accessToken);
  }, [accessToken, loadProfile, loadMediaWithInsights]);

  const handlePublish = async () => {
    if (!accessToken || !userId) return;
    if (!imageUrl.trim()) {
      setPublishError('Please provide a public image URL.');
      return;
    }
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);
    try {
      const result = await publishInstagramImage({
        userId,
        imageUrl: imageUrl.trim(),
        caption: caption.trim() || undefined,
        accessToken,
      });
      setPublishResult(result);
      setImageUrl('');
      setCaption('');
      void loadMediaWithInsights(accessToken);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleLogout = () => {
    clearInstagramBusinessToken();
    navigate('/connect/instagram-business', { replace: true });
  };

  const getInsightValue = (insights: InstagramMediaInsight[] | undefined, name: string) => {
    if (!insights) return '—';
    const metric = insights.find((i) => i.name === name);
    const value = metric?.values?.[0]?.value;
    return typeof value === 'number' ? value.toLocaleString('en-US') : '—';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f6f6', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <InstagramIcon sx={{ color: GLASS.accent.orange }} />
              <Typography variant="h5" sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
                Connected account
              </Typography>
            </Stack>
            <Tooltip title="Disconnect and return to login">
              <Button
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                size="small"
                sx={{
                  color: GLASS.text.muted,
                  textTransform: 'none',
                  '&:hover': { color: GLASS.accent.orange },
                }}
              >
                Sign out
              </Button>
            </Tooltip>
          </Stack>

          {/* Section A — instagram_business_basic */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: GLASS.radius.card,
              bgcolor: '#ffffff',
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: GLASS.shadow.card,
            }}
          >
            <SectionHeader
              icon={<PersonIcon />}
              title="Profile (basic)"
              scope="instagram_business_basic"
              description="Reading the authenticated account's profile through the Instagram Graph API."
            />

            {profileLoading && (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={20} sx={{ color: GLASS.accent.orange }} />
                <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                  Loading profile from <code>graph.instagram.com/me</code>...
                </Typography>
              </Stack>
            )}

            {profileError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {profileError}
              </Alert>
            )}

            {profile && (
              <Stack direction="row" spacing={2.5} alignItems="center">
                <Avatar
                  src={profile.profile_picture_url}
                  alt={profile.username}
                  sx={{ width: 72, height: 72, border: `2px solid ${GLASS.border.outer}` }}
                >
                  {profile.username?.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
                      @{profile.username}
                    </Typography>
                    <CheckCircleIcon sx={{ fontSize: 18, color: GLASS.accent.green }} />
                  </Stack>
                  {profile.name && (
                    <Typography variant="body2" sx={{ color: GLASS.text.body }}>
                      {profile.name}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                    {profile.account_type && (
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        Account type: <strong>{profile.account_type}</strong>
                      </Typography>
                    )}
                    {typeof profile.media_count === 'number' && (
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        Media count: <strong>{profile.media_count}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}
          </Paper>

          {/* Section B — instagram_business_content_publish */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: GLASS.radius.card,
              bgcolor: '#ffffff',
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: GLASS.shadow.card,
            }}
          >
            <SectionHeader
              icon={<PublishIcon />}
              title="Publish a photo"
              scope="instagram_business_content_publish"
              description="Two-step flow: create a media container, then publish it to the connected feed."
            />

            <Stack spacing={2}>
              <TextField
                label="Public image URL (JPEG, https://...)"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                fullWidth
                size="small"
                helperText="Instagram requires the URL to be publicly reachable."
              />
              <TextField
                label="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                size="small"
              />

              {publishError && <Alert severity="error">{publishError}</Alert>}

              {publishResult && (
                <Alert
                  severity="success"
                  icon={<CheckCircleIcon />}
                  action={
                    publishResult.permalink ? (
                      <MuiLink
                        href={publishResult.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        View post <OpenInNewIcon fontSize="small" />
                      </MuiLink>
                    ) : undefined
                  }
                >
                  Published successfully (media id <code>{publishResult.id}</code>).
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handlePublish}
                disabled={publishing || !accessToken}
                startIcon={
                  publishing ? (
                    <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                  ) : (
                    <PublishIcon />
                  )
                }
                sx={{
                  bgcolor: GLASS.accent.orange,
                  '&:hover': { bgcolor: GLASS.accent.orangeDark },
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                {publishing ? 'Publishing...' : 'Publish to Instagram'}
              </Button>
            </Stack>
          </Paper>

          {/* Section C — instagram_business_manage_insights */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: GLASS.radius.card,
              bgcolor: '#ffffff',
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: GLASS.shadow.card,
            }}
          >
            <SectionHeader
              icon={<InsightsIcon />}
              title="Recent media and insights"
              scope="instagram_business_manage_insights"
              description="Listing the last 5 media and fetching metrics for each one."
            />

            {mediaLoading && (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={20} sx={{ color: GLASS.accent.orange }} />
                <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                  Loading recent media and their insights...
                </Typography>
              </Stack>
            )}

            {mediaError && <Alert severity="error">{mediaError}</Alert>}

            {!mediaLoading && mediaList.length === 0 && !mediaError && (
              <Alert severity="info">
                No media found for this account yet. Publish one above to see insights here.
              </Alert>
            )}

            {mediaList.length > 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Media</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Reach</TableCell>
                      <TableCell align="right">Likes</TableCell>
                      <TableCell align="right">Comments</TableCell>
                      <TableCell align="right">Saved</TableCell>
                      <TableCell align="right">Total interactions</TableCell>
                      <TableCell align="center">Link</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mediaList.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              src={m.thumbnail_url || m.media_url}
                              variant="rounded"
                              sx={{ width: 36, height: 36 }}
                            />
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ color: GLASS.text.body, display: 'block', maxWidth: 160 }}
                                noWrap
                              >
                                {m.caption || <em>(no caption)</em>}
                              </Typography>
                              {m.timestamp && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: GLASS.text.muted, fontSize: '0.7rem' }}
                                >
                                  {new Date(m.timestamp).toLocaleDateString('en-US')}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.media_type}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              bgcolor: 'rgba(82, 86, 99, 0.08)',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{getInsightValue(m.insights, 'reach')}</TableCell>
                        <TableCell align="right">{getInsightValue(m.insights, 'likes')}</TableCell>
                        <TableCell align="right">
                          {getInsightValue(m.insights, 'comments')}
                        </TableCell>
                        <TableCell align="right">{getInsightValue(m.insights, 'saved')}</TableCell>
                        <TableCell align="right">
                          {getInsightValue(m.insights, 'total_interactions')}
                        </TableCell>
                        <TableCell align="center">
                          {m.permalink ? (
                            <MuiLink
                              href={m.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </MuiLink>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>

          <Divider />
          <Typography
            variant="caption"
            sx={{ color: GLASS.text.muted, textAlign: 'center', display: 'block' }}
          >
            Demonstration of Instagram API with Instagram Login permissions for Meta App Review.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default InstagramBusinessDemo;

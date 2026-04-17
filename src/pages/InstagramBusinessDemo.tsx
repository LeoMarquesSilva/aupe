import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
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
  Image as ImageIcon,
  Movie as MovieIcon,
  CloudUpload as CloudUploadIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import {
  clearInstagramBusinessToken,
  getInstagramBusinessMedia,
  getInstagramBusinessProfile,
  getInstagramMediaInsights,
  publishInstagramImage,
  publishInstagramVideo,
  readInstagramBusinessToken,
  type InstagramBusinessMedia,
  type InstagramBusinessProfile,
  type InstagramMediaInsight,
} from '../services/instagramBusinessAuthService';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { supabaseVideoStorageService } from '../services/supabaseVideoStorageService';
import { GLASS } from '../theme/glassTokens';

/** Same public URL pattern as `scheduleInstagramPost` / n8n (Supabase Storage). */
function isSupabasePostImagesPublicUrl(url: string): boolean {
  return /\/storage\/v1\/object\/public\/post-images\//i.test(url.trim());
}

/**
 * Main app always stores media on Supabase and passes that HTTPS URL to Instagram.
 * Mirror any external URL into `post-images` before publishing so Meta fetches our bucket.
 */
async function mirrorImageToSupabaseIfNeeded(
  rawUrl: string,
  folder: string,
): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error('Image URL is empty');
  if (isSupabasePostImagesPublicUrl(trimmed)) return trimmed;
  const { url } = await supabaseStorageService.uploadImageFromUrl(
    trimmed,
    folder,
    'ig-business-demo.jpg',
  );
  return url;
}

async function mirrorVideoToSupabaseIfNeeded(
  rawUrl: string,
  folder: string,
): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error('Video URL is empty');
  if (isSupabasePostImagesPublicUrl(trimmed)) return trimmed;
  const res = await fetch(trimmed);
  if (!res.ok) throw new Error(`Could not download video (${res.status})`);
  const blob = await res.blob();
  const file = new File([blob], `ig-business-demo-${Date.now()}.mp4`, {
    type: blob.type || 'video/mp4',
  });
  const result = await supabaseVideoStorageService.uploadVideo(file, folder);
  return result.publicUrl || result.url;
}

interface MediaWithInsights extends InstagramBusinessMedia {
  insights?: InstagramMediaInsight[];
  insightsError?: string;
}

type PublishMode = 'image' | 'video';

/**
 * Sample sources downloaded in the browser, then uploaded to Supabase Storage
 * (same pipeline as Create Post / n8n). Instagram only sees the public
 * `post-images` URL — not the original host.
 */
const SAMPLE_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/1024px-Fronalpstock_big.jpg';
/** Short MP4 keeps “Use sample” fast; still mirrored to Storage before Graph. */
const SAMPLE_VIDEO_URL = 'https://download.samplelib.com/mp4/sample-15s.mp4';

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

  const [publishMode, setPublishMode] = useState<PublishMode>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    id: string;
    permalink?: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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

  const resetPublishFeedback = () => {
    setPublishError(null);
    setPublishStatus(null);
    setPublishResult(null);
    setUploadError(null);
  };

  const handlePublish = async () => {
    if (!accessToken || !userId) return;
    resetPublishFeedback();

    const folder = userId || 'instagram-business-demo';

    if (publishMode === 'image') {
      if (!imageUrl.trim()) {
        setPublishError('Please provide a public image URL or upload a file.');
        return;
      }
      setPublishing(true);
      setPublishStatus('Uploading to Supabase Storage (same as scheduled posts)…');
      try {
        const resolvedImageUrl = await mirrorImageToSupabaseIfNeeded(imageUrl, folder);
        if (resolvedImageUrl !== imageUrl.trim()) {
          setImageUrl(resolvedImageUrl);
        }
        setPublishStatus(null);
        const result = await publishInstagramImage({
          userId,
          imageUrl: resolvedImageUrl,
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
        setPublishStatus(null);
      }
      return;
    }

    if (!videoUrl.trim()) {
      setPublishError('Please provide a public video URL or upload a file.');
      return;
    }
    setPublishing(true);
    setPublishStatus('Uploading video to Supabase Storage (same as scheduled posts)…');
    try {
      const resolvedVideoUrl = await mirrorVideoToSupabaseIfNeeded(videoUrl, folder);
      if (resolvedVideoUrl !== videoUrl.trim()) {
        setVideoUrl(resolvedVideoUrl);
      }
      setPublishStatus(null);
      const result = await publishInstagramVideo({
        userId,
        videoUrl: resolvedVideoUrl,
        caption: caption.trim() || undefined,
        accessToken,
        onStatusUpdate: (status) => setPublishStatus(status),
      });
      setPublishResult(result);
      setVideoUrl('');
      setCaption('');
      void loadMediaWithInsights(accessToken);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
      setPublishStatus(null);
    }
  };

  const handleUseSample = async () => {
    resetPublishFeedback();
    if (!accessToken) return;
    const folder = userId || 'instagram-business-demo';
    setUploading(true);
    setUploadError(null);
    try {
      if (publishMode === 'image') {
        const url = await mirrorImageToSupabaseIfNeeded(SAMPLE_IMAGE_URL, folder);
        setImageUrl(url);
        if (!caption) {
          setCaption('Posted from the Instagram Business Login demo (sample image).');
        }
      } else {
        const url = await mirrorVideoToSupabaseIfNeeded(SAMPLE_VIDEO_URL, folder);
        setVideoUrl(url);
        if (!caption) {
          setCaption('Posted from the Instagram Business Login demo (sample reel).');
        }
      }
    } catch (e) {
      setUploadError(
        e instanceof Error
          ? `${e.message} Try uploading a file from your device instead.`
          : 'Sample upload failed. Try uploading from your device.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFilePicked = async (file: File | null) => {
    if (!file || !accessToken) return;
    resetPublishFeedback();
    setUploading(true);
    try {
      // We use the connected Instagram user_id as a folder name in the bucket
      // so demo uploads do not collide with real org users.
      const folder = userId || 'instagram-business-demo';
      if (publishMode === 'image') {
        const result = await supabaseStorageService.uploadImage(file, folder);
        setImageUrl(result.url);
      } else {
        const result = await supabaseVideoStorageService.uploadVideo(file, folder);
        setVideoUrl(result.publicUrl || result.url);
      }
    } catch (e) {
      setUploadError(
        e instanceof Error
          ? e.message
          : 'Upload failed. Try the "Use sample" button instead.',
      );
    } finally {
      setUploading(false);
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

          {/* Intro / explainer for Meta App Reviewers */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: GLASS.radius.card,
              bgcolor: 'rgba(247, 66, 17, 0.04)',
              border: `1px solid rgba(247, 66, 17, 0.2)`,
            }}
          >
            <Typography variant="body2" sx={{ color: GLASS.text.body, lineHeight: 1.6 }}>
              <strong>App Review reviewer notes.</strong> This page demonstrates the three
              Instagram permissions our app requests, end-to-end, against the connected
              Instagram Business / Creator account:
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_basic</code> — read the authenticated profile
                (Section A below).
              </Typography>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_content_publish</code> — publish a photo or a
                Reel (Section B).
              </Typography>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_manage_insights</code> — list recent media and
                read per-media metrics (Section C).
              </Typography>
            </Stack>
          </Paper>

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
              title="A. Profile (basic)"
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
              title="B. Publish a photo or a Reel"
              scope="instagram_business_content_publish"
              description="Same pipeline as the main scheduler: media is stored on Supabase (public URL in the post-images bucket), then Instagram loads that URL — upload a file, paste any HTTPS URL (we mirror it to Storage), or use the sample."
            />

            <Tabs
              value={publishMode}
              onChange={(_, v: PublishMode) => {
                setPublishMode(v);
                resetPublishFeedback();
              }}
              sx={{
                mb: 2,
                minHeight: 36,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minHeight: 36,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                },
                '& .Mui-selected': { color: `${GLASS.accent.orange} !important` },
                '& .MuiTabs-indicator': { bgcolor: GLASS.accent.orange },
              }}
            >
              <Tab
                value="image"
                label="Photo"
                icon={<ImageIcon fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                value="video"
                label="Reel (video)"
                icon={<MovieIcon fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleUseSample}
                  disabled={publishing || uploading}
                  sx={{
                    textTransform: 'none',
                    borderColor: GLASS.accent.orange,
                    color: GLASS.accent.orange,
                    '&:hover': {
                      borderColor: GLASS.accent.orangeDark,
                      bgcolor: 'rgba(247, 66, 17, 0.04)',
                    },
                  }}
                >
                  Use sample {publishMode === 'image' ? 'image' : 'video'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    uploading ? (
                      <CircularProgress size={14} sx={{ color: GLASS.accent.blue }} />
                    ) : (
                      <CloudUploadIcon />
                    )
                  }
                  onClick={() =>
                    publishMode === 'image'
                      ? imageInputRef.current?.click()
                      : videoInputRef.current?.click()
                  }
                  disabled={publishing || uploading}
                  sx={{
                    textTransform: 'none',
                    borderColor: GLASS.accent.blue,
                    color: GLASS.accent.blue,
                    '&:hover': { bgcolor: 'rgba(62, 84, 181, 0.04)' },
                  }}
                >
                  {uploading ? 'Uploading...' : `Upload ${publishMode === 'image' ? 'image' : 'video'} from device`}
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  hidden
                  onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  hidden
                  onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
                />
              </Stack>

              {uploadError && <Alert severity="warning">{uploadError}</Alert>}

              {publishMode === 'image' ? (
                <TextField
                  label="Public image URL (JPEG/PNG, https://...)"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="External URLs are copied to Supabase Storage first (same as Create Post). Instagram then fetches from your project’s public bucket. Max 8 MiB."
                />
              ) : (
                <TextField
                  label="Public video URL (MP4, https://...)"
                  placeholder="https://example.com/reel.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Videos are uploaded to Supabase Storage first (same as Reels in the app), then published. MP4, &lt; 90s, &lt; 1 GB recommended."
                />
              )}

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

              {publishStatus && (
                <Alert
                  severity="info"
                  icon={
                    publishStatus.includes('Uploading') ? (
                      <CircularProgress size={16} sx={{ color: GLASS.accent.blue }} />
                    ) : undefined
                  }
                >
                  {publishStatus}
                </Alert>
              )}

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
                        View on Instagram <OpenInNewIcon fontSize="small" />
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
                disabled={publishing || uploading || !accessToken}
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
                {publishing
                  ? publishMode === 'video'
                    ? 'Processing reel...'
                    : 'Publishing...'
                  : `Publish ${publishMode === 'image' ? 'photo' : 'reel'} to Instagram`}
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
              title="C. Recent media and insights"
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

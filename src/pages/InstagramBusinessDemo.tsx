import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Link as MuiLink,
  Paper,
  Radio,
  RadioGroup,
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
  Schedule as ScheduleIcon,
  FlashOn as FlashIcon,
} from '@mui/icons-material';
import {
  clearInstagramBusinessToken,
  getInstagramBusinessMedia,
  getInstagramBusinessProfile,
  getInstagramMediaInsights,
  readInstagramBusinessToken,
  type InstagramBusinessMedia,
  type InstagramBusinessProfile,
  type InstagramMediaInsight,
} from '../services/instagramBusinessAuthService';
import { clientService, supabase } from '../services/supabaseClient';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { supabaseVideoStorageService } from '../services/supabaseVideoStorageService';
import { scheduleInstagramPost } from '../services/postService';
import { ensureMetaAppReviewClient } from '../services/metaAppReviewClientService';
import { isMetaAppReviewEmail } from '../config/metaAppReview';
import { Client, PostData } from '../types';
import { GLASS } from '../theme/glassTokens';

interface MediaWithInsights extends InstagramBusinessMedia {
  insights?: InstagramMediaInsight[];
  insightsError?: string;
}

type PublishMode = 'image' | 'video';
type ScheduleMode = 'now' | 'later';

/** Terminal states for a `scheduled_posts` row returned by the n8n pipeline. */
const TERMINAL_STATUSES = new Set([
  'posted',
  'published',
  'failed',
  'cancelled',
]);

function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'pending';
  return status.replace(/_/g, ' ');
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

function getDefaultSchedule(): string {
  // Default "Schedule for..." value: 15 minutes from now, formatted for
  // <input type="datetime-local"> ("YYYY-MM-DDTHH:mm").
  const d = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const InstagramBusinessDemo: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get('clientId') || null;

  // --- Connected account ------------------------------------------------------
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [igUserId, setIgUserId] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);

  // --- Section A: profile -----------------------------------------------------
  const [profile, setProfile] = useState<InstagramBusinessProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // --- Section C: media + insights --------------------------------------------
  const [mediaList, setMediaList] = useState<MediaWithInsights[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);

  // --- Section B: publish via production pipeline -----------------------------
  const [publishMode, setPublishMode] = useState<PublishMode>('image');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduledAt, setScheduledAt] = useState<string>(getDefaultSchedule);
  const [caption, setCaption] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>('idle');
  const [pipelineInstagramId, setPipelineInstagramId] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // ----- bootstrap ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const applyClient = (c: Client) => {
      if (cancelled) return;
      setClient(c);
      // Prefer the long-lived token stored on the `clients` row (persisted
      // during the OAuth callback) over the sessionStorage one.
      if (c.accessToken) setAccessToken(c.accessToken);
      if (c.instagramAccountId) setIgUserId(c.instagramAccountId);
    };

    (async () => {
      const stored = readInstagramBusinessToken();
      if (stored?.access_token) {
        setAccessToken(stored.access_token);
        setIgUserId(String(stored.user_id));
      }

      // 1) Explicit clientId in the URL (normal reviewer path after OAuth
      //    callback). Load the client directly.
      if (clientIdFromUrl) {
        try {
          const c = await clientService.getClientById(clientIdFromUrl);
          if (!c) {
            if (!cancelled) {
              setClientLoadError(
                'We could not load the connected client row. Re-run the Instagram Business login flow.',
              );
            }
            return;
          }
          applyClient(c);
        } catch (e) {
          if (!cancelled) {
            setClientLoadError(
              e instanceof Error ? e.message : 'Could not load client.',
            );
          }
        }
        return;
      }

      // 2) No clientId in URL. If the signed-in user is the Meta App Review
      //    reviewer, auto-resolve their dedicated client row. This handles:
      //      - direct navigation to /connect/instagram-business/demo
      //      - callback fall-through when sessionStorage was cleared
      //      - re-entering the demo after a refresh
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (isMetaAppReviewEmail(email)) {
          const c = await ensureMetaAppReviewClient();
          if (!c.accessToken || !c.instagramAccountId) {
            // Reviewer has the client row but hasn't completed OAuth yet —
            // send them to the connect page to finish it.
            if (!cancelled) {
              navigate('/connect/instagram-business', { replace: true });
            }
            return;
          }
          applyClient(c);
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setClientLoadError(
            e instanceof Error ? e.message : 'Could not resolve reviewer client row.',
          );
        }
        return;
      }

      // 3) Anonymous public demo: we only allow Sections A/C via sessionStorage
      //    token (Section B requires a signed-in client). Without a token
      //    there is nothing to show, so bounce back to the connect page.
      if (!stored || !stored.access_token) {
        if (!cancelled) navigate('/connect/instagram-business', { replace: true });
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientIdFromUrl, navigate]);

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

  // ----- upload helpers -------------------------------------------------------
  const resetPublishFeedback = () => {
    setPublishError(null);
    setUploadError(null);
    setPublishedPostId(null);
    setPipelineStatus('idle');
    setPipelineInstagramId(null);
    setPipelineError(null);
  };

  const handleFilePicked = async (file: File | null) => {
    if (!file) return;
    resetPublishFeedback();
    setUploading(true);
    try {
      // The bucket path is `${userId}/...`; using the client.userId keeps
      // uploads scoped to the reviewer's own Supabase user.
      const folder = client?.userId || igUserId || 'instagram-business-demo';
      if (publishMode === 'image') {
        const result = await supabaseStorageService.uploadImage(file, folder);
        setUploadedImageUrl(result.url);
      } else {
        const result = await supabaseVideoStorageService.uploadVideo(file, folder);
        setUploadedVideoUrl(result.publicUrl || result.url);
      }
    } catch (e) {
      setUploadError(
        e instanceof Error ? e.message : 'Upload failed. Please try another file.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClearMedia = () => {
    setUploadedImageUrl(null);
    setUploadedVideoUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // ----- publish via production pipeline --------------------------------------
  const handlePublish = async () => {
    if (!client) {
      setPublishError('Connected client row was not loaded. Re-run the OAuth flow.');
      return;
    }
    if (!client.accessToken || !client.instagramAccountId) {
      setPublishError(
        'Instagram credentials are missing on the client row. Connect Instagram first.',
      );
      return;
    }

    setPublishError(null);
    setPipelineError(null);

    const isReel = publishMode === 'video';
    const mediaUrl = isReel ? uploadedVideoUrl : uploadedImageUrl;
    if (!mediaUrl) {
      setPublishError(
        isReel
          ? 'Please upload a video before publishing.'
          : 'Please upload a photo before publishing.',
      );
      return;
    }

    let scheduledIso: string;
    if (scheduleMode === 'now') {
      scheduledIso = new Date().toISOString();
    } else {
      const picked = new Date(scheduledAt);
      if (Number.isNaN(picked.getTime())) {
        setPublishError('Please pick a valid future date and time.');
        return;
      }
      if (picked.getTime() <= Date.now()) {
        setPublishError('Scheduled time must be in the future.');
        return;
      }
      scheduledIso = picked.toISOString();
    }

    const postData: PostData = {
      clientId: client.id,
      caption: caption.trim(),
      images: [mediaUrl],
      scheduledDate: scheduledIso,
      postType: isReel ? 'reels' : 'post',
      immediate: scheduleMode === 'now',
      ...(isReel
        ? {
            video: mediaUrl,
            shareToFeed: true,
          }
        : {}),
    };

    setPublishing(true);
    setPipelineStatus('pending');
    try {
      const { supabasePost } = await scheduleInstagramPost(postData, client);
      setPublishedPostId(supabasePost.id);
      // Reset the form media (but keep the caption visible for context).
      setUploadedImageUrl(null);
      setUploadedVideoUrl(null);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Scheduling failed.');
      setPipelineStatus('idle');
    } finally {
      setPublishing(false);
    }
  };

  // ----- poll `scheduled_posts` for the terminal status ----------------------
  useEffect(() => {
    if (!publishedPostId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('scheduled_posts')
          .select('status, instagram_post_id, error_message')
          .eq('id', publishedPostId)
          .single();
        if (cancelled) return;
        if (error) {
          setPipelineError(error.message);
          return;
        }
        if (!data) return;
        setPipelineStatus(data.status as string);
        if (data.instagram_post_id) {
          setPipelineInstagramId(data.instagram_post_id);
        }
        if (data.error_message) {
          setPipelineError(data.error_message);
        }
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(interval);
          if (data.status === 'posted' || data.status === 'published') {
            if (accessToken) {
              void loadMediaWithInsights(accessToken);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPipelineError(
            e instanceof Error ? e.message : 'Could not read scheduled_posts.',
          );
        }
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publishedPostId, accessToken, loadMediaWithInsights]);

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

  const pipelineTerminal = pipelineStatus
    ? TERMINAL_STATUSES.has(pipelineStatus)
    : false;
  const pipelinePosted =
    pipelineStatus === 'posted' || pipelineStatus === 'published';
  const mediaReady =
    (publishMode === 'image' && Boolean(uploadedImageUrl)) ||
    (publishMode === 'video' && Boolean(uploadedVideoUrl));
  const canPublish =
    Boolean(client) &&
    mediaReady &&
    !publishing &&
    !uploading &&
    (publishedPostId ? pipelineTerminal : true);

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
              <strong>App Review reviewer notes.</strong> This page demonstrates the
              three Instagram permissions our app requests, end-to-end, against the
              connected Instagram Business / Creator account. Publishing uses the
              same production pipeline as real customers: media is uploaded to
              Supabase Storage, a row is inserted in <code>scheduled_posts</code>,
              and our n8n workflow performs the Graph API calls.
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_basic</code> — read the authenticated
                profile (Section A below).
              </Typography>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_content_publish</code> — publish a photo
                or a Reel, either immediately or at a scheduled time (Section B).
              </Typography>
              <Typography variant="caption" sx={{ color: GLASS.text.body }}>
                • <code>instagram_business_manage_insights</code> — list recent
                media and read per-media metrics (Section C).
              </Typography>
            </Stack>
          </Paper>

          {clientLoadError && <Alert severity="error">{clientLoadError}</Alert>}

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

          {/* Section B — instagram_business_content_publish (production pipeline) */}
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
              description="Same flow as our production scheduler: upload media, choose Post now or Schedule for a later time, and the post goes through Supabase + n8n to the Instagram Graph API."
            />

            {!client && !clientLoadError && (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={18} sx={{ color: GLASS.accent.blue }} />
                <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                  Loading the connected client row...
                </Typography>
              </Stack>
            )}

            {client && (
              <Stack spacing={2}>
                <Tabs
                  value={publishMode}
                  onChange={(_, v: PublishMode) => {
                    setPublishMode(v);
                    resetPublishFeedback();
                    handleClearMedia();
                  }}
                  sx={{
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

                {/* Upload */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                    {uploading
                      ? 'Uploading...'
                      : `Upload ${publishMode === 'image' ? 'photo' : 'video'} from device`}
                  </Button>
                  {(uploadedImageUrl || uploadedVideoUrl) && !uploading && (
                    <Button
                      size="small"
                      onClick={handleClearMedia}
                      sx={{ textTransform: 'none', color: GLASS.text.muted }}
                    >
                      Remove
                    </Button>
                  )}
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

                {uploadedImageUrl && publishMode === 'image' && (
                  <Box
                    component="img"
                    src={uploadedImageUrl}
                    alt="Uploaded preview"
                    sx={{
                      maxWidth: 240,
                      borderRadius: GLASS.radius.inner,
                      border: `1px solid ${GLASS.border.outer}`,
                    }}
                  />
                )}

                {uploadedVideoUrl && publishMode === 'video' && (
                  <Box
                    component="video"
                    src={uploadedVideoUrl}
                    controls
                    sx={{
                      maxWidth: 320,
                      borderRadius: GLASS.radius.inner,
                      border: `1px solid ${GLASS.border.outer}`,
                    }}
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

                {/* Post now / Schedule */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: GLASS.text.heading, fontWeight: 600, mb: 0.5 }}
                  >
                    When should we publish?
                  </Typography>
                  <RadioGroup
                    row
                    value={scheduleMode}
                    onChange={(_, v) => setScheduleMode(v as ScheduleMode)}
                  >
                    <FormControlLabel
                      value="now"
                      control={<Radio size="small" sx={{ color: GLASS.accent.orange }} />}
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <FlashIcon fontSize="small" />
                          <span>Post now</span>
                        </Stack>
                      }
                    />
                    <FormControlLabel
                      value="later"
                      control={<Radio size="small" sx={{ color: GLASS.accent.blue }} />}
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ScheduleIcon fontSize="small" />
                          <span>Schedule for...</span>
                        </Stack>
                      }
                    />
                  </RadioGroup>
                  {scheduleMode === 'later' && (
                    <TextField
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      size="small"
                      sx={{ mt: 1, maxWidth: 260 }}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>

                {publishError && <Alert severity="error">{publishError}</Alert>}

                {publishedPostId && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: GLASS.radius.inner,
                      bgcolor: pipelinePosted
                        ? 'rgba(34, 197, 94, 0.06)'
                        : pipelineStatus === 'failed'
                          ? 'rgba(220, 38, 38, 0.06)'
                          : 'rgba(62, 84, 181, 0.06)',
                      border: `1px solid ${
                        pipelinePosted
                          ? 'rgba(34, 197, 94, 0.3)'
                          : pipelineStatus === 'failed'
                            ? 'rgba(220, 38, 38, 0.3)'
                            : 'rgba(62, 84, 181, 0.25)'
                      }`,
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {!pipelineTerminal && (
                          <CircularProgress
                            size={16}
                            sx={{ color: GLASS.accent.blue }}
                          />
                        )}
                        {pipelinePosted && (
                          <CheckCircleIcon
                            sx={{ color: GLASS.accent.green, fontSize: 18 }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{ color: GLASS.text.body, fontWeight: 600 }}
                        >
                          Pipeline status:{' '}
                          <code>{formatStatusLabel(pipelineStatus)}</code>
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                        scheduled_posts.id = <code>{publishedPostId}</code>
                      </Typography>
                      {pipelineInstagramId && (
                        <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                          Instagram media id:{' '}
                          <code>{pipelineInstagramId}</code>
                        </Typography>
                      )}
                      {pipelinePosted && (
                        <Typography variant="body2" sx={{ color: GLASS.accent.green }}>
                          Post is now live on the connected Instagram account.
                          Scroll down to Section C to see it appear with insights.
                        </Typography>
                      )}
                      {pipelineStatus === 'failed' && pipelineError && (
                        <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                          {pipelineError}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}

                <Button
                  variant="contained"
                  onClick={handlePublish}
                  disabled={!canPublish}
                  startIcon={
                    publishing ? (
                      <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                    ) : scheduleMode === 'now' ? (
                      <FlashIcon />
                    ) : (
                      <ScheduleIcon />
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
                    ? 'Scheduling...'
                    : scheduleMode === 'now'
                      ? `Post ${publishMode === 'image' ? 'photo' : 'reel'} now`
                      : `Schedule ${publishMode === 'image' ? 'photo' : 'reel'}`}
                </Button>
              </Stack>
            )}
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

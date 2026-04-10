import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Button,
  LinearProgress,
  useTheme,
  CircularProgress,
  Avatar,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Chip,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  PostAdd as PostIcon,
  Slideshow as ReelsIcon,
  AddPhotoAlternate as StoryIcon,
  AdminPanelSettings as AdminIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  BarChart as BarChartIcon,
  WarningAmber as WarningIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CardMembership as PlanIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as AccessTimeIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { roleService } from '../services/roleService';
import { subscriptionService } from '../services/subscriptionService';
import { subscriptionLimitsService, SubscriptionLimits } from '../services/subscriptionLimitsService';
import { supabase, postService } from '../services/supabaseClient';
import { ImageUrlService } from '../services/imageUrlService';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';
import { resolveAgencyLogoSrc } from '../services/imageUrlService';

const BRAND = {
  orange: '#f74211',
  orangeDark: '#d4380d',
  navy: '#0a0f2d',
  blue: '#3e54b5',
  green: '#10b981',
  muted: '#525663',
  border: 'rgba(82, 86, 99, 0.12)',
  borderStrong: 'rgba(82, 86, 99, 0.18)',
  surface: '#ffffff',
  pageBg: '#f6f6f6',
};

const CARD_SX = {
  borderRadius: '14px',
  border: `1px solid ${BRAND.border}`,
  bgcolor: BRAND.surface,
  boxShadow: '0 1px 3px rgba(10,15,45,0.06), 0 1px 2px rgba(10,15,45,0.04)',
  transition: 'box-shadow 0.22s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    boxShadow: '0 8px 24px -4px rgba(10,15,45,0.10)',
  },
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getUserDisplayName = (user: { user_metadata?: { full_name?: string }; email?: string } | null): string => {
  if (!user) return '';
  const name = user.user_metadata?.full_name?.trim();
  if (name) return name.split(' ')[0];
  return user.email?.split('@')[0] || 'Usuário';
};

interface PostWithClient {
  id: string;
  scheduledDate: string;
  caption: string;
  postType: string;
  status: string;
  clientId: string;
  clientName: string;
  clientLogoUrl?: string | null;
  imagePreviewUrl?: string | null;
  coverImageUrl?: string | null;
  imageUrls?: string[];
  videoUrl?: string | null;
  errorMessage?: string;
  retryCount?: number;
  postedAt?: string;
}

interface TopClientRow {
  clientId: string;
  clientName: string;
  clientLogoUrl?: string | null;
  count: number;
}

const getPostTypeLabel = (postType: string) => {
  const map: Record<string, string> = { post: 'Post', carousel: 'Carrossel', reels: 'Reels', stories: 'Story' };
  return map[postType] || postType;
};

const getPostTypeBadgeColor = (postType: string): string => {
  const map: Record<string, string> = {
    post: BRAND.blue,
    carousel: BRAND.orange,
    reels: '#7c3aed',
    stories: '#db2777',
  };
  return map[postType] || BRAND.muted;
};

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [orgStats, setOrgStats] = useState<{ scheduledPosts: number; publishedPosts: number } | null>(null);
  const [homeClients, setHomeClients] = useState<{ id: string; name: string; instagram?: string | null; is_active?: boolean | null }[]>([]);
  const [postsByMonth, setPostsByMonth] = useState<{ name: string; posts: number; fullMonth: string }[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<PostWithClient[]>([]);
  const [failedPosts, setFailedPosts] = useState<PostWithClient[]>([]);
  const [lastPublishedPosts, setLastPublishedPosts] = useState<PostWithClient[]>([]);
  const [planLimits, setPlanLimits] = useState<SubscriptionLimits | null>(null);
  const [topClients, setTopClients] = useState<TopClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewCarouselIndex, setPreviewCarouselIndex] = useState(0);

  const activeClientsCount = useMemo(() => homeClients.filter((c) => c.is_active !== false).length, [homeClients]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const admin = await roleService.isCurrentUserAdmin();
          setIsAdmin(admin);
        } catch {
          setIsAdmin(false);
        }
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) { setHomeClients([]); setLoading(false); return; }
      try {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = (profile as any)?.organization_id;
        if (!orgId) {
          setHomeClients([]);
          setOrganizationName(null);
          setAgencyLogoUrl(null);
          setLoading(false);
          return;
        }

        const [orgData, clientsDataRes, postsRes] = await Promise.all([
          subscriptionService.getOrganization(orgId),
          supabase.from('clients').select('id, name, instagram, is_active').eq('organization_id', orgId).order('name'),
          supabase.from('scheduled_posts').select('id, status, posted_at, scheduled_date').eq('organization_id', orgId),
        ]);

        setOrganizationName(orgData?.name || null);
        setAgencyLogoUrl(orgData?.agency_logo_url ?? null);
        setHomeClients(clientsDataRes.data ?? []);

        const allPosts = postsRes.data || [];
        const scheduled = allPosts.filter((p: { status: string }) => ['pending', 'sent_to_n8n', 'processing'].includes(p.status)).length;
        const published = allPosts.filter((p: { status: string }) => ['posted', 'published'].includes(p.status)).length;
        setOrgStats({ scheduledPosts: scheduled, publishedPosts: published });

        const postedPosts = allPosts.filter((p: { status: string }) => ['posted', 'published'].includes(p.status));
        const now = new Date();
        const months: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(now, i);
          months[format(startOfMonth(d), 'yyyy-MM')] = 0;
        }
        postedPosts.forEach((p: { posted_at?: string; scheduled_date?: string }) => {
          const dateStr = p.posted_at || p.scheduled_date;
          if (dateStr) {
            const key = format(startOfMonth(new Date(dateStr)), 'yyyy-MM');
            if (months[key] !== undefined) months[key]++;
          }
        });
        setPostsByMonth(Object.entries(months).map(([key, count]) => {
          const monthName = format(new Date(key + '-01'), 'MMM', { locale: ptBR });
          return { fullMonth: key, name: monthName.charAt(0).toUpperCase() + monthName.slice(1), posts: count };
        }));

        const nowIso = new Date().toISOString();
        const getImageUrls = (p: any): string[] => {
          if (!p.images || !Array.isArray(p.images)) return [];
          return p.images.map((item: any) => {
            const url = typeof item === 'string' ? item : (item?.url ?? item?.path);
            return url ? ImageUrlService.getPublicUrl(url) : null;
          }).filter(Boolean);
        };
        const mapRow = (p: any): PostWithClient => {
          const postType = p.post_type || 'post';
          const imageUrls = getImageUrls(p);
          const coverImageUrl = p.cover_image ? ImageUrlService.getPublicUrl(p.cover_image) : null;
          const videoUrl = p.video ? ImageUrlService.getPublicUrl(p.video) : null;

          // For Reels: prefer cover_image, then fall back to null (video will be rendered directly)
          // For Stories/posts: use first image from images array
          let imagePreviewUrl: string | null = null;
          if (postType === 'reels') {
            imagePreviewUrl = coverImageUrl;
          } else {
            imagePreviewUrl = imageUrls.length > 0 ? imageUrls[0] : null;
          }

          return {
            id: p.id,
            scheduledDate: p.scheduled_date,
            caption: p.caption || '',
            postType,
            status: p.status,
            clientId: p.client_id,
            clientName: p.clients?.name || 'Cliente',
            clientLogoUrl: p.clients?.profile_picture ?? p.clients?.logo_url ?? null,
            imagePreviewUrl,
            coverImageUrl,
            imageUrls,
            videoUrl,
            errorMessage: p.error_message,
            retryCount: p.retry_count ?? 0,
            postedAt: p.posted_at,
          };
        };

        const { data: upcoming } = await supabase
          .from('scheduled_posts')
          .select('id, scheduled_date, caption, post_type, status, client_id, images, video, cover_image, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId).in('status', ['pending', 'sent_to_n8n', 'processing'])
          .gt('scheduled_date', nowIso).order('scheduled_date', { ascending: true }).limit(6);
        setUpcomingPosts((upcoming || []).map(mapRow));

        const { data: failed } = await supabase
          .from('scheduled_posts')
          .select('id, scheduled_date, caption, post_type, status, client_id, error_message, retry_count, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId).eq('status', 'failed')
          .order('last_retry_at', { ascending: false }).limit(5);
        setFailedPosts((failed || []).map(mapRow));

        const { data: lastPublishedData } = await supabase
          .from('scheduled_posts')
          .select('id, posted_at, caption, post_type, status, client_id, images, video, cover_image, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId).in('status', ['posted', 'published'])
          .not('posted_at', 'is', null).order('posted_at', { ascending: false }).limit(6);
        setLastPublishedPosts((lastPublishedData || []).map((p: any) => ({ ...mapRow(p), scheduledDate: p.posted_at || p.scheduled_date })));

        try { const limits = await subscriptionLimitsService.getCurrentLimits(); setPlanLimits(limits); } catch { setPlanLimits(null); }

        const { data: forTopClients } = await supabase
          .from('scheduled_posts')
          .select('client_id, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId).in('status', ['pending', 'sent_to_n8n', 'processing']);
        const byClient: Record<string, { name: string; logoUrl?: string | null; count: number }> = {};
        (forTopClients || []).forEach((p: any) => {
          const cid = p.client_id;
          if (!byClient[cid]) byClient[cid] = { name: p.clients?.name || 'Cliente', logoUrl: p.clients?.profile_picture ?? p.clients?.logo_url ?? null, count: 0 };
          byClient[cid].count++;
        });
        setTopClients(
          Object.entries(byClient)
            .map(([clientId, v]) => ({ clientId, clientName: v.name, clientLogoUrl: v.logoUrl ?? null, count: v.count }))
            .sort((a, b) => b.count - a.count).slice(0, 5)
        );
      } catch (err) {
        console.error('Erro ao carregar dados da organização:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const greeting = getGreeting();
  const displayName = getUserDisplayName(user);
  const nextPost = upcomingPosts[0] ?? null;

  const handleRetryPost = async (postId: string) => {
    try {
      await postService.retryFailedPost(postId);
      setFailedPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  };

  const quickActions = [
    { label: 'Clientes', path: '/clients', icon: <PeopleIcon sx={{ fontSize: 15 }} /> },
    { label: 'Calendário', path: '/calendar', icon: <CalendarIcon sx={{ fontSize: 15 }} /> },
    { label: 'Criar Post', path: '/create-post', icon: <PostIcon sx={{ fontSize: 15 }} /> },
    { label: 'Criar Reels', path: '/create-reels', icon: <ReelsIcon sx={{ fontSize: 15 }} /> },
    { label: 'Criar Story', path: '/create-story', icon: <StoryIcon sx={{ fontSize: 15 }} /> },
  ];

  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ ...appShellContainerSx, py: { xs: 2.5, md: 4 } }}
    >

      {/* ── SECTION 1: Greeting ──────────────────────────────────── */}
      <Box
        className="grain-overlay premium-header-bg"
        sx={{
          p: { xs: 2, md: 2.75 },
          borderRadius: GLASS.radius.card,
          border: `1px solid rgba(255, 255, 255, 0.18)`,
          boxShadow: '0 16px 38px -24px rgba(10, 15, 45, 0.8)',
          mb: 2.5,
        }}
      >
        {/* Logo + greeting */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
          {agencyLogoUrl && (
            <Avatar
              src={resolveAgencyLogoSrc(agencyLogoUrl)}
              variant="rounded"
              sx={{
                width: { xs: 40, md: 48 },
                height: { xs: 40, md: 48 },
                flexShrink: 0,
                border: `1px solid rgba(255,255,255,0.22)`,
                bgcolor: 'rgba(255,255,255,0.12)',
                objectFit: 'contain',
              }}
            />
          )}
          <Typography
            component="h1"
            className="premium-header-title"
            sx={{
              fontFamily: '"Cabinet Grotesk", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.55rem', md: '1.9rem' },
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''}
          </Typography>
        </Box>

        <Typography
          className="premium-header-subtitle"
          variant="body2"
          sx={{ mb: 2.5, textTransform: 'capitalize', letterSpacing: '0.01em' }}
        >
          {organizationName ? `${organizationName} · ` : ''}{todayStr}
        </Typography>

        {/* Quick actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {quickActions.map((item) => (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.4,
                py: 0.6,
                borderRadius: '999px',
                border: `1px solid rgba(255,255,255,0.22)`,
                bgcolor: 'rgba(255,255,255,0.12)',
                cursor: 'pointer',
                transition: 'all 0.18s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.35)' },
              }}
            >
              <Box sx={{ color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
          {isAdmin && (
            <Box
              onClick={() => navigate('/admin')}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.6, px: 1.4, py: 0.6,
                borderRadius: '999px', border: `1px solid rgba(255,255,255,0.22)`,
                bgcolor: 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.18s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.35)' },
              }}
            >
              <AdminIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }} />
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                Admin
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── SECTION 2: Metric cards ──────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: BRAND.orange }} />
        </Box>
      ) : orgStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Clientes ativos */}
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ ...CARD_SX }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 }, pb: '20px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '10px',
                      bgcolor: 'rgba(62,84,181,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 22, color: BRAND.blue }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem', mt: 0.5 }}>
                    Clientes
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Cabinet Grotesk", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '2.8rem', md: '3.2rem' },
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: BRAND.navy,
                    mb: 0.5,
                  }}
                >
                  {activeClientsCount}
                </Typography>
                <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>
                  {homeClients.length > activeClientsCount
                    ? `+${homeClients.length - activeClientsCount} inativos`
                    : `${homeClients.length} no total`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Posts agendados */}
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ ...CARD_SX }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 }, pb: '20px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '10px',
                      bgcolor: 'rgba(247,66,17,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 22, color: BRAND.orange }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem', mt: 0.5 }}>
                    Agendados
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Cabinet Grotesk", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '2.8rem', md: '3.2rem' },
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: BRAND.navy,
                    mb: 0.5,
                  }}
                >
                  {orgStats.scheduledPosts}
                </Typography>
                <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>
                  posts na fila
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Posts publicados */}
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ ...CARD_SX }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 }, pb: '20px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '10px',
                      bgcolor: 'rgba(16,185,129,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 22, color: BRAND.green }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem', mt: 0.5 }}>
                    Publicados
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Cabinet Grotesk", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '2.8rem', md: '3.2rem' },
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: BRAND.navy,
                    mb: 0.5,
                  }}
                >
                  {orgStats.publishedPosts}
                </Typography>
                <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>
                  posts no total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── SECTION 3: Featured "Próximo Agendado" ───────────────── */}
      {!loading && nextPost && (
        <>
          <Card
            elevation={0}
            sx={{
              ...CARD_SX,
              mb: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              overflow: 'hidden',
            }}
          >
            {/* Media preview */}
            {(nextPost.imagePreviewUrl || nextPost.videoUrl) && (
              <Box
                onClick={() => setPreviewModalOpen(true)}
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                  width: { xs: '100%', sm: 240 },
                  minWidth: { sm: 240 },
                  height: { xs: 200, sm: 240 },
                  bgcolor: '#0a0f2d',
                  overflow: 'hidden',
                }}
              >
                {nextPost.imagePreviewUrl ? (
                  <CardMedia
                    component="img"
                    image={nextPost.imagePreviewUrl}
                    alt="Preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : nextPost.videoUrl ? (
                  <Box
                    component="video"
                    src={nextPost.videoUrl}
                    poster={nextPost.coverImageUrl ?? undefined}
                    preload="metadata"
                    muted
                    playsInline
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                    onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                      e.currentTarget.currentTime = 0.1;
                    }}
                  />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ReelsIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                )}
                {/* Post type badge */}
                <Box
                  sx={{
                    position: 'absolute', top: 12, left: 12,
                    bgcolor: getPostTypeBadgeColor(nextPost.postType),
                    color: '#fff', px: 1.2, py: 0.3,
                    borderRadius: '999px',
                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}
                >
                  {getPostTypeLabel(nextPost.postType)}
                </Box>
                {/* Carousel indicator */}
                {(nextPost.imageUrls?.length ?? 0) > 1 && (
                  <Box
                    sx={{
                      position: 'absolute', bottom: 10, right: 10,
                      bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                      px: 1, py: 0.3, borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
                    }}
                  >
                    1/{nextPost.imageUrls!.length}
                  </Box>
                )}
                {/* Hover overlay */}
                <Box
                  sx={{
                    position: 'absolute', inset: 0,
                    bgcolor: 'rgba(0,0,0,0)', transition: 'background-color 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' },
                  }}
                >
                  <VisibilityIcon sx={{ color: 'rgba(255,255,255,0)', fontSize: 32, transition: 'color 0.2s', '.MuiBox-root:hover &': { color: '#fff' } }} />
                </Box>
              </Box>
            )}

            {/* Content */}
            <CardContent sx={{ p: { xs: 2.5, md: 3 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: BRAND.orange, mb: 1,
                  }}
                >
                  Próximo agendado
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar
                    src={nextPost.clientLogoUrl ? ImageUrlService.getPublicUrl(nextPost.clientLogoUrl) : undefined}
                    sx={{ width: 36, height: 36, bgcolor: BRAND.orange, fontSize: '0.875rem', flexShrink: 0 }}
                  >
                    {nextPost.clientName?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography
                    sx={{
                      fontFamily: '"Cabinet Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.15rem',
                      color: BRAND.navy,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {nextPost.clientName}
                  </Typography>
                </Box>

                {nextPost.caption && (
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND.muted, lineHeight: 1.55, mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {nextPost.caption}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <AccessTimeIcon sx={{ fontSize: 15, color: BRAND.muted }} />
                  <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>
                    {format(new Date(nextPost.scheduledDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 2.5, flexWrap: 'wrap' }}>
                {(nextPost.imagePreviewUrl || nextPost.videoUrl) && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon sx={{ fontSize: '1rem !important' }} />}
                    onClick={() => setPreviewModalOpen(true)}
                    sx={{ borderColor: BRAND.border, color: BRAND.navy, borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, '&:hover': { borderColor: BRAND.borderStrong, bgcolor: 'rgba(0,0,0,0.03)' } }}
                  >
                    Preview
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate('/calendar')}
                  sx={{ borderColor: BRAND.border, color: BRAND.navy, borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, '&:hover': { borderColor: BRAND.borderStrong, bgcolor: 'rgba(0,0,0,0.03)' } }}
                >
                  Calendário
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<EditIcon sx={{ fontSize: '1rem !important' }} />}
                  onClick={() => navigate(`/edit-post/${nextPost.id}`)}
                  sx={{ bgcolor: BRAND.orange, borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: BRAND.orangeDark, boxShadow: 'none' } }}
                >
                  Editar
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Preview modal */}
          <Dialog
            open={previewModalOpen}
            onClose={() => { setPreviewModalOpen(false); setPreviewCarouselIndex(0); }}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: '14px', overflow: 'hidden',
                bgcolor: BRAND.surface,
                border: `1px solid ${BRAND.border}`,
                boxShadow: '0 20px 60px rgba(10,15,45,0.18)',
              },
            }}
          >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BRAND.border}`, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={nextPost.clientLogoUrl ? ImageUrlService.getPublicUrl(nextPost.clientLogoUrl) : undefined} sx={{ width: 34, height: 34, bgcolor: BRAND.orange }}>
                  {nextPost.clientName?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{nextPost.clientName}</Typography>
                  <Typography variant="caption" color="text.secondary">{getPostTypeLabel(nextPost.postType)} · {format(new Date(nextPost.scheduledDate), "dd/MM 'às' HH:mm", { locale: ptBR })}</Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => { setPreviewModalOpen(false); setPreviewCarouselIndex(0); }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#000' }}>
              {nextPost.postType === 'reels' && nextPost.videoUrl ? (
                <video src={nextPost.videoUrl} controls style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              ) : (nextPost.imageUrls && nextPost.imageUrls.length > 0) ? (
                <Box sx={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  {nextPost.imageUrls.length > 1 && (
                    <IconButton sx={{ position: 'absolute', left: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }} onClick={() => setPreviewCarouselIndex((i) => Math.max(0, i - 1))}>
                      <ChevronLeftIcon />
                    </IconButton>
                  )}
                  <Box component="img" src={nextPost.imageUrls[previewCarouselIndex]} alt="Preview" sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                  {nextPost.imageUrls.length > 1 && (
                    <IconButton sx={{ position: 'absolute', right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }} onClick={() => setPreviewCarouselIndex((i) => Math.min(nextPost!.imageUrls!.length - 1, i + 1))}>
                      <ChevronRightIcon />
                    </IconButton>
                  )}
                </Box>
              ) : (
                <Box sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography>Sem mídia para preview</Typography>
                </Box>
              )}
              {nextPost.caption && (
                <Box sx={{ p: 2, width: '100%', bgcolor: BRAND.surface, borderTop: `1px solid ${BRAND.border}` }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{nextPost.caption}</Typography>
                </Box>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── SECTION 4: Two-column grid ───────────────────────────── */}
      {!loading && (upcomingPosts.length > 0 || failedPosts.length > 0 || planLimits || topClients.length > 0) && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Left column */}
          <Grid item xs={12} md={6}>
            {upcomingPosts.length > 0 && (
              <Card elevation={0} sx={{ ...CARD_SX, mb: 2 }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon sx={{ fontSize: 18, color: BRAND.orange }} />
                      <Typography sx={{ fontFamily: '"Cabinet Grotesk", sans-serif', fontWeight: 700, fontSize: '0.9rem', color: BRAND.navy }}>
                        Próximos na fila
                      </Typography>
                    </Box>
                    <Chip
                      label={`${upcomingPosts.length}`}
                      size="small"
                      sx={{ bgcolor: 'rgba(247,66,17,0.08)', color: BRAND.orange, fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                    />
                  </Box>

                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {upcomingPosts.slice(nextPost ? 1 : 0, nextPost ? 6 : 5).map((p, idx) => (
                      <Box
                        component="li"
                        key={p.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          py: 1.25,
                          borderTop: idx > 0 ? `1px solid ${BRAND.border}` : 'none',
                        }}
                      >
                        <Avatar
                          src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined}
                          sx={{ width: 34, height: 34, bgcolor: BRAND.orange, fontSize: '0.8rem', flexShrink: 0 }}
                        >
                          {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.clientName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                            <Box
                              sx={{
                                width: 6, height: 6, borderRadius: '50%',
                                bgcolor: getPostTypeBadgeColor(p.postType),
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>
                              {getPostTypeLabel(p.postType)} · {format(new Date(p.scheduledDate), 'dd/MM HH:mm', { locale: ptBR })}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/edit-post/${p.id}`)}
                          sx={{
                            width: 30, height: 30, flexShrink: 0,
                            border: `1px solid ${BRAND.border}`,
                            borderRadius: '8px',
                            color: BRAND.muted,
                            '&:hover': { bgcolor: 'rgba(247,66,17,0.06)', borderColor: 'rgba(247,66,17,0.2)', color: BRAND.orange },
                          }}
                        >
                          <ArrowForwardIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    size="small"
                    onClick={() => navigate('/calendar')}
                    sx={{
                      mt: 1.5,
                      bgcolor: BRAND.navy,
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      py: 0.9,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#151c42', boxShadow: 'none' },
                    }}
                  >
                    Ver calendário completo
                  </Button>
                </CardContent>
              </Card>
            )}

            {failedPosts.length > 0 && (
              <Card elevation={0} sx={{ ...CARD_SX, border: `1px solid rgba(239,68,68,0.2)` }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <WarningIcon sx={{ fontSize: 17, color: theme.palette.error.main }} />
                    </Box>
                    <Typography sx={{ fontFamily: '"Cabinet Grotesk", sans-serif', fontWeight: 700, fontSize: '0.9rem', color: theme.palette.error.dark }}>
                      Precisam de atenção
                    </Typography>
                    <Chip label={failedPosts.length} size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: theme.palette.error.main, fontWeight: 700, height: 22, fontSize: '0.72rem' }} />
                  </Box>

                  {failedPosts.slice(0, 5).map((p, idx) => (
                    <Box
                      key={p.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        py: 1.25,
                        borderTop: idx > 0 ? `1px solid rgba(239,68,68,0.1)` : 'none',
                      }}
                    >
                      <Avatar src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined} sx={{ width: 34, height: 34, bgcolor: BRAND.orange, fontSize: '0.8rem', flexShrink: 0 }}>
                        {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.clientName} · {getPostTypeLabel(p.postType)}
                        </Typography>
                        {p.errorMessage && (
                          <Typography variant="caption" sx={{ color: BRAND.muted, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.errorMessage.slice(0, 55)}{p.errorMessage.length > 55 ? '…' : ''}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => navigate(`/edit-post/${p.id}`)} sx={{ width: 30, height: 30, border: `1px solid ${BRAND.border}`, borderRadius: '8px', color: BRAND.muted }}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRetryPost(p.id)} sx={{ width: 30, height: 30, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '8px', color: theme.palette.error.main, bgcolor: 'rgba(239,68,68,0.06)', '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' } }}>
                          <RefreshIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={6}>
            {planLimits && planLimits.maxPostsPerMonth < 999999 && (
              <Card elevation={0} sx={{ ...CARD_SX, mb: 2 }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(62,84,181,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlanIcon sx={{ fontSize: 17, color: BRAND.blue }} />
                    </Box>
                    <Typography sx={{ fontFamily: '"Cabinet Grotesk", sans-serif', fontWeight: 700, fontSize: '0.9rem', color: BRAND.navy }}>
                      Uso do plano
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: BRAND.muted, fontWeight: 500 }}>Posts este mês</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: BRAND.navy }}>
                      {planLimits.currentPostsThisMonth} <Typography component="span" variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>/ {planLimits.maxPostsPerMonth}</Typography>
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (planLimits.currentPostsThisMonth / planLimits.maxPostsPerMonth) * 100)}
                    sx={{
                      height: 6, borderRadius: '999px', bgcolor: 'rgba(82,86,99,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: BRAND.orange, borderRadius: '999px' },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: BRAND.muted, mt: 0.75, display: 'block' }}>
                    {Math.max(0, planLimits.maxPostsPerMonth - planLimits.currentPostsThisMonth)} posts restantes no plano
                  </Typography>
                </CardContent>
              </Card>
            )}

            {topClients.length > 0 && (
              <Card elevation={0} sx={{ ...CARD_SX }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, pb: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUpIcon sx={{ fontSize: 18, color: BRAND.green }} />
                      <Typography sx={{ fontFamily: '"Cabinet Grotesk", sans-serif', fontWeight: 700, fontSize: '0.9rem', color: BRAND.navy }}>
                        Top clientes
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 500 }}>posts agendados</Typography>
                  </Box>

                  {topClients.map((c, idx) => {
                    const max = topClients[0]?.count || 1;
                    return (
                      <Box
                        key={c.clientId}
                        onClick={() => navigate(`/client/${c.clientId}`)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          py: 1.25, cursor: 'pointer',
                          borderTop: idx > 0 ? `1px solid ${BRAND.border}` : 'none',
                          borderRadius: '8px',
                          px: 0.5,
                          mx: -0.5,
                          transition: 'background-color 0.15s',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, color: BRAND.muted, fontSize: '0.7rem', width: 16, flexShrink: 0, textAlign: 'center' }}>
                          {idx + 1}
                        </Typography>
                        <Avatar src={c.clientLogoUrl ? ImageUrlService.getPublicUrl(c.clientLogoUrl) : undefined} sx={{ width: 34, height: 34, bgcolor: BRAND.orange, fontSize: '0.8rem', flexShrink: 0 }}>
                          {c.clientName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.clientName}
                          </Typography>
                          {/* Mini bar */}
                          <Box sx={{ mt: 0.5, height: 3, borderRadius: '999px', bgcolor: 'rgba(82,86,99,0.1)', overflow: 'hidden', width: '100%' }}>
                            <Box sx={{ height: '100%', borderRadius: '999px', bgcolor: BRAND.orange, width: `${(c.count / max) * 100}%`, transition: 'width 0.4s ease' }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: BRAND.navy, flexShrink: 0 }}>
                          {c.count}
                        </Typography>
                      </Box>
                    );
                  })}

                  <Button
                    fullWidth size="small"
                    onClick={() => navigate('/clients')}
                    sx={{
                      mt: 1.5,
                      bgcolor: BRAND.navy,
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      py: 0.9,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#151c42', boxShadow: 'none' },
                    }}
                  >
                    Ver todos os clientes
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── SECTION 5: Last published ────────────────────────────── */}
      {!loading && lastPublishedPosts.length > 0 && (
        <Card elevation={0} sx={{ ...CARD_SX, mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 }, pb: '16px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 18, color: BRAND.green }} />
                <Typography sx={{ fontFamily: '"Cabinet Grotesk", sans-serif', fontWeight: 700, fontSize: '0.9rem', color: BRAND.navy }}>
                  Últimos publicados
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: '0.9rem !important' }} />}
                onClick={() => navigate('/calendar')}
                sx={{ color: BRAND.muted, fontSize: '0.75rem', fontWeight: 600, p: 0, minWidth: 0, '&:hover': { color: BRAND.navy, bgcolor: 'transparent' } }}
              >
                Ver todos
              </Button>
            </Box>

            {/* Horizontal scrollable thumbnails if posts have images, else vertical list */}
            {lastPublishedPosts.some((p) => p.imagePreviewUrl) ? (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  overflowX: 'auto',
                  pb: 1,
                  mx: { xs: -2, md: -2.5 },
                  px: { xs: 2, md: 2.5 },
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {lastPublishedPosts.map((p) => {
                  const isVertical = p.postType === 'reels' || p.postType === 'stories';
                  const thumbW = isVertical ? { xs: 78, md: 92 } : { xs: 110, md: 130 };
                  const thumbH = isVertical ? { xs: 139, md: 164 } : { xs: 110, md: 130 };
                  return (
                    <Box
                      key={p.id}
                      onClick={() => navigate(`/edit-post/${p.id}`)}
                      sx={{
                        position: 'relative',
                        flexShrink: 0,
                        width: thumbW,
                        height: thumbH,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        bgcolor: BRAND.navy,
                        border: `1px solid ${BRAND.border}`,
                        transition: 'transform 0.18s, box-shadow 0.18s',
                        '&:hover': { transform: 'scale(1.03)', boxShadow: '0 8px 24px rgba(10,15,45,0.14)' },
                      }}
                    >
                      {p.imagePreviewUrl ? (
                        <Box
                          component="img"
                          src={p.imagePreviewUrl}
                          alt={p.clientName}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : p.videoUrl ? (
                        /* Reels without cover: render video frozen at first frame */
                        <Box
                          component="video"
                          src={p.videoUrl}
                          preload="metadata"
                          muted
                          playsInline
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                          onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                            e.currentTarget.currentTime = 0.1;
                          }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.postType === 'reels'
                            ? <ReelsIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.3)' }} />
                            : <StoryIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.3)' }} />
                          }
                        </Box>
                      )}
                      {/* Gradient overlay */}
                      <Box
                        sx={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)',
                          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.clientName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.53rem', color: 'rgba(255,255,255,0.7)' }}>
                          {p.postedAt ? format(new Date(p.postedAt), 'dd/MM', { locale: ptBR }) : format(new Date(p.scheduledDate), 'dd/MM', { locale: ptBR })}
                        </Typography>
                      </Box>
                      {/* Post type badge */}
                      <Box
                        sx={{
                          position: 'absolute', top: 6, left: 6,
                          bgcolor: getPostTypeBadgeColor(p.postType),
                          color: '#fff', px: 0.7, py: 0.15,
                          borderRadius: '999px',
                          fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                        }}
                      >
                        {getPostTypeLabel(p.postType)}
                      </Box>
                      {/* Status dot */}
                      <Box sx={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', bgcolor: BRAND.green, border: '1.5px solid #fff' }} />
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {lastPublishedPosts.map((p, idx) => (
                  <Box
                    component="li"
                    key={p.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      py: 1.25,
                      borderTop: idx > 0 ? `1px solid ${BRAND.border}` : 'none',
                    }}
                  >
                    <Avatar src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined} sx={{ width: 34, height: 34, bgcolor: BRAND.green, fontSize: '0.8rem', flexShrink: 0 }}>
                      {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.navy }}>
                        {p.clientName} · {getPostTypeLabel(p.postType)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: BRAND.muted }}>
                        {p.postedAt ? format(new Date(p.postedAt), "dd/MM 'às' HH:mm", { locale: ptBR }) : format(new Date(p.scheduledDate), 'dd/MM', { locale: ptBR })}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => navigate(`/edit-post/${p.id}`)} sx={{ width: 30, height: 30, border: `1px solid ${BRAND.border}`, borderRadius: '8px', color: BRAND.muted }}>
                      <ArrowForwardIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 6: Monthly chart ─────────────────────────────── */}
      {!loading && postsByMonth.length > 0 && (
        <Card elevation={0} sx={{ ...CARD_SX }}>
          <CardContent sx={{ p: { xs: 2, md: 3 }, pb: '20px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ fontSize: 20, color: BRAND.orange }} />
                <Typography
                  sx={{
                    fontFamily: '"Cabinet Grotesk", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '1.05rem', md: '1.15rem' },
                    color: BRAND.navy,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Publicações por mês
                </Typography>
              </Box>
              <Chip
                label={`${postsByMonth.reduce((acc, d) => acc + d.posts, 0)} nos últimos 6 meses`}
                size="small"
                sx={{
                  bgcolor: 'rgba(247,66,17,0.08)',
                  color: BRAND.orange,
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  height: 24,
                }}
              />
            </Box>

            <Box sx={{ height: 200, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: BRAND.muted, fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: BRAND.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: BRAND.surface,
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(10,15,45,0.1)',
                      fontSize: '0.8rem',
                    }}
                    formatter={(value: number) => [`${value} posts`, 'Publicados']}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullMonth
                        ? format(new Date(payload[0].payload.fullMonth + '-01'), 'MMMM yyyy', { locale: ptBR })
                        : label
                    }
                    cursor={{ fill: 'rgba(247,66,17,0.05)' }}
                  />
                  <Bar dataKey="posts" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {postsByMonth.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.posts === Math.max(...postsByMonth.map((d) => d.posts)) ? BRAND.orange : `rgba(247,66,17,0.35)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default HomePage;

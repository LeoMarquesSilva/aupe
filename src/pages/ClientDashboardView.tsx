import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Paper,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Chip
} from '@mui/material';
import { Instagram as InstagramIcon } from '@mui/icons-material';
import { formatDistanceToNow, format, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchDashboardByToken } from '../services/shareLinkService';
import { instagramMetricsService, InstagramPost } from '../services/instagramMetricsService';
import { MetricsOverview, FeaturedPost, PostsTable, PostDetails } from '../components/dashboard';

const AGENCY_LOGO_URL = '/LOGO-AUPE.jpg';
const APP_NAME = 'AUPE';

const ClientDashboardView: React.FC = () => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const rawToken = tokenFromPath || tokenFromQuery || '';
  const decodedToken = rawToken ? decodeURIComponent(rawToken) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDashboardByToken>> | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [postDetailsOpen, setPostDetailsOpen] = useState(false);

  useEffect(() => {
    if (!decodedToken) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardByToken(decodedToken)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Link inválido ou expirado.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [decodedToken]);

  const posts = (data?.posts as InstagramPost[] | undefined) || [];
  const cutoffDate = subDays(new Date(), period === '7d' ? 7 : period === '30d' ? 30 : 90);
  const filteredPosts = posts
    .filter((post) => isAfter(new Date(post.timestamp), cutoffDate))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const dashboardData = useMemo(() => {
    if (posts.length === 0) return null;
    const summary = instagramMetricsService.generateDashboardSummaryFromPosts(posts);
    const by_media_type = instagramMetricsService.analyzeMediaTypes(posts);
    const engagement_breakdown = instagramMetricsService.getEngagementBreakdown(posts);
    const timeline = instagramMetricsService.generateTimelineData(posts, 90);
    return {
      summary,
      by_media_type,
      engagement_breakdown,
      timeline,
      top_posts: posts.slice(0, 5),
      recent_posts: posts.slice(0, 10),
    };
  }, [posts]);

  const legacyMetrics = useMemo(() => {
    if (!dashboardData) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        engagementRate: 0,
        postsByType: {},
        metricsByMonth: [],
        mostEngagedPost: null as InstagramPost | null,
        totalImpressions: 0,
        totalReach: 0,
        periodComparisons: { posts: 0, likes: 0, comments: 0, reach: 0, impressions: 0, engagementRate: 0 },
        previousPeriodValues: { posts: 0, likes: 0, comments: 0, reach: 0, impressions: 0, engagementRate: 0 },
        engagementBreakdown: { likes: 0, comments: 0, saved: 0, shares: 0, total: 0 },
      };
    }
    const cutoffDate = subDays(new Date(), period === '7d' ? 7 : period === '30d' ? 30 : 90);
    const filteredTimeline = dashboardData.timeline.filter((item) => {
      const itemDate = parseISO(item.date + '-01');
      return isAfter(itemDate, cutoffDate);
    });
    const totals = filteredTimeline.reduce(
      (acc, item) => ({
        posts: acc.posts + (item.posts || 0),
        engagement: acc.engagement + (item.engagement || 0),
        reach: acc.reach + (item.reach || 0),
        impressions: acc.impressions + (item.impressions || 0),
      }),
      { posts: 0, engagement: 0, reach: 0, impressions: 0 }
    );
    const filteredPostsForMetrics = posts.filter((post) => isAfter(new Date(post.timestamp), cutoffDate));
    const totalLikes = filteredPostsForMetrics.reduce((s, p) => s + (p.like_count || 0), 0);
    const totalComments = filteredPostsForMetrics.reduce((s, p) => s + (p.comments_count || 0), 0);
    const totalReach = filteredPostsForMetrics.reduce((s, p) => s + (p.insights?.reach || 0), 0);
    const totalImpressions = filteredPostsForMetrics.reduce((s, p) => s + (p.insights?.impressions || p.impressions || 0), 0);
    const engagementRate = totalReach > 0 ? ((totalLikes + totalComments) / totalReach) * 100 : 0;
    const engagementBreakdown = filteredPostsForMetrics.reduce(
      (b, p) => ({
        likes: b.likes + (p.like_count || 0),
        comments: b.comments + (p.comments_count || 0),
        saved: b.saved + (p.insights?.saved || 0),
        shares: b.shares + (p.insights?.shares || 0),
        total: b.total + (p.like_count || 0) + (p.comments_count || 0) + (p.insights?.saved || 0) + (p.insights?.shares || 0),
      }),
      { likes: 0, comments: 0, saved: 0, shares: 0, total: 0 }
    );
    const mostEngagedPost =
      filteredPostsForMetrics.length === 0
        ? null
        : [...filteredPostsForMetrics].sort((a, b) => {
            const engA = (a.like_count || 0) + (a.comments_count || 0) + (a.insights?.saved || 0) + (a.insights?.shares || 0);
            const engB = (b.like_count || 0) + (b.comments_count || 0) + (b.insights?.saved || 0) + (b.insights?.shares || 0);
            return engB - engA;
          })[0];
    const postsByType = Object.keys(dashboardData.by_media_type).reduce((acc, k) => {
      acc[k] = dashboardData.by_media_type[k].count;
      return acc;
    }, {} as Record<string, number>);
    const metricsByMonth = filteredTimeline.map((item) => ({
      month: item.date.substring(0, 7),
      posts: item.posts,
      likes: Math.round((item.engagement || 0) * 0.8),
      comments: Math.round((item.engagement || 0) * 0.2),
      engagement: item.engagement || 0,
      reach: item.reach || 0,
      impressions: item.impressions || 0,
    }));

    // Período anterior para comparação (mesmo tamanho do período atual, imediatamente antes)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const previousPeriodEnd = cutoffDate;
    const previousPeriodStart = subDays(previousPeriodEnd, days);
    const previousPeriodPosts = posts.filter((post) => {
      const postDate = new Date(post.timestamp);
      return postDate >= previousPeriodStart && postDate < previousPeriodEnd;
    });
    const previousLikes = previousPeriodPosts.reduce((s, p) => s + (p.like_count || 0), 0);
    const previousComments = previousPeriodPosts.reduce((s, p) => s + (p.comments_count || 0), 0);
    const previousReach = previousPeriodPosts.reduce((s, p) => s + (p.insights?.reach || 0), 0);
    const previousImpressions = previousPeriodPosts.reduce((s, p) => {
      return s + (p.insights?.impressions || p.impressions || 0);
    }, 0);
    const previousPosts = previousPeriodPosts.length;
    const previousEngagementRate =
      previousReach > 0 ? ((previousLikes + previousComments) / previousReach) * 100 : 0;
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalPosts: filteredPostsForMetrics.length,
      totalLikes,
      totalComments,
      engagementRate,
      totalReach,
      totalImpressions: totalImpressions || (dashboardData.summary?.total_impressions ?? 0),
      postsByType,
      metricsByMonth,
      mostEngagedPost,
      periodComparisons: {
        posts: calculateChange(filteredPostsForMetrics.length, previousPosts),
        likes: calculateChange(totalLikes, previousLikes),
        comments: calculateChange(totalComments, previousComments),
        reach: calculateChange(totalReach, previousReach),
        impressions: calculateChange(totalImpressions || 0, previousImpressions),
        engagementRate: calculateChange(engagementRate, previousEngagementRate),
      },
      previousPeriodValues: {
        posts: previousPosts,
        likes: previousLikes,
        comments: previousComments,
        reach: previousReach,
        impressions: previousImpressions,
        engagementRate: previousEngagementRate,
      },
      engagementBreakdown,
    };
  }, [dashboardData, period, posts]);

  const formatTimeAgo = (timestamp: string) =>
    formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Carregando relatório...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Link inválido ou expirado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Peça um novo link ao seu gestor para visualizar o relatório do Instagram.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const client = data.client;
  const profile = data.profile as { followers_count?: number; profile_picture_url?: string; profile_picture?: string } | null;
  // Foto: perfil em cache (Instagram) > profile_picture do cliente (salvo ao conectar) > logo do cliente
  const clientPhotoUrl =
    (profile?.profile_picture_url ?? profile?.profile_picture) ||
    client.profilePicture ||
    client.logoUrl;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {/* AppBar — mesmo padrão do Header do sistema */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          borderRadius: '0 0 20px 20px',
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0 4px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Toolbar sx={{ minHeight: 56, py: 0, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: { xs: 1, md: 3 } }}>
            <Avatar
              src={AGENCY_LOGO_URL}
              alt={APP_NAME}
              sx={{ width: 36, height: 36, flexShrink: 0, boxShadow: theme.shadows[1] }}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  lineHeight: 1.2,
                }}
              >
                {APP_NAME}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  color: theme.palette.text.secondary,
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Relatório compartilhado
              </Typography>
            </Box>
          </Box>
          {data.expiresAt && (
            <Typography
              variant="caption"
              sx={{
                ml: 'auto',
                color: theme.palette.text.secondary,
                fontWeight: 500,
              }}
            >
              Link expira em {format(parseISO(data.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* Paper do cliente — mesmo padrão do ClientHeader */}
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || theme.palette.primary.light})`,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: isTablet ? 'column' : 'row',
              alignItems: isTablet ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flex: 1, minWidth: 0 }}>
              <Avatar
                src={clientPhotoUrl}
                alt={client.name}
                imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' }}
                sx={{
                  width: { xs: 56, md: 72 },
                  height: { xs: 56, md: 72 },
                  border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                  bgcolor: theme.palette.primary.main,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 600,
                }}
              >
                {client.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '1.75rem' },
                    mb: 0.5,
                    background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${theme.palette.primary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                  }}
                >
                  {client.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    <InstagramIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        fontSize: '0.875rem',
                      }}
                    >
                      @{client.instagram}
                    </Typography>
                  </Box>
                  {profile?.followers_count != null && (
                    <Chip
                      icon={<InstagramIcon sx={{ fontSize: 16 }} />}
                      label={`${profile.followers_count.toLocaleString('pt-BR')} seguidores`}
                      size="small"
                      sx={{
                        height: 28,
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.dark,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        '& .MuiChip-icon': { color: theme.palette.success.main },
                      }}
                    />
                  )}
                  <Chip
                    label={
                      data.cacheStatus?.lastFullSync
                        ? `Dados em cache · Atualizado em ${format(parseISO(data.cacheStatus.lastFullSync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                        : 'Dados em cache'
                    }
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      bgcolor: alpha(theme.palette.text.secondary, 0.08),
                      color: theme.palette.text.secondary,
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 0.75,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                }}
              >
                Período
              </Typography>
              <ToggleButtonGroup
                value={period}
                exclusive
                onChange={(_, v) => v && setPeriod(v)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                    '&:not(.Mui-selected)': {
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                  },
                }}
              >
                <ToggleButton value="7d">7 dias</ToggleButton>
                <ToggleButton value="30d">30 dias</ToggleButton>
                <ToggleButton value="90d">90 dias</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>
      </Container>

      <Container maxWidth="lg">
        {filteredPosts.length === 0 ? (
          <Alert severity="info">
            Não há posts no período selecionado para exibir métricas.
          </Alert>
        ) : (
          <Box component="span" sx={{ display: 'block' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Métricas de performance
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <MetricsOverview
                  metrics={legacyMetrics}
                  periodComparisons={legacyMetrics.periodComparisons}
                  previousPeriodValues={legacyMetrics.previousPeriodValues}
                />
              </Grid>
              {legacyMetrics.mostEngagedPost ? (
                <Grid item xs={12}>
                  <FeaturedPost
                    post={legacyMetrics.mostEngagedPost}
                    onViewDetails={(post) => {
                      setSelectedPost(post);
                      setPostDetailsOpen(true);
                    }}
                    formatTimeAgo={formatTimeAgo}
                  />
                </Grid>
              ) : null}
            </Grid>

            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Posts do Instagram
            </Typography>
            <PostsTable
              posts={filteredPosts}
              onViewDetails={(post) => {
                setSelectedPost(post);
                setPostDetailsOpen(true);
              }}
              formatTimestamp={formatTimestamp}
            />
          </Box>
        )}

        <PostDetails
          open={postDetailsOpen}
          post={selectedPost}
          onClose={() => {
            setPostDetailsOpen(false);
            setSelectedPost(null);
          }}
          formatTimestamp={formatTimestamp}
        />
      </Container>
    </Box>
  );
};

export default ClientDashboardView;

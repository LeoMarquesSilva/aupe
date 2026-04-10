import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import { formatDistanceToNow, format, subDays, isAfter, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchDashboardByToken } from '../services/shareLinkService';
import { instagramMetricsService, InstagramPost } from '../services/instagramMetricsService';
import { MetricsOverview, FeaturedPost, PostsTable, PostDetails, PeriodSelector, ConversionFunnel } from '../components/dashboard';
import type { PeriodConfig } from '../components/dashboard';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';
import { resolveAgencyLogoSrc } from '../services/imageUrlService';

const APP_NAME = 'INSYT';

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
  const [periodConfig, setPeriodConfig] = useState<PeriodConfig>({
    mode: 'month',
    quickPeriod: '30d',
    selectedMonth: new Date(),
    comparisonMonth: subMonths(new Date(), 1)
  });
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

  const posts = useMemo(() => (data?.posts as InstagramPost[] | undefined) || [], [data?.posts]);

  const { periodStart, periodEnd, prevPeriodStart, prevPeriodEnd, prevPeriodLabel } = useMemo(() => {
    if (periodConfig.mode === 'month') {
      const monthStart = startOfMonth(periodConfig.selectedMonth);
      const monthEnd = endOfMonth(periodConfig.selectedMonth);
      const compMonth = periodConfig.comparisonMonth;
      return {
        periodStart: monthStart,
        periodEnd: monthEnd,
        prevPeriodStart: startOfMonth(compMonth),
        prevPeriodEnd: endOfMonth(compMonth),
        periodLabel: format(monthStart, "MMMM 'de' yyyy", { locale: ptBR }),
        prevPeriodLabel: format(compMonth, "MMMM 'de' yyyy", { locale: ptBR })
      };
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const end = new Date();
    const start = subDays(end, days);
    return {
      periodStart: start,
      periodEnd: end,
      prevPeriodStart: subDays(start, days),
      prevPeriodEnd: start,
      periodLabel: `Últimos ${days} dias`,
      prevPeriodLabel: `${days} dias anteriores`
    };
  }, [periodConfig, period]);

  const filteredPosts = posts
    .filter((post) => {
      const postDate = new Date(post.timestamp);
      if (periodConfig.mode === 'month') {
        return postDate >= periodStart && postDate <= periodEnd;
      }
      return isAfter(postDate, periodStart);
    })
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
    const filteredTimeline = dashboardData.timeline.filter((item) => {
      const itemDate = parseISO(item.date + '-01');
      return itemDate >= periodStart && itemDate <= periodEnd;
    });
    const filteredPostsForMetrics = posts.filter((post) => {
      const postDate = new Date(post.timestamp);
      if (periodConfig.mode === 'month') {
        return postDate >= periodStart && postDate <= periodEnd;
      }
      return isAfter(postDate, periodStart);
    });
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

    const previousPeriodPosts = posts.filter((post) => {
      const postDate = new Date(post.timestamp);
      return postDate >= prevPeriodStart && postDate <= prevPeriodEnd;
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
  }, [dashboardData, posts, periodConfig, periodStart, periodEnd, prevPeriodStart, prevPeriodEnd]);

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
          bgcolor: '#f6f6f6',
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
          bgcolor: '#f6f6f6',
        }}
      >
        <Paper sx={{
          p: 4,
          maxWidth: 400,
          textAlign: 'center',
          borderRadius: GLASS.radius.card,
          bgcolor: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
          border: `1px solid ${GLASS.border.outer}`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}>
          <Typography variant="h6" color="error" gutterBottom>
            Link inválido ou expirado
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: GLASS.text.muted }}>
            {error}
          </Typography>
          <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f6f6', pb: 6 }}>
      {/* Header — dark grain, INSYT + agency logos */}
      <Box
        className="grain-overlay premium-header-bg"
        sx={{
          borderRadius: '0 0 16px 16px',
          px: { xs: 2, md: 3 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minHeight: 60,
          flexShrink: 0,
        }}
      >
        {/* INSYT brand mark */}
        <Box
          component="img"
          src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-07.png"
          alt="INSYT"
          sx={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0, display: 'block' }}
        />

        {/* Vertical divider */}
        <Box sx={{ width: '1px', height: 28, bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

        {/* Agency block */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
          {data?.agencyLogoUrl && (
            <Avatar
              src={resolveAgencyLogoSrc(data.agencyLogoUrl)}
              alt="Agência"
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.3)',
                bgcolor: 'rgba(255,255,255,0.1)',
              }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Cabinet Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#fff',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {client?.name ?? 'Cliente'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.2, display: 'block' }}
            >
              Relatório compartilhado
            </Typography>
          </Box>
        </Box>

        {/* Expiry */}
        {data.expiresAt && (
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
          >
            Expira em {format(parseISO(data.expiresAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </Typography>
        )}
      </Box>

      {/* Header do cliente */}
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, mt: 2 }}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            overflow: 'hidden',
          }}
        >
          {/* Perfil */}
          <Box sx={{ 
            p: { xs: 2, md: 2.5 },
            display: 'flex',
            alignItems: isTablet ? 'flex-start' : 'center',
            flexDirection: isTablet ? 'column' : 'row',
            gap: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
              <Avatar
                src={clientPhotoUrl}
                alt={client.name}
                imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' }}
                sx={{
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  border: `2px solid ${GLASS.accent.orange}`,
                  bgcolor: GLASS.accent.orange,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  fontWeight: 700,
                  boxShadow: GLASS.shadow.avatar,
                }}
              >
                {client.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  component="h1"
                  sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' }, lineHeight: 1.2, mb: 0.5 }}
                >
                  {client.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem' }}
                  >
                    @{client.instagram}
                  </Typography>
                  {profile?.followers_count != null && (
                    <Chip
                      label={`${profile.followers_count.toLocaleString('pt-BR')} seguidores`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        bgcolor: alpha('#d4380d', 0.08),
                        color: '#d4380d',
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            {data.cacheStatus?.lastFullSync && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                Atualizado em {format(parseISO(data.cacheStatus.lastFullSync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Typography>
            )}
          </Box>

          {/* Seletor de período */}
          <Box sx={{ 
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            borderTop: `1px solid ${GLASS.border.subtle}`,
            bgcolor: GLASS.surface.bgFooter,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <PeriodSelector
              config={periodConfig}
              onChange={(newConfig) => {
                setPeriodConfig(newConfig);
                if (newConfig.mode === 'quick') {
                  setPeriod(newConfig.quickPeriod);
                }
              }}
              compact
            />
          </Box>
        </Paper>
      </Container>

      <Container maxWidth={false} disableGutters sx={appShellContainerSx}>
        {filteredPosts.length === 0 ? (
          <Alert severity="info">
            Não há posts no período selecionado para exibir métricas.
          </Alert>
        ) : (
          <Box component="span" sx={{ display: 'block' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Métricas de Performance
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <MetricsOverview
                  metrics={legacyMetrics}
                  periodComparisons={legacyMetrics.periodComparisons}
                  previousPeriodValues={legacyMetrics.previousPeriodValues}
                  comparisonLabel={periodConfig.mode === 'month' ? `vs ${prevPeriodLabel}` : undefined}
                />
              </Grid>
              {legacyMetrics.mostEngagedPost && (
                <Grid item xs={12} md={legacyMetrics.engagementBreakdown?.total > 0 ? 7 : 12}>
                  <FeaturedPost
                    post={legacyMetrics.mostEngagedPost}
                    onViewDetails={(post) => {
                      setSelectedPost(post);
                      setPostDetailsOpen(true);
                    }}
                    formatTimeAgo={formatTimeAgo}
                  />
                </Grid>
              )}
              {legacyMetrics.engagementBreakdown?.total > 0 && (
                <Grid item xs={12} md={legacyMetrics.mostEngagedPost ? 5 : 12}>
                  <ConversionFunnel
                    data={{
                      impressions: legacyMetrics.totalImpressions || 0,
                      reach: legacyMetrics.totalReach || 0,
                      engagement: legacyMetrics.engagementBreakdown.total || 0,
                      saves: legacyMetrics.engagementBreakdown.saved || 0,
                      shares: legacyMetrics.engagementBreakdown.shares || 0,
                    }}
                  />
                </Grid>
              )}
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

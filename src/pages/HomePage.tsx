import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Grid,
  Button,
  LinearProgress,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Avatar,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Divider,
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
  Business as BusinessIcon,
  BarChart as BarChartIcon,
  WarningAmber as WarningIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CardMembership as PlanIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { roleService } from '../services/roleService';
import { subscriptionService } from '../services/subscriptionService';
import { subscriptionLimitsService, SubscriptionLimits } from '../services/subscriptionLimitsService';
import { supabase } from '../services/supabaseClient';
import { postService } from '../services/supabaseClient';
import { ImageUrlService } from '../services/imageUrlService';

const COLORS = {
  primary: '#510000',
  secondary: '#3A1D1A',
  lightGray: '#D7CFCF',
  offWhite: '#EDEBE9',
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

interface ShortcutCard {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

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

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [orgStats, setOrgStats] = useState<{
    clientsCount: number;
    scheduledPosts: number;
    publishedPosts: number;
  } | null>(null);
  const [postsByMonth, setPostsByMonth] = useState<{ name: string; posts: number; fullMonth: string }[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<PostWithClient[]>([]);
  const [failedPosts, setFailedPosts] = useState<PostWithClient[]>([]);
  const [lastPublishedPosts, setLastPublishedPosts] = useState<PostWithClient[]>([]);
  const [planLimits, setPlanLimits] = useState<SubscriptionLimits | null>(null);
  const [topClients, setTopClients] = useState<TopClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewCarouselIndex, setPreviewCarouselIndex] = useState(0);

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
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        const orgId = (profile as any)?.organization_id;
        if (!orgId) {
          setLoading(false);
          return;
        }

        const [orgData, clientsRes, postsRes] = await Promise.all([
          subscriptionService.getOrganization(orgId),
          supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          supabase
            .from('scheduled_posts')
            .select('id, status, posted_at, scheduled_date')
            .eq('organization_id', orgId),
        ]);

        setOrganizationName(orgData?.name || null);

        const allPosts = postsRes.data || [];
        const scheduled = allPosts.filter(
          (p: { status: string }) => p.status === 'pending' || p.status === 'sent_to_n8n' || p.status === 'processing'
        ).length;
        const published = allPosts.filter(
          (p: { status: string }) => p.status === 'posted' || p.status === 'published'
        ).length;

        setOrgStats({
          clientsCount: clientsRes.count ?? 0,
          scheduledPosts: scheduled,
          publishedPosts: published,
        });

        const postedPosts = allPosts.filter(
          (p: { status: string }) => p.status === 'posted' || p.status === 'published'
        );
        const now = new Date();
        const months: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(now, i);
          const key = format(startOfMonth(d), 'yyyy-MM');
          months[key] = 0;
        }
        postedPosts.forEach((p: { posted_at?: string; scheduled_date?: string }) => {
          const dateStr = p.posted_at || p.scheduled_date;
          if (dateStr) {
            const d = new Date(dateStr);
            const key = format(startOfMonth(d), 'yyyy-MM');
            if (months[key] !== undefined) months[key]++;
          }
        });
        const chartData = Object.entries(months).map(([key, count]) => {
          const monthName = format(new Date(key + '-01'), 'MMM', { locale: ptBR });
          return {
            fullMonth: key,
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            posts: count,
          };
        });
        setPostsByMonth(chartData);

        const nowIso = new Date().toISOString();

        const getImageUrls = (p: any): string[] => {
          if (!p.images || !Array.isArray(p.images)) return [];
          return p.images
            .map((item: any) => {
              const url = typeof item === 'string' ? item : (item?.url ?? item?.path);
              return url ? ImageUrlService.getPublicUrl(url) : null;
            })
            .filter(Boolean);
        };
        const getFirstImageUrl = (p: any): string | null => {
          const urls = getImageUrls(p);
          return urls.length > 0 ? urls[0] : null;
        };
        const getVideoUrl = (p: any): string | null => {
          return p.video ? ImageUrlService.getPublicUrl(p.video) : null;
        };

        const mapRow = (p: any): PostWithClient => ({
          id: p.id,
          scheduledDate: p.scheduled_date,
          caption: p.caption || '',
          postType: p.post_type || 'post',
          status: p.status,
          clientId: p.client_id,
          clientName: p.clients?.name || 'Cliente',
          clientLogoUrl: p.clients?.profile_picture ?? p.clients?.logo_url ?? null,
          imagePreviewUrl: getFirstImageUrl(p),
          imageUrls: getImageUrls(p),
          videoUrl: getVideoUrl(p),
          errorMessage: p.error_message,
          retryCount: p.retry_count ?? 0,
          postedAt: p.posted_at,
        });

        const { data: upcoming } = await supabase
          .from('scheduled_posts')
          .select('id, scheduled_date, caption, post_type, status, client_id, images, video, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId)
          .in('status', ['pending', 'sent_to_n8n', 'processing'])
          .gt('scheduled_date', nowIso)
          .order('scheduled_date', { ascending: true })
          .limit(5);
        setUpcomingPosts((upcoming || []).map(mapRow));

        const { data: failed } = await supabase
          .from('scheduled_posts')
          .select('id, scheduled_date, caption, post_type, status, client_id, error_message, retry_count, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId)
          .eq('status', 'failed')
          .order('last_retry_at', { ascending: false })
          .limit(5);
        setFailedPosts((failed || []).map(mapRow));

        const { data: lastPublishedData } = await supabase
          .from('scheduled_posts')
          .select('id, posted_at, caption, post_type, status, client_id, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId)
          .in('status', ['posted', 'published'])
          .not('posted_at', 'is', null)
          .order('posted_at', { ascending: false })
          .limit(5);
        setLastPublishedPosts((lastPublishedData || []).map((p: any) => ({ ...mapRow(p), scheduledDate: p.posted_at || p.scheduled_date })));

        try {
          const limits = await subscriptionLimitsService.getCurrentLimits();
          setPlanLimits(limits);
        } catch {
          setPlanLimits(null);
        }

        const { data: forTopClients } = await supabase
          .from('scheduled_posts')
          .select('client_id, clients(id, name, logo_url, profile_picture)')
          .eq('organization_id', orgId)
          .in('status', ['pending', 'sent_to_n8n', 'processing']);
        const byClient: Record<string, { name: string; logoUrl?: string | null; count: number }> = {};
        (forTopClients || []).forEach((p: any) => {
          const cid = p.client_id;
          if (!byClient[cid]) byClient[cid] = { name: p.clients?.name || 'Cliente', logoUrl: p.clients?.profile_picture ?? p.clients?.logo_url ?? null, count: 0 };
          byClient[cid].count++;
        });
        setTopClients(
          Object.entries(byClient)
            .map(([clientId, v]) => ({ clientId, clientName: v.name, clientLogoUrl: v.logoUrl ?? null, count: v.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );

      } catch (err) {
        console.error('Erro ao carregar dados da organização:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const mainShortcuts: ShortcutCard[] = [
    {
      title: 'Gerenciamento de Clientes',
      description: 'Visualize e gerencie todos os seus clientes e contas Instagram',
      path: '/clients',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
    },
    {
      title: 'Calendário',
      description: 'Visualize o calendário de posts e stories agendados',
      path: '/calendar',
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
    },
  ];

  const createShortcuts: ShortcutCard[] = [
    {
      title: 'Criar Post',
      description: 'Novo post ou carrossel para o feed',
      path: '/create-post',
      icon: <PostIcon sx={{ fontSize: 36 }} />,
    },
    {
      title: 'Criar Reels',
      description: 'Novo vídeo Reels',
      path: '/create-reels',
      icon: <ReelsIcon sx={{ fontSize: 36 }} />,
    },
    {
      title: 'Criar Story',
      description: 'Novo story para Instagram',
      path: '/create-story',
      icon: <StoryIcon sx={{ fontSize: 36 }} />,
    },
  ];

  const greeting = getGreeting();
  const displayName = getUserDisplayName(user);

  const getPostTypeLabel = (postType: string) => {
    const map: Record<string, string> = { post: 'Post', carousel: 'Carrossel', reels: 'Reels', stories: 'Story' };
    return map[postType] || postType;
  };

  const nextPost = upcomingPosts[0] ?? null;

  const handleRetryPost = async (postId: string) => {
    try {
      await postService.retryFailedPost(postId);
      setFailedPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error(e);
    }
  };

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${COLORS.lightGray}`,
    bgcolor: 'background.paper',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: COLORS.primary,
      boxShadow: '0 2px 8px rgba(81, 0, 0, 0.08)',
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Saudação + Nome da organização */}
      <Box
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(237,235,233,0.08) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Argent CF", serif',
              fontWeight: 'normal',
              color: COLORS.offWhite,
            }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''}
          </Typography>
          {organizationName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
              <BusinessIcon sx={{ fontSize: 20, color: COLORS.lightGray }} />
              <Typography
                variant="body1"
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  color: COLORS.lightGray,
                  fontWeight: 500,
                }}
              >
                {organizationName}
              </Typography>
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              color: 'rgba(237,235,233,0.85)',
              mt: 1,
            }}
          >
            Escolha por onde começar
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mt: 2.5,
            }}
          >
            {[...mainShortcuts, ...createShortcuts].map((item) => (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                <Box sx={{ color: COLORS.offWhite, display: 'flex', '& .MuiSvgIcon-root': { fontSize: 20 } }}>
                  {item.icon}
                </Box>
                <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, color: COLORS.offWhite }}>
                  {item.title}
                </Typography>
              </Box>
            ))}
            {isAdmin && (
              <Box
                onClick={() => navigate('/admin')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                <AdminIcon sx={{ fontSize: 20, color: COLORS.offWhite }} />
                <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, color: COLORS.offWhite }}>
                  Painel Admin
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Números da organização */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: COLORS.primary }} size={32} />
        </Box>
      ) : (
        orgStats && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ ...cardSx, bgcolor: COLORS.offWhite }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(81, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.primary,
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, color: COLORS.primary }}
                    >
                      {orgStats.clientsCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      Clientes ativos
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ ...cardSx, bgcolor: COLORS.offWhite }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(81, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.primary,
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, color: COLORS.primary }}
                    >
                      {orgStats.scheduledPosts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      Posts agendados
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={0} sx={{ ...cardSx, bgcolor: COLORS.offWhite }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(81, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.primary,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, color: COLORS.primary }}
                    >
                      {orgStats.publishedPosts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                      Posts publicados
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        )
      )}

      {/* Próximo post em destaque */}
      {!loading && nextPost && (
        <>
          <Card elevation={0} sx={{ ...cardSx, mb: 3, borderLeft: `4px solid ${COLORS.primary}`, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, overflow: 'hidden' }}>
            {nextPost.imagePreviewUrl && (
              <Box
                onClick={() => setPreviewModalOpen(true)}
                sx={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}
              >
                <CardMedia
                  component="img"
                  image={nextPost.imagePreviewUrl}
                  alt="Preview do post"
                  sx={{ width: { xs: '100%', sm: 280 }, minWidth: { sm: 280 }, height: 280, objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif' }}>Ver preview</Typography>
                </Box>
              </Box>
            )}
            {!nextPost.imagePreviewUrl && nextPost.videoUrl && (
              <Box
                onClick={() => setPreviewModalOpen(true)}
                sx={{ cursor: 'pointer', position: 'relative', flexShrink: 0, width: { xs: '100%', sm: 280 }, minWidth: { sm: 280 }, height: 280, bgcolor: 'grey.900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ReelsIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.5)' }} />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif' }}>Ver preview</Typography>
                </Box>
              </Box>
            )}
            <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>
                Próximo agendado
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                <Avatar
                  src={nextPost.clientLogoUrl ? ImageUrlService.getPublicUrl(nextPost.clientLogoUrl) : undefined}
                  sx={{ width: 32, height: 32, bgcolor: COLORS.primary, fontSize: '0.875rem' }}
                >
                  {nextPost.clientName?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <Typography variant="h6" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: COLORS.primary }}>
                  {nextPost.clientName} · {getPostTypeLabel(nextPost.postType)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif', mt: 1 }} noWrap>
                {nextPost.caption?.slice(0, 100)}{nextPost.caption?.length > 100 ? '…' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif', display: 'block', mt: 1.5 }}>
                {format(new Date(nextPost.scheduledDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </Typography>
              <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(nextPost.imagePreviewUrl || nextPost.videoUrl) && (
                  <Button size="medium" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => setPreviewModalOpen(true)} sx={{ fontFamily: '"Poppins", sans-serif' }}>
                    Ver preview
                  </Button>
                )}
                <Button size="medium" variant="outlined" onClick={() => navigate('/calendar')} sx={{ fontFamily: '"Poppins", sans-serif' }}>
                  Calendário
                </Button>
                <Button size="medium" variant="contained" onClick={() => navigate(`/edit-post/${nextPost.id}`)} startIcon={<EditIcon />} sx={{ fontFamily: '"Poppins", sans-serif', bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.secondary } }}>
                  Editar
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Modal de preview do post */}
          <Dialog
            open={previewModalOpen}
            onClose={() => { setPreviewModalOpen(false); setPreviewCarouselIndex(0); }}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={nextPost.clientLogoUrl ? ImageUrlService.getPublicUrl(nextPost.clientLogoUrl) : undefined}
                  sx={{ width: 36, height: 36, bgcolor: COLORS.primary }}
                >
                  {nextPost.clientName?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>{nextPost.clientName}</Typography>
                  <Typography variant="caption" color="text.secondary">{getPostTypeLabel(nextPost.postType)} · {format(new Date(nextPost.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => { setPreviewModalOpen(false); setPreviewCarouselIndex(0); }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#000' }}>
              {nextPost.postType === 'reels' && nextPost.videoUrl ? (
                <video
                  src={nextPost.videoUrl}
                  controls
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : (nextPost.imageUrls && nextPost.imageUrls.length > 0) ? (
                <Box sx={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  {nextPost.imageUrls.length > 1 && (
                    <IconButton
                      sx={{ position: 'absolute', left: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                      onClick={() => setPreviewCarouselIndex((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                  )}
                  <Box component="img" src={nextPost.imageUrls[previewCarouselIndex]} alt="Preview" sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                  {nextPost.imageUrls.length > 1 && (
                    <IconButton
                      sx={{ position: 'absolute', right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                      onClick={() => setPreviewCarouselIndex((i) => Math.min(nextPost!.imageUrls!.length - 1, i + 1))}
                    >
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
                <Box sx={{ p: 2, width: '100%', bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', whiteSpace: 'pre-wrap' }}>{nextPost.caption}</Typography>
                </Box>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Próximos agendados + Posts que precisam de atenção + Uso do plano + Top clientes */}
      {!loading && (upcomingPosts.length > 0 || failedPosts.length > 0 || planLimits || topClients.length > 0) && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            {upcomingPosts.length > 0 && (
              <Card elevation={0} sx={{ ...cardSx, mb: 2, height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: COLORS.primary, mb: 1.5 }}>
                    Próximos agendados
                  </Typography>
                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {upcomingPosts.slice(nextPost ? 1 : 0, nextPost ? 6 : 5).map((p, idx) => (
                      <React.Fragment key={p.id}>
                        {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                        <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: idx === 0 ? 0 : 0.5 }}>
                          <Avatar
                            src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined}
                            sx={{ width: 36, height: 36, bgcolor: COLORS.primary, fontSize: '0.875rem', flexShrink: 0 }}
                          >
                            {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                              {p.clientName} · {getPostTypeLabel(p.postType)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                              {format(new Date(p.scheduledDate), "dd/MM HH:mm", { locale: ptBR })}
                            </Typography>
                          </Box>
                          <Button size="small" variant="outlined" onClick={() => navigate(`/edit-post/${p.id}`)} sx={{ fontFamily: '"Poppins", sans-serif', flexShrink: 0 }}>
                            Ver
                          </Button>
                        </Box>
                      </React.Fragment>
                    ))}
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Button size="medium" variant="contained" onClick={() => navigate('/calendar')} sx={{ fontFamily: '"Poppins", sans-serif', width: '100%', bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.secondary } }}>
                    Ver calendário completo
                  </Button>
                </CardContent>
              </Card>
            )}
            {failedPosts.length > 0 && (
              <Card elevation={0} sx={{ ...cardSx, borderLeft: `4px solid ${theme.palette.error.main}` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarningIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: theme.palette.error.dark }}>
                      Posts que precisam de atenção
                    </Typography>
                  </Box>
                  {failedPosts.slice(0, 5).map((p, idx) => (
                    <React.Fragment key={p.id}>
                      {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, py: idx === 0 ? 0 : 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                          <Avatar
                            src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined}
                            sx={{ width: 36, height: 36, bgcolor: COLORS.primary, fontSize: '0.875rem', flexShrink: 0 }}
                          >
                            {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                              {p.clientName} · {getPostTypeLabel(p.postType)}
                            </Typography>
                            {p.errorMessage && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: '"Poppins", sans-serif' }}>
                                {p.errorMessage.slice(0, 60)}{p.errorMessage.length > 60 ? '…' : ''}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Button size="small" variant="outlined" onClick={() => navigate(`/edit-post/${p.id}`)} sx={{ fontFamily: '"Poppins", sans-serif' }}>
                            Ver
                          </Button>
                          <Button size="small" variant="contained" startIcon={<RefreshIcon />} onClick={() => handleRetryPost(p.id)} sx={{ fontFamily: '"Poppins", sans-serif', bgcolor: theme.palette.error.main, '&:hover': { bgcolor: theme.palette.error.dark } }}>
                            Reprocessar
                          </Button>
                        </Box>
                      </Box>
                    </React.Fragment>
                  ))}
                </CardContent>
              </Card>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            {planLimits && planLimits.maxPostsPerMonth < 999999 && (
              <Card elevation={0} sx={{ ...cardSx, mb: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <PlanIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: COLORS.primary }}>
                      Uso do plano
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                    Posts este mês: {planLimits.currentPostsThisMonth} / {planLimits.maxPostsPerMonth}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (planLimits.currentPostsThisMonth / planLimits.maxPostsPerMonth) * 100)}
                    sx={{ mt: 1, height: 8, borderRadius: 1, bgcolor: COLORS.lightGray, '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif', display: 'block', mt: 0.5 }}>
                    {Math.max(0, planLimits.maxPostsPerMonth - planLimits.currentPostsThisMonth)} posts restantes no plano
                  </Typography>
                </CardContent>
              </Card>
            )}
            {topClients.length > 0 && (
              <Card elevation={0} sx={{ ...cardSx }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrendingUpIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: COLORS.primary }}>
                      Top clientes (posts agendados)
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {topClients.map((c, idx) => (
                      <React.Fragment key={c.clientId}>
                        {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                        <Box
                          component="li"
                          onClick={() => navigate(`/client/${c.clientId}`)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: idx === 0 ? 0 : 1,
                            cursor: 'pointer',
                            borderRadius: 1.5,
                            px: 1.5,
                            transition: 'background-color 0.2s',
                            '&:hover': { bgcolor: theme.palette.action.hover },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={c.clientLogoUrl ? ImageUrlService.getPublicUrl(c.clientLogoUrl) : undefined}
                              sx={{ width: 40, height: 40, bgcolor: COLORS.primary, fontSize: '0.9375rem', flexShrink: 0 }}
                            >
                              {c.clientName?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>{c.clientName}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>{c.count} posts agendados</Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', color: COLORS.primary, fontWeight: 600 }}>Ver perfil →</Typography>
                        </Box>
                      </React.Fragment>
                    ))}
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Button size="medium" variant="contained" onClick={() => navigate('/clients')} sx={{ fontFamily: '"Poppins", sans-serif', width: '100%', bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.secondary } }}>
                    Ver todos os clientes
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Últimos publicados */}
      {!loading && lastPublishedPosts.length > 0 && (
        <Card elevation={0} sx={{ ...cardSx, mb: 4 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <HistoryIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: COLORS.primary }}>
                Últimos publicados
              </Typography>
            </Box>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {lastPublishedPosts.map((p, idx) => (
                <React.Fragment key={p.id}>
                  {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: idx === 0 ? 0 : 0.5 }}>
                    <Avatar
                      src={p.clientLogoUrl ? ImageUrlService.getPublicUrl(p.clientLogoUrl) : undefined}
                      sx={{ width: 36, height: 36, bgcolor: COLORS.primary, fontSize: '0.875rem', flexShrink: 0 }}
                    >
                      {p.clientName?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500 }}>
                        {p.clientName} · {getPostTypeLabel(p.postType)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                        {p.postedAt ? format(new Date(p.postedAt), "dd/MM HH:mm", { locale: ptBR }) : format(new Date(p.scheduledDate), "dd/MM", { locale: ptBR })}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/edit-post/${p.id}`)} sx={{ fontFamily: '"Poppins", sans-serif', flexShrink: 0 }}>
                      Ver
                    </Button>
                  </Box>
                </React.Fragment>
              ))}
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Button size="medium" variant="contained" onClick={() => navigate('/calendar')} sx={{ fontFamily: '"Poppins", sans-serif', width: '100%', bgcolor: COLORS.primary, '&:hover': { bgcolor: COLORS.secondary } }}>
              Ver calendário completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Posts publicados por mês — com contexto */}
      {!loading && postsByMonth.length > 0 && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: `1px solid ${COLORS.lightGray}`,
            backgroundColor: theme.palette.background.paper,
            boxShadow: `0 1px 3px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.04)'}`,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BarChartIcon sx={{ fontSize: 28, color: COLORS.primary }} />
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  color: COLORS.primary,
                  fontFamily: '"Argent CF", serif',
                  fontWeight: 400,
                  textTransform: 'lowercase',
                  letterSpacing: '0.02em',
                  fontSize: { xs: '1.35rem', sm: '1.5rem' },
                }}
              >
                Publicações por mês
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Poppins", sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              Últimos 6 meses · {postsByMonth.reduce((acc, d) => acc + d.posts, 0)} publicados no período
            </Typography>
          </Box>
          <Box sx={{ height: 220, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={postsByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: COLORS.secondary, fontSize: 12, fontFamily: '"Poppins", sans-serif' }}
                  axisLine={{ stroke: COLORS.lightGray }}
                />
                <YAxis
                  tick={{ fill: COLORS.secondary, fontSize: 12, fontFamily: '"Poppins", sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: COLORS.offWhite,
                    border: `1px solid ${COLORS.lightGray}`,
                    borderRadius: 8,
                    fontFamily: '"Poppins", sans-serif',
                  }}
                  formatter={(value: number) => [`${value} posts`, 'Publicados']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullMonth
                      ? format(new Date(payload[0].payload.fullMonth + '-01'), 'MMMM yyyy', { locale: ptBR })
                      : label
                  }
                />
                <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
                  {postsByMonth.map((_, index) => (
                    <Cell key={index} fill={COLORS.primary} fillOpacity={0.7 + (index % 3) * 0.1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default HomePage;

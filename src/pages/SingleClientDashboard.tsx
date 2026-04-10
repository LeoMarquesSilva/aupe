import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Tab,
  Tabs,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Instagram as InstagramIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FileDownload as ExportIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Client } from '../types';
import { 
  instagramMetricsService, 
  InstagramPost, 
  PostsFilter,
  DashboardSummary,
  MediaTypeAnalysis,
  EngagementBreakdown,
  TimelineData
} from '../services/instagramMetricsService';
import { instagramCacheService, CachedData } from '../services/instagramCacheService';
import { clientService } from '../services/supabaseClient';
import { pdfExportService } from '../services/pdfExportService';
import { formatDistanceToNow, subDays, isAfter, parseISO, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { devLog, logClientError } from '../utils/clientLogger';
import { appShellContainerSx } from '../theme/appShellLayout';

// Importar componentes
import ClientHeader from '../components/ClientHeader';
import ShareLinkDialog from '../components/ShareLinkDialog';
import ApprovalRequestDialog from '../components/ApprovalRequestDialog';
import {
  MetricsOverview,
  FeaturedPost,
  PostsTable,
  PostFilters,
  PostDetails,
  ClientSettings,
  ScheduledPostsList,
  PDFExportDialog,
  PeriodSelector,
  ConversionFunnel
} from '../components/dashboard';
import type { PeriodConfig } from '../components/dashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SingleClientDashboard: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Instagram data com cache
  const [cachedData, setCachedData] = useState<CachedData | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [, setLastSyncTime] = useState<Date | null>(null);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary;
    by_media_type: MediaTypeAnalysis;
    engagement_breakdown: EngagementBreakdown;
    timeline: TimelineData[];
    top_posts: InstagramPost[];
    recent_posts: InstagramPost[];
  } | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [insightsPermissionError, setInsightsPermissionError] = useState(false);
  
  // Filtro de período global
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [periodConfig, setPeriodConfig] = useState<PeriodConfig>({
    mode: 'month',
    quickPeriod: '30d',
    selectedMonth: new Date(),
    comparisonMonth: subMonths(new Date(), 1)
  });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PostsFilter>({
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  
  // Post details
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [postDetailsOpen, setPostDetailsOpen] = useState(false);
  
  // Scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  
  // Estatísticas de posts
  const [postsStats, setPostsStats] = useState<{
    published: number;
    scheduled: number;
  }>({ published: 0, scheduled: 0 });

  useEffect(() => {
    if (client) {
      devLog('Cliente (debug, sem token)', {
        id: client.id,
        username: client.username,
        instagramAccountId: client.instagramAccountId,
        hasInstagramAuth: Boolean(client.accessToken && client.instagramAccountId),
      });
    }
  }, [client]);

  const fetchScheduledPosts = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: true });
        
      if (postsError) throw postsError;
      
      const published = (postsData || []).filter(p => 
        p.status === 'published' || p.status === 'posted'
      ).length;
      const scheduled = (postsData || []).filter(p => 
        p.status === 'pending' || p.status === 'sent_to_n8n'
      ).length;
      
      setPostsStats({ published, scheduled });
      
      const userIds = [...new Set((postsData || []).map(p => p.user_id).filter(Boolean))];
      let usersMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            usersMap[profile.id] = profile;
          });
        }
      }
      
      const postsWithUsers = (postsData || []).map((post: any) => ({
        ...post,
        profiles: post.user_id ? usersMap[post.user_id] : null
      }));
      
      setScheduledPosts(postsWithUsers);
    } catch (err: any) {
      logClientError('Erro ao buscar posts agendados', err);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchClient = async () => {
      try {
        const clients = await clientService.getClients();
        const clientData = clients.find(c => c.id === clientId);
        
        if (!clientData) {
          throw new Error('Cliente não encontrado');
        }
        
        devLog('Cliente carregado', { id: clientData.id, name: clientData.name, hasAccessToken: !!clientData.accessToken, hasIgId: !!clientData.instagramAccountId });
        devLog('Tem accessToken?', !!clientData.accessToken);
        devLog('Tem instagramAccountId?', !!clientData.instagramAccountId);
        
        setClient(clientData);
        
        if (clientData.accessToken && clientData.instagramAccountId) {
          devLog('Cliente autenticado, carregando dados do Instagram...');
          await loadInstagramDataWithCache(clientData.id);
        } else {
          devLog('Cliente não autenticado com Instagram');
          setLoading(false);
        }
      } catch (err: any) {
        logClientError('Erro ao buscar cliente', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchClient();
    fetchScheduledPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, fetchScheduledPosts]);

  /**
   * Carrega dados do Instagram usando o sistema de cache - VERSÃO CORRIGIDA
   */
  const loadInstagramDataWithCache = async (clientId: string, forceRefresh = false) => {
    setLoading(true);
    setLoadingDashboard(true);
    
    try {
      setSyncInProgress(forceRefresh);
      devLog(forceRefresh ? 'Forçando sincronização...' : 'Usando sincronização inteligente...');
      
      // ✅ USAR O NOVO MÉTODO QUE JÁ RESOLVE TUDO
      const result = await instagramCacheService.getDataWithCache(clientId, forceRefresh);
      
      // Construir CachedData a partir do resultado
      const data: CachedData = {
        posts: result.posts,
        profile: result.profile,
        cacheStatus: result.cacheStatus,
        isStale: !result.isFromCache // Se não veio do cache, não está stale
      };
      
      setCachedData(data);
      setLastSyncTime(result.cacheStatus.lastFullSync);
      
      // Gerar dados do dashboard se temos posts
      if (result.posts.length > 0) {
        await generateDashboardData(result.posts);
        
        // Verificar se há erro de permissão: se temos posts mas nenhum tem insights
        const hasAnyInsights = result.posts.some(post => post.insights?.reach || post.insights?.impressions);
        
        // Se temos posts mas nenhum tem insights, provavelmente é erro de permissão
        if (!hasAnyInsights && result.posts.length > 0) {
          setInsightsPermissionError(true);
        } else {
          setInsightsPermissionError(false);
        }
      } else {
        // Limpar dashboard se não há posts
        setDashboardData(null);
        setInsightsPermissionError(false);
      }
      
      devLog(`📊 Dashboard atualizado: ${result.posts.length} posts, fonte: ${result.isFromCache ? 'cache' : 'API'}`);
      
    } catch (err: any) {
      logClientError('Erro ao carregar dados do Instagram', err);
      setError('Não foi possível carregar os dados do Instagram. Verifique a conexão.');
      
      // Em caso de erro, tentar usar dados em cache se existirem
      try {
        const cachedDataFallback = await instagramCacheService.getCachedData(clientId);
        if (cachedDataFallback.posts.length > 0) {
          setCachedData(cachedDataFallback);
          await generateDashboardData(cachedDataFallback.posts);
          devLog('📋 Usando dados em cache como fallback');
        }
      } catch (cacheError) {
        logClientError('Erro ao buscar dados em cache', cacheError);
      }
    } finally {
      setLoading(false);
      setLoadingDashboard(false);
      setSyncInProgress(false);
    }
  };

  /**
   * Gera dados do dashboard a partir dos posts em cache
   */
  const generateDashboardData = async (posts: InstagramPost[]) => {
    try {
      const summary = instagramMetricsService.generateDashboardSummaryFromPosts(posts);
      const mediaTypeAnalysis = instagramMetricsService.analyzeMediaTypes(posts);
      const engagementBreakdown = instagramMetricsService.getEngagementBreakdown(posts);
      const timeline = instagramMetricsService.generateTimelineData(posts);
      
      setDashboardData({
        summary,
        by_media_type: mediaTypeAnalysis,
        engagement_breakdown: engagementBreakdown,
        timeline,
        top_posts: posts.slice(0, 5),
        recent_posts: posts.slice(0, 10)
      });
      
      devLog('📊 Dados do dashboard gerados:', {
        posts: posts.length,
        totalReach: summary.total_reach,
        totalEngagement: summary.total_engagement
      });
    } catch (err: any) {
      logClientError('Erro ao gerar dados do dashboard', err);
    }
  };

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleCreatePost = () => {
    navigate(`/create-post?clientId=${clientId}`);
  };
  
  const handleCreateStory = () => {
    navigate(`/create-story?clientId=${clientId}`);
  };

  const handleCreateReels = () => {
    navigate(`/create-reels?clientId=${clientId}`);
  };
  
  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  /**
   * Força uma atualização dos dados do Instagram
   */
  const handleForceRefresh = async () => {
    if (!clientId || syncInProgress) return;
    
    devLog('🔄 Usuário solicitou atualização manual');
    setError(null); // Limpar erros anteriores
    await loadInstagramDataWithCache(clientId, true);
  };

  const handleViewPostDetails = (post: InstagramPost) => {
    setSelectedPost(post);
    setPostDetailsOpen(true);
  };
  
  const handleClosePostDetails = () => {
    setPostDetailsOpen(false);
    setSelectedPost(null);
  };
  
  const handleOpenFilterDialog = () => {
    setFilterDialogOpen(true);
  };
  
  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };
  
  const handleApplyFilters = (newFilters: PostsFilter) => {
    setFilters(newFilters);
    devLog('🔍 Filtros aplicados:', newFilters);
    
    // Regenerar dashboard com novos filtros se necessário
    if (cachedData?.posts) {
      setTimeout(() => generateDashboardData(cachedData.posts), 100);
    }
  };
  
  const handleResetFilters = () => {
    const defaultFilters = {
      sortBy: 'date' as const,
      sortOrder: 'desc' as const
    };
    
    setFilters(defaultFilters);
    setSearchQuery('');
    devLog('🔄 Filtros resetados');
    
    // Regenerar dashboard sem filtros
    if (cachedData?.posts) {
      setTimeout(() => generateDashboardData(cachedData.posts), 100);
    }
  };
  
  const handleEditClient = () => {
    devLog('✏️ Editar cliente', { id: client.id, username: client.username });
    // TODO: Implementar modal de edição ou navegar para página de edição
    navigate(`/clients/${clientId}/edit`);
  };
  
  const handleConnectInstagram = () => {
    navigate(`/clients/${clientId}/connect-instagram`);
  };
  
  const handleDisconnectInstagram = async () => {
    if (!client) return;
    
    try {
      devLog('🔌 Desconectando Instagram...');
      
      // Usar o clientService ao invés de consulta direta
      const updatedClient = await clientService.removeInstagramAuth(client.id);
      
      devLog('✅ Instagram desconectado', { id: updatedClient.id, username: updatedClient.username });
      
      // Atualizar estado local
      setClient(updatedClient);
      
      // Limpar dados do Instagram e cache
      setCachedData(null);
      setDashboardData(null);
      await instagramCacheService.clearCache(client.id);
      
      setError(null);
    } catch (err: any) {
      logClientError('Erro ao desconectar Instagram', err);
      setError('Não foi possível desconectar a conta do Instagram.');
    }
  };
  
  const handleExportData = () => {
    const posts = cachedData?.posts || [];
    if (posts.length === 0) {
      devLog('⚠️ Nenhum post para exportar');
      return;
    }
    
    try {
      devLog('📤 Exportando dados...', posts.length, 'posts');
      
      // Criar CSV com dados mais completos
      const headers = [
        'ID',
        'Data',
        'Tipo',
        'Legenda',
        'Curtidas',
        'Comentários',
        'Alcance',
        'Impressões',
        'Engajamento Total',
        'Taxa de Engajamento (%)',
        'Link'
      ];
      
      const csvRows = [
        headers.join(','),
        ...posts.map(post => {
          const engagement = (post.insights?.engagement || 0);
          const reach = (post.insights?.reach || 0);
          const impressions = (post.insights?.impressions || 0);
          const engagementRate = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : '0';
          
          return [
            post.id,
            new Date(post.timestamp).toLocaleDateString('pt-BR'),
            post.media_product_type === 'REELS' ? 'Reels' : 
            post.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' :
            post.media_type === 'VIDEO' ? 'Vídeo' : 'Imagem',
            `"${(post.caption || '').replace(/"/g, '""').substring(0, 100)}..."`,
            post.like_count || 0,
            post.comments_count || 0,
            reach,
            impressions,
            engagement,
            engagementRate,
            post.permalink
          ].join(',');
        })
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `instagram_posts_${client?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ Dados exportados:', fileName);
    } catch (err) {
      logClientError('Erro ao exportar dados', err);
      setError('Não foi possível exportar os dados.');
    }
  };

  const [pdfExportDialogOpen, setPdfExportDialogOpen] = useState(false);
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalDialogPostIds, setApprovalDialogPostIds] = useState<string[]>([]);

  const handleExportPDF = async (exportOptions: any) => {
    if (!client || !dashboardData || !legacyMetrics) {
      setError('Não há dados suficientes para gerar o relatório.');
      return;
    }

    try {
      const posts = cachedData?.posts || [];
      
      await pdfExportService.generatePDFReport({
        client,
        profile: cachedData?.profile || null,
        posts,
        metrics: {
          totalPosts: legacyMetrics.totalPosts,
          totalLikes: legacyMetrics.totalLikes,
          totalComments: legacyMetrics.totalComments,
          totalReach: legacyMetrics.totalReach || 0,
          totalImpressions: legacyMetrics.totalImpressions || 0,
          engagementRate: legacyMetrics.engagementRate,
          periodComparisons: legacyMetrics.periodComparisons,
          previousPeriodValues: legacyMetrics.previousPeriodValues,
          engagementBreakdown: legacyMetrics.engagementBreakdown,
          postsByType: legacyMetrics.postsByType,
          mostEngagedPost: legacyMetrics.mostEngagedPost
        },
        period,
        postsStats,
        options: exportOptions
      });
    } catch (err) {
      logClientError('Erro ao gerar PDF', err);
      setError('Não foi possível gerar o relatório PDF.');
    }
  };
  
  // Utility functions
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: ptBR
    });
  };
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const posts = cachedData?.posts || [];
  
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
    const prevEnd = start;
    const prevStart = subDays(prevEnd, days);
    return {
      periodStart: start,
      periodEnd: end,
      prevPeriodStart: prevStart,
      prevPeriodEnd: prevEnd,
      periodLabel: `Últimos ${days} dias`,
      prevPeriodLabel: `${days} dias anteriores`
    };
  }, [periodConfig, period]);

  const cutoffDate = periodStart;
  
  const filteredPosts = posts.filter(post => {
    const postDate = new Date(post.timestamp);
    if (periodConfig.mode === 'month') {
      if (postDate < periodStart || postDate > periodEnd) return false;
    } else {
      if (!isAfter(postDate, cutoffDate)) return false;
    }
    
    // Filter by search
    if (searchQuery && !post.caption?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by date (filtros adicionais do dialog)
    if (filters.startDate && new Date(post.timestamp) < filters.startDate) {
      return false;
    }
    
    if (filters.endDate) {
      const endDateWithTime = new Date(filters.endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      if (new Date(post.timestamp) > endDateWithTime) {
        return false;
      }
    }
    
    // Filter by media type
    if (filters.mediaType && filters.mediaType !== 'all' && post.media_type !== filters.mediaType) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort posts
    if (filters.sortBy === 'date') {
      return filters.sortOrder === 'asc' 
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (filters.sortBy === 'likes') {
      return filters.sortOrder === 'asc' 
        ? (a.like_count || 0) - (b.like_count || 0)
        : (b.like_count || 0) - (a.like_count || 0);
    } else if (filters.sortBy === 'comments') {
      return filters.sortOrder === 'asc' 
        ? (a.comments_count || 0) - (b.comments_count || 0)
        : (b.comments_count || 0) - (a.comments_count || 0);
    } else if (filters.sortBy === 'engagement') {
      const engagementA = a.insights?.engagement || ((a.like_count || 0) + (a.comments_count || 0));
      const engagementB = b.insights?.engagement || ((b.like_count || 0) + (b.comments_count || 0));
      return filters.sortOrder === 'asc' 
        ? engagementA - engagementB
        : engagementB - engagementA;
    } else if (filters.sortBy === 'reach') {
      const reachA = a.insights?.reach || 0;
      const reachB = b.insights?.reach || 0;
      return filters.sortOrder === 'asc' 
        ? reachA - reachB
        : reachB - reachA;
    }
    
    return 0;
  });
  
  // Criar métricas compatíveis com o componente MetricsOverview
  // Aplicar filtro de período nas métricas
  const legacyMetrics = useMemo(() => {
    if (!dashboardData) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        engagementRate: 0,
        postsByType: {},
        metricsByMonth: [],
        mostEngagedPost: null,
        totalImpressions: 0,
        totalReach: 0
      };
    }

    // Filtrar timeline por período
    const cutoffDate = subDays(new Date(), period === '7d' ? 7 : period === '30d' ? 30 : 90);
    const filteredTimeline = dashboardData.timeline.filter(item => {
      const itemDate = parseISO(item.date + '-01');
      return isAfter(itemDate, cutoffDate);
    });

    // Calcular proporção de likes/comments baseado no total do breakdown
    const totalEngagement = dashboardData.engagement_breakdown.total;
    const likesRatio = totalEngagement > 0 
      ? dashboardData.engagement_breakdown.likes / totalEngagement 
      : 0.8;
    const commentsRatio = totalEngagement > 0 
      ? dashboardData.engagement_breakdown.comments / totalEngagement 
      : 0.2;

    // Filtrar posts por período para calcular métricas
    const filteredPostsForMetrics = posts.filter(post => {
      const postDate = new Date(post.timestamp);
      if (periodConfig.mode === 'month') {
        return postDate >= periodStart && postDate <= periodEnd;
      }
      return isAfter(postDate, cutoffDate);
    });

    const filteredLikes = filteredPostsForMetrics.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const filteredComments = filteredPostsForMetrics.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    const filteredReach = filteredPostsForMetrics.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
    
    // Calcular impressões - tentar múltiplas fontes
    const filteredImpressions = filteredPostsForMetrics.reduce((sum, post) => {
      const impressions = post.insights?.impressions || post.impressions || 0;
      return sum + impressions;
    }, 0);
    
    // Calcular impressões da timeline filtrada (mais confiável)
    const timelineImpressions = filteredTimeline.reduce((sum, item) => sum + (item.impressions || 0), 0);
    
    // Usar a melhor fonte disponível
    let totalImpressions = filteredImpressions;
    if (totalImpressions === 0 && timelineImpressions > 0) {
      totalImpressions = timelineImpressions;
    } else if (totalImpressions === 0 && dashboardData.summary.total_impressions > 0) {
      // Se temos o total de impressões mas não nos posts filtrados, usar proporção
      const totalPosts = posts.length;
      const filteredPostsCount = filteredPostsForMetrics.length;
      if (totalPosts > 0 && filteredPostsCount > 0) {
        const proportion = filteredPostsCount / totalPosts;
        totalImpressions = Math.round(dashboardData.summary.total_impressions * proportion);
      } else {
        totalImpressions = dashboardData.summary.total_impressions;
      }
    } else if (totalImpressions === 0) {
      // Último fallback: usar o total do summary
      totalImpressions = dashboardData.summary.total_impressions || 0;
    }
    
    const filteredEngagementRate = filteredReach > 0 
      ? ((filteredLikes + filteredComments) / filteredReach) * 100 
      : 0;

    // Filtrar posts do período anterior (usa variáveis calculadas acima)
    const previousPeriodPosts = posts.filter(post => {
      const postDate = new Date(post.timestamp);
      return postDate >= prevPeriodStart && postDate <= prevPeriodEnd;
    });
    
    // Calcular métricas do período anterior
    const previousLikes = previousPeriodPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const previousComments = previousPeriodPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    const previousReach = previousPeriodPosts.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
    const previousImpressions = previousPeriodPosts.reduce((sum, post) => {
      const impressions = post.insights?.impressions || post.impressions || 0;
      return sum + impressions;
    }, 0);
    const previousPosts = previousPeriodPosts.length;
    const previousEngagementRate = previousReach > 0 
      ? ((previousLikes + previousComments) / previousReach) * 100 
      : 0;

    // Calcular mudanças percentuais
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Calcular breakdown de engajamento do período filtrado
    const filteredEngagementBreakdown = filteredPostsForMetrics.reduce((breakdown, post) => {
      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;
      const saved = post.insights?.saved || 0;
      const shares = post.insights?.shares || 0;
      
      return {
        likes: breakdown.likes + likes,
        comments: breakdown.comments + comments,
        saved: breakdown.saved + saved,
        shares: breakdown.shares + shares,
        total: breakdown.total + likes + comments + saved + shares
      };
    }, { likes: 0, comments: 0, saved: 0, shares: 0, total: 0 });

    return {
      totalPosts: filteredPostsForMetrics.length,
      totalLikes: filteredLikes,
      totalComments: filteredComments,
      engagementRate: filteredEngagementRate,
      totalReach: filteredReach,
      totalImpressions: totalImpressions,
      postsByType: Object.keys(dashboardData.by_media_type).reduce((acc, key) => {
        acc[key] = dashboardData.by_media_type[key].count;
        return acc;
      }, {} as Record<string, number>),
      engagementBreakdown: filteredEngagementBreakdown,
      metricsByMonth: filteredTimeline.map(item => ({
        month: item.date.substring(0, 7), // YYYY-MM
        posts: item.posts,
        likes: Math.round(item.engagement * likesRatio),
        comments: Math.round(item.engagement * commentsRatio),
        engagement: item.engagement,
        reach: item.reach || 0,
        impressions: item.impressions || 0
      })),
      // Comparações com período anterior
      periodComparisons: {
        posts: calculateChange(filteredPostsForMetrics.length, previousPosts),
        likes: calculateChange(filteredLikes, previousLikes),
        comments: calculateChange(filteredComments, previousComments),
        reach: calculateChange(filteredReach, previousReach),
        impressions: calculateChange(totalImpressions, previousImpressions),
        engagementRate: calculateChange(filteredEngagementRate, previousEngagementRate)
      },
      // Valores absolutos do período anterior
      previousPeriodValues: {
        posts: previousPosts,
        likes: previousLikes,
        comments: previousComments,
        reach: previousReach,
        impressions: previousImpressions,
        engagementRate: previousEngagementRate
      },
      // Calcular post mais engajado do período filtrado
      mostEngagedPost: (() => {
        if (filteredPostsForMetrics.length === 0) return null;
        
        // Calcular engajamento para cada post (usar insights reais quando disponível)
        const postsWithEngagement = filteredPostsForMetrics.map(post => {
          const likes = post.like_count || 0;
          const comments = post.comments_count || 0;
          const saved = post.insights?.saved || 0;
          const shares = post.insights?.shares || 0;
          const reach = post.insights?.reach || 0;
          
          // Engajamento total
          const totalEngagement = likes + comments + saved + shares;
          
          // Taxa de engajamento (se tiver reach)
          const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;
          
          return {
            post,
            totalEngagement,
            engagementRate,
            reach
          };
        });
        
        // Ordenar por taxa de engajamento (se tiver reach), senão por engajamento total
        postsWithEngagement.sort((a, b) => {
          if (a.reach > 0 && b.reach > 0) {
            return b.engagementRate - a.engagementRate;
          } else if (a.reach > 0) {
            return -1; // Posts com reach vêm primeiro
          } else if (b.reach > 0) {
            return 1;
          } else {
            return b.totalEngagement - a.totalEngagement;
          }
        });
        
        return postsWithEngagement[0]?.post || null;
      })()
    };
  }, [dashboardData, period, posts, periodConfig, periodStart, periodEnd, prevPeriodStart, prevPeriodEnd]);
  
  // Extrair comparações e valores anteriores para passar ao MetricsOverview
  const periodComparisons = legacyMetrics.periodComparisons || {
    posts: 0,
    likes: 0,
    comments: 0,
    reach: 0,
    impressions: 0,
    engagementRate: 0
  };
  
  const previousPeriodValues = legacyMetrics.previousPeriodValues || {
    posts: 0,
    likes: 0,
    comments: 0,
    reach: 0,
    impressions: 0,
    engagementRate: 0
  };
  
  if (loading) {
    return (
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2.5,
            py: 8,
            borderRadius: '14px',
            bgcolor: '#fff',
            border: '1px solid #e8eaed',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <Box sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f0fdf4',
            }}>
              <CircularProgress size={28} sx={{ color: '#f74211' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#0a0f2d', fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
                {syncInProgress ? 'Sincronizando dados do Instagram' : 'Carregando dashboard'}
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.82rem' }}>
                {syncInProgress ? 'Buscando informações mais recentes...' : 'Preparando seus dados...'}
              </Typography>
            </Box>
            {syncInProgress && (
              <LinearProgress sx={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 8,
                height: 4,
                bgcolor: 'rgba(247, 66, 17, 0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: '#f74211', borderRadius: 8 },
              }} />
            )}
          </Box>
        </motion.div>
      </Container>
    );
  }
  
  if (error && !cachedData) {
    return (
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Box sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '14px',
            bgcolor: '#fff',
            border: '1px solid rgba(239, 68, 68, 0.18)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(239, 68, 68, 0.08)',
              mx: 'auto',
              mb: 2,
            }}>
              <ErrorIcon sx={{ color: '#ef4444', fontSize: 24 }} />
            </Box>
            <Typography sx={{ color: '#0a0f2d', fontWeight: 600, fontSize: '1rem', mb: 0.75 }}>
              Erro ao carregar
            </Typography>
            <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', mb: 3, maxWidth: 400, mx: 'auto' }}>
              {error}
            </Typography>
            <Box
              component="button"
              onClick={() => window.location.reload()}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2.5,
                py: 1,
                border: 'none',
                borderRadius: '10px',
                bgcolor: '#0a0f2d',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 650,
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: '#131940' },
                '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.3)' },
              }}
            >
              Recarregar página
            </Box>
          </Box>
        </motion.div>
      </Container>
    );
  }
  
  if (!client) {
    return (
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
        <Box sx={{
          p: 4,
          borderRadius: '14px',
          bgcolor: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.18)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          textAlign: 'center',
        }}>
          <ErrorIcon sx={{ color: '#ef4444', fontSize: 36, mb: 1.5, opacity: 0.7 }} />
          <Typography sx={{ color: '#0a0f2d', fontWeight: 600, fontSize: '1rem' }}>
            Cliente não encontrado
          </Typography>
        </Box>
      </Container>
    );
  }
  
  const hasInstagramAuth = Boolean(client.accessToken && client.instagramAccountId);

  const tabIconSx = {
    '&.Mui-selected': { '& .MuiSvgIcon-root': { color: '#f74211' } }
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
      {/* Back navigation */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Box sx={{ mb: 2 }}>
          <Box
            component="button"
            onClick={() => navigate('/clients')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0,
              py: 0.5,
              border: 'none',
              bgcolor: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'color 0.15s ease',
              '&:hover': { color: '#f74211' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Voltar para clientes
          </Box>
        </Box>
      </motion.div>

      {/* Client Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.05 }}>
        <ClientHeader 
          client={client} 
          profile={cachedData?.profile || null} 
          onCreatePost={handleCreatePost}
          onCreateStory={handleCreateStory}
          onCreateReels={handleCreateReels}
          onViewCalendar={handleViewCalendar}
          cacheStatus={cachedData?.cacheStatus || null}
          isStale={cachedData?.isStale || false}
          formatTimeAgo={formatTimeAgo}
          onForceRefresh={handleForceRefresh}
          syncInProgress={syncInProgress}
          postsStats={postsStats}
          onExportPDF={() => setPdfExportDialogOpen(true)}
          onShareLink={() => setShareLinkDialogOpen(true)}
        />
      </motion.div>

      {/* Alerts */}
      {error && cachedData && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Box sx={{
            mb: 2.5,
            p: 1.5,
            borderRadius: '10px',
            bgcolor: '#fffbeb',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#92400e', fontWeight: 500, fontSize: '0.82rem' }}>
              <ErrorIcon sx={{ fontSize: 16, color: '#d97706' }} />
              {error} (Usando dados em cache)
            </Typography>
            <IconButton
              size="small"
              onClick={() => setError(null)}
              sx={{ p: 0.5, color: '#d97706', '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.08)' } }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </motion.div>
      )}

      {insightsPermissionError && hasInstagramAuth && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Box sx={{
            mb: 2.5,
            p: 2,
            borderRadius: '10px',
            bgcolor: '#fffbeb',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="body2" sx={{ fontWeight: 650, color: '#92400e', mb: 0.3, fontSize: '0.82rem' }}>
                Token sem permissão para insights
              </Typography>
              <Typography variant="body2" sx={{ color: '#a16207', lineHeight: 1.5, fontSize: '0.78rem' }}>
                Reconecte para acessar métricas detalhadas.
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={handleConnectInstagram}
              sx={{
                px: 2,
                py: 0.75,
                border: 'none',
                borderRadius: '8px',
                bgcolor: '#f74211',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.78rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: '#d4380d' },
              }}
            >
              Reconectar
            </Box>
          </Box>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.1 }}>
        <Box
          sx={{
            mb: 3,
            borderRadius: '14px',
            bgcolor: '#fff',
            border: '1px solid #e8eaed',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 0,
              '& .MuiTabs-indicator': {
                height: 2,
                borderRadius: '2px 2px 0 0',
                bgcolor: '#f74211',
              },
              '& .MuiTab-root': {
                minHeight: 52,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                px: 2.5,
                color: '#6b7280',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: '#f74211',
                },
                '&.Mui-selected': {
                  color: '#f74211',
                  fontWeight: 600,
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.15rem',
                  mr: 0.75,
                },
              },
            }}
          >
            <Tab icon={<DashboardIcon />} iconPosition="start" label="Dashboard" id="tab-0" aria-controls="tabpanel-0" sx={tabIconSx} />
            <Tab icon={<CalendarIcon />} iconPosition="start" label="Agendamentos" id="tab-1" aria-controls="tabpanel-1" sx={tabIconSx} />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Configurações" id="tab-2" aria-controls="tabpanel-2" sx={tabIconSx} />
          </Tabs>
        </Box>
      </motion.div>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        {!hasInstagramAuth ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <Box sx={{
              p: { xs: 3, md: 4.5 },
              borderRadius: '14px',
              bgcolor: '#fff',
              border: '1px dashed #d1d5db',
              textAlign: 'center',
            }}>
              <InstagramIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1.5, opacity: 0.4 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#0a0f2d', mb: 0.5 }}>
                Instagram não conectado
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', mb: 3, maxWidth: 400, mx: 'auto' }}>
                Conecte a conta do Instagram para visualizar o dashboard completo com métricas, posts e insights.
              </Typography>
              <Box
                component="button"
                onClick={handleConnectInstagram}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 2.5,
                  py: 1.1,
                  border: 'none',
                  borderRadius: '10px',
                  bgcolor: '#f74211',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  fontFamily: 'inherit',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { bgcolor: '#d4380d' },
                  '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.3)' },
                }}
              >
                <InstagramIcon sx={{ fontSize: 18 }} />
                Conectar Instagram
              </Box>
            </Box>
          </motion.div>
        ) : loadingDashboard ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            borderRadius: '14px',
            bgcolor: '#fff',
            border: '1px solid #e8eaed',
            gap: 2,
          }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f0fdf4',
            }}>
              <CircularProgress size={24} sx={{ color: '#f74211' }} />
            </Box>
            <Typography sx={{ color: '#6b7280', fontWeight: 500, fontSize: '0.85rem' }}>
              Carregando métricas...
            </Typography>
          </Box>
        ) : !dashboardData ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <Box sx={{
              p: { xs: 3, md: 4.5 },
              borderRadius: '14px',
              bgcolor: '#fff',
              border: '1px dashed #d1d5db',
              textAlign: 'center',
            }}>
              <BarChartIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1.5, opacity: 0.4 }} />
              <Typography sx={{ fontWeight: 600, color: '#0a0f2d', mb: 0.5 }}>
                Sem dados disponíveis
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: 380, mx: 'auto' }}>
                Não foram encontrados dados suficientes para gerar o dashboard.
              </Typography>
            </Box>
          </motion.div>
        ) : (
          <>
            {/* Metrics Section */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}>
                  <Typography sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    color: '#0a0f2d',
                    letterSpacing: '-0.01em',
                  }}>
                    Métricas de Performance
                  </Typography>
                  <PeriodSelector
                    config={periodConfig}
                    onChange={(newConfig) => {
                      setPeriodConfig(newConfig);
                      if (newConfig.mode === 'quick') {
                        setPeriod(newConfig.quickPeriod);
                      }
                    }}
                  />
                </Box>
                <MetricsOverview
                  metrics={legacyMetrics}
                  periodComparisons={periodComparisons}
                  previousPeriodValues={previousPeriodValues}
                  comparisonLabel={periodConfig.mode === 'month' ? `vs ${prevPeriodLabel}` : undefined}
                />
              </Box>
            </motion.div>

            {/* Featured Post + Funnel */}
            {(legacyMetrics.mostEngagedPost || (legacyMetrics.engagementBreakdown?.total > 0)) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.05 }}>
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  {legacyMetrics.mostEngagedPost && (
                    <Grid item xs={12} md={legacyMetrics.engagementBreakdown?.total > 0 ? 7 : 12}>
                      <FeaturedPost
                        post={legacyMetrics.mostEngagedPost}
                        onViewDetails={handleViewPostDetails}
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
              </motion.div>
            )}

            {/* Posts Section */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.1 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1.5,
                  mb: 2,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0a0f2d', lineHeight: 1.2 }}>
                      Posts do Instagram
                    </Typography>
                    <Chip
                      label={`${filteredPosts.length}`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        bgcolor: '#f3f4f6',
                        color: '#6b7280',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="Buscar por legenda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                              <ClearIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        width: { xs: '100%', sm: 240 },
                        '& .MuiOutlinedInput-root': {
                          height: 36,
                          fontSize: '0.8rem',
                          bgcolor: '#fafafa',
                          borderRadius: '8px',
                          '& fieldset': { borderColor: '#e8eaed' },
                          '&:hover fieldset': { borderColor: '#d1d5db' },
                          '&.Mui-focused fieldset': {
                            borderColor: '#f74211',
                            boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.1)',
                          },
                        },
                      }}
                    />
                    <Tooltip title="Filtros">
                      <IconButton
                        size="small"
                        onClick={handleOpenFilterDialog}
                        sx={{
                          width: 36,
                          height: 36,
                          border: '1px solid #e8eaed',
                          bgcolor: '#fff',
                          transition: 'border-color 0.15s ease',
                          '&:hover': { borderColor: '#d1d5db' },
                        }}
                      >
                        <FilterIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Exportar CSV">
                      <IconButton
                        size="small"
                        onClick={handleExportData}
                        disabled={filteredPosts.length === 0}
                        sx={{
                          width: 36,
                          height: 36,
                          border: '1px solid #e8eaed',
                          bgcolor: '#fff',
                          transition: 'border-color 0.15s ease',
                          '&:hover': { borderColor: '#d1d5db' },
                          '&.Mui-disabled': { opacity: 0.35 },
                        }}
                      >
                        <ExportIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <PostsTable
                  posts={filteredPosts}
                  onViewDetails={handleViewPostDetails}
                  formatTimestamp={formatTimestamp}
                />
              </Box>
            </motion.div>
          </>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <ScheduledPostsList
            posts={scheduledPosts}
            onRefreshPosts={fetchScheduledPosts}
            onEditPost={(post) => {
              navigate(`/clients/${clientId}/edit-post/${post.id}`);
            }}
            onSendForApproval={(postIds) => {
              setApprovalDialogPostIds(postIds);
              setApprovalDialogOpen(true);
            }}
            onDeletePost={async (postId) => {
              try {
                const { error } = await supabase
                  .from('scheduled_posts')
                  .delete()
                  .eq('id', postId);

                if (error) throw error;

                setScheduledPosts(prev => prev.filter(p => p.id !== postId));
                devLog('Post agendado excluído:', postId);
              } catch (err: any) {
                logClientError('Erro ao excluir post', err);
                setError('Não foi possível excluir o post agendado.');
              }
            }}
          />
        </motion.div>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <ClientSettings
            client={client}
            hasInstagramAuth={hasInstagramAuth}
            onEditClient={handleEditClient}
            onConnectInstagram={handleConnectInstagram}
            onDisconnectInstagram={handleDisconnectInstagram}
          />
        </motion.div>
      </TabPanel>

      <PostFilters
        open={filterDialogOpen}
        filters={filters}
        onClose={handleCloseFilterDialog}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <PostDetails
        open={postDetailsOpen}
        post={selectedPost}
        onClose={handleClosePostDetails}
        formatTimestamp={formatTimestamp}
      />

      <PDFExportDialog
        open={pdfExportDialogOpen}
        onClose={() => setPdfExportDialogOpen(false)}
        onExport={handleExportPDF}
      />

      {clientId && client && (
        <ShareLinkDialog
          open={shareLinkDialogOpen}
          onClose={() => setShareLinkDialogOpen(false)}
          clientId={clientId}
          clientName={client.name}
        />
      )}

      {clientId && client && (
        <ApprovalRequestDialog
          open={approvalDialogOpen}
          onClose={() => {
            setApprovalDialogOpen(false);
            setApprovalDialogPostIds([]);
          }}
          clientId={clientId}
          postIds={approvalDialogPostIds}
          onCreated={fetchScheduledPosts}
        />
      )}
    </Container>
  );
};

export default SingleClientDashboard;
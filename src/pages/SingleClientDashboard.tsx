import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme
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
  Refresh as RefreshIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { Client } from '../types';
import { 
  instagramMetricsService, 
  InstagramPost, 
  InstagramProfile, 
  PostsFilter,
  DashboardSummary,
  MediaTypeAnalysis,
  EngagementBreakdown,
  TimelineData
} from '../services/instagramMetricsService';
import { instagramCacheService, CachedData } from '../services/instagramCacheService';
import { clientService } from '../services/supabaseClient';
import { pdfExportService } from '../services/pdfExportService';
import { formatDistanceToNow, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importar componentes
import ClientHeader from '../components/ClientHeader';
import ShareLinkDialog from '../components/ShareLinkDialog';
import {
  MetricsOverview,
  FeaturedPost,
  PostsTable,
  PostFilters,
  PostDetails,
  ClientSettings,
  ScheduledPostsList,
  PDFExportDialog
} from '../components/dashboard';

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
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Instagram data com cache
  const [cachedData, setCachedData] = useState<CachedData | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
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

  // Debug client data
  useEffect(() => {
    if (client) {
      console.log('=== DEBUG CLIENT DATA ===');
      console.log('Client object:', client);
      console.log('accessToken:', client.accessToken);
      console.log('instagramAccountId:', client.instagramAccountId);
      console.log('username:', client.username);
      console.log('hasInstagramAuth:', Boolean(client.accessToken && client.instagramAccountId));
      console.log('========================');
    }
  }, [client]);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchClient = async () => {
      try {
        // Usar o clientService ao invés de consulta direta
        const clients = await clientService.getClients();
        const clientData = clients.find(c => c.id === clientId);
        
        if (!clientData) {
          throw new Error('Cliente não encontrado');
        }
        
        console.log('Cliente carregado:', clientData);
        console.log('Tem accessToken?', !!clientData.accessToken);
        console.log('Tem instagramAccountId?', !!clientData.instagramAccountId);
        
        setClient(clientData);
        
        // Verificar se o cliente tem autenticação do Instagram
        if (clientData.accessToken && clientData.instagramAccountId) {
          console.log('Cliente autenticado, carregando dados do Instagram...');
          await loadInstagramDataWithCache(clientData.id);
        } else {
          console.log('Cliente não autenticado com Instagram');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Erro ao buscar cliente:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    const fetchScheduledPosts = async () => {
      try {
        // Buscar posts agendados
        const { data: postsData, error: postsError } = await supabase
          .from('scheduled_posts')
          .select('*')
          .eq('client_id', clientId)
          .order('scheduled_date', { ascending: true });
          
        if (postsError) throw postsError;
        
        // Calcular estatísticas
        const published = (postsData || []).filter(p => 
          p.status === 'published' || p.status === 'posted'
        ).length;
        const scheduled = (postsData || []).filter(p => 
          p.status === 'pending' || p.status === 'sent_to_n8n'
        ).length;
        
        setPostsStats({ published, scheduled });
        
        // Buscar informações dos usuários únicos
        const userIds = [...new Set((postsData || []).map(p => p.user_id).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (profilesData) {
            profilesData.forEach(profile => {
              usersMap[profile.id] = profile;
            });
          }
        }
        
        // Combinar posts com informações dos usuários
        const postsWithUsers = (postsData || []).map(post => ({
          ...post,
          profiles: post.user_id ? usersMap[post.user_id] : null
        }));
        
        setScheduledPosts(postsWithUsers);
      } catch (err: any) {
        console.error('Erro ao buscar posts agendados:', err);
      }
    };
    
    fetchClient();
    fetchScheduledPosts();
  }, [clientId]);

  /**
   * Carrega dados do Instagram usando o sistema de cache - VERSÃO CORRIGIDA
   */
  const loadInstagramDataWithCache = async (clientId: string, forceRefresh = false) => {
    setLoading(true);
    setLoadingDashboard(true);
    
    try {
      setSyncInProgress(forceRefresh);
      console.log(forceRefresh ? 'Forçando sincronização...' : 'Usando sincronização inteligente...');
      
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
      
      console.log(`📊 Dashboard atualizado: ${result.posts.length} posts, fonte: ${result.isFromCache ? 'cache' : 'API'}`);
      
    } catch (err: any) {
      console.error('Erro ao carregar dados do Instagram:', err);
      setError('Não foi possível carregar os dados do Instagram. Verifique a conexão.');
      
      // Em caso de erro, tentar usar dados em cache se existirem
      try {
        const cachedDataFallback = await instagramCacheService.getCachedData(clientId);
        if (cachedDataFallback.posts.length > 0) {
          setCachedData(cachedDataFallback);
          await generateDashboardData(cachedDataFallback.posts);
          console.log('📋 Usando dados em cache como fallback');
        }
      } catch (cacheError) {
        console.error('Erro ao buscar dados em cache:', cacheError);
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
      
      console.log('📊 Dados do dashboard gerados:', {
        posts: posts.length,
        totalReach: summary.total_reach,
        totalEngagement: summary.total_engagement
      });
    } catch (err: any) {
      console.error('Erro ao gerar dados do dashboard:', err);
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
    
    console.log('🔄 Usuário solicitou atualização manual');
    setError(null); // Limpar erros anteriores
    await loadInstagramDataWithCache(clientId, true);
  };

  /**
   * Limpa o cache e recarrega
   */
  const handleClearCache = async () => {
    if (!clientId || syncInProgress) return;
    
    try {
      console.log('🗑️ Limpando cache...');
      await instagramCacheService.clearCache(clientId);
      setCachedData(null);
      setDashboardData(null);
      setError(null);
      
      // Recarregar dados
      await loadInstagramDataWithCache(clientId, true);
    } catch (err: any) {
      console.error('Erro ao limpar cache:', err);
      setError('Não foi possível limpar o cache.');
    }
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
    console.log('🔍 Filtros aplicados:', newFilters);
    
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
    console.log('🔄 Filtros resetados');
    
    // Regenerar dashboard sem filtros
    if (cachedData?.posts) {
      setTimeout(() => generateDashboardData(cachedData.posts), 100);
    }
  };
  
  const handleEditClient = () => {
    console.log('✏️ Editar cliente:', client);
    // TODO: Implementar modal de edição ou navegar para página de edição
    navigate(`/clients/${clientId}/edit`);
  };
  
  const handleConnectInstagram = () => {
    navigate(`/clients/${clientId}/connect-instagram`);
  };
  
  const handleDisconnectInstagram = async () => {
    if (!client) return;
    
    try {
      console.log('🔌 Desconectando Instagram...');
      
      // Usar o clientService ao invés de consulta direta
      const updatedClient = await clientService.removeInstagramAuth(client.id);
      
      console.log('✅ Instagram desconectado, cliente atualizado:', updatedClient);
      
      // Atualizar estado local
      setClient(updatedClient);
      
      // Limpar dados do Instagram e cache
      setCachedData(null);
      setDashboardData(null);
      await instagramCacheService.clearCache(client.id);
      
      setError(null);
    } catch (err: any) {
      console.error('❌ Erro ao desconectar Instagram:', err);
      setError('Não foi possível desconectar a conta do Instagram.');
    }
  };
  
  const handleExportData = () => {
    const posts = cachedData?.posts || [];
    if (posts.length === 0) {
      console.log('⚠️ Nenhum post para exportar');
      return;
    }
    
    try {
      console.log('📤 Exportando dados...', posts.length, 'posts');
      
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
      
      console.log('✅ Dados exportados:', fileName);
    } catch (err) {
      console.error('❌ Erro ao exportar dados:', err);
      setError('Não foi possível exportar os dados.');
    }
  };

  const [pdfExportDialogOpen, setPdfExportDialogOpen] = useState(false);
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);

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
      console.error('❌ Erro ao gerar PDF:', err);
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
  
  // Filter posts com período global
  const posts = cachedData?.posts || [];
  const cutoffDate = subDays(new Date(), period === '7d' ? 7 : period === '30d' ? 30 : 90);
  
  const filteredPosts = posts.filter(post => {
    // Filter by período global
    const postDate = new Date(post.timestamp);
    if (!isAfter(postDate, cutoffDate)) {
      return false;
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

    // Calcular totais do período filtrado
    const totals = filteredTimeline.reduce((acc, item) => ({
      posts: acc.posts + (item.posts || 0),
      engagement: acc.engagement + (item.engagement || 0),
      reach: acc.reach + (item.reach || 0),
      impressions: acc.impressions + (item.impressions || 0),
    }), { posts: 0, engagement: 0, reach: 0, impressions: 0 });

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

    // Calcular métricas do período anterior para comparação
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const previousPeriodEnd = cutoffDate; // Fim do período anterior = início do período atual
    const previousPeriodStart = subDays(previousPeriodEnd, days); // Início do período anterior
    
    // Filtrar posts do período anterior
    const previousPeriodPosts = posts.filter(post => {
      const postDate = new Date(post.timestamp);
      return postDate >= previousPeriodStart && postDate < previousPeriodEnd;
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
  }, [dashboardData, period, posts]);
  
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
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            {syncInProgress ? 'Sincronizando dados do Instagram...' : 'Carregando dashboard...'}
          </Typography>
          {syncInProgress && (
            <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
          )}
        </Box>
      </Container>
    );
  }
  
  if (error && !cachedData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }
  
  if (!client) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Cliente não encontrado</Alert>
      </Container>
    );
  }
  
  const hasInstagramAuth = Boolean(client.accessToken && client.instagramAccountId);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
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

      {/* Erro não crítico - Simplificado */}
      {error && cachedData && (
        <Box sx={{ 
          mb: 2,
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'warning.light',
          border: '1px solid',
          borderColor: 'warning.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon fontSize="small" sx={{ color: 'warning.main' }} />
            {error} (Usando dados em cache)
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setError(null)}
            sx={{ p: 0.5 }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Alerta de Permissão de Insights */}
      {insightsPermissionError && hasInstagramAuth && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleConnectInstagram}
              sx={{ fontWeight: 600 }}
            >
              Reconectar
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Token sem permissão para insights
          </Typography>
          <Typography variant="body2">
            O token atual não tem a permissão 'instagram_manage_insights'. Reconecte a conta do Instagram para acessar impressões, reach e outras métricas detalhadas.
          </Typography>
        </Alert>
      )}

      
      <Box 
        sx={{ 
          mb: 4,
          position: 'relative'
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, ${alpha('#000', 0.05)}, ${alpha('#000', 0.02)}, ${alpha('#000', 0.05)})`,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light || theme.palette.primary.main})`,
              boxShadow: `0 -2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9375rem',
              px: 3,
              py: 2,
              color: 'text.secondary',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '12px 12px 0 0',
                background: 'transparent',
                transition: 'all 0.3s ease',
                zIndex: 0
              },
              '&:hover': {
                color: 'primary.main',
                '&::before': {
                  background: alpha(theme.palette.primary.main, 0.06)
                },
                transform: 'translateY(-2px)'
              },
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.96875rem',
                '&::before': {
                  background: alpha(theme.palette.primary.main, 0.08)
                },
                '& .MuiSvgIcon-root': {
                  transform: 'scale(1.1)',
                  filter: `drop-shadow(0 2px 4px ${alpha(theme.palette.primary.main, 0.3)})`
                }
              },
              '& .MuiSvgIcon-root': {
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '1.25rem',
                mr: 1
              }
            }
          }}
        >
          <Tab 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            label="Dashboard" 
            id="tab-0" 
            aria-controls="tabpanel-0"
            sx={{
              '&.Mui-selected': {
                '& .MuiSvgIcon-root': {
                  color: 'primary.main'
                }
              }
            }}
          />
          <Tab 
            icon={<CalendarIcon />} 
            iconPosition="start" 
            label="Agendamentos" 
            id="tab-1" 
            aria-controls="tabpanel-1"
            sx={{
              '&.Mui-selected': {
                '& .MuiSvgIcon-root': {
                  color: 'primary.main'
                }
              }
            }}
          />
          <Tab 
            icon={<SettingsIcon />} 
            iconPosition="start" 
            label="Configurações" 
            id="tab-2" 
            aria-controls="tabpanel-2"
            sx={{
              '&.Mui-selected': {
                '& .MuiSvgIcon-root': {
                  color: 'primary.main'
                }
              }
            }}
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {!hasInstagramAuth ? (
          <Box sx={{ 
            p: 3,
            borderRadius: 2,
            bgcolor: 'info.light',
            border: '1px solid',
            borderColor: 'info.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InstagramIcon sx={{ color: 'info.main' }} />
              Conecte a conta do Instagram para visualizar o dashboard completo.
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleConnectInstagram}
              startIcon={<InstagramIcon />}
            >
              Conectar Instagram
            </Button>
          </Box>
        ) : loadingDashboard ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 6, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Carregando métricas...
            </Typography>
          </Box>
        ) : !dashboardData ? (
          <Box sx={{ 
            p: 3,
            borderRadius: 2,
            bgcolor: 'info.light',
            border: '1px solid',
            borderColor: 'info.main',
            textAlign: 'center'
          }}>
            <Typography variant="body1" color="text.secondary">
              Não foram encontrados dados suficientes para gerar o dashboard.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Filtro de Período Global */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Typography variant="h6" fontWeight={600}>
                Métricas de Performance
              </Typography>
              
              <ToggleButtonGroup
                value={period}
                exclusive
                onChange={(_, newPeriod) => {
                  if (newPeriod) setPeriod(newPeriod);
                }}
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
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    },
                    '&:not(.Mui-selected)': {
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="7d">7 dias</ToggleButton>
                <ToggleButton value="30d">30 dias</ToggleButton>
                <ToggleButton value="90d">90 dias</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <MetricsOverview 
                  metrics={legacyMetrics} 
                  periodComparisons={periodComparisons}
                  previousPeriodValues={previousPeriodValues}
                />
              </Grid>
              
              {legacyMetrics.mostEngagedPost && (
                <Grid item xs={12}>
                  <FeaturedPost 
                    post={legacyMetrics.mostEngagedPost}
                    onViewDetails={handleViewPostDetails}
                    formatTimeAgo={formatTimeAgo}
                  />
                </Grid>
              )}
            </Grid>

            {/* Seção de Posts */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Posts do Instagram
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                mb: 3,
                flexWrap: 'wrap'
              }}>
                <TextField
                  placeholder="Buscar por legenda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => setSearchQuery('')}
                          sx={{ p: 0.5 }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ 
                    flexGrow: 1, 
                    maxWidth: { xs: '100%', sm: 320 },
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'background.paper'
                      }
                    }
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Filtros">
                    <IconButton 
                      onClick={handleOpenFilterDialog}
                      sx={{ 
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      <FilterIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Exportar dados">
                    <IconButton 
                      onClick={handleExportData}
                      disabled={filteredPosts.length === 0}
                      sx={{ 
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: 'primary.main'
                        },
                        '&.Mui-disabled': {
                          borderColor: 'divider',
                          opacity: 0.5
                        }
                      }}
                    >
                      <ExportIcon fontSize="small" />
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
          </>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ScheduledPostsList 
            posts={scheduledPosts}
            onEditPost={(post) => {
              navigate(`/clients/${clientId}/edit-post/${post.id}`);
            }}
            onDeletePost={async (postId) => {
              try {
                const { error } = await supabase
                  .from('scheduled_posts')
                  .delete()
                  .eq('id', postId);
                
                if (error) throw error;
                
                setScheduledPosts(prev => prev.filter(p => p.id !== postId));
                console.log('✅ Post agendado excluído:', postId);
              } catch (err: any) {
                console.error('❌ Erro ao excluir post:', err);
                setError('Não foi possível excluir o post agendado.');
              }
            }}
          />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ClientSettings 
          client={client}
          hasInstagramAuth={hasInstagramAuth}
          onEditClient={handleEditClient}
          onConnectInstagram={handleConnectInstagram}
          onDisconnectInstagram={handleDisconnectInstagram}
        />
      </TabPanel>

      {/* Dialogs */}
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
    </Container>
  );
};

export default SingleClientDashboard;
import React, { useEffect, useState } from 'react';
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
  LinearProgress
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
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importar componentes
import ClientHeader from '../components/ClientHeader';
import {
  MetricsOverview,
  FeaturedPost,
  PostsTable,
  PostFilters,
  PostDetails,
  ClientSettings,
  ScheduledPostsList
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
        const { data, error } = await supabase
          .from('scheduled_posts')
          .select('*')
          .eq('client_id', clientId)
          .order('scheduled_date', { ascending: true });
          
        if (error) throw error;
        
        setScheduledPosts(data || []);
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
      } else {
        // Limpar dashboard se não há posts
        setDashboardData(null);
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
    navigate('/create-post');
  };
  
  const handleCreateStory = () => {
    navigate('/create-story');
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
  
  // Filter posts
  const posts = cachedData?.posts || [];
  const filteredPosts = posts.filter(post => {
    // Filter by search
    if (searchQuery && !post.caption?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by date
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
  const legacyMetrics = dashboardData ? {
    totalPosts: dashboardData.summary.total_posts,
    totalLikes: dashboardData.engagement_breakdown.likes,
    totalComments: dashboardData.engagement_breakdown.comments,
    engagementRate: dashboardData.summary.engagement_rate,
    postsByType: Object.keys(dashboardData.by_media_type).reduce((acc, key) => {
      acc[key] = dashboardData.by_media_type[key].count;
      return acc;
    }, {} as Record<string, number>),
    metricsByMonth: dashboardData.timeline.map(item => ({
      month: item.date.substring(0, 7), // YYYY-MM
      posts: item.posts,
      likes: Math.round(item.engagement * 0.8), // Estimativa
      comments: Math.round(item.engagement * 0.2), // Estimativa
      engagement: item.engagement
    })),
    mostEngagedPost: dashboardData.top_posts[0] || null,
    totalImpressions: dashboardData.summary.total_impressions,
    totalReach: dashboardData.summary.total_reach
  } : {
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
        onViewCalendar={handleViewCalendar}
      />

      {/* Erro não crítico */}
      {error && cachedData && (
        <Box sx={{ mb: 2 }}>
          <Alert 
            severity="warning"
            onClose={() => setError(null)}
          >
            {error} (Usando dados em cache)
          </Alert>
        </Box>
      )}

      {/* Status do Cache */}
      {hasInstagramAuth && cachedData && (
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity={cachedData.isStale ? "warning" : "success"}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<RefreshIcon />}
                  onClick={handleForceRefresh}
                  disabled={syncInProgress}
                >
                  {syncInProgress ? 'Atualizando...' : 'Atualizar'}
                </Button>
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleClearCache}
                  disabled={syncInProgress}
                >
                  Limpar Cache
                </Button>
              </Box>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {cachedData.cacheStatus.syncStatus === 'completed' ? (
                  <CheckCircleIcon fontSize="small" />
                ) : cachedData.cacheStatus.syncStatus === 'failed' ? (
                  <ErrorIcon fontSize="small" />
                ) : (
                  <ScheduleIcon fontSize="small" />
                )}
                <Typography variant="body2">
                  {cachedData.isStale 
                    ? `Dados desatualizados (última sincronização: ${formatTimeAgo(cachedData.cacheStatus.lastFullSync.toISOString())})`
                    : `Dados atualizados (${formatTimeAgo(cachedData.cacheStatus.lastFullSync.toISOString())})`
                  }
                </Typography>
              </Box>
              
              <Chip 
                size="small" 
                label={`${cachedData.cacheStatus.postsCount} posts em cache`}
                color={cachedData.isStale ? "warning" : "success"}
                variant="outlined"
              />
              
              {cachedData.cacheStatus.syncStatus === 'failed' && cachedData.cacheStatus.errorMessage && (
                <Chip 
                  size="small" 
                  label={`Erro: ${cachedData.cacheStatus.errorMessage}`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          </Alert>
        </Box>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab icon={<DashboardIcon />} label="Dashboard" id="tab-0" aria-controls="tabpanel-0" />
          <Tab icon={<InstagramIcon />} label="Instagram" id="tab-1" aria-controls="tabpanel-1" />
          <Tab icon={<CalendarIcon />} label="Agendamentos" id="tab-2" aria-controls="tabpanel-2" />
          <Tab icon={<SettingsIcon />} label="Configurações" id="tab-3" aria-controls="tabpanel-3" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {!hasInstagramAuth ? (
          <Alert 
            severity="info" 
            action={
              <Button color="inherit" size="small" onClick={handleConnectInstagram}>
                Conectar
              </Button>
            }
          >
            Conecte a conta do Instagram para visualizar o dashboard completo.
          </Alert>
        ) : loadingDashboard ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : !dashboardData ? (
          <Alert severity="info">
            Não foram encontrados dados suficientes para gerar o dashboard.
          </Alert>
        ) : (
          <MetricsOverview metrics={legacyMetrics} />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {!hasInstagramAuth ? (
          <Alert 
            severity="info" 
            action={
              <Button color="inherit" size="small" onClick={handleConnectInstagram}>
                Conectar
              </Button>
            }
          >
            Conecte a conta do Instagram para visualizar os posts.
          </Alert>
        ) : posts.length === 0 ? (
          <Alert 
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={handleForceRefresh}>
                Tentar Novamente
              </Button>
            }
          >
            Não foram encontrados posts no Instagram deste cliente.
          </Alert>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <TextField
                placeholder="Buscar por legenda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<FilterIcon />}
                  onClick={handleOpenFilterDialog}
                >
                  Filtros
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<ExportIcon />}
                  onClick={handleExportData}
                  disabled={filteredPosts.length === 0}
                >
                  Exportar
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MetricsOverview metrics={legacyMetrics} />
              </Grid>
              
              {legacyMetrics.mostEngagedPost && (
                <FeaturedPost 
                  post={legacyMetrics.mostEngagedPost}
                  onViewDetails={handleViewPostDetails}
                  formatTimeAgo={formatTimeAgo}
                />
              )}
              
              <Grid item xs={12}>
                <PostsTable 
                  posts={filteredPosts}
                  onViewDetails={handleViewPostDetails}
                  formatTimestamp={formatTimestamp}
                />
              </Grid>
            </Grid>
          </>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Posts Agendados</Typography>
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
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
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
    </Container>
  );
};

export default SingleClientDashboard;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Edit as EditIcon,
  Instagram as InstagramIcon,
  Image as ImageIcon,
  Movie as VideoIcon,
  PhotoLibrary as CarouselIcon,
  Favorite as LikeIcon,
  Comment as CommentIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  BarChart as ChartIcon,
  PostAdd as PostAddIcon,
  AddPhotoAlternate as StoryAddIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clientService, postService } from '../services/supabaseClient';
import { instagramMetricsService, InstagramPost, InstagramProfile } from '../services/instagramMetricsService';
import { Client } from '../types';

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
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `client-tab-${index}`,
    'aria-controls': `client-tabpanel-${index}`,
  };
}

const SingleClientDashboard: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [tabValue, setTabValue] = useState(0);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Carregar dados do cliente e métricas
  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) return;
      
      try {
        setLoading(true);
        
        // Carregar dados do cliente
        const clients = await clientService.getClients();
        const foundClient = clients.find(c => c.id === clientId);
        
        if (!foundClient) {
          setError('Cliente não encontrado');
          setLoading(false);
          return;
        }
        
        setClient(foundClient);
        
        // Carregar posts agendados
        const scheduledPostsData = await postService.getScheduledPostsByClient(clientId);
        setScheduledPosts(scheduledPostsData);
        
        // Carregar métricas do Instagram se o cliente estiver conectado
        if (foundClient.accessToken && foundClient.instagramAccountId) {
          try {
            // Carregar perfil do Instagram
            const profileData = await instagramMetricsService.getClientProfile(clientId);
            if (profileData) {
              setProfile(profileData);
            }
            
            // Carregar posts do Instagram
            const postsData = await instagramMetricsService.getClientPosts(clientId);
            setPosts(postsData);
          } catch (metricsError) {
            console.error('Erro ao carregar dados do Instagram:', metricsError);
            // Não exibimos o erro para não interromper a exibição do dashboard
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do cliente:', err);
        setError('Erro ao carregar dados do cliente');
      } finally {
        setLoading(false);
      }
    };
    
    loadClientData();
  }, [clientId]);

  // Manipuladores de eventos
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreatePost = () => {
    navigate(`/create-post?clientId=${clientId}`);
  };

  const handleCreateStory = () => {
    navigate(`/create-story?clientId=${clientId}`);
  };

  const handleViewCalendar = () => {
    navigate(`/calendar/${clientId}`);
  };

  const handleRefreshMetrics = async () => {
    if (!clientId) return;
    
    try {
      setRefreshing(true);
      
      // Recarregar perfil do Instagram
      const profileData = await instagramMetricsService.getClientProfile(clientId);
      if (profileData) {
        setProfile(profileData);
      }
      
      // Recarregar posts do Instagram
      const postsData = await instagramMetricsService.getClientPosts(clientId);
      setPosts(postsData);
    } catch (err) {
      console.error('Erro ao atualizar métricas:', err);
      setError('Erro ao atualizar métricas do Instagram');
    } finally {
      setRefreshing(false);
    }
  };

  // Funções auxiliares
  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'IMAGE':
        return <ImageIcon />;
      case 'VIDEO':
        return <VideoIcon />;
      case 'CAROUSEL_ALBUM':
        return <CarouselIcon />;
      default:
        return <ImageIcon />;
    }
  };

  const getMediaTypeLabel = (mediaType: string) => {
    switch (mediaType) {
      case 'IMAGE':
        return 'Imagem';
      case 'VIDEO':
        return 'Vídeo';
      case 'CAROUSEL_ALBUM':
        return 'Carrossel';
      default:
        return mediaType;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return timestamp;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
    } catch (e) {
      return timestamp;
    }
  };

  // Calcular métricas agregadas
  const metrics = instagramMetricsService.calculateAggregatedMetrics(posts);

  // Estados de carregamento e erro
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando dados do cliente...</Typography>
      </Container>
    );
  }

  if (error || !client) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Cliente não encontrado'}</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => navigate('/clients')}
        >
          Voltar para a lista de clientes
        </Button>
      </Container>
    );
  }

  const hasInstagramAuth = client.accessToken && client.instagramAccountId;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Cabeçalho do cliente */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          background: `linear-gradient(to right, ${theme.palette.primary.main}22, ${theme.palette.primary.main}11)`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', alignItems: isTablet ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: isTablet ? 2 : 0 }}>
            <Badge 
              color={hasInstagramAuth ? "success" : "error"} 
              overlap="circular"
              badgeContent={hasInstagramAuth ? <InstagramIcon fontSize="small" /> : null}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              sx={{ mr: 2 }}
            >
              <Avatar 
                src={profile?.profile_picture_url || client.profilePicture || client.logoUrl} 
                alt={client.name}
                sx={{ width: 80, height: 80 }}
              >
                {client.name.charAt(0)}
              </Avatar>
            </Badge>
            
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {client.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InstagramIcon sx={{ fontSize: 18, mr: 0.5, color: '#E1306C' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  @{profile?.username || client.instagram}
                </Typography>
                {client.username && client.username !== client.instagram && (
                  <Chip 
                    size="small" 
                    label={client.username} 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: isTablet ? 'flex-start' : 'flex-end' }}>
            <Button 
              variant="contained" 
              startIcon={<PostAddIcon />}
              onClick={handleCreatePost}
              sx={{ color: '#ffffff' }}
            >
              Criar Post
            </Button>
            <Button 
              variant="contained" 
              startIcon={<StoryAddIcon />}
              onClick={handleCreateStory}
              sx={{ color: '#ffffff' }}
            >
              Criar Story
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<CalendarIcon />}
              onClick={handleViewCalendar}
              sx={{ color: theme.palette.primary.main }}
            >
              Calendário
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Abas de navegação */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="client dashboard tabs"
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : undefined}
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="Dashboard" 
            {...a11yProps(0)} 
            sx={{ fontWeight: 'medium' }}
          />
          <Tab 
            icon={<InstagramIcon />} 
            label="Métricas" 
            {...a11yProps(1)} 
            sx={{ fontWeight: 'medium' }}
            disabled={!hasInstagramAuth}
          />
          <Tab 
            icon={<CalendarIcon />} 
            label="Agendados" 
            {...a11yProps(2)} 
            sx={{ fontWeight: 'medium' }}
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="Configurações" 
            {...a11yProps(3)} 
            sx={{ fontWeight: 'medium' }}
          />
        </Tabs>
      </Box>

      {/* Conteúdo das abas */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1 }} /> Visão Geral
        </Typography>
        
        <Grid container spacing={3}>
          {/* Cards de ações rápidas */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Ações Rápidas</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={handleCreatePost} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <PostAddIcon sx={{ fontSize: 40, mb: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" align="center">Criar Post</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={handleCreateStory} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <StoryAddIcon sx={{ fontSize: 40, mb: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" align="center">Criar Story</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={handleViewCalendar} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <CalendarIcon sx={{ fontSize: 40, mb: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" align="center">Ver Calendário</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={() => setTabValue(3)} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <SettingsIcon sx={{ fontSize: 40, mb: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" align="center">Configurações</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Status da conta */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Status da Conta</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  src={profile?.profile_picture_url || client.profilePicture} 
                  alt={client.name}
                  sx={{ width: 60, height: 60, mr: 2 }}
                >
                  {client.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {profile?.name || client.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: '#E1306C' }} />
                    <Typography variant="body2">
                      @{profile?.username || client.instagram}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Status de Conexão:</Typography>
                {hasInstagramAuth ? (
                  <Chip 
                    icon={<InstagramIcon />}
                    label="Conectado ao Instagram" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontWeight: 'medium' }}
                  />
                ) : (
                  <Chip 
                    icon={<InstagramIcon />}
                    label="Não conectado ao Instagram" 
                    color="error" 
                    variant="outlined"
                    sx={{ fontWeight: 'medium' }}
                  />
                )}
              </Box>
              
              {client.tokenExpiry && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Validade do Token:</Typography>
                  <Chip 
                    label={`Válido até ${new Date(client.tokenExpiry).toLocaleDateString()}`} 
                    color="primary" 
                    variant="outlined"
                    size="small"
                  />
                </Box>
              )}
              
              {profile && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Estatísticas do Instagram:</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="h6">{profile.followers_count}</Typography>
                        <Typography variant="caption">Seguidores</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="h6">{profile.follows_count}</Typography>
                        <Typography variant="caption">Seguindo</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="h6">{profile.media_count}</Typography>
                        <Typography variant="caption">Posts</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {!hasInstagramAuth && (
                <Button 
                  variant="contained" 
                  startIcon={<InstagramIcon />} 
                  fullWidth
                  sx={{ mt: 2, color: '#ffffff' }}
                  onClick={() => setTabValue(3)}
                >
                  Conectar ao Instagram
                </Button>
              )}
            </Paper>
          </Grid>
          
          {/* Resumo de métricas (se conectado ao Instagram) */}
          {hasInstagramAuth && posts.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Resumo de Métricas</Typography>
                  <Button 
                    startIcon={<ChartIcon />}
                    onClick={() => setTabValue(1)}
                    size="small"
                  >
                    Ver Detalhes
                  </Button>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Posts</Typography>
                        <Typography variant="h4">{metrics.totalPosts}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Curtidas</Typography>
                        <Typography variant="h4">{metrics.totalLikes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Comentários</Typography>
                        <Typography variant="h4">{metrics.totalComments}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Engajamento</Typography>
                        <Typography variant="h4">{metrics.engagementRate.toFixed(1)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
            <InstagramIcon sx={{ mr: 1 }} /> Métricas do Instagram
          </Typography>
          
          <Tooltip title="Atualizar métricas">
            <IconButton onClick={handleRefreshMetrics} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        
        {!hasInstagramAuth ? (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setTabValue(3)}>
                Conectar
              </Button>
            }
          >
            Esta conta não está conectada ao Instagram. Conecte para ver as métricas.
          </Alert>
        ) : posts.length === 0 ? (
          <Alert severity="info">Nenhum post encontrado para este cliente.</Alert>
        ) : (
          <Grid container spacing={3}>
            {/* Métricas gerais */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Métricas Gerais</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Posts</Typography>
                        <Typography variant="h4">{metrics.totalPosts}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Curtidas</Typography>
                        <Typography variant="h4">{metrics.totalLikes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Comentários</Typography>
                        <Typography variant="h4">{metrics.totalComments}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="overline" sx={{ opacity: 0.8 }}>Engajamento</Typography>
                        <Typography variant="h4">{metrics.engagementRate.toFixed(1)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            {/* Perfil do Instagram */}
            {profile && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Perfil do Instagram</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar 
                          src={profile.profile_picture_url} 
                          alt={profile.username}
                          sx={{ width: 120, height: 120, mb: 2 }}
                        />
                        <Typography variant="h6">{profile.name}</Typography>
                        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                          <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: '#E1306C' }} />
                          @{profile.username}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Biografia:</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {profile.biography || "Sem biografia."}
                      </Typography>
                      
                      {profile.website && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Website:</Typography>
                          <Button 
                            variant="outlined" 
                            size="small"
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {profile.website}
                          </Button>
                        </Box>
                      )}
                      
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={4}>
                          <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                            <Typography variant="h5">{profile.followers_count}</Typography>
                            <Typography variant="body2">Seguidores</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={4}>
                          <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                            <Typography variant="h5">{profile.follows_count}</Typography>
                            <Typography variant="body2">Seguindo</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={4}>
                          <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <Typography variant="h5">{profile.media_count}</Typography>
                            <Typography variant="body2">Posts</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            
            {/* Tipos de mídia */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Tipos de Mídia</Typography>
                <Grid container spacing={2}>
                  {Object.entries(metrics.postsByType).map(([type, count]) => (
                    <Grid item xs={4} key={type}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        {getMediaTypeIcon(type)}
                        <Typography variant="h6">{count}</Typography>
                        <Typography variant="caption">{getMediaTypeLabel(type)}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
            
            {/* Post mais engajado */}
            {metrics.mostEngagedPost && (
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Post Mais Engajado</Typography>
                  <Card sx={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row' }}>
                    <CardMedia
                      component="img"
                      sx={{ 
                        width: isTablet ? '100%' : 200,
                        height: isTablet ? 200 : '100%',
                        objectFit: 'cover'
                      }}
                      image={metrics.mostEngagedPost.thumbnail_url || metrics.mostEngagedPost.media_url}
                      alt={metrics.mostEngagedPost.caption}
                    />
                    <CardContent sx={{ flex: '1 0 auto' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          icon={getMediaTypeIcon(metrics.mostEngagedPost.media_type)}
                          label={getMediaTypeLabel(metrics.mostEngagedPost.media_type)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(metrics.mostEngagedPost.timestamp)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        {metrics.mostEngagedPost.caption}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip 
                          icon={<LikeIcon />}
                          label={`${metrics.mostEngagedPost.like_count} curtidas`}
                          variant="outlined"
                          size="small"
                        />
                        <Chip 
                          icon={<CommentIcon />}
                          label={`${metrics.mostEngagedPost.comments_count} comentários`}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      
                      <Button 
                        startIcon={<LinkIcon />}
                        href={metrics.mostEngagedPost.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 2 }}
                      >
                        Ver no Instagram
                      </Button>
                    </CardContent>
                  </Card>
                </Paper>
              </Grid>
            )}
            
            {/* Lista de posts */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Posts do Instagram</Typography>
                <List>
                  {posts.map((post) => (
                    <React.Fragment key={post.id}>
                      <ListItem
                        secondaryAction={
                          <Tooltip title="Ver no Instagram">
                            <IconButton 
                              edge="end" 
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar 
                            variant="rounded"
                            src={post.thumbnail_url || post.media_url}
                            alt={post.caption}
                          >
                            {getMediaTypeIcon(post.media_type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={post.caption.length > 50 ? post.caption.substring(0, 50) + '...' : post.caption}
                          secondary={
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimestamp(post.timestamp)}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LikeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                <Typography variant="caption">{post.like_count}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CommentIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                <Typography variant="caption">{post.comments_count}</Typography>
                              </Box>
                              <Chip 
                                label={getMediaTypeLabel(post.media_type)}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <CalendarIcon sx={{ mr: 1 }} /> Posts Agendados
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              startIcon={<CalendarIcon />}
              onClick={handleViewCalendar}
              sx={{ mb: 2, color: '#ffffff' }}
            >
              Ver Calendário Completo
            </Button>
            
            {scheduledPosts.length === 0 ? (
              <Alert severity="info">
                Não há posts agendados para este cliente.
              </Alert>
            ) : (
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <List>
                  {scheduledPosts.map((post) => (
                    <ListItem key={post.id}>
                      <ListItemAvatar>
                        <Avatar 
                          variant="rounded"
                          src={post.mediaUrl || post.thumbnailUrl}
                        >
                          {post.type === 'image' ? <ImageIcon /> : <VideoIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={post.caption.length > 50 ? post.caption.substring(0, 50) + '...' : post.caption}
                        secondary={`Agendado para ${formatTimestamp(post.scheduledDate)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} /> Configurações da Conta
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Informações do Cliente</Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Nome:</Typography>
                <Typography variant="body1">{client.name}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Instagram:</Typography>
                <Typography variant="body1">@{client.instagram}</Typography>
              </Box>
              
              {client.username && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Nome de usuário:</Typography>
                  <Typography variant="body1">{client.username}</Typography>
                </Box>
              )}
              
              <Button 
                variant="contained" 
                startIcon={<EditIcon />}
                sx={{ mt: 1, color: '#ffffff' }}
              >
                Editar Informações
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Conexão com Instagram</Typography>
              
              {hasInstagramAuth ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Esta conta está conectada ao Instagram.
                  </Alert>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>ID da conta:</Typography>
                    <Typography variant="body1">{client.instagramAccountId}</Typography>
                  </Box>
                  
                  {client.tokenExpiry && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Validade do token:</Typography>
                      <Typography variant="body1">{new Date(client.tokenExpiry).toLocaleDateString()}</Typography>
                    </Box>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Esta conta não está conectada ao Instagram.
                  </Alert>
                  
                  <Button 
                    variant="contained" 
                    startIcon={<InstagramIcon />}
                    sx={{ mt: 1, color: '#ffffff' }}
                  >
                    Conectar ao Instagram
                  </Button>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default SingleClientDashboard;
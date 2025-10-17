import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  IconButton, 
  Tabs, 
  Tab, 
  Menu, 
  MenuItem, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Divider, 
  Chip, 
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  ListItemIcon,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarIcon,
  Instagram as InstagramIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Photo as PhotoIcon,
  VideoLibrary as VideoIcon,
  Collections as CarouselIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '../components/Header';
import { clientService, postService } from '../services/supabaseClient';
import { Client, Post, Story } from '../types';
import StoryPreview from '../components/StoryPreview';

// Tipo para representar qualquer conteúdo agendado (post, carrossel, reels ou story)
interface ScheduledContent {
  id: string;
  clientId: string;
  type: 'post' | 'carousel' | 'reels' | 'story';
  images: { url: string }[] | { url: string };
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  createdAt: string;
  caption?: string;
  client?: Client;
}

const ContentCalendar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [contentItems, setContentItems] = useState<ScheduledContent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContent, setSelectedContent] = useState<ScheduledContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  
  // Gerar dias do mês atual
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Adicionar dias do início da semana (se o mês não começar no domingo)
  const startWeek = startOfWeek(monthStart);
  const daysBeforeMonth = eachDayOfInterval({ 
    start: startWeek, 
    end: new Date(monthStart.getTime() - 24 * 60 * 60 * 1000) 
  });
  
  // Adicionar dias do fim da semana (se o mês não terminar no sábado)
  const endWeek = endOfWeek(monthEnd);
  const daysAfterMonth = eachDayOfInterval({ 
    start: new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000), 
    end: endWeek 
  });
  
  // Todos os dias que serão exibidos no calendário
  const calendarDays = [...daysBeforeMonth, ...monthDays, ...daysAfterMonth];
  
  // Função para buscar clientes e conteúdos agendados
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar clientes
      const clientsData = await clientService.getClients();
      setClients(clientsData);
      
      // Buscar todos os posts agendados
      const postsData = await postService.getAllScheduledPosts();
      
      // Converter posts para o formato ScheduledContent
      const formattedContent: ScheduledContent[] = postsData.map(post => {
        // Determinar o tipo de conteúdo com base no número de imagens
        let contentType: 'post' | 'carousel' | 'reels' | 'story' = 'post';
        
        if (post.type) {
          contentType = post.type;
        } else if (post.images && Array.isArray(post.images)) {
          contentType = post.images.length > 1 ? 'carousel' : 'post';
        }
        
        // Se for um vídeo, marcar como reels
        if (post.isVideo) {
          contentType = 'reels';
        }
        
        return {
          id: post.id,
          clientId: post.clientId,
          type: contentType,
          images: post.images || [],
          scheduledDate: post.scheduledDate,
          status: post.status || 'scheduled',
          createdAt: post.createdAt || new Date().toISOString(),
          caption: post.caption,
          client: post.clients
        };
      });
      
      setContentItems(formattedContent);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchData();
  }, []);
  
  // Filtrar conteúdo com base no cliente e tipo selecionados
  const filteredContent = contentItems.filter(item => {
    const clientMatch = selectedClient === 'all' || item.clientId === selectedClient;
    const typeMatch = contentTypeFilter === 'all' || item.type === contentTypeFilter;
    return clientMatch && typeMatch;
  });
  
  const handleClientChange = (event: SelectChangeEvent) => {
    setSelectedClient(event.target.value);
  };
  
  const handleContentTypeChange = (event: SelectChangeEvent) => {
    setContentTypeFilter(event.target.value);
  };
  
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, content: ScheduledContent) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedContent(content);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handlePreview = () => {
    setMenuAnchorEl(null);
    setPreviewOpen(true);
  };
  
  const handleEdit = () => {
    setMenuAnchorEl(null);
    
    if (!selectedContent) return;
    
    // Redirecionar para a página de edição apropriada com base no tipo de conteúdo
    switch (selectedContent.type) {
      case 'story':
        navigate(`/edit-story/${selectedContent.id}`);
        break;
      case 'post':
      case 'carousel':
      case 'reels':
        navigate(`/edit-post/${selectedContent.id}`);
        break;
    }
  };
  
  const handleDeleteConfirm = () => {
    setMenuAnchorEl(null);
    setDeleteConfirmOpen(true);
  };
  
  const handleDelete = async () => {
    if (!selectedContent) {
      setDeleteConfirmOpen(false);
      return;
    }
    
    try {
      // Implementar a lógica de exclusão quando estiver disponível na API
      // await postService.deleteScheduledPost(selectedContent.id);
      
      // Por enquanto, apenas remover do estado local
      setContentItems(prev => prev.filter(item => item.id !== selectedContent.id));
      
      setDeleteConfirmOpen(false);
      setSelectedContent(null);
    } catch (err) {
      console.error('Erro ao excluir conteúdo:', err);
      // Mostrar mensagem de erro
    }
  };
  
  // Função para obter conteúdo de um dia específico
  const getContentForDay = (day: Date) => {
    return filteredContent.filter(item => {
      const itemDate = parseISO(item.scheduledDate);
      return isWithinInterval(itemDate, {
        start: startOfDay(day),
        end: endOfDay(day)
      });
    });
  };
  
  // Função para obter o cliente pelo ID
  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId) || null;
  };
  
  // Função para obter o ícone com base no tipo de conteúdo
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <PhotoIcon fontSize="small" />;
      case 'carousel':
        return <CarouselIcon fontSize="small" />;
      case 'reels':
        return <VideoIcon fontSize="small" />;
      case 'story':
        return <InstagramIcon fontSize="small" />;
      default:
        return <PhotoIcon fontSize="small" />;
    }
  };
  
  // Função para obter a cor com base no tipo de conteúdo
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'post':
        return theme.palette.primary.main;
      case 'carousel':
        return theme.palette.secondary.main;
      case 'reels':
        return '#E1306C'; // Rosa do Instagram
      case 'story':
        return '#FCAF45'; // Laranja do Instagram
      default:
        return theme.palette.primary.main;
    }
  };
  
  // Função para obter o rótulo com base no status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendado';
      case 'posted':
        return 'Publicado';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };
  
  // Função para obter a cor com base no status
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'scheduled':
        return 'primary';
      case 'posted':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Função para renderizar o conteúdo do preview
  const renderPreviewContent = () => {
    if (!selectedContent) return null;
    
    // Determinar o que renderizar com base no tipo de conteúdo
    switch (selectedContent.type) {
      case 'story':
        // Converter para o formato esperado pelo StoryPreview
        const storyData: Story = {
          id: selectedContent.id,
          clientId: selectedContent.clientId,
          image: {
            id: 'preview',
            url: Array.isArray(selectedContent.images) 
              ? selectedContent.images[0]?.url 
              : selectedContent.images.url,
            width: 1080,
            height: 1920,
            aspectRatio: 9/16
          },
          elements: [],
          scheduledDate: selectedContent.scheduledDate,
          status: selectedContent.status,
          createdAt: selectedContent.createdAt,
          duration: 15
        };
        return <StoryPreview story={storyData} />;
        
      case 'post':
      case 'carousel':
      case 'reels':
        return (
          <Box sx={{ textAlign: 'center' }}>
            {Array.isArray(selectedContent.images) ? (
              // Carrossel ou post único
              selectedContent.images.map((img, index) => (
                <Box 
                  key={index}
                  component="img"
                  src={img.url}
                  alt={`Imagem ${index + 1}`}
                  sx={{ 
                    maxWidth: '100%', 
                    maxHeight: 500,
                    mb: 2,
                    borderRadius: 2
                  }}
                />
              ))
            ) : (
              // Imagem única
              <Box 
                component="img"
                src={selectedContent.images.url}
                alt="Prévia"
                sx={{ 
                  maxWidth: '100%', 
                  maxHeight: 500,
                  borderRadius: 2
                }}
              />
            )}
            
            {selectedContent.caption && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2">{selectedContent.caption}</Typography>
              </Paper>
            )}
          </Box>
        );
        
      default:
        return (
          <Typography>
            Prévia não disponível para este tipo de conteúdo.
          </Typography>
        );
    }
  };
  
  // Estilo para os itens de dia do calendário
  const dayItemStyle = {
    width: 'calc(100% / 7)',
    padding: '4px'
  };
  
  return (
    <>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs de navegação */}
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
          sx={{ mb: 3 }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: theme.palette.text.secondary, textDecoration: 'none' }}>
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Início
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <CalendarIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Calendário de Conteúdo
          </Typography>
        </Breadcrumbs>
        
        {/* Cabeçalho da página */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexDirection: isTablet ? 'column' : 'row',
          gap: 2,
          mb: 4 
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CalendarIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            Calendário de Conteúdo
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            width: isTablet ? '100%' : 'auto',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <FormControl fullWidth sx={{ minWidth: isMobile ? '100%' : 150 }}>
                <InputLabel id="client-select-label">Cliente</InputLabel>
                <Select
                  labelId="client-select-label"
                  id="client-select"
                  value={selectedClient}
                  label="Cliente"
                  onChange={handleClientChange}
                  startAdornment={<PeopleIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  <MenuItem value="all">Todos os Clientes</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={client.logoUrl} 
                          sx={{ width: 24, height: 24, mr: 1 }}
                        >
                          {client.name.charAt(0)}
                        </Avatar>
                        {client.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ minWidth: isMobile ? '100%' : 150 }}>
                <InputLabel id="type-select-label">Tipo</InputLabel>
                <Select
                  labelId="type-select-label"
                  id="type-select"
                  value={contentTypeFilter}
                  label="Tipo"
                  onChange={handleContentTypeChange}
                >
                  <MenuItem value="all">Todos os Tipos</MenuItem>
                  <MenuItem value="post">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhotoIcon sx={{ mr: 1 }} />
                      Posts
                    </Box>
                  </MenuItem>
                  <MenuItem value="carousel">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CarouselIcon sx={{ mr: 1 }} />
                      Carrosséis
                    </Box>
                  </MenuItem>
                  <MenuItem value="reels">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VideoIcon sx={{ mr: 1 }} />
                      Reels
                    </Box>
                  </MenuItem>
                  <MenuItem value="story">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InstagramIcon sx={{ mr: 1 }} />
                      Stories
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchData}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Atualizar
              </Button>
              
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-story')}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Novo Conteúdo
              </Button>
            </Box>
          </Box>
        </Box>
        
        {/* Seletor de visualização */}
        <Paper sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={viewMode}
            onChange={(_, newValue) => setViewMode(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab 
              icon={<CalendarIcon />} 
              label="Calendário" 
              value="calendar" 
            />
            <Tab 
              icon={<List />} 
              label="Lista" 
              value="list" 
            />
          </Tabs>
        </Paper>
        
        {/* Estado de carregamento */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {/* Estado de erro */}
        {error && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
            <Typography variant="body1">{error}</Typography>
            <Button 
              variant="contained" 
              color="error"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ mt: 2 }}
            >
              Tentar Novamente
            </Button>
          </Paper>
        )}
        
        {/* Visualização de Calendário */}
        {!loading && !error && viewMode === 'calendar' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            {/* Navegação do mês */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <IconButton onClick={handlePrevMonth}>
                <ArrowBackIcon />
              </IconButton>
              
              <Typography variant="h5" sx={{ fontWeight: 'medium', textTransform: 'capitalize' }}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </Typography>
              
              <IconButton onClick={handleNextMonth}>
                <ArrowForwardIcon />
              </IconButton>
            </Box>
            
            {/* Calendário - usando Box em vez de Grid para evitar problemas de tipagem */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
              {/* Cabeçalho dos dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Box key={day} sx={dayItemStyle}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    p: 1
                  }}>
                    {day}
                  </Box>
                </Box>
              ))}
              
              {/* Dias do calendário */}
              {calendarDays.map((day, index) => {
                const dayContent = getContentForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <Box key={index} sx={dayItemStyle}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 1, 
                        height: '100%', 
                        minHeight: 120,
                        bgcolor: isToday ? 'rgba(25, 118, 210, 0.08)' : 
                                 !isCurrentMonth ? 'rgba(0, 0, 0, 0.03)' : 'background.paper',
                        border: isToday ? `1px solid ${theme.palette.primary.main}` : '1px solid #eee',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: isCurrentMonth ? 1 : 0.6
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isToday ? 'bold' : 'normal',
                          color: isToday ? 'primary.main' : 'text.primary',
                          mb: 1
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      {dayContent.length > 0 ? (
                        <Box sx={{ overflowY: 'auto', flex: 1 }}>
                          {dayContent.map((content) => {
                            const client = content.client || getClientById(content.clientId);
                            const contentDate = parseISO(content.scheduledDate);
                            
                            return (
                              <Box 
                                key={content.id} 
                                sx={{ 
                                  p: 0.5, 
                                  mb: 0.5, 
                                  bgcolor: getContentTypeColor(content.type),
                                  color: '#fff',
                                  borderRadius: 1,
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                  <Tooltip title={client?.name || 'Cliente'}>
                                    <Avatar 
                                      src={client?.logoUrl} 
                                      sx={{ width: 16, height: 16, mr: 0.5 }}
                                    >
                                      {client?.name?.charAt(0)}
                                    </Avatar>
                                  </Tooltip>
                                  <Tooltip title={format(contentDate, "HH:mm")}>
                                    <Typography 
                                      variant="caption" 
                                      noWrap 
                                      sx={{ fontWeight: 'medium', mr: 0.5 }}
                                    >
                                      {format(contentDate, "HH:mm")}
                                    </Typography>
                                  </Tooltip>
                                  <Tooltip title={content.type}>
                                    {getContentTypeIcon(content.type)}
                                  </Tooltip>
                                </Box>
                                <IconButton 
                                  size="small" 
                                  sx={{ color: 'inherit', p: 0.25 }}
                                  onClick={(e) => handleMenuOpen(e, content)}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        <Box sx={{ flex: 1 }} />
                      )}
                    </Paper>
                  </Box>
                );
              })}
            </Box>
            
            {/* Legenda */}
            <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: getContentTypeColor('post'), borderRadius: 1, mr: 1 }} />
                <Typography variant="caption">Post</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: getContentTypeColor('carousel'), borderRadius: 1, mr: 1 }} />
                <Typography variant="caption">Carrossel</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: getContentTypeColor('reels'), borderRadius: 1, mr: 1 }} />
                <Typography variant="caption">Reels</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, bgcolor: getContentTypeColor('story'), borderRadius: 1, mr: 1 }} />
                <Typography variant="caption">Story</Typography>
              </Box>
            </Box>
          </Paper>
        )}
        
        {/* Visualização de Lista */}
        {!loading && !error && viewMode === 'list' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Conteúdo Agendado
            </Typography>
            
            {filteredContent.length === 0 ? (
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'background.default',
                borderRadius: 2
              }}>
                <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhum conteúdo agendado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedClient === 'all' 
                    ? 'Não há conteúdo agendado para este período.' 
                    : 'Não há conteúdo agendado para este cliente.'}
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  component={Link}
                  to="/create-story"
                >
                  Criar Novo Conteúdo
                </Button>
              </Box>
            ) : (
              <List>
                {filteredContent
                  .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                  .map((content, index) => {
                    const client = content.client || getClientById(content.clientId);
                    const contentDate = parseISO(content.scheduledDate);
                    
                    return (
                      <React.Fragment key={content.id}>
                        {index > 0 && <Divider component="li" />}
                        <ListItem
                          secondaryAction={
                            <IconButton edge="end" onClick={(e) => handleMenuOpen(e, content)}>
                              <MoreVertIcon />
                            </IconButton>
                          }
                        >
                          <ListItemAvatar>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                              badgeContent={
                                <Tooltip title={content.type}>
                                  <Avatar 
                                    sx={{ 
                                      width: 20, 
                                      height: 20, 
                                      bgcolor: getContentTypeColor(content.type) 
                                    }}
                                  >
                                    {getContentTypeIcon(content.type)}
                                  </Avatar>
                                </Tooltip>
                              }
                            >
                              <Avatar 
                                variant="rounded"
                                src={Array.isArray(content.images) 
                                  ? content.images[0]?.url 
                                  : content.images?.url
                                }
                                sx={{ width: 56, height: 56 }}
                              />
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar 
                                  src={client?.logoUrl} 
                                  sx={{ width: 24, height: 24, mr: 1 }}
                                >
                                  {client?.name?.charAt(0)}
                                </Avatar>
                                <Typography variant="subtitle1">
                                  {client?.name || 'Cliente não encontrado'}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Chip 
                                  icon={<ScheduleIcon />} 
                                  label={format(contentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 1, mb: 1 }}
                                />
                                <Chip 
                                  icon={content.status === 'failed' ? <ErrorIcon /> : <CheckCircleIcon />} 
                                  label={getStatusLabel(content.status)}
                                  size="small"
                                  color={getStatusColor(content.status)}
                                  sx={{ mr: 1, mb: 1 }}
                                />
                                {content.caption && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                      mt: 0.5, 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }}
                                  >
                                    {content.caption}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
              </List>
            )}
          </Paper>
        )}
      </Container>
      
      {/* Menu de ações para conteúdo */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handlePreview}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Visualizar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteConfirm}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Excluir</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Diálogo de prévia */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {selectedContent && getContentTypeIcon(selectedContent.type)}
            <Typography sx={{ ml: 1 }}>
              Prévia do {selectedContent?.type === 'post' ? 'Post' : 
                         selectedContent?.type === 'carousel' ? 'Carrossel' :
                         selectedContent?.type === 'reels' ? 'Reels' : 'Story'}
            </Typography>
          </Box>
          <Chip 
            label={selectedContent?.client?.name || getClientById(selectedContent?.clientId || '')?.name || 'Cliente'}
            size="small"
            variant="outlined"
          />
        </DialogTitle>
        <DialogContent dividers>
          {renderPreviewContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContentCalendar;
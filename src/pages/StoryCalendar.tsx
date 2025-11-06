import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemAvatar,
  Divider,
  Badge,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  PersonAdd as PersonAddIcon,
  Instagram as InstagramIcon,
  VideoLibrary as VideoLibraryIcon,
  Collections as CollectionsIcon,
  Image as ImageIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';
import { postService, clientService, userProfileService, UserProfile } from '../services/supabaseClient';
import { Client, ScheduledPost, Story, PostStatus } from '../types';
import StoryPreview from '../components/StoryPreview';
import ClientManager from '../components/ClientManager';
import SmartImage from '../components/SmartImage';
import { imageUrlService } from '../services/imageUrlService';

const StoryCalendar: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Estados principais
  const [content, setContent] = useState<ScheduledPost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros e visualização
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Estados para menus e diálogos
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContent, setSelectedContent] = useState<ScheduledPost | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Carregando dados do calendário...');
      
      // Carregar dados em paralelo
      const [postsData, clientsData, profileData] = await Promise.all([
        postService.getScheduledPostsWithClient(),
        clientService.getClients(),
        userProfileService.getCurrentUserProfile()
      ]);
      
      console.log('📊 Dados carregados:', {
        content: postsData?.length || 0,
        clients: clientsData?.length || 0,
        profile: !!profileData
      });
      
      // Log detalhado dos dados para debug
      if (postsData && postsData.length > 0) {
        console.log('📝 Primeiro item de conteúdo:', postsData[0]);
      }
      
      if (clientsData && clientsData.length > 0) {
        console.log('👥 Primeiro cliente:', clientsData[0]);
      }
      
      setContent(postsData || []);
      setClients(clientsData || []);
      setUserProfile(profileData);
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do calendário');
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer parse seguro de datas
  const safeParseDateISO = (dateString: string | Date | null | undefined): Date | null => {
    if (!dateString) return null;
    
    try {
      if (dateString instanceof Date) {
        return isValid(dateString) ? dateString : null;
      }
      
      if (typeof dateString === 'string') {
        const parsed = parseISO(dateString);
        return isValid(parsed) ? parsed : null;
      }
      
      return null;
    } catch (error) {
      console.warn('Erro ao fazer parse da data:', dateString, error);
      return null;
    }
  };

  // Função para formatar data de forma segura
  const safeFormatDate = (
    dateString: string | Date | null | undefined, 
    formatStr: string, 
    options?: { locale?: any }
  ): string => {
    const date = safeParseDateISO(dateString);
    if (!date) return 'Data inválida';
    
    try {
      return format(date, formatStr, options);
    } catch (error) {
      console.warn('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  // Função para obter cliente por ID
  const getClientById = (clientId: string): Client | undefined => {
    return clients.find(client => client.id === clientId);
  };

  // Função para obter logo do cliente de forma segura
  const getClientLogo = (client: Client | null | undefined): string | undefined => {
    if (!client) return undefined;
    
    // Priorizar profilePicture (foto do Instagram)
    if (client.profilePicture && client.profilePicture.trim() !== '') {
      return client.profilePicture;
    }
    
    // Fallback para logoUrl
    if (client.logoUrl && client.logoUrl.trim() !== '') {
      return client.logoUrl;
    }
    
    return undefined;
  };

// Função para obter a primeira URL de imagem de forma segura
const getFirstImageUrl = (content: ScheduledPost): string => {
  try {
    // Para Reels, verificar se tem coverImage primeiro
    if (content.postType === 'reels' && content.coverImage) {
      // Verificação mais segura para string
      if (typeof content.coverImage === 'string') {
        const coverStr = content.coverImage as string;
        if (coverStr.trim()) {
          return imageUrlService.getPublicUrl(coverStr);
        }
      }
      
      // Verificação mais segura para array
      if (Array.isArray(content.coverImage)) {
        const coverArray = content.coverImage as string[];
        if (coverArray.length > 0) {
          const firstCover = coverArray[0];
          if (typeof firstCover === 'string' && firstCover.trim()) {
            return imageUrlService.getPublicUrl(firstCover);
          }
        }
      }
      
      // Verificação para objeto com url
      if (typeof content.coverImage === 'object' && content.coverImage !== null) {
        const coverObj = content.coverImage as { url?: string };
        if (coverObj.url && typeof coverObj.url === 'string' && coverObj.url.trim()) {
          return imageUrlService.getPublicUrl(coverObj.url);
        }
      }
    }
    
    // Para outros tipos ou se não tem coverImage, usar images
    if (content.images) {
      // Verificação mais segura para string
      if (typeof content.images === 'string') {
        const imagesStr = content.images as string;
        if (imagesStr.trim()) {
          return imageUrlService.getPublicUrl(imagesStr);
        }
      }
      
      // Verificação mais segura para array
      if (Array.isArray(content.images)) {
        const imagesArray = content.images as string[];
        if (imagesArray.length > 0) {
          const firstImage = imagesArray[0];
          if (typeof firstImage === 'string' && firstImage.trim()) {
            return imageUrlService.getPublicUrl(firstImage);
          }
        }
      }
      
      // Verificação para objeto com url
      if (typeof content.images === 'object' && content.images !== null) {
        const imagesObj = content.images as { url?: string };
        if (imagesObj.url && typeof imagesObj.url === 'string' && imagesObj.url.trim()) {
          return imageUrlService.getPublicUrl(imagesObj.url);
        }
      }
    }
    
    // Fallback baseado no tipo de conteúdo
    const fallbackText = content.postType === 'stories' ? 'Story' : 
                        content.postType === 'reels' ? 'Reel' : 
                        content.postType === 'carousel' ? 'Carrossel' : 'Post';
    
    return imageUrlService.getPlaceholder(400, 400, fallbackText);
    
  } catch (error) {
    console.warn('Erro ao obter URL da imagem:', error);
    return imageUrlService.getPlaceholder(400, 400, 'Erro na imagem');
  }
};

  // Função para obter cor por tipo de conteúdo (usando brand colors)
  const getContentTypeColor = (type: string): string => {
    switch (type) {
      case 'post': return '#E1306C'; // Instagram pink
      case 'carousel': return '#833AB4'; // Instagram purple
      case 'reels': return '#F56040'; // Instagram orange
      case 'stories': return '#FCAF45'; // Instagram yellow
      default: return theme.palette.primary.main;
    }
  };

  // Função para obter ícone por tipo de conteúdo
  const getContentTypeIcon = (type: string) => {
    const iconProps = { fontSize: 'small' as const };
    switch (type) {
      case 'post': return <ImageIcon {...iconProps} />;
      case 'carousel': return <CollectionsIcon {...iconProps} />;
      case 'reels': return <VideoLibraryIcon {...iconProps} />;
      case 'stories': return <InstagramIcon {...iconProps} />;
      default: return <ImageIcon {...iconProps} />;
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: PostStatus): string => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'sent_to_n8n': return 'Enviado';
      case 'processing': return 'Processando';
      case 'posted': return 'Publicado';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: PostStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'sent_to_n8n': return 'info';
      case 'processing': return 'primary';
      case 'posted': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Filtrar conteúdo
  const filteredContent = content.filter(item => {
    const matchesClient = selectedClient === 'all' || item.clientId === selectedClient;
    const itemDate = safeParseDateISO(item.scheduledDate);
    if (!itemDate) return false;
    const matchesMonth = isSameMonth(itemDate, selectedMonth);
    return matchesClient && matchesMonth;
  });

  // Agrupar conteúdo por dia para visualização de calendário
  const getContentForDay = (day: Date) => {
    return filteredContent.filter(item => {
      const itemDate = safeParseDateISO(item.scheduledDate);
      if (!itemDate) return false;
      return format(itemDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
  };

  // Handlers para menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, content: ScheduledPost) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedContent(content);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedContent(null);
  };

  // Handlers para ações
  const handlePreview = () => {
    setPreviewOpen(true);
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedContent) {
      // Navegar para página de edição baseada no tipo
      switch (selectedContent.postType) {
        case 'stories':
          navigate(`/edit-story/${selectedContent.id}`);
          break;
        case 'reels':
          navigate(`/edit-reel/${selectedContent.id}`);
          break;
        default:
          navigate(`/edit-post/${selectedContent.id}`);
      }
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedContent) {
      try {
        await postService.deleteScheduledPost(selectedContent.id);
        await loadData(); // Recarregar dados
        setDeleteConfirmOpen(false);
        setSelectedContent(null);
      } catch (error) {
        console.error('Erro ao excluir conteúdo:', error);
        setError('Erro ao excluir conteúdo');
      }
    }
  };

  // Handler para mudança de cliente
  const handleClientChange = (event: SelectChangeEvent<string>) => {
    setSelectedClient(event.target.value);
  };

  // Handler para mudança de modo de visualização
  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'calendar' | 'list' | null) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  // Handler para adicionar cliente
  const handleAddClient = async (newClient: Omit<Client, 'id'>) => {
    try {
      const addedClient = await clientService.addClient(newClient);
      setClients([...clients, addedClient]);
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      setError('Erro ao adicionar cliente');
      throw error;
    }
  };

  // Handler para atualizar cliente
  const handleUpdateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  // Handler para deletar cliente
  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter(c => c.id !== clientId));
  };

  // Função para renderizar o conteúdo do preview
  const renderPreviewContent = () => {
    if (!selectedContent) return null;
    
    const client = selectedContent.clients || getClientById(selectedContent.clientId);
    const contentDate = safeParseDateISO(selectedContent.scheduledDate);
    const createdDate = safeParseDateISO(selectedContent.createdAt);
    
    return (
      <Box>
        {/* Cabeçalho com informações do usuário e cliente */}
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SmartImage
                src={getClientLogo(client)}
                alt={client?.name || 'Cliente'}
                width={48}
                height={48}
                borderRadius="50%"
                fallbackText={client?.name?.charAt(0) || 'C'}
                sx={{ mr: 2 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  {client?.name || 'Cliente não encontrado'}
                  <Chip 
                    icon={getContentTypeIcon(selectedContent.postType)}
                    label={selectedContent.postType.toUpperCase()}
                    size="small"
                    sx={{ 
                      ml: 1,
                      bgcolor: getContentTypeColor(selectedContent.postType),
                      color: 'white'
                    }}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {contentDate ? safeFormatDate(selectedContent.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data inválida'}
                </Typography>
              </Box>
              <Chip 
                icon={selectedContent.status === 'failed' ? <ErrorIcon /> : <CheckCircleIcon />} 
                label={getStatusLabel(selectedContent.status)}
                size="small"
                color={getStatusColor(selectedContent.status)}
              />
            </Box>
            
            {/* Informações do usuário que criou */}
            {userProfile && (
              <Box sx={{ display: 'flex', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Criado por: {userProfile.full_name || userProfile.email}
                </Typography>
                {createdDate && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    em {safeFormatDate(selectedContent.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Conteúdo visual */}
        <Box sx={{ mb: 3 }}>
          {selectedContent.postType === 'stories' ? (
            // Renderizar story
            (() => {
              const storyData: Story = {
                id: selectedContent.id,
                clientId: selectedContent.clientId,
                image: {
                  id: 'preview',
                  url: getFirstImageUrl(selectedContent),
                  width: 1080,
                  height: 1920,
                  aspectRatio: 9/16
                },
                elements: [],
                scheduledDate: selectedContent.scheduledDate,
                status: selectedContent.status as 'draft' | 'scheduled' | 'posted' | 'failed',
                createdAt: selectedContent.createdAt,
                duration: 15
              };
              return (
                <Box sx={{ maxWidth: 300, mx: 'auto' }}>
                  <StoryPreview story={storyData} />
                </Box>
              );
            })()
          ) : selectedContent.postType === 'reels' ? (
            // Renderizar reel
            <Box sx={{ textAlign: 'center' }}>
              {selectedContent.video ? (
                <Box sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>
                  <video
                    controls
                    style={{
                      width: '100%',
                      maxHeight: 600,
                      borderRadius: 8
                    }}
                  >
                    <source src={imageUrlService.getPublicUrl(selectedContent.video)} type="video/mp4" />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                </Box>
              ) : (
                <SmartImage
                  src={selectedContent.coverImage}
                  alt="Capa do Reel"
                  width="100%"
                  height={400}
                  borderRadius={2}
                  fallbackText="Vídeo do Reel"
                />
              )}
              
              {selectedContent.shareToFeed && (
                <Chip 
                  label="Compartilhar no Feed" 
                  size="small" 
                  color="primary" 
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
          ) : (
            // Renderizar post ou carrossel
            <Box sx={{ textAlign: 'center' }}>
{(() => {
  // Processar as imagens de forma mais robusta
  let imagesToRender: string[] = [];
  
  if (selectedContent.images) {
    if (Array.isArray(selectedContent.images)) {
      imagesToRender = selectedContent.images
        .map(img => {
          if (typeof img === 'string') {
            const trimmedImg = (img as string).trim();
            return trimmedImg || null;
          }
          if (typeof img === 'object' && img !== null && 'url' in img) {
            const imgObj = img as { url?: string };
            const trimmedUrl = imgObj.url?.trim();
            return trimmedUrl || null;
          }
          return null;
        })
        .filter((img): img is string => img !== null && img !== '');
    } else if (typeof selectedContent.images === 'string') {
      const trimmedImages = (selectedContent.images as string).trim();
      if (trimmedImages) {
        imagesToRender = [trimmedImages];
      }
    }
  }
  
  if (imagesToRender.length === 0) {
    return (
      <SmartImage
        src=""
        alt="Sem imagem"
        width="100%"
        height={400}
        borderRadius={2}
        fallbackText="Sem imagem disponível"
      />
    );
  }
  
  return (
    <Grid container spacing={1}>
      {imagesToRender.map((img, index) => (
        <Grid item xs={imagesToRender.length === 1 ? 12 : 6} key={index}>
          <SmartImage
            src={img}
            alt={`Imagem ${index + 1}`}
            width="100%"
            height={300}
            borderRadius={2}
            fallbackText={`Imagem ${index + 1}`}
          />
        </Grid>
      ))}
    </Grid>
  );
})()}
            </Box>
          )}
        </Box>

        {/* Legenda */}
        {selectedContent.caption && (
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Legenda:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {selectedContent.caption}
            </Typography>
          </Paper>
        )}

        {/* Informações adicionais */}
        {(selectedContent.errorMessage || selectedContent.instagramPostId) && (
          <Box sx={{ mt: 2 }}>
            {selectedContent.instagramPostId && (
              <Alert severity="success" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>ID do Post no Instagram:</strong> {selectedContent.instagramPostId}
                </Typography>
              </Alert>
            )}
            
            {selectedContent.errorMessage && (
              <Alert severity="error">
                <Typography variant="body2">
                  <strong>Erro:</strong> {selectedContent.errorMessage}
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // Gerar dias do mês para o calendário
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Carregando calendário...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Cabeçalho */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Calendário de Conteúdo
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setClientDialogOpen(true)}
            >
              Gerenciar Clientes
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create-story')}
            >
              Criar Conteúdo
            </Button>
          </Box>
        </Box>

        {/* Filtros e controles */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={selectedClient}
                  onChange={handleClientChange}
                  label="Cliente"
                >
                  <MenuItem value="all">Todos os Clientes</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SmartImage
                          src={getClientLogo(client)}
                          alt={client.name}
                          width={24}
                          height={24}
                          borderRadius="50%"
                          fallbackText={client.name.charAt(0)}
                          sx={{ mr: 1 }}
                        />
                        {client.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>
                  ←
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                  {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </Typography>
                <IconButton onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>
                  →
                </IconButton>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="calendar">
                  <ViewModuleIcon sx={{ mr: 1 }} />
                  Calendário
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewListIcon sx={{ mr: 1 }} />
                  Lista
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>

        {/* Visualização de Calendário */}
        {viewMode === 'calendar' && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            
            {/* Cabeçalho dos dias da semana */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Grid item xs key={day}>
                  <Typography 
                    variant="subtitle2" 
                    align="center" 
                    sx={{ fontWeight: 'bold', color: 'text.secondary' }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            
            {/* Dias do calendário */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {daysInMonth.map((day, index) => {
                const dayContent = getContentForDay(day);
                const isCurrentMonth = isSameMonth(day, selectedMonth);
                const isDayToday = isToday(day);
                
                return (
                  <Paper
                    key={index}
                    elevation={0} 
                    sx={{ 
                      p: 1, 
                      height: '100%', 
                      minHeight: 120,
                      bgcolor: isDayToday ? 'rgba(25, 118, 210, 0.08)' : 
                               !isCurrentMonth ? 'rgba(0, 0, 0, 0.03)' : 'background.paper',
                      border: isDayToday ? `1px solid ${theme.palette.primary.main}` : '1px solid #eee',
                      borderRadius: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isCurrentMonth ? 1 : 0.6
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: isDayToday ? 'bold' : 'normal',
                        color: isDayToday ? 'primary.main' : 'text.primary',
                        mb: 1
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>
              {dayContent.length > 0 ? (
  <Box sx={{ overflowY: 'auto', flex: 1 }}>
    {dayContent.map((content) => {
      const client = content.clients || getClientById(content.clientId);
      const contentDate = safeParseDateISO(content.scheduledDate);
      
      if (!contentDate) return null; // Pular conteúdo com data inválida
      
      return (
        <Box 
          key={content.id} 
          sx={{ 
            p: 0.5, 
            mb: 0.5, 
            bgcolor: getContentTypeColor(content.postType),
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
              <SmartImage
                src={getClientLogo(client)}
                alt={client?.name || 'Cliente'}
                width={16}
                height={16}
                borderRadius="50%"
                fallbackText={client?.name?.charAt(0) || 'C'}
                sx={{ mr: 0.5 }}
              />
            </Tooltip>
            <Typography 
              variant="caption" 
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {safeFormatDate(content.scheduledDate, 'HH:mm')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
            <Tooltip title={content.postType}>
              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                {getContentTypeIcon(content.postType)}
              </Box>
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
                <Box sx={{ width: 16, height: 16, bgcolor: getContentTypeColor('stories'), borderRadius: 1, mr: 1 }} />
                <Typography variant="caption">Stories</Typography>
              </Box>
            </Box>
          </Paper>
        )}
        
        {/* Visualização de Lista */}
        {viewMode === 'list' && (
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
                  onClick={() => navigate('/create-story')}
                >
                  Criar Novo Conteúdo
                </Button>
              </Box>
            ) : (
              <List>
                {filteredContent
                  .sort((a, b) => {
                    const dateA = safeParseDateISO(a.scheduledDate);
                    const dateB = safeParseDateISO(b.scheduledDate);
                    if (!dateA || !dateB) return 0;
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((content, index) => {
                    const client = content.clients || getClientById(content.clientId);
                    const contentDate = safeParseDateISO(content.scheduledDate);
                    
                    if (!contentDate) return null; // Pular conteúdo com data inválida
                    
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
                                <Tooltip title={content.postType}>
                                  <Avatar 
                                    sx={{ 
                                      width: 20, 
                                      height: 20, 
                                      bgcolor: getContentTypeColor(content.postType) 
                                    }}
                                  >
                                    {getContentTypeIcon(content.postType)}
                                  </Avatar>
                                </Tooltip>
                              }
                            >
                              <SmartImage
                                src={getFirstImageUrl(content)}
                                alt={`Prévia do ${content.postType}`}
                                width={56}
                                height={56}
                                borderRadius={1}
                                fallbackText="Sem imagem"
                                sx={{ 
                                  border: '1px solid',
                                  borderColor: 'grey.300'
                                }}
                              />
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <SmartImage
                                  src={getClientLogo(client)}
                                  alt={client?.name || 'Cliente'}
                                  width={24}
                                  height={24}
                                  borderRadius="50%"
                                  fallbackText={client?.name?.charAt(0) || 'C'}
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="subtitle1" component="span">
                                  {client?.name || 'Cliente não encontrado'}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box component="div" sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                  <Chip 
                                    icon={<ScheduleIcon />} 
                                    label={safeFormatDate(content.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    icon={content.status === 'failed' ? <ErrorIcon /> : <CheckCircleIcon />} 
                                    label={getStatusLabel(content.status)}
                                    size="small"
                                    color={getStatusColor(content.status)}
                                  />
                                  {/* Mostrar quem criou o conteúdo */}
                                  {userProfile && (
                                    <Chip 
                                      icon={<PersonIcon />} 
                                      label={`Por: ${userProfile.full_name || userProfile.email}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                {content.caption && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    component="div"
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

      {/* Menu de contexto */}
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
        <MenuItem onClick={handleDeleteConfirm} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Diálogo de visualização */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VisibilityIcon sx={{ mr: 1 }} />
            Visualizar Conteúdo
          </Box>
          {selectedContent && (
            <Chip 
              label={selectedContent.postType.toUpperCase()}
              size="small"
              sx={{ 
                bgcolor: getContentTypeColor(selectedContent.postType),
                color: 'white'
              }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {renderPreviewContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Fechar
          </Button>
          {selectedContent && (
            <Button 
              variant="contained" 
              onClick={handleEdit}
              startIcon={<EditIcon />}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.
          </Typography>
          {selectedContent && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Cliente:</strong> {getClientById(selectedContent.clientId)?.name || 'Cliente não encontrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tipo:</strong> {selectedContent.postType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Data:</strong> {safeFormatDate(selectedContent.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            startIcon={<DeleteIcon />}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de gerenciamento de clientes */}
      <Dialog 
        open={clientDialogOpen} 
        onClose={() => setClientDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          Gerenciar Clientes
        </DialogTitle>
        <DialogContent>
          <ClientManager
            clients={clients}
            onClientAdded={handleAddClient}
            onClientUpdated={handleUpdateClient}
            onClientDeleted={handleDeleteClient}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  ); 
};

export default StoryCalendar;
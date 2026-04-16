import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Card,
  CardContent,
  SelectChangeEvent,
  TextField,
  Pagination
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
  PlayArrow as PlayArrowIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  FactCheck as FactCheckIcon
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isValid, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { postService, clientService, supabase } from '../services/supabaseClient';
import { Client, ScheduledPost, Story, PostStatus } from '../types';
import StoryPreview from '../components/StoryPreview';
import ClientManager from '../components/ClientManager';
import SmartImage from '../components/SmartImage';
import { imageUrlService } from '../services/imageUrlService';
import { motion, AnimatePresence } from 'framer-motion';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';
import DateTimePicker from '../components/DateTimePicker';
import {
  getCalendarStatusDisplay,
  isOverdueUnapproved,
  isOperationalPendingOnly,
  isWaitingClient,
  isWaitingInternal,
  isPublishedStatus,
} from '../utils/calendarPostDisplay';

const StoryCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  
  // Estados principais
  const [content, setContent] = useState<ScheduledPost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros e visualização
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Estados para filtros do modo lista
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // 20 itens por página
  
  // Estados para menus e diálogos
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContent, setSelectedContent] = useState<ScheduledPost | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDateIso, setRescheduleDateIso] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados em paralelo
      const [postsData, clientsData] = await Promise.all([
        postService.getScheduledPostsWithClient(),
        clientService.getClients()
      ]);

      // Roteiros são apenas fluxo de aprovação de texto; não entram no calendário de publicações
      const calendarPosts = (postsData || []).filter(
        (p) => (p.postType ?? '').toLowerCase() !== 'roteiro'
      );

      setContent(calendarPosts);
      setClients(clientsData || []);

      await loadUsersFromPosts(calendarPosts);
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do calendário');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ ADICIONAR useEffect para carregar dados
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Inicializar filtro de cliente quando clientId vem na URL (ex.: redirect após agendamento)
  useEffect(() => {
    if (clientIdParam && clients.length > 0 && clients.some((c) => c.id === clientIdParam)) {
      setSelectedClient(clientIdParam);
    }
  }, [clientIdParam, clients]);

  // Função para carregar usuários únicos dos posts
  const loadUsersFromPosts = async (posts: ScheduledPost[]) => {
    try {
      const userIds = [...new Set(posts.map(post => post.userId).filter(Boolean))];
      
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      // Tentar buscar de profiles primeiro
      let { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Se não encontrar, tentar user_profiles
      if (error && error.message.includes('does not exist')) {
        const result = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        profilesData = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        // Se não conseguir buscar perfis, criar lista básica com IDs
        setUsers(userIds.map(id => ({ id, email: id.substring(0, 8) + '...' })));
      } else {
        setUsers(profilesData || []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setUsers([]);
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

  // Função para obter usuário criador por ID
  const getCreatorUser = (userId: string | undefined) => {
    if (!userId) return null;
    return users.find(user => user.id === userId) || null;
  };

  // Função para verificar se o post pode ser editado
  const canEditPost = (status: PostStatus | string): boolean => {
    const statusStr = String(status).toLowerCase();
    return statusStr !== 'posted' && statusStr !== 'published';
  };

  // ✅ MOVER getClientLogo PARA ANTES de getFirstImageUrl
  const getClientLogo = (client: Client | undefined): string | undefined => {
    if (!client) return undefined;
    
    // Verificar se tem logoUrl
    if (client.logoUrl) {
      return imageUrlService.getPublicUrl(client.logoUrl);
    }
    
    // Verificar se tem profilePicture
    if (client.profilePicture) {
      return imageUrlService.getPublicUrl(client.profilePicture);
    }
    
    return undefined;
  };

  const getFirstImageUrl = (content: ScheduledPost): string => {
    const client = content.clients || getClientById(content.clientId);
    
    // 🔥 PRIORIZAR CONTEÚDO PRÓPRIO ANTES DA LOGO DO CLIENTE
    
    // Para stories - verificar se tem imagens próprias no array
    if (content.postType === 'stories' && content.images && content.images.length > 0) {
      const firstImage = content.images[0];
      // Verificar se é string ou objeto com url
      const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;
      return imageUrlService.getPublicUrl(imageUrl);
    }
    
    // Para reels - verificar se tem thumbnail ou usar vídeo
    if (content.postType === 'reels') {
      if (content.coverImage) {
        return imageUrlService.getPublicUrl(content.coverImage);
      }
      if (content.video) {
        return imageUrlService.getPublicUrl(content.video);
      }
    }
    
    // Para posts/carrossel - verificar se tem imagens próprias
    if ((content.postType === 'post' || content.postType === 'carousel') && content.images && content.images.length > 0) {
      const firstImage = content.images[0];
      // Verificar se é string ou objeto com url
      const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;
      return imageUrlService.getPublicUrl(imageUrl);
    }
    
    // 🎯 APENAS COMO ÚLTIMO RECURSO, usar logo do cliente
    const clientLogo = getClientLogo(client);
    if (clientLogo) {
      return clientLogo;
    }
    
    // Fallback final para placeholder
    return imageUrlService.getPlaceholder(400, 400, client?.name || 'Conteúdo');
  };

  const getClientLogoForAvatar = (content: ScheduledPost): string => {
    const client = content.clients || getClientById(content.clientId);
    const clientLogo = getClientLogo(client);
    
    if (clientLogo) {
      return clientLogo;
    }
    
    // Fallback para placeholder com inicial do cliente
    return imageUrlService.getPlaceholder(40, 40, client?.name?.charAt(0) || 'C');
  };

  const getContentTypeColor = (type: string): string => {
    switch (type) {
      case 'post': return '#f74211';
      case 'carousel': return '#e8590c';
      case 'reels': return '#3e54b5';
      case 'stories': return '#7c3aed';
      default: return '#f74211';
    }
  };

  const getContentTypeBg = (type: string): string => {
    switch (type) {
      case 'post': return 'rgba(247, 66, 17, 0.07)';
      case 'carousel': return 'rgba(232, 89, 12, 0.07)';
      case 'reels': return 'rgba(62, 84, 181, 0.07)';
      case 'stories': return 'rgba(124, 58, 237, 0.07)';
      default: return 'rgba(247, 66, 17, 0.07)';
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
      case 'published': return <CheckCircleIcon sx={{ fontSize: 12, color: '#10b981' }} />;
      case 'failed': return <ErrorIcon sx={{ fontSize: 12, color: '#ef4444' }} />;
      case 'pending': return <ScheduleIcon sx={{ fontSize: 12, color: '#f59e0b' }} />;
      case 'sent_to_n8n':
      case 'processing': return <ScheduleIcon sx={{ fontSize: 12, color: '#3b82f6' }} />;
      default: return null;
    }
  };

  const getStatusIconForPost = (post: ScheduledPost) => {
    const disp = getCalendarStatusDisplay(post);
    if (disp.preferApprovalIcon) {
      return <FactCheckIcon sx={{ fontSize: 12, color: GLASS.accent.blue }} />;
    }
    return getStatusIcon(post.status);
  };

  const openRescheduleDialog = useCallback(() => {
    if (!selectedContent) return;
    setRescheduleDateIso(selectedContent.scheduledDate || '');
    setRescheduleError(null);
    setRescheduleOpen(true);
  }, [selectedContent]);

  const handleSaveReschedule = useCallback(async () => {
    if (!selectedContent || !rescheduleDateIso) return;
    setRescheduleSaving(true);
    setRescheduleError(null);
    try {
      await postService.updateScheduledPost(selectedContent.id, { scheduledDate: rescheduleDateIso });
      setRescheduleOpen(false);
      setPreviewOpen(false);
      setSelectedContent(null);
      await loadData();
    } catch (e) {
      setRescheduleError(e instanceof Error ? e.message : 'Não foi possível salvar a nova data.');
    } finally {
      setRescheduleSaving(false);
    }
  }, [selectedContent, rescheduleDateIso, loadData]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClient, selectedUserId, selectedStatus, startDate, endDate, viewMode]);

  // Filtrar conteúdo
  const filteredContent = content.filter(item => {
    // Filtro de cliente (sempre aplicado)
    const matchesClient = selectedClient === 'all' || item.clientId === selectedClient;
    
    // Filtros específicos do modo lista
    if (viewMode === 'list') {
      // Filtro por usuário
      const matchesUser = selectedUserId === 'all' || item.userId === selectedUserId;
      
      // Filtro por status
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      
      // Filtro por data
      const itemDate = safeParseDateISO(item.scheduledDate);
      if (!itemDate) return false;
      
      let matchesDate = true;
      if (startDate) {
        const start = safeParseDateISO(startDate);
        if (start && itemDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = safeParseDateISO(endDate);
        if (end) {
          // Adicionar 23:59:59 ao final do dia
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (itemDate > endOfDay) matchesDate = false;
        }
      }
      
      return matchesClient && matchesUser && matchesStatus && matchesDate;
    } else {
      // Modo calendário - apenas filtro de cliente e mês
      const itemDate = safeParseDateISO(item.scheduledDate);
      if (!itemDate) return false;
      const matchesMonth = isSameMonth(itemDate, selectedMonth);
      return matchesClient && matchesMonth;
    }
  });

  const contentSummary = useMemo(() => {
    const pendingPipeline = filteredContent.filter((item) => isOperationalPendingOnly(item)).length;
    const awaitingClient = filteredContent.filter((item) => isWaitingClient(item)).length;
    const awaitingInternal = filteredContent.filter((item) => isWaitingInternal(item)).length;
    const sent = filteredContent.filter((item) => item.status === 'sent_to_n8n' || item.status === 'processing').length;
    const published = filteredContent.filter((item) => isPublishedStatus(item.status)).length;
    const failed = filteredContent.filter((item) => item.status === 'failed').length;
    return {
      total: filteredContent.length,
      pending: pendingPipeline,
      awaitingClient,
      awaitingInternal,
      sent,
      published,
      failed,
    };
  }, [filteredContent]);

  // Agrupar conteúdo por dia para visualização de calendário
  const getContentForDay = (day: Date) => {
    return filteredContent.filter(item => {
      const itemDate = safeParseDateISO(item.scheduledDate);
      if (!itemDate) return false;
      return format(itemDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
  };

  // Função para renderizar preview do conteúdo na lista
  const renderContentPreview = (content: ScheduledPost) => {
    const client = content.clients || getClientById(content.clientId);
    const typeColor = getContentTypeColor(content.postType);

    const typeBadge = (
      <Box sx={{ 
        position: 'absolute', top: 4, right: 4, 
        bgcolor: typeColor, borderRadius: '50%',
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        {getContentTypeIcon(content.postType)}
      </Box>
    );
    
    if (content.postType === 'stories') {
      const storyData: Story = {
        id: content.id,
        clientId: content.clientId,
        image: {
          id: 'preview',
          url: getFirstImageUrl(content),
          width: 1080,
          height: 1920,
          aspectRatio: 9/16
        },
        elements: [],
        scheduledDate: content.scheduledDate,
        status: content.status as 'draft' | 'scheduled' | 'posted' | 'failed',
        createdAt: content.createdAt,
        duration: 15
      };
      
      return (
        <Box sx={{ 
          width: 80, height: 140, position: 'relative',
          borderRadius: 2, overflow: 'hidden',
          border: `2px solid ${typeColor}`,
        }}>
          <StoryPreview story={storyData} />
          {typeBadge}
        </Box>
      );
    } else if (content.postType === 'reels') {
      return (
        <Box sx={{ 
          width: 80, height: 140, position: 'relative',
          borderRadius: 2, overflow: 'hidden',
          border: `2px solid ${typeColor}`,
        }}>
          {content.video ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              <video
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                preload="metadata"
              >
                <source src={imageUrlService.getPublicUrl(content.video)} type="video/mp4" />
              </video>
              <Box sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PlayArrowIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
            </Box>
          ) : (
            <SmartImage
              src={getFirstImageUrl(content)}
              alt="Capa do Reel"
              width="100%"
              height="100%"
              borderRadius={0}
              fallbackText="Reel"
              sx={{ objectFit: 'cover' }}
            />
          )}
          {typeBadge}
        </Box>
      );
    } else {
      return (
        <Box sx={{ 
          width: 80, height: 80, position: 'relative',
          borderRadius: 2, overflow: 'hidden',
          border: `2px solid ${typeColor}`,
        }}>
          <SmartImage
            src={getFirstImageUrl(content)}
            clientId={client?.id}
            alt={`Preview do ${content.postType}`}
            width="100%"
            height="100%"
            borderRadius={0}
            fallbackText={content.postType.toUpperCase()}
            sx={{ objectFit: 'cover' }}
          />
          {typeBadge}
        </Box>
      );
    }
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
    // NÃO limpar selectedContent aqui - precisamos dele no modal!
    setMenuAnchorEl(null); // Apenas fechar o menu
    setPreviewOpen(true);
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
    // NÃO limpar selectedContent aqui - precisamos dele no modal!
    setMenuAnchorEl(null); // Apenas fechar o menu
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedContent) {
      setError('Erro: Nenhum conteúdo selecionado para exclusão.');
      return;
    }
    
    try {
      await postService.deleteScheduledPost(selectedContent.id);
      await loadData(); // Recarregar dados
      setDeleteConfirmOpen(false);
      setSelectedContent(null);
      setError(null); // Limpar erros anteriores
    } catch (error: any) {
      console.error('❌ Erro ao excluir conteúdo:', error);
      // Mostrar mensagem de erro detalhada
      const errorMessage = error?.message || 'Erro ao excluir conteúdo. Verifique se você tem permissão para excluir este post.';
      setError(errorMessage);
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

  // Renderização otimizada do conteúdo de preview
  const renderPreviewContent = () => {
    if (!selectedContent) return null;
    
    const client = selectedContent.clients || getClientById(selectedContent.clientId);
    const contentDate = safeParseDateISO(selectedContent.scheduledDate);
    const createdDate = safeParseDateISO(selectedContent.createdAt);
    
    return (
      <Box>
        {/* Cabeçalho com informações do usuário e cliente */}
        <Card elevation={0} sx={{
          mb: 3,
          bgcolor: GLASS.surface.bg,
          border: `1px solid ${GLASS.border.subtle}`,
          borderRadius: GLASS.radius.inner,
          boxShadow: GLASS.shadow.cardInset,
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                <SmartImage
                  src={getClientLogo(client)}
                  clientId={client?.id}
                  alt={client?.name || 'Cliente'}
                  width={48}
                  height={48}
                  borderRadius="50%"
                  fallbackText={client?.name?.charAt(0) || 'C'}
                  sx={{ flexShrink: 0, border: `2px solid ${GLASS.surface.bg}`, boxShadow: GLASS.shadow.avatar }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: GLASS.text.heading, mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client?.name || 'Cliente não encontrado'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<Box component="span" sx={{ display: 'flex', color: getContentTypeColor(selectedContent.postType) }}>{getContentTypeIcon(selectedContent.postType)}</Box>}
                      label={selectedContent.postType.toUpperCase()}
                      size="small"
                      sx={{ 
                        bgcolor: getContentTypeBg(selectedContent.postType),
                        color: getContentTypeColor(selectedContent.postType),
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 24,
                        border: `1px solid ${getContentTypeColor(selectedContent.postType)}30`,
                      }}
                    />
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: GLASS.text.muted, fontWeight: 500 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {contentDate ? safeFormatDate(selectedContent.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data inválida'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
                {(() => {
                  const disp = getCalendarStatusDisplay(selectedContent);
                  const icon =
                    disp.preferApprovalIcon ? (
                      <FactCheckIcon />
                    ) : selectedContent.status === 'failed' ? (
                      <ErrorIcon />
                    ) : isPublishedStatus(selectedContent.status) ? (
                      <CheckCircleIcon />
                    ) : (
                      <ScheduleIcon />
                    );
                  return (
                    <Tooltip title={disp.tooltip}>
                      <Chip
                        icon={icon}
                        label={disp.label}
                        size="small"
                        color={disp.chipColor}
                        sx={{ fontWeight: 700, borderRadius: GLASS.radius.badge }}
                      />
                    </Tooltip>
                  );
                })()}
              </Box>
            </Box>
            
            {(() => {
              const creatorUser = getCreatorUser(selectedContent.userId);
              if (!creatorUser) return null;
              
              return (
                <Box sx={{ 
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5,
                  pt: 2, borderTop: `1px dashed ${GLASS.border.subtle}` 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <PersonIcon sx={{ fontSize: 16, color: GLASS.text.muted }} />
                    <Typography variant="body2" sx={{ color: GLASS.text.muted, fontWeight: 500 }}>
                      Criado por: <Box component="span" sx={{ color: GLASS.text.body, fontWeight: 600 }}>{creatorUser.full_name || creatorUser.email}</Box>
                    </Typography>
                  </Box>
                  {createdDate && (
                    <Typography variant="body2" sx={{ color: GLASS.text.muted, fontWeight: 500 }}>
                      em {safeFormatDate(selectedContent.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Typography>
                  )}
                </Box>
              );
            })()}
          </CardContent>
        </Card>

        {/* Status de aprovação (conteúdo do painel de aprovação) */}
        {(() => {
          const raw = selectedContent as unknown as Record<string, unknown>;
          const approvalStatus = (selectedContent.approvalStatus ?? raw.approval_status) as string | undefined;
          const forApprovalOnly = (selectedContent.forApprovalOnly ?? raw.for_approval_only) as boolean | undefined;
          const requiresApproval = (selectedContent.requiresApproval ?? raw.requires_approval) as boolean | undefined;
          const approvalFeedback = (selectedContent.approvalFeedback ?? raw.approval_feedback) as string | null | undefined;
          const isRoteiro = selectedContent.postType === 'roteiro';

          if (!requiresApproval && !approvalStatus && !approvalFeedback) return null;

          const getApprovalStatusLabel = (): string => {
            switch (approvalStatus) {
              case 'pending': return 'Aguardando aprovação do cliente';
              case 'approved': return 'Aprovado pelo cliente';
              case 'rejected': return 'Ajustes solicitados';
              default: return approvalStatus ?? '—';
            }
          };

          const getPostingInfo = (): { label: string; severity: 'success' | 'info' | 'warning' } => {
            if (approvalStatus === 'pending') {
              return { label: 'Aguardando aprovação para definir publicação', severity: 'info' };
            }
            if (approvalStatus === 'rejected') {
              return { label: 'Não será postado até os ajustes serem feitos e reenviados para aprovação', severity: 'warning' };
            }
            if (approvalStatus === 'approved') {
              if (isRoteiro || forApprovalOnly) {
                return { label: 'Aprovado apenas para uso interno — não será postado automaticamente', severity: 'info' };
              }
              return { label: 'Será postado automaticamente no horário agendado', severity: 'success' };
            }
            return { label: '—', severity: 'info' };
          };

          const postingInfo = getPostingInfo();

          return (
            <Alert
              severity={postingInfo.severity}
              sx={{ mb: 3 }}
              icon={approvalStatus === 'approved' && !forApprovalOnly && !isRoteiro ? <CheckCircleIcon /> : undefined}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Fluxo de aprovação
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Status: {getApprovalStatusLabel()}
              </Typography>
              <Typography variant="body2">
                Publicação: {postingInfo.label}
              </Typography>
              {approvalStatus === 'rejected' && approvalFeedback && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Feedback do cliente:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {approvalFeedback}
                  </Typography>
                </Box>
              )}
            </Alert>
          );
        })()}

        {/* Conteúdo visual otimizado */}
        <Box sx={{ mb: 3 }}>
          {selectedContent.postType === 'stories' ? (
            // Renderizar story
            (() => {
              const storyData: Story = {
                id: selectedContent.id,
                clientId: selectedContent.clientId,
                image: {
                  id: 'preview',
                  url: getFirstImageUrl(selectedContent), // ✅ Já usa logo do cliente
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
                  src={getFirstImageUrl(selectedContent)}
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
                  sx={{ mb: 2, bgcolor: GLASS.accent.orange, color: '#fff', borderRadius: GLASS.radius.badge }}
                />
              )}
            </Box>
          ) : (
            // Renderizar post ou carrossel - USAR SEMPRE LOGO DO CLIENTE
            <Box sx={{ textAlign: 'center' }}>
              <SmartImage
                src={getFirstImageUrl(selectedContent)} // ✅ Usa logo do cliente
                alt={`Logo de ${client?.name || 'Cliente'}`}
                width="100%"
                height={400}
                borderRadius={2}
                fallbackText={client?.name || 'Logo do Cliente'}
                sx={{ objectFit: 'contain' }}
              />
            </Box>
          )}
        </Box>

        {/* Legenda */}
        {selectedContent.caption && (
          <Paper elevation={0} sx={{
            p: 2,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.subtle}`,
            borderRadius: GLASS.radius.inner,
            boxShadow: GLASS.shadow.cardInset,
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: GLASS.text.heading }}>
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
        {selectedContent.errorMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">
              <Typography variant="body2">
                <strong>Erro:</strong> {selectedContent.errorMessage}
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>
    );
  };

  // Gerar dias do mês para o calendário
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calcular o dia da semana do primeiro dia do mês (0 = domingo, 1 = segunda, etc.)
  const firstDayOfWeek = getDay(monthStart);
  
  // Criar array com células vazias antes do primeiro dia + dias do mês
  const calendarDays: (Date | null)[] = [];
  
  // Adicionar células vazias antes do primeiro dia do mês
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Adicionar todos os dias do mês
  daysInMonth.forEach(day => calendarDays.push(day));

  if (loading) {
    return (
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: 4 }}>
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
      <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: 4 }}>
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
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: GLASS.text.heading, letterSpacing: '-0.02em' }}>
            Calendário de Conteúdo
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setClientDialogOpen(true)}
              sx={{
                borderColor: GLASS.border.outer,
                color: GLASS.text.body,
                borderRadius: GLASS.radius.button,
                backdropFilter: `blur(${GLASS.surface.blur})`,
                bgcolor: GLASS.surface.bg,
                boxShadow: GLASS.shadow.button,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: GLASS.accent.orange,
                  bgcolor: GLASS.surface.bgHover,
                  boxShadow: GLASS.shadow.buttonHover,
                  color: GLASS.accent.orange,
                },
              }}
            >
              Gerenciar Clientes
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create-story')}
              sx={{
                bgcolor: GLASS.accent.orange,
                borderRadius: GLASS.radius.button,
                boxShadow: GLASS.shadow.button,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: GLASS.accent.orangeDark,
                  boxShadow: GLASS.shadow.buttonHover,
                },
              }}
            >
              Criar Conteúdo
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 4 }}>
          <Box sx={{ 
            display: 'flex', alignItems: 'center', gap: 1, 
            px: 2, py: 0.75, 
            bgcolor: 'rgba(82, 86, 99, 0.04)', 
            border: `1px solid ${GLASS.border.subtle}`,
            borderRadius: GLASS.radius.badge 
          }}>
            <Typography variant="caption" sx={{ color: GLASS.text.muted, fontWeight: 600 }}>Total agendado</Typography>
            <Typography variant="caption" sx={{ color: GLASS.text.heading, fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.total}</Typography>
          </Box>
          
          {contentSummary.pending > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: 'rgba(245, 158, 11, 0.08)', 
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b' }} />
              <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>Fila de publicação</Typography>
              <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.pending}</Typography>
            </Box>
          )}

          {contentSummary.awaitingClient > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: 'rgba(59, 130, 246, 0.08)', 
              border: '1px solid rgba(59, 130, 246, 0.22)',
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6' }} />
              <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 600 }}>Aguardando cliente</Typography>
              <Typography variant="caption" sx={{ color: '#1e3a8a', fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.awaitingClient}</Typography>
            </Box>
          )}

          {contentSummary.awaitingInternal > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: 'rgba(124, 58, 237, 0.08)', 
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7c3aed' }} />
              <Typography variant="caption" sx={{ color: '#5b21b6', fontWeight: 600 }}>Pré-aprovação interna</Typography>
              <Typography variant="caption" sx={{ color: '#4c1d95', fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.awaitingInternal}</Typography>
            </Box>
          )}
          
          {contentSummary.sent > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: 'rgba(59, 130, 246, 0.08)', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6' }} />
              <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 600 }}>Processando</Typography>
              <Typography variant="caption" sx={{ color: '#1e3a8a', fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.sent}</Typography>
            </Box>
          )}
          
          {contentSummary.published > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: GLASS.status.connected.bg, 
              border: `1px solid ${GLASS.status.connected.bgStrong}`,
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: GLASS.status.connected.dot }} />
              <Typography variant="caption" sx={{ color: GLASS.status.connected.colorDark, fontWeight: 600 }}>Publicados</Typography>
              <Typography variant="caption" sx={{ color: GLASS.status.connected.colorDark, fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.published}</Typography>
            </Box>
          )}
          
          {contentSummary.failed > 0 && (
            <Box sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              px: 2, py: 0.75, 
              bgcolor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: GLASS.radius.badge 
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ef4444' }} />
              <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600 }}>Falhas</Typography>
              <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 800, fontSize: '0.85rem' }}>{contentSummary.failed}</Typography>
            </Box>
          )}
        </Box>

        {/* Filtros e controles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Paper elevation={0} sx={{
            p: { xs: 2, md: 2.5 }, mb: 3,
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 2
            }}>
              {/* Filtro de Cliente */}
              <Box sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 260 } }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: GLASS.text.muted, mb: 0.5, display: 'block', ml: 0.5 }}>
                  Cliente
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedClient}
                    onChange={handleClientChange}
                    displayEmpty
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          mt: 1,
                          borderRadius: GLASS.radius.inner,
                          border: `1px solid ${GLASS.border.outer}`,
                          boxShadow: GLASS.shadow.cardHover,
                        }
                      }
                    }}
                    sx={{ 
                      borderRadius: GLASS.radius.button,
                      bgcolor: 'rgba(82, 86, 99, 0.02)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: GLASS.border.subtle,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: GLASS.border.outer,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: GLASS.accent.orange,
                        borderWidth: '1px',
                      },
                    }}
                    renderValue={(selected) => {
                      if (selected === 'all' || !selected) {
                        return <Typography sx={{ color: GLASS.text.body, fontWeight: 600, fontSize: '0.9rem' }}>Todos os Clientes</Typography>;
                      }
                      const client = getClientById(selected);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SmartImage
                            src={getClientLogo(client)}
                            clientId={client?.id}
                            alt={client?.name || 'Cliente'}
                            width={20}
                            height={20}
                            borderRadius="50%"
                            fallbackText={client?.name?.charAt(0) || 'C'}
                          />
                          <Typography sx={{ color: GLASS.text.heading, fontWeight: 600, fontSize: '0.9rem' }}>{client?.name}</Typography>
                        </Box>
                      );
                    }}
                  >
                    <MenuItem value="all" sx={{ borderRadius: 1, mx: 0.5, my: 0.2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Todos os Clientes</Typography>
                    </MenuItem>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id} sx={{ borderRadius: 1, mx: 0.5, my: 0.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <SmartImage
                            src={getClientLogo(client)}
                            clientId={client.id}
                            alt={client.name}
                            width={24}
                            height={24}
                            borderRadius="50%"
                            fallbackText={client.name.charAt(0)}
                          />
                          <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>{client.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {/* Navegação de Data */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 1,
                bgcolor: 'rgba(82, 86, 99, 0.03)',
                border: `1px solid ${GLASS.border.subtle}`,
                borderRadius: GLASS.radius.badge,
                p: 0.5,
                width: { xs: '100%', md: 'auto' },
                mt: { xs: 0, md: 2.5 }
              }}>
                <IconButton
                  size="small"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  sx={{ 
                    color: GLASS.text.body, 
                    bgcolor: GLASS.surface.bg,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    '&:hover': { bgcolor: GLASS.surface.bgHover, color: GLASS.accent.orange },
                    width: 32, height: 32
                  }}
                >
                  <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>←</Box>
                </IconButton>
                <Typography variant="subtitle1" sx={{ 
                  minWidth: 140, 
                  textAlign: 'center', 
                  color: GLASS.text.heading,
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  fontSize: '0.95rem'
                }}>
                  {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  sx={{ 
                    color: GLASS.text.body, 
                    bgcolor: GLASS.surface.bg,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    '&:hover': { bgcolor: GLASS.surface.bgHover, color: GLASS.accent.orange },
                    width: 32, height: 32
                  }}
                >
                  <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>→</Box>
                </IconButton>
              </Box>
              
              {/* Modo de Visualização */}
              <Box sx={{ 
                width: { xs: '100%', md: 'auto' }, 
                display: 'flex', 
                justifyContent: { xs: 'center', md: 'flex-end' },
                mt: { xs: 0, md: 2.5 }
              }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(82, 86, 99, 0.03)',
                    border: `1px solid ${GLASS.border.subtle}`,
                    p: 0.5,
                    borderRadius: GLASS.radius.badge,
                    width: { xs: '100%', sm: 'auto' },
                    display: 'flex',
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      flex: { xs: 1, sm: 'initial' },
                      borderRadius: `${GLASS.radius.badge} !important`,
                      color: GLASS.text.muted,
                      px: 2.5,
                      py: 0.75,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      '&.Mui-selected': {
                        bgcolor: GLASS.surface.bg,
                        color: GLASS.accent.orange,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)',
                        '&:hover': { bgcolor: GLASS.surface.bgHover },
                      },
                      '&:hover': {
                        bgcolor: 'transparent',
                        color: GLASS.text.heading,
                      }
                    },
                  }}
                >
                  <ToggleButton value="calendar">
                    Calendário
                  </ToggleButton>
                  <ToggleButton value="list">
                    Lista
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          </Paper>
        </motion.div>

        <AnimatePresence mode="wait">
        {/* Visualização de Calendário */}
        {viewMode === 'calendar' && (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            maxWidth: '100%',
            minWidth: 0,
            overflowX: 'hidden',
          }}>
            <Typography variant="h6" sx={{ mb: 3, color: GLASS.text.heading }}>
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            
            {/* Cabeçalho dos dias da semana */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Grid item xs key={day}>
                  <Typography 
                    variant="subtitle2" 
                    align="center" 
                    sx={{ fontWeight: 'bold', color: GLASS.text.muted }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            
            {/* Dias do calendário */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, width: '100%', minWidth: 0 }}>
              {calendarDays.map((day, index) => {
                // Se for célula vazia (null), renderizar célula vazia
                if (day === null) {
                  return (
                    <Paper
                      key={`empty-${index}`}
                      elevation={0} 
                      sx={{ 
                        p: 1, 
                        height: '100%', 
                        minHeight: 120,
                        minWidth: 0,
                        maxWidth: '100%',
                        bgcolor: 'transparent',
                        border: 'none',
                        borderRadius: GLASS.radius.inner,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    />
                  );
                }
                
                const dayContent = getContentForDay(day);
                const isCurrentMonth = isSameMonth(day, selectedMonth);
                const isDayToday = isToday(day);
                
                return (
                  <Paper
                    key={day.getTime()}
                    elevation={0} 
                    sx={{ 
                      p: 1, 
                      height: '100%', 
                      minHeight: 120,
                      minWidth: 0,
                      maxWidth: '100%',
                      bgcolor: isDayToday ? 'rgba(247, 66, 17, 0.10)' :
                               !isCurrentMonth ? 'rgba(0, 0, 0, 0.02)' : GLASS.surface.bg,
                      backdropFilter: `blur(${GLASS.surface.blur})`,
                      border: isDayToday ? `1.5px solid ${GLASS.accent.orange}` : `1px solid ${GLASS.border.subtle}`,
                      borderRadius: GLASS.radius.inner,
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isCurrentMonth ? 1 : 0.6,
                      overflow: 'hidden',
                      transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                      '&:hover': {
                        bgcolor: isDayToday ? 'rgba(247, 66, 17, 0.14)' : GLASS.surface.bgHover,
                        boxShadow: GLASS.shadow.card,
                      },
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: isDayToday ? 'bold' : 'normal',
                        color: isDayToday ? GLASS.accent.orange : GLASS.text.body,
                        mb: 1
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>
                    
                    {dayContent.length > 0 ? (
                      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, minWidth: 0, width: '100%', maxWidth: '100%' }}>
                        {dayContent.map((content) => {
                          const client = content.clients || getClientById(content.clientId);
                          const contentDate = safeParseDateISO(content.scheduledDate);
                          const calendarDisp = getCalendarStatusDisplay(content);
                          
                          if (!contentDate) return null;
                          
                          return (
                            <Box 
                              key={content.id} 
                              sx={{ 
                                p: 1,
                                mb: 0.75, 
                                minWidth: 0,
                                maxWidth: '100%',
                                bgcolor: GLASS.surface.bg,
                                border: `1px solid ${GLASS.border.subtle}`,
                                borderRadius: GLASS.radius.buttonSm,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                cursor: 'pointer',
                                overflow: 'hidden',
                                transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                                '&:hover': { 
                                  bgcolor: GLASS.surface.bgHover,
                                  borderColor: GLASS.border.outer,
                                  transform: 'translateY(-1px)',
                                  boxShadow: GLASS.shadow.card,
                                }
                              }}
                              onClick={() => {
                                setSelectedContent(content);
                                setPreviewOpen(true);
                                setMenuAnchorEl(null);
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                                  <SmartImage
                                    src={getClientLogo(client)}
                                    clientId={client?.id}
                                    alt={client?.name || 'Cliente'}
                                    width={18}
                                    height={18}
                                    borderRadius="50%"
                                    fallbackText={client?.name?.charAt(0) || 'C'}
                                    sx={{ flexShrink: 0 }}
                                  />
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: GLASS.text.heading,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {client?.name || 'Cliente'}
                                  </Typography>
                                </Box>
                                <IconButton 
                                  size="small" 
                                  sx={{ color: GLASS.text.muted, p: 0, flexShrink: 0, '&:hover': { color: GLASS.accent.orange } }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuOpen(e, content);
                                  }}
                                >
                                  <MoreVertIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, gap: 0.25, minWidth: 0, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: '1 1 auto' }}>
                                  <Tooltip title={content.postType.toUpperCase()}>
                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: getContentTypeColor(content.postType) }}>
                                      {getContentTypeIcon(content.postType)}
                                    </Box>
                                  </Tooltip>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: GLASS.text.muted,
                                      fontSize: '0.7rem',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {safeFormatDate(content.scheduledDate, 'HH:mm')}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                                  <Tooltip title={calendarDisp.tooltip}>
                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                      {getStatusIconForPost(content)}
                                    </Box>
                                  </Tooltip>
                                  {(() => {
                                    const raw = content as unknown as Record<string, unknown>;
                                    const requiresApproval = (content.requiresApproval ?? raw.requires_approval) as boolean | undefined;
                                    const approvalStatus = (content.approvalStatus ?? raw.approval_status) as string | undefined;
                                    const isApprovalFlow = requiresApproval || approvalStatus;
                                    if (!isApprovalFlow || calendarDisp.preferApprovalIcon) return null;
                                    return (
                                      <Tooltip title="Fluxo de Aprovação do Cliente">
                                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: GLASS.accent.blue }}>
                                          <FactCheckIcon sx={{ fontSize: 14 }} />
                                        </Box>
                                      </Tooltip>
                                    );
                                  })()}
                                </Box>
                              </Box>
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
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${GLASS.border.subtle}` }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: GLASS.text.muted, mr: 1 }}>Tipo:</Typography>
                {[
                  { type: 'post', label: 'Post' },
                  { type: 'carousel', label: 'Carrossel' },
                  { type: 'reels', label: 'Reels' },
                  { type: 'stories', label: 'Stories' },
                ].map(({ type, label }) => (
                  <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ 
                      width: 14, height: 14, borderRadius: '4px', 
                      bgcolor: getContentTypeBg(type),
                      border: `1.5px solid ${getContentTypeColor(type)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Box component="span" sx={{ color: getContentTypeColor(type), display: 'flex', '& svg': { fontSize: 10 } }}>
                        {getContentTypeIcon(type)}
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: GLASS.text.body }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: GLASS.text.muted, mr: 0.5 }}>Status:</Typography>
                <Chip label="Fila de publicação" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
                <Chip label="Aguardando cliente" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                <Chip label="Pré-aprovação interna" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem' }} />
                <Chip label="Enviado" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                <Chip label="Publicado" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                <Chip label="Falhou" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />
              </Box>
            </Box>
          </Paper>
          </motion.div>
        )}
        
        {/* Visualização de Lista */}
        {viewMode === 'list' && (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
          <>
            {/* Filtros do modo lista */}
            <Paper elevation={0} sx={{
              p: { xs: 2, md: 2.5 }, mb: 3,
              borderRadius: GLASS.radius.card,
              bgcolor: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterListIcon sx={{ color: GLASS.accent.orange, fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
                    Filtros Avançados
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<ClearIcon fontSize="small" />}
                  onClick={() => {
                    setSelectedUserId('all');
                    setSelectedStatus('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  disabled={selectedUserId === 'all' && selectedStatus === 'all' && !startDate && !endDate}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    color: GLASS.text.muted,
                    '&:hover': { bgcolor: 'rgba(82, 86, 99, 0.04)', color: GLASS.text.heading }
                  }}
                >
                  Limpar
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                {/* Filtro por Usuário */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: GLASS.text.muted, mb: 0.5, display: 'block', ml: 0.5 }}>
                    Usuário
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      displayEmpty
                      sx={{ 
                        borderRadius: GLASS.radius.button,
                        bgcolor: 'rgba(82, 86, 99, 0.02)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.border.subtle },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.border.outer },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.accent.orange, borderWidth: '1px' },
                      }}
                    >
                      <MenuItem value="all"><Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Todos os Usuários</Typography></MenuItem>
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          <Typography sx={{ fontSize: '0.9rem' }}>{user.full_name || user.email || user.id.substring(0, 8) + '...'}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Filtro por Status */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: GLASS.text.muted, mb: 0.5, display: 'block', ml: 0.5 }}>
                    Status
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      displayEmpty
                      sx={{ 
                        borderRadius: GLASS.radius.button,
                        bgcolor: 'rgba(82, 86, 99, 0.02)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.border.subtle },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.border.outer },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GLASS.accent.orange, borderWidth: '1px' },
                      }}
                    >
                      <MenuItem value="all"><Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Todos os Status</Typography></MenuItem>
                      <MenuItem value="pending"><Typography sx={{ fontSize: '0.9rem' }}>Pendente</Typography></MenuItem>
                      <MenuItem value="sent_to_n8n"><Typography sx={{ fontSize: '0.9rem' }}>Enviado</Typography></MenuItem>
                      <MenuItem value="processing"><Typography sx={{ fontSize: '0.9rem' }}>Processando</Typography></MenuItem>
                      <MenuItem value="posted"><Typography sx={{ fontSize: '0.9rem' }}>Publicado</Typography></MenuItem>
                      <MenuItem value="failed"><Typography sx={{ fontSize: '0.9rem' }}>Falhou</Typography></MenuItem>
                      <MenuItem value="cancelled"><Typography sx={{ fontSize: '0.9rem' }}>Cancelado</Typography></MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Filtro por Data Inicial */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: GLASS.text.muted, mb: 0.5, display: 'block', ml: 0.5 }}>
                    Data Inicial
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: GLASS.radius.button,
                        bgcolor: 'rgba(82, 86, 99, 0.02)',
                        '& fieldset': { borderColor: GLASS.border.subtle },
                        '&:hover fieldset': { borderColor: GLASS.border.outer },
                        '&.Mui-focused fieldset': { borderColor: GLASS.accent.orange, borderWidth: '1px' },
                      },
                      '& .MuiInputBase-input': { fontSize: '0.9rem' }
                    }}
                  />
                </Grid>
                
                {/* Filtro por Data Final */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: GLASS.text.muted, mb: 0.5, display: 'block', ml: 0.5 }}>
                    Data Final
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    inputProps={{ min: startDate || undefined }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: GLASS.radius.button,
                        bgcolor: 'rgba(82, 86, 99, 0.02)',
                        '& fieldset': { borderColor: GLASS.border.subtle },
                        '&:hover fieldset': { borderColor: GLASS.border.outer },
                        '&.Mui-focused fieldset': { borderColor: GLASS.accent.orange, borderWidth: '1px' },
                      },
                      '& .MuiInputBase-input': { fontSize: '0.9rem' }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper elevation={0} sx={{
              p: 3,
              borderRadius: GLASS.radius.card,
              bgcolor: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            }}>
              <Typography variant="h6" sx={{ mb: 3, color: GLASS.text.heading }}>
                Conteúdo Agendado {filteredContent.length > 0 && `(${filteredContent.length})`}
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
                  sx={{
                    bgcolor: GLASS.accent.orange,
                    borderRadius: GLASS.radius.button,
                    '&:hover': { bgcolor: GLASS.accent.orangeDark },
                  }}
                >
                  Criar Novo Conteúdo
                </Button>
              </Box>
            ) : (
              <>
                <List>
                  {(() => {
                    // Ordenar conteúdo por proximidade da data atual
                    // Prioriza posts futuros mais próximos, depois posts passados mais recentes
                    const now = new Date().getTime();
                    const sortedContent = [...filteredContent].sort((a, b) => {
                      const dateA = safeParseDateISO(a.scheduledDate);
                      const dateB = safeParseDateISO(b.scheduledDate);
                      if (!dateA || !dateB) return 0;
                      
                      const timeA = dateA.getTime();
                      const timeB = dateB.getTime();
                      
                      // Separar futuros e passados
                      const isAFuture = timeA > now;
                      const isBFuture = timeB > now;
                      
                      // Posts futuros vêm primeiro
                      if (isAFuture && !isBFuture) return -1;
                      if (!isAFuture && isBFuture) return 1;
                      
                      // Se ambos são futuros: ordenar crescente (mais próximo primeiro)
                      if (isAFuture && isBFuture) {
                        return timeA - timeB;
                      }
                      
                      // Se ambos são passados: ordenar decrescente (mais recente primeiro)
                      return timeB - timeA;
                    });
                    
                    // Calcular paginação
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedContent = sortedContent.slice(startIndex, endIndex);
                    
                    return paginatedContent.map((content, index) => {
                    const client = content.clients || getClientById(content.clientId);
                    const contentDate = safeParseDateISO(content.scheduledDate);
                    
                    if (!contentDate) return null;
                    
                    return (
                      <React.Fragment key={content.id}>
                        {index > 0 && <Divider component="li" sx={{ ml: 0 }} />}
                        <ListItem
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: getContentTypeBg(content.postType),
                            borderRadius: '8px',
                            mb: 0.5,
                            transition: 'background-color 0.15s ease',
                            '&:hover': { bgcolor: getContentTypeBg(content.postType).replace('0.07', '0.12') },
                          }}
                          onClick={() => {
                            setSelectedContent(content);
                            setPreviewOpen(true);
                            setMenuAnchorEl(null);
                          }}
                          secondaryAction={
                            <IconButton edge="end" onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, content);
                            }}>
                              <MoreVertIcon />
                            </IconButton>
                          }
                        >
                          <ListItemAvatar>
                            <Box sx={{ mr: 2 }}>
                              {renderContentPreview(content)}
                            </Box>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SmartImage
                                  src={getClientLogoForAvatar(content)}
                                  clientId={client?.id}
                                  alt={client?.name || 'Cliente'}
                                  width={24}
                                  height={24}
                                  borderRadius="50%"
                                  fallbackText={client?.name?.charAt(0) || 'C'}
                                />
                                <Typography variant="subtitle1" component="span" sx={{ fontWeight: 600 }}>
                                  {client?.name || 'Cliente não encontrado'}
                                </Typography>
                                <Chip
                                  icon={<Box component="span" sx={{ display: 'flex', color: getContentTypeColor(content.postType) }}>{getContentTypeIcon(content.postType)}</Box>}
                                  label={content.postType.toUpperCase()}
                                  size="small"
                                  sx={{
                                    bgcolor: getContentTypeBg(content.postType),
                                    color: getContentTypeColor(content.postType),
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    height: 22,
                                    border: `1px solid ${getContentTypeColor(content.postType)}30`,
                                  }}
                                />
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
                                  {(() => {
                                    const disp = getCalendarStatusDisplay(content);
                                    const icon =
                                      disp.preferApprovalIcon ? (
                                        <FactCheckIcon />
                                      ) : content.status === 'failed' ? (
                                        <ErrorIcon />
                                      ) : isPublishedStatus(content.status) ? (
                                        <CheckCircleIcon />
                                      ) : (
                                        <ScheduleIcon />
                                      );
                                    return (
                                      <Tooltip title={disp.tooltip}>
                                        <Chip icon={icon} label={disp.label} size="small" color={disp.chipColor} />
                                      </Tooltip>
                                    );
                                  })()}
                                  {(() => {
                                    const creatorUser = getCreatorUser(content.userId);
                                    if (!creatorUser) return null;
                                    return (
                                      <Chip 
                                        icon={<PersonIcon />} 
                                        label={`Por: ${creatorUser.full_name || creatorUser.email}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    );
                                  })()}
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
                  });
                  })()}
                </List>
                
                {/* Paginação */}
                {(() => {
                  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
                  if (totalPages <= 1) return null;
                  
                  return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                      <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, page) => setCurrentPage(page)}
                        color="standard"
                        size="large"
                        showFirstButton
                        showLastButton
                        sx={{
                          '& .MuiPaginationItem-root': {
                            borderRadius: GLASS.radius.button,
                            border: `1px solid ${GLASS.border.outer}`,
                            bgcolor: GLASS.surface.bg,
                            backdropFilter: `blur(${GLASS.surface.blur})`,
                            color: GLASS.text.body,
                            '&.Mui-selected': {
                              bgcolor: GLASS.accent.orange,
                              color: '#fff',
                              borderColor: GLASS.accent.orange,
                              '&:hover': { bgcolor: GLASS.accent.orangeDark },
                            },
                          },
                        }}
                      />
                    </Box>
                  );
                })()}
              </>
            )}
          </Paper>
          </>
          </motion.div>
        )}
        </AnimatePresence>
      </Container>

      {/* Menu de contexto */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.inner,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: GLASS.shadow.card,
          }
        }}
      >
        <MenuItem onClick={handlePreview}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Visualizar</ListItemText>
        </MenuItem>
        {selectedContent && canEditPost(selectedContent.status) && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {selectedContent && isOverdueUnapproved(selectedContent) && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              openRescheduleDialog();
            }}
          >
            <ListItemIcon>
              <CalendarIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Nova data (aprovação)</ListItemText>
          </MenuItem>
        )}
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
        onClose={() => {
          setPreviewOpen(false);
          setSelectedContent(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1,
          color: GLASS.text.heading,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VisibilityIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
            Visualizar Conteúdo
          </Box>
          {selectedContent && (
            <Chip 
              label={selectedContent.postType.toUpperCase()}
              size="small"
              sx={{ 
                bgcolor: getContentTypeColor(selectedContent.postType),
                color: 'white',
                borderRadius: GLASS.radius.badge,
              }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedContent && isOverdueUnapproved(selectedContent) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              A data e hora já passaram e o cliente ainda não aprovou. Defina uma nova data abaixo ou gere um novo link na{' '}
              <Box component={RouterLink} to="/approvals" sx={{ fontWeight: 700, color: 'inherit' }}>
                página de Aprovações
              </Box>
              .
            </Alert>
          )}
          {renderPreviewContent()}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${GLASS.border.subtle}`, pt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button
            onClick={() => {
              setPreviewOpen(false);
              setSelectedContent(null);
            }}
            sx={{ borderRadius: GLASS.radius.button, color: GLASS.text.muted }}
          >
            Fechar
          </Button>
          {selectedContent && isOverdueUnapproved(selectedContent) && (
            <Button
              variant="outlined"
              onClick={openRescheduleDialog}
              startIcon={<CalendarIcon />}
              sx={{ borderRadius: GLASS.radius.button }}
            >
              Nova data (manter na aprovação)
            </Button>
          )}
          {selectedContent && canEditPost(selectedContent.status) && (
            <Button 
              variant="contained" 
              onClick={handleEdit}
              startIcon={<EditIcon />}
              sx={{
                bgcolor: GLASS.accent.orange,
                borderRadius: GLASS.radius.button,
                '&:hover': { bgcolor: GLASS.accent.orangeDark },
              }}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={rescheduleOpen}
        onClose={() => !rescheduleSaving && setRescheduleOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            border: `1px solid ${GLASS.border.outer}`,
          },
        }}
      >
        <DialogTitle sx={{ color: GLASS.text.heading }}>Nova data de referência</DialogTitle>
        <DialogContent>
          {rescheduleError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {rescheduleError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A aprovação do cliente permanece pendente. Se o link expirou, crie um novo na página de Aprovações.
          </Typography>
          <DateTimePicker scheduledDate={rescheduleDateIso} onChange={setRescheduleDateIso} disabled={rescheduleSaving} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${GLASS.border.subtle}`, pt: 2 }}>
          <Button onClick={() => setRescheduleOpen(false)} disabled={rescheduleSaving} sx={{ color: GLASS.text.muted }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveReschedule}
            disabled={rescheduleSaving || !rescheduleDateIso}
            sx={{ bgcolor: GLASS.accent.orange, borderRadius: GLASS.radius.button }}
          >
            {rescheduleSaving ? 'Salvando…' : 'Salvar data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedContent(null);
        }}
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', color: GLASS.text.heading }}>
          <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography>
            Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.
          </Typography>
          {selectedContent ? (
            <Box sx={{
              mt: 2, p: 2,
              bgcolor: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              border: `1px solid ${GLASS.border.subtle}`,
              borderRadius: GLASS.radius.inner,
            }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Cliente:</strong> {getClientById(selectedContent.clientId)?.name || 'Cliente não encontrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tipo:</strong> {selectedContent.postType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Data:</strong> {safeFormatDate(selectedContent.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                <strong>ID:</strong> {selectedContent.id}
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              ⚠️ Nenhum conteúdo selecionado!
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${GLASS.border.subtle}`, pt: 2 }}>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setSelectedContent(null);
            }}
            sx={{ borderRadius: GLASS.radius.button, color: GLASS.text.muted }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            startIcon={<DeleteIcon />}
            disabled={!selectedContent}
            sx={{ borderRadius: GLASS.radius.button }}
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
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }
        }}
      >
        <DialogTitle sx={{ color: GLASS.text.heading }}>
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
        <DialogActions sx={{ borderTop: `1px solid ${GLASS.border.subtle}`, pt: 2 }}>
          <Button
            onClick={() => setClientDialogOpen(false)}
            sx={{ borderRadius: GLASS.radius.button, color: GLASS.text.muted }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StoryCalendar;
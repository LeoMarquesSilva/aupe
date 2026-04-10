import React, { useState, useEffect } from 'react';
import { clientService } from '../services/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Alert, 
  Divider, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  ListItemText,
  ListItemAvatar,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Card,
  CardContent,
  Badge,
  Tooltip,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  VideoLibrary as ReelsIcon, 
  Schedule as ScheduleIcon, 
  Send as SendIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Instagram as InstagramIcon,
  Image as ImageIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { Client, ReelVideo, PostImage } from '../types';
import { scheduleInstagramPost } from '../services/postService';
import ClientManager from '../components/ClientManager';
import VideoUploader from '../components/VideoUploader';
import ImageUploader from '../components/ImageUploader';
import CaptionEditor from '../components/CaptionEditor';
import DateTimePicker from '../components/DateTimePicker';
import SubscriptionLimitsAlert from '../components/SubscriptionLimitsAlert';
import AppSnackbar from '../components/AppSnackbar';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

const CreateReels: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [video, setVideo] = useState<ReelVideo | null>(null);
  const [coverImage, setCoverImage] = useState<PostImage[]>([]); // Usar array para compatibilidade com ImageUploader
  const [caption, setCaption] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [shareToFeed, setShareToFeed] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [postNowLoading, setPostNowLoading] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const loadClients = async () => {
      try {
        const supabaseClients = await clientService.getClients();
        setClients(supabaseClients);
        
        // Verificar se há clientId na URL e pré-selecionar
        const clientIdFromUrl = searchParams.get('clientId');
        if (clientIdFromUrl && supabaseClients.some(c => c.id === clientIdFromUrl)) {
          setSelectedClientId(clientIdFromUrl);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
      }
    };

    loadClients();
  }, [searchParams]);

  const handleAddClient = async (client: Client) => {
    setSelectedClientId(client.id);
    setClientDialogOpen(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleVideoChange = (newVideo: ReelVideo | null) => {
    console.log('🎬 Novo vídeo recebido:', newVideo);
    setVideo(newVideo);
  };

  const handleCoverImageChange = (images: PostImage[]) => {
    console.log('🖼️ Nova capa recebida:', images);
    setCoverImage(images);
  };

  const handleCaptionChange = (newCaption: string) => {
    setCaption(newCaption);
  };

  const handleDateChange = (newDate: string) => {
    setScheduledDate(newDate);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const getSelectedClient = (): Client | undefined => {
    return clients.find(client => client.id === selectedClientId);
  };

  const validateReelData = () => {
    if (!selectedClientId) {
      showNotification('Selecione um cliente', 'warning');
      return false;
    }

    const selectedClient = getSelectedClient();
    if (!selectedClient) {
      showNotification('Cliente não encontrado', 'error');
      return false;
    }

    if (!video) {
      showNotification('Adicione um vídeo para o Reel', 'warning');
      return false;
    }

    if (!caption.trim()) {
      showNotification('Adicione uma legenda para o Reel', 'warning');
      return false;
    }

    // ✅ Verificar credenciais do Instagram
    if (!selectedClient.accessToken || !selectedClient.instagramAccountId) {
      showNotification('Esta conta não está conectada ao Instagram. Conecte-a antes de agendar Reels.', 'error');
      return false;
    }

    return true;
  };

  // ✅ Validação específica para agendamento
  const validateScheduling = () => {
    if (!scheduledDate) {
      showNotification('Defina uma data e hora para agendamento', 'warning');
      return false;
    }

    // Verificar se a data é válida e no futuro
    try {
      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();
      
      if (isNaN(scheduledDateTime.getTime())) {
        showNotification('Data/hora inválida', 'error');
        return false;
      }
      
      if (scheduledDateTime <= now) {
        showNotification('A data/hora deve ser no futuro', 'warning');
        return false;
      }
      
      return true;
    } catch (error) {
      showNotification('Erro ao validar data/hora', 'error');
      return false;
    }
  };

  const resetForm = () => {
    setVideo(null);
    setCoverImage([]);
    setCaption('');
    setScheduledDate('');
    setShareToFeed(true);
  };

  const handleSubmit = async () => {
    if (!validateReelData()) return;
    if (!validateScheduling()) return;

    setLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient || !video) {
        showNotification('Verifique o vídeo e a legenda antes de continuar.', 'error');
        return;
      }

      console.log('🎬 Agendando Reel:', {
        clientId: selectedClientId,
        videoUrl: video.publicUrl,
        coverImageUrl: coverImage.length > 0 ? coverImage[0].url : null,
        caption: caption,
        scheduledDate: scheduledDate,
        shareToFeed: shareToFeed
      });

      // ✅ Usar a capa personalizada se disponível, senão usar thumbnail do vídeo
      const finalCoverImage = coverImage.length > 0 ? coverImage[0].url : video.thumbnail;

      await scheduleInstagramPost({
        clientId: selectedClientId,
        caption: caption,
        images: [video.publicUrl], // Para Reels, o vídeo vai no campo images
        scheduledDate: scheduledDate,
        postType: 'reels',
        immediate: false,
        video: video.publicUrl,
        shareToFeed: shareToFeed,
        coverImage: finalCoverImage
      }, selectedClient);

      resetForm();
      showNotification('Reel agendado com sucesso! Será publicado na data e hora escolhidas.', 'success');
      setTimeout(() => navigate(selectedClientId ? `/calendar/${selectedClientId}` : '/calendar'), 1500);
    } catch (error) {
      console.error('Erro ao agendar Reel:', error);
      showNotification(getUserFriendlyMessage(error, 'agendar Reel'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!validateReelData()) return;
    
    setPostNowLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient || !video) {
        showNotification('Verifique o vídeo e a legenda antes de continuar.', 'error');
        return;
      }

      console.log('🎬 Publicando Reel imediatamente:', {
        clientId: selectedClientId,
        videoUrl: video.publicUrl,
        coverImageUrl: coverImage.length > 0 ? coverImage[0].url : null,
        caption: caption,
        shareToFeed: shareToFeed
      });

      // ✅ Usar a capa personalizada se disponível, senão usar thumbnail do vídeo
      const finalCoverImage = coverImage.length > 0 ? coverImage[0].url : video.thumbnail;

      await scheduleInstagramPost({
        clientId: selectedClientId,
        caption: caption,
        images: [video.publicUrl], // Para Reels, o vídeo vai no campo images
        scheduledDate: new Date().toISOString(),
        postType: 'reels',
        immediate: true,
        video: video.publicUrl,
        shareToFeed: shareToFeed,
        coverImage: finalCoverImage
      }, selectedClient);

      resetForm();
      showNotification('Reel enviado com sucesso!', 'success');
      setTimeout(() => navigate(selectedClientId ? `/calendar/${selectedClientId}` : '/calendar'), 1500);
    } catch (error) {
      console.error('Erro ao enviar Reel:', error);
      showNotification(getUserFriendlyMessage(error, 'enviar Reel'), 'error');
    } finally {
      setPostNowLoading(false);
    }
  };

  const handleCreatePost = () => {
    navigate('/create-post');
  };

  const handleCreateStory = () => {
    navigate('/create-story');
  };

  const selectedClient = getSelectedClient();
  const hasInstagramAuth = selectedClient?.accessToken && selectedClient?.instagramAccountId;

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: 4, flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            fontFamily: '"Montserrat", sans-serif',
            color: GLASS.text.heading,
          }}>
            Criar Reels
          </Typography>
          <Typography variant="subtitle1" sx={{ color: GLASS.text.muted }}>
            Crie e agende Reels para o Instagram com suporte a arquivos de até 2GB
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={handleCreatePost}
            sx={{ 
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              px: 3,
              py: 1,
              color: GLASS.accent.orange,
              borderColor: GLASS.accent.orange,
              '&:hover': {
                backgroundColor: 'rgba(247, 66, 17, 0.04)',
                borderColor: GLASS.accent.orangeDark,
              }
            }}
          >
            Criar Post
          </Button>

          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={handleCreateStory}
            sx={{ 
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              px: 3,
              py: 1,
              color: GLASS.accent.orange,
              borderColor: GLASS.accent.orange,
              '&:hover': {
                backgroundColor: 'rgba(247, 66, 17, 0.04)',
                borderColor: GLASS.accent.orangeDark,
              }
            }}
          >
            Criar Story
          </Button>
        </Stack>
      </Box>

      {/* Seleção de cliente */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
          border: `1px solid ${GLASS.border.outer}`,
          borderRadius: GLASS.radius.card,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center', color: GLASS.text.heading }}>
            <InstagramIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
            Selecione a Conta do Instagram
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={() => setClientDialogOpen(true)}
            size="small"
            sx={{ color: GLASS.accent.orange, borderColor: GLASS.accent.orange, borderRadius: GLASS.radius.button }}
          >
            Novo Cliente
          </Button>
        </Box>

        <FormControl fullWidth variant="outlined">
          <InputLabel id="client-select-label">Selecione um cliente</InputLabel>
          <Select
            labelId="client-select-label"
            id="client-select"
            value={clients.length > 0 ? selectedClientId : ''}
            onChange={(e) => setSelectedClientId(e.target.value as string)}
            label="Selecione um cliente"
            sx={{ mb: 2 }}
            renderValue={(selected) => {
              const client = clients.find(c => c.id === selected);
              if (!client) return "Selecione um cliente";
              
              return (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={client.profilePicture || client.logoUrl} 
                    alt={client.name}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  >
                    {client.name.charAt(0)}
                  </Avatar>
                  <Typography>{client.name}</Typography>
                  <Typography sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                    @{client.instagram}
                  </Typography>
                </Box>
              );
            }}
          >
            {clients.length === 0 ? (
              <MenuItem disabled value="">
                <Typography color="text.secondary">
                  Nenhum cliente cadastrado
                </Typography>
              </MenuItem>
            ) : (
              clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Badge 
                      color={client.accessToken ? "success" : "error"} 
                      variant="dot" 
                      overlap="circular"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                    >
                      <Avatar 
                        src={client.profilePicture || client.logoUrl} 
                        alt={client.name}
                        sx={{ width: 24, height: 24 }}
                      >
                        {client.name.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={client.name} 
                    secondary={`@${client.instagram}`} 
                    primaryTypographyProps={{ variant: 'body1' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                  {client.accessToken ? (
                    <Chip 
                      size="small" 
                      color="success" 
                      label="Conectado" 
                      icon={<CheckCircleIcon />} 
                      sx={{ ml: 1 }}
                    />
                  ) : (
                    <Chip 
                      size="small" 
                      color="error" 
                      label="Não conectado" 
                      icon={<ErrorIcon />} 
                      sx={{ ml: 1 }}
                    />
                  )}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {selectedClient && (
          <Card 
            variant="outlined" 
            sx={{ 
              mb: 2, 
              borderRadius: 2,
              borderColor: hasInstagramAuth ? 'success.main' : 'error.main',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <CardContent sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2, 
              '&:last-child': { pb: 2 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Badge 
                  color={hasInstagramAuth ? "success" : "error"} 
                  overlap="circular"
                  badgeContent={hasInstagramAuth ? <CheckCircleIcon fontSize="small" /> : <ErrorIcon fontSize="small" />}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  sx={{ mr: 2 }}
                >
                  <Avatar 
                    src={selectedClient.profilePicture || selectedClient.logoUrl} 
                    alt={selectedClient.name}
                    sx={{ width: 56, height: 56 }}
                  >
                    {selectedClient.name.charAt(0)}
                  </Avatar>
                </Badge>
                
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                    {selectedClient.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: GLASS.accent.orange }} />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      @{selectedClient.instagram}
                    </Typography>
                  </Box>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    {selectedClient.username && (
                      <Chip 
                        size="small" 
                        label={`Usuário: ${selectedClient.username}`} 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                    {selectedClient.tokenExpiry && (
                      <Tooltip title={`Token válido até ${new Date(selectedClient.tokenExpiry).toLocaleDateString()}`}>
                        <Chip 
                          size="small" 
                          label="Token ativo" 
                          color="success" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              </Box>
              
              <Box>
                {hasInstagramAuth ? (
                  <Chip 
                    icon={<CheckCircleIcon />}
                    label="Conta conectada" 
                    color="success" 
                    variant="filled"
                    sx={{ fontWeight: 'medium' }}
                  />
                ) : (
                  <Tooltip title="É necessário conectar esta conta ao Instagram para publicar">
                    <Chip 
                      icon={<ErrorIcon />}
                      label="Conta não conectada" 
                      color="error" 
                      variant="filled"
                      sx={{ fontWeight: 'medium' }}
                    />
                  </Tooltip>
                )}
              </Box>
            </CardContent>
            
            {!hasInstagramAuth && (
              <Alert 
                severity="warning" 
                variant="filled"
                sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                Esta conta não está conectada ao Instagram. Conecte-a antes de agendar Reels.
              </Alert>
            )}
          </Card>
        )}
      </Paper>

      {/* Formulário de criação de Reel */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
          border: `1px solid ${GLASS.border.outer}`,
          borderRadius: GLASS.radius.card,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3, 
          pb: 2, 
          borderBottom: `1px solid ${GLASS.border.subtle}`,
        }}>
          <ReelsIcon sx={{ mr: 1.5, color: GLASS.accent.orange }} />
          <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
            Novo Reel
          </Typography>
          
          {selectedClient && (
            <Chip
              avatar={
                <Avatar 
                  src={selectedClient.profilePicture || selectedClient.logoUrl}
                  alt={selectedClient.name}
                >
                  {selectedClient.name.charAt(0)}
                </Avatar>
              }
              label={`@${selectedClient.instagram}`}
              variant="outlined"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        {/* Alert de limites de subscription */}
        <SubscriptionLimitsAlert type="post" />

        {/* Upload de Vídeo */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Para maior confiabilidade use <strong>MP4 (H.264 + AAC)</strong>. MOV pode funcionar dependendo do codec; em caso de falha na publicação, tente converter para MP4 e reagendar.
        </Alert>
        <VideoUploader
          video={video}
          onChange={handleVideoChange}
          maxFileSize={2048}
          maxDuration={90}
          acceptedFormats={['video/mp4', 'video/mov', 'video/quicktime', 'video/webm']}
          showPreview={true}
        />
        
        {/* Indicador do tipo de conteúdo */}
        {video && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Alert 
              severity="info" 
              variant="outlined"
              sx={{ 
                borderRadius: GLASS.radius.inner,
                backgroundColor: 'rgba(247, 66, 17, 0.04)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReelsIcon sx={{ color: GLASS.accent.orange }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  <strong>Reel:</strong> Será criado um Reel com duração de {Math.round(video.duration)}s
                  {video.publicUrl && (
                    <Chip 
                      size="small" 
                      label="✓ Vídeo armazenado (2GB suportado)" 
                      color="success" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        {/* Upload de Capa Personalizada */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <ImageIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
            Capa Personalizada (Opcional)
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adicione uma imagem personalizada como capa para seu Reel. Se não for adicionada, será usado o primeiro frame do vídeo automaticamente.
          </Typography>

          <ImageUploader
            images={coverImage}
            onChange={handleCoverImageChange}
            maxImages={1} // ✅ Apenas 1 imagem para capa
            aspectRatio="9:16" // ✅ Proporção vertical ideal para Reels
            helperText="Recomendado: 1080x1920 pixels (9:16) para melhor qualidade no Instagram"
            clientName={selectedClient?.name || 'Cliente'}
            clientUsername={selectedClient?.instagram || 'username'}
            caption="" // Não mostrar caption no preview da capa
          />

          {/* Status da capa */}
          {coverImage.length > 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 1 }} />
                Capa personalizada será usada no Reel
              </Box>
            </Alert>
          ) : video?.thumbnail ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Será usado o primeiro frame do vídeo como capa
              </Box>
            </Alert>
          ) : null}
        </Box>

        <Divider sx={{ my: 4 }} />
        
        <CaptionEditor caption={caption} onChange={handleCaptionChange} />
        
        <Divider sx={{ my: 4 }} />

        {/* Configurações do Reel */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
            Configurações do Reel
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
                color="primary"
              />
            }
            label="Compartilhar no feed principal"
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            Quando ativado, o Reel também aparecerá no feed principal da conta
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        
        <DateTimePicker scheduledDate={scheduledDate} onChange={handleDateChange} />

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SendIcon />}
            onClick={handlePostNow}
            disabled={postNowLoading || loading || !selectedClientId || !video || !hasInstagramAuth}
            sx={{ 
              px: 4, 
              py: 1.5, 
              borderRadius: GLASS.radius.button,
              borderColor: GLASS.accent.orange,
              color: GLASS.accent.orange,
              '&:hover': {
                backgroundColor: 'rgba(247, 66, 17, 0.06)',
                borderColor: GLASS.accent.orangeDark,
              },
              '&.Mui-disabled': {
                color: 'rgba(0, 0, 0, 0.26)'
              }
            }}
          >
            {postNowLoading ? 'Enviando...' : 'Publicar Agora'}
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={<ScheduleIcon />}
            onClick={handleSubmit}
            disabled={loading || postNowLoading || !selectedClientId || !video || !scheduledDate || !hasInstagramAuth}
            sx={{ 
              px: 4, 
              py: 1.5, 
              borderRadius: GLASS.radius.button,
              backgroundColor: GLASS.accent.orange,
              color: '#ffffff',
              boxShadow: GLASS.shadow.button,
              '&:hover': {
                backgroundColor: GLASS.accent.orangeDark,
                boxShadow: GLASS.shadow.buttonHover,
              },
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {loading ? 'Agendando...' : 'Agendar Reel'}
          </Button>
        </Box>
        
        {selectedClient && !hasInstagramAuth && (
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ mt: 3 }}
            icon={<InfoIcon />}
          >
            Esta conta não está conectada ao Instagram. Não é possível agendar ou publicar Reels.
            Por favor, conecte a conta nas configurações do cliente.
          </Alert>
        )}
      </Paper>

      {/* Dialog para adicionar cliente */}
      <Dialog 
        open={clientDialogOpen} 
        onClose={() => setClientDialogOpen(false)}
        fullWidth 
        maxWidth="md"
        PaperProps={{
          sx: {
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            borderRadius: GLASS.radius.card,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: GLASS.shadow.card,
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${GLASS.border.outer}`,
          fontWeight: 'bold',
          color: GLASS.text.heading,
        }}>
          Gerenciar Clientes
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <ClientManager
            clients={clients}
            onAddClient={handleAddClient}
            onSelectClient={handleSelectClient}
            selectedClientId={selectedClientId}
          />
        </DialogContent>
      </Dialog>

      <AppSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
        autoHideDuration={6000}
      />
    </Container>
  );
};

export default CreateReels;
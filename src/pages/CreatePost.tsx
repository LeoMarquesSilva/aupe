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
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Card,
  CardContent,
  Badge,
  Tooltip,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon, 
  Instagram as InstagramIcon, 
  Schedule as ScheduleIcon, 
  Send as SendIcon,
  VideoLibrary as StoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  VideoLibrary as ReelsIcon
} from '@mui/icons-material';
import { Client, PostImage, PostData } from '../types';
import ClientManager from '../components/ClientManager';
import ImageUploader from '../components/ImageUploader';
import CaptionEditor from '../components/CaptionEditor';
import DateTimePicker from '../components/DateTimePicker';
import SubscriptionLimitsAlert from '../components/SubscriptionLimitsAlert';
import AppSnackbar from '../components/AppSnackbar';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { scheduleInstagramPost, uploadImagesToSupabaseStorage } from '../services/postService';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

const CreatePost: React.FC = () => {
  // ... resto do código permanece exatamente igual
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [images, setImages] = useState<PostImage[]>([]);
  const [caption, setCaption] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  useEffect(() => {
    console.log("Estado de imagens atualizado:", images.length);
  }, [images]);

  const handleAddClient = async (client: Client) => {
    setSelectedClientId(client.id);
    setClientDialogOpen(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleImagesChange = (newImages: PostImage[]) => {
    console.log('Novas imagens recebidas:', newImages.length);
    console.log('Primeira imagem URL:', newImages.length > 0 ? newImages[0].url.substring(0, 50) + "..." : "nenhuma");
    setImages([...newImages]);
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

  const validatePostData = () => {
    if (!selectedClientId) {
      showNotification('Selecione um cliente', 'warning');
      return false;
    }

    const selectedClient = getSelectedClient();
    if (!selectedClient) {
      showNotification('Cliente não encontrado', 'error');
      return false;
    }

    if (images.length === 0) {
      showNotification('Adicione pelo menos uma imagem', 'warning');
      return false;
    }

    if (!caption.trim()) {
      showNotification('Adicione uma legenda para a postagem', 'warning');
      return false;
    }

    // ✅ Verificar credenciais do Instagram
    if (!selectedClient.accessToken || !selectedClient.instagramAccountId) {
      showNotification('Esta conta não está conectada ao Instagram. Conecte-a antes de agendar posts.', 'error');
      return false;
    }

    return true;
  };

  // ✅ ADICIONAR: Validação específica para agendamento
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
    setImages([]);
    setCaption('');
    setScheduledDate('');
  };

  const handleSubmit = async () => {
    if (!validatePostData()) return;
    if (!validateScheduling()) return; // ✅ Agora a função existe

    setLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient) {
        showNotification('Cliente não encontrado', 'error');
        return;
      }

      showNotification('Enviando imagens...', 'info');
      
      console.log(`📦 Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE em vez de ImgBB
      const imageUrls = await uploadImagesToSupabaseStorage(images);
      
      if (imageUrls.length === 0) {
        showNotification('Não foi possível enviar as imagens. Tente novamente ou use outras imagens.', 'error');
        return;
      }
      
      if (imageUrls.length < images.length) {
        showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
      }
      
      const postType = imageUrls.length > 1 ? 'carousel' : 'post';
      
      const postData: PostData = {
        clientId: selectedClientId,
        caption: caption,
        images: imageUrls, // ✅ URLs do Supabase Storage
        scheduledDate: scheduledDate,
        postType: postType,
        immediate: false
      };

      console.log(`📝 Post será criado como: ${postType} (${imageUrls.length} imagem(s))`);
      console.log('📅 Data de agendamento:', scheduledDate);
      console.log('🔗 URLs das imagens:', imageUrls);

      await scheduleInstagramPost(postData, selectedClient);

      resetForm();
      showNotification(`${postType === 'carousel' ? 'Carrossel' : 'Postagem'} agendada com sucesso! Será publicada na data e hora escolhidas.`, 'success');
      setTimeout(() => navigate(selectedClientId ? `/calendar/${selectedClientId}` : '/calendar'), 1500);
    } catch (error) {
      console.error('Erro ao agendar postagem:', error);
      showNotification(getUserFriendlyMessage(error, 'agendar postagem'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!validatePostData()) return;
    
    setPostNowLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient) {
        showNotification('Cliente não encontrado', 'error');
        return;
      }

      showNotification('Enviando imagens...', 'info');
      
      console.log(`Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE também para "Postar Agora"
      const imageUrls = await uploadImagesToSupabaseStorage(images);
      
      if (imageUrls.length === 0) {
        showNotification('Não foi possível enviar as imagens. Tente novamente ou use outras imagens.', 'error');
        return;
      }
      
      if (imageUrls.length < images.length) {
        showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
      }
      
      const postType = imageUrls.length > 1 ? 'carousel' : 'post';
      
      const postData: PostData = {
        clientId: selectedClientId,
        caption: caption,
        images: imageUrls,
        scheduledDate: new Date().toISOString(),
        postType: postType,
        immediate: true
      };

      console.log(`Post será criado como: ${postType} (${imageUrls.length} imagem(s))`);

      await scheduleInstagramPost(postData, selectedClient);

      resetForm();
      showNotification(`${postType === 'carousel' ? 'Carrossel' : 'Postagem'} enviada com sucesso!`, 'success');
      setTimeout(() => navigate(selectedClientId ? `/calendar/${selectedClientId}` : '/calendar'), 1500);
    } catch (error) {
      console.error('Erro ao enviar postagem:', error);
      showNotification(getUserFriendlyMessage(error, 'enviar postagem'), 'error');
    } finally {
      setPostNowLoading(false);
    }
  };

  const handleCreateStory = () => {
    navigate('/create-story');
  };

  const handleCreateReels = () => {
    navigate('/create-reels');
  };

  const selectedClient = getSelectedClient();
  const hasInstagramAuth = selectedClient?.accessToken && selectedClient?.instagramAccountId;

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 4 }, flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            fontFamily: '"Montserrat", sans-serif',
            color: GLASS.text.heading,
            fontSize: { xs: '1.5rem', md: '2.125rem' },
          }}>
            Agendamento de Posts
          </Typography>
          <Typography variant="subtitle1" sx={{ color: GLASS.text.muted }}>
            Crie e agende posts para o Instagram dos seus clientes
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ReelsIcon />}
            onClick={handleCreateReels}
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
            Criar Reels
            <Chip
              label="Novo"
              size="small"
              sx={{
                ml: 1,
                backgroundColor: GLASS.accent.orange,
                color: 'white',
                fontSize: '0.7rem',
                height: '18px'
              }}
            />
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<StoryIcon />}
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

        {/* Alert de limites de subscription */}
        <SubscriptionLimitsAlert type="post" />

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
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 0 },
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
                Esta conta não está conectada ao Instagram. Conecte-a antes de agendar posts.
              </Alert>
            )}
          </Card>
        )}
      </Paper>


      {/* Formulário de criação de post */}
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
          <InstagramIcon sx={{ mr: 1.5, color: GLASS.accent.orange }} />
          <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
            Nova Postagem
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

        <ImageUploader 
          images={images} 
          onChange={handleImagesChange} 
          caption={caption}
          clientName={selectedClient?.name || 'Cliente'}
          clientUsername={selectedClient?.instagram || 'cliente'}
        />
        
        {/* Indicador do tipo de post */}
        {images.length > 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Alert 
              severity="info" 
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                backgroundColor: images.length > 1 ? 'rgba(25, 118, 210, 0.04)' : 'rgba(76, 175, 80, 0.04)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {images.length > 1 ? (
                  <>
                    <InstagramIcon sx={{ color: '#1976d2' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      <strong>Carrossel:</strong> Será criado um carrossel com {images.length} imagens
                    </Typography>
                  </>
                ) : (
                  <>
                    <InstagramIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      <strong>Post simples:</strong> Será criado um post com 1 imagem
                    </Typography>
                  </>
                )}
              </Box>
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />
        
        <CaptionEditor caption={caption} onChange={handleCaptionChange} />
        
        <Divider sx={{ my: 4 }} />
        
        <DateTimePicker scheduledDate={scheduledDate} onChange={handleDateChange} />

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SendIcon />}
            onClick={handlePostNow}
            disabled={postNowLoading || loading || !selectedClientId || images.length === 0 || !hasInstagramAuth}
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
            {postNowLoading ? 'Enviando...' : 'Postar Agora'}
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={<ScheduleIcon />}
            onClick={handleSubmit}
            disabled={loading || postNowLoading || !selectedClientId || images.length === 0 || !scheduledDate || !hasInstagramAuth}
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
            {loading ? 'Agendando...' : 'Agendar Postagem'}
          </Button>
        </Box>
        
        {selectedClient && !hasInstagramAuth && (
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ mt: 3 }}
            icon={<InfoIcon />}
          >
            Esta conta não está conectada ao Instagram. Não é possível agendar ou publicar posts.
            Por favor, conecte a conta nas configurações do cliente.
          </Alert>
        )}
      </Paper>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto', 
          background: GLASS.surface.bgFooter,
          color: GLASS.text.muted,
          textAlign: 'center',
          borderTop: `1px solid ${GLASS.border.outer}`,
        }}
      >
        <Container maxWidth={false} disableGutters sx={appShellContainerSx}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Typography variant="body2">
              © {new Date().getFullYear()} INSYT - Todos os direitos reservados
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 3,
              color: 'text.secondary'
            }}>
              <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
                Termos de Uso
              </Typography>
              <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
                Privacidade
              </Typography>
              <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>
                Suporte
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

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

      {isMobile && (
        <Fab 
          aria-label="add-client" 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            backgroundColor: GLASS.accent.orange,
            color: '#ffffff',
            boxShadow: GLASS.shadow.button,
            '&:hover': {
              backgroundColor: GLASS.accent.orangeDark,
              boxShadow: GLASS.shadow.buttonHover,
            }
          }}
          onClick={() => setClientDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

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

export default CreatePost;
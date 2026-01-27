import React, { useState, useEffect } from 'react';
import { clientService, postService } from '../services/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Snackbar, 
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
import { Client, Post, PostImage, PostData, PostStatus } from '../types';
import ClientManager from '../components/ClientManager';
import ImageUploader from '../components/ImageUploader';
import CaptionEditor from '../components/CaptionEditor';
import DateTimePicker from '../components/DateTimePicker';
import SubscriptionLimitsAlert from '../components/SubscriptionLimitsAlert';
import { scheduleInstagramPost, uploadImagesToSupabaseStorage } from '../services/postService';

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

      showNotification('Enviando imagens para Supabase Storage...', 'info');
      
      console.log(`📦 Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE em vez de ImgBB
      const imageUrls = await uploadImagesToSupabaseStorage(images);
      
      if (imageUrls.length === 0) {
        showNotification('Falha ao fazer upload das imagens', 'error');
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
      showNotification(`${postType === 'carousel' ? 'Carrossel' : 'Postagem'} agendado com sucesso! Imagens salvas no Supabase Storage.`, 'success');
    } catch (error) {
      console.error('Erro ao agendar postagem:', error);
      showNotification(`Erro ao agendar postagem: ${(error as Error).message}`, 'error');
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

      showNotification('Enviando imagens para Supabase Storage...', 'info');
      
      console.log(`Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE também para "Postar Agora"
      const imageUrls = await uploadImagesToSupabaseStorage(images);
      
      if (imageUrls.length === 0) {
        showNotification('Falha ao fazer upload das imagens', 'error');
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
      showNotification(`${postType === 'carousel' ? 'Carrossel' : 'Postagem'} enviado com sucesso! Imagens salvas no Supabase Storage.`, 'success');
    } catch (error) {
      console.error('Erro ao enviar postagem:', error);
      showNotification(`Erro ao enviar postagem: ${(error as Error).message}`, 'error');
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
    <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            fontFamily: '"Montserrat", sans-serif',
            color: '#121212'
          }}>
            Agendamento de Posts
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Crie e agende posts para o Instagram dos seus clientes
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ReelsIcon />}
            onClick={handleCreateReels}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1,
              color: '#E91E63',
              borderColor: '#E91E63',
              '&:hover': {
                backgroundColor: 'rgba(233, 30, 99, 0.04)',
                borderColor: '#C2185B'
              }
            }}
          >
            Criar Reels
            <Chip
              label="Novo"
              size="small"
              sx={{
                ml: 1,
                backgroundColor: '#E91E63',
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
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1,
              color: theme.palette.secondary.main,
              borderColor: theme.palette.secondary.main
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
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 2,
          backgroundColor: '#fff'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
            <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
            Selecione a Conta do Instagram
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={() => setClientDialogOpen(true)}
            size="small"
            sx={{ color: theme.palette.primary.main }}
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
                    <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: '#E1306C' }} />
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
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 2,
          backgroundColor: '#fff'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3, 
          pb: 2, 
          borderBottom: '1px solid rgba(0,0,0,0.08)' 
        }}>
          <InstagramIcon sx={{ mr: 1.5, color: '#E1306C' }} />
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
            color="primary"
            size="large"
            startIcon={<SendIcon />}
            onClick={handlePostNow}
            disabled={postNowLoading || loading || !selectedClientId || images.length === 0 || !hasInstagramAuth}
            sx={{ 
              px: 4, 
              py: 1.5, 
              borderRadius: 2,
              borderColor: '#121212',
              color: '#121212',
              '&:hover': {
                backgroundColor: 'rgba(18,18,18,0.04)',
                borderColor: '#000'
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
            color="primary"
            size="large"
            startIcon={<ScheduleIcon />}
            onClick={handleSubmit}
            disabled={loading || postNowLoading || !selectedClientId || images.length === 0 || !scheduledDate || !hasInstagramAuth}
            sx={{ 
              px: 4, 
              py: 1.5, 
              borderRadius: 2,
              backgroundColor: '#121212',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#333'
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
          backgroundColor: '#f9f9f9',
          color: 'text.secondary',
          textAlign: 'center',
          borderTop: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Typography variant="body2">
              © {new Date().getFullYear()} AUPE - Todos os direitos reservados
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
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          fontWeight: 'bold',
          backgroundColor: '#f9f9f9'
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
          color="primary" 
          aria-label="add-client" 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            backgroundColor: '#121212',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#333'
            }
          }}
          onClick={() => setClientDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreatePost;
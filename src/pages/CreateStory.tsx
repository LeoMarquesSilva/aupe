import React, { useState, useEffect } from 'react';
import { clientService, postService } from '../services/supabaseClient';
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
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  CircularProgress
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
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  RestartAlt as RestartIcon
} from '@mui/icons-material';
import { Client, Story, PostData, PostImage } from '../types';
import ClientManager from '../components/ClientManager';
import StoryEditor from '../components/StoryEditor';
import StoryPreview from '../components/StoryPreview';
import DateTimePicker from '../components/DateTimePicker';
import SubscriptionLimitsAlert from '../components/SubscriptionLimitsAlert';
import AppSnackbar from '../components/AppSnackbar';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { scheduleInstagramPost, uploadImagesToSupabaseStorage } from '../services/postService';

const CreateStory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [story, setStory] = useState<Story | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [postNowLoading, setPostNowLoading] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [editorKey, setEditorKey] = useState<number>(0);
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

  const handleAddClient = async (client: Client) => {
    setSelectedClientId(client.id);
    setClientDialogOpen(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleStoryChange = (newStory: Story) => {
    setStory(newStory);
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

  // Função para extrair imagens do story
  const extractStoryImages = (story: Story): string[] => {
    const images: string[] = [];
    
    // Imagem de fundo
    if (story.image && story.image.url) {
      images.push(story.image.url);
    }
    
    // Imagens de elementos (stickers, etc.)
    story.elements?.forEach(element => {
      if (element.type === 'sticker' && element.style?.imageUrl) {
        images.push(element.style.imageUrl);
      }
    });
    
    return images;
  };

  // ✅ NOVA FUNÇÃO: Converter URLs para PostImage
  const convertUrlsToPostImages = (urls: string[]): PostImage[] => {
    return urls.map((url, index) => ({
      id: `story-image-${index}`,
      url: url,
      file: null,
      order: index
    }));
  };

  // Função para extrair caption do story
  const extractStoryCaption = (story: Story): string => {
    const textElements = story.elements?.filter(el => el.type === 'text') || [];
    
    const caption = textElements
      .map(el => el.style?.text || '')
      .filter(text => text.trim() !== '')
      .join(' ')
      .trim();
    
    return caption || 'Story criado com o sistema de agendamento';
  };

  const validateStoryData = () => {
    if (!selectedClientId) {
      showNotification('Selecione um cliente', 'warning');
      return false;
    }

    const selectedClient = getSelectedClient();
    if (!selectedClient) {
      showNotification('Cliente não encontrado', 'error');
      return false;
    }

    if (!story) {
      showNotification('Crie um story antes de agendar', 'warning');
      return false;
    }

    const images = extractStoryImages(story);
    if (images.length === 0) {
      showNotification('Story deve ter pelo menos uma imagem', 'warning');
      return false;
    }

    // ✅ Verificar credenciais do Instagram
    if (!selectedClient.accessToken || !selectedClient.instagramAccountId) {
      showNotification('Esta conta não está conectada ao Instagram. Conecte-a antes de agendar stories.', 'error');
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
    setStory(null);
    setScheduledDate('');
    setActiveStep(0);
    setEditorKey(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!validateStoryData()) return;
    if (!validateScheduling()) return; // ✅ Validação de agendamento

    setLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient) {
        showNotification('Cliente não encontrado', 'error');
        return;
      }

      showNotification('Enviando imagens...', 'info');
      
      const images = extractStoryImages(story!);
      const caption = extractStoryCaption(story!);
      
      console.log(`📦 Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE em vez de ImgBB
      const postImages = convertUrlsToPostImages(images);
      const imageUrls = await uploadImagesToSupabaseStorage(postImages);
      
      if (imageUrls.length === 0) {
        showNotification('Não foi possível enviar as imagens. Tente novamente ou use outras imagens.', 'error');
        return;
      }
      
      if (imageUrls.length < images.length) {
        showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
      }
      
      const postData: PostData = {
        clientId: selectedClientId,
        caption: caption,
        images: imageUrls, // ✅ URLs do Supabase Storage
        scheduledDate: new Date(scheduledDate).toISOString(),
        postType: 'stories', // Importante: tipo 'stories' para o N8N
        immediate: false
      };

      console.log(`📝 Story será criado com ${imageUrls.length} imagem(s)`);
      console.log('📅 Data de agendamento:', scheduledDate);
      console.log('🔗 URLs das imagens:', imageUrls);

      await scheduleInstagramPost(postData, selectedClient);

      resetForm();
      showNotification('Story agendado com sucesso! Será publicado na data e hora escolhidas.', 'success');
    } catch (error) {
      console.error('Erro ao agendar story:', error);
      showNotification(getUserFriendlyMessage(error, 'agendar story'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!validateStoryData()) return;
    
    setPostNowLoading(true);

    try {
      const selectedClient = getSelectedClient();
      if (!selectedClient) {
        showNotification('Cliente não encontrado', 'error');
        return;
      }

      showNotification('Enviando imagens...', 'info');
      
      const images = extractStoryImages(story!);
      const caption = extractStoryCaption(story!);
      
      console.log(`📦 Preparando upload de ${images.length} imagens para Supabase Storage`);
      
      // ✅ USAR SUPABASE STORAGE também para "Postar Agora"
      const postImages = convertUrlsToPostImages(images);
      const imageUrls = await uploadImagesToSupabaseStorage(postImages);
      
      if (imageUrls.length === 0) {
        showNotification('Não foi possível enviar as imagens. Tente novamente ou use outras imagens.', 'error');
        return;
      }
      
      if (imageUrls.length < images.length) {
        showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
      }
      
      const postData: PostData = {
        clientId: selectedClientId,
        caption: caption,
        images: imageUrls, // ✅ URLs do Supabase Storage
        scheduledDate: new Date().toISOString(),
        postType: 'stories', // Importante: tipo 'stories' para o N8N
        immediate: true
      };

      console.log(`📝 Story será criado com ${imageUrls.length} imagem(s)`);

      await scheduleInstagramPost(postData, selectedClient);

      resetForm();
      showNotification('Story enviado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao enviar story:', error);
      showNotification(getUserFriendlyMessage(error, 'enviar story'), 'error');
    } finally {
      setPostNowLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedClientId) {
      showNotification('Selecione um cliente antes de continuar', 'warning');
      return;
    }
    if (activeStep === 0 && !story) {
      showNotification('Crie um story antes de continuar', 'warning');
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const selectedClient = getSelectedClient();
  const hasInstagramAuth = selectedClient?.accessToken && selectedClient?.instagramAccountId;

  const steps = [
    {
      label: 'Criar Story',
      description: 'Crie seu story com texto, emojis e outros elementos',
    },
    {
      label: 'Agendar Publicação',
      description: 'Defina quando seu story será publicado',
    }
  ];

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
            Criar Story
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Crie e agende stories para o Instagram dos seus clientes
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate('/create-post')}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: 3,
            py: 1
          }}
        >
          Criar Post
        </Button>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "horizontal"} sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
              <Typography variant="body2" color="text.secondary">{step.description}</Typography>
            </StepLabel>
            {isMobile && (
              <StepContent>
                {/* Conteúdo será renderizado abaixo */}
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>

      {/* Etapa 1: Criar Story */}
      {activeStep === 0 && (
        <Fade in={true} timeout={500}>
          <Box>
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
                      Esta conta não está conectada ao Instagram. Conecte-a antes de agendar stories.
                    </Alert>
                  )}
                </Card>
              )}
            </Paper>

            {/* Alert de limites de subscription */}
            <SubscriptionLimitsAlert type="post" />

            {/* Editor de Story */}
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
                <EditIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                  Editor de Story
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

              {story && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    color="error"
                    startIcon={<RestartIcon />}
                    onClick={() => {
                      setStory(null);
                      setEditorKey(prev => prev + 1);
                    }}
                    size="small"
                    sx={{ color: theme.palette.error.main }}
                  >
                    Começar de novo
                  </Button>
                </Box>
              )}

              <StoryEditor 
                key={editorKey}
                clientId={selectedClientId}
                onSave={handleStoryChange}
                initialStory={story || undefined}
              />

              {story && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setPreviewOpen(true)}
                    startIcon={<VisibilityIcon />}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    Visualizar
                  </Button>
                  
                  <Button 
                    variant="contained" 
                    endIcon={<ArrowForwardIcon />}
                    onClick={handleNext}
                    disabled={!story || !selectedClientId}
                    sx={{ 
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
                    Avançar para Agendamento
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Fade>
      )}

            {/* Etapa 2: Agendar */}
      {activeStep === 1 && (
        <Fade in={true} timeout={500}>
          <Box>
            {/* Informações do cliente selecionado */}
            {selectedClient && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  mb: 4, 
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={selectedClient.profilePicture || selectedClient.logoUrl} 
                    alt={selectedClient.name}
                    sx={{ width: 40, height: 40, mr: 2 }}
                  >
                    {selectedClient.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      Agendando para:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: '#E1306C' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        @{selectedClient.instagram}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {hasInstagramAuth ? (
                  <Chip 
                    icon={<CheckCircleIcon />}
                    label="Conta conectada" 
                    color="success" 
                    size="small"
                    variant="filled"
                  />
                ) : (
                  <Chip 
                    icon={<ErrorIcon />}
                    label="Conta não conectada" 
                    color="error" 
                    size="small"
                    variant="filled"
                  />
                )}
              </Paper>
            )}

            {/* Agendamento */}
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
              <DateTimePicker scheduledDate={scheduledDate} onChange={handleDateChange} />

              {/* Informações sobre o story */}
              {story && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
                    📱 Story Preview:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Imagens:</strong> {extractStoryImages(story).length} imagem(s)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Texto:</strong> {extractStoryCaption(story) || 'Sem texto'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Tipo:</strong> Story do Instagram
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: theme.palette.primary.main }}
                >
                  Voltar
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    startIcon={<SendIcon />}
                    onClick={handlePostNow}
                    disabled={postNowLoading || loading || !selectedClientId || !story || !hasInstagramAuth}
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
                    disabled={loading || postNowLoading || !selectedClientId || !story || !scheduledDate || !hasInstagramAuth}
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
                    {loading ? 'Agendando...' : 'Agendar Story'}
                  </Button>
                </Box>
              </Box>

              {selectedClient && !hasInstagramAuth && (
                <Alert 
                  severity="error" 
                  variant="outlined"
                  sx={{ mt: 3 }}
                  icon={<InfoIcon />}
                >
                  Esta conta não está conectada ao Instagram. Não é possível agendar ou publicar stories.
                  Por favor, conecte a conta nas configurações do cliente.
                </Alert>
              )}
            </Paper>
          </Box>
        </Fade>
      )}

                    {/* Modal de Prévia */}
  <Dialog
    open={previewOpen}
    onClose={() => setPreviewOpen(false)}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
      <StoryIcon sx={{ mr: 1, color: '#E1306C' }} />
      Prévia do Story
      {selectedClient && (
        <Chip
          size="small"
          label={`@${selectedClient.instagram}`}
          sx={{ ml: 1 }}
          variant="outlined"
        />
      )}
    </DialogTitle>
    <DialogContent>
      {story && (
        <Box 
          sx={{ 
            width: '100%',
            height: 600,
            mx: 'auto',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <StoryPreview story={story} />
        </Box>
      )}
    </DialogContent>
  </Dialog>

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

export default CreateStory;
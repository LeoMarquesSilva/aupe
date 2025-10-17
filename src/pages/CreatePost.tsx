import React, { useState, useEffect } from 'react';
import { clientService, postService } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Snackbar, 
  Alert, 
  Divider, 
  AppBar, 
  Toolbar,
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
  Stack,
  ButtonGroup,
  IconButton
} from '@mui/material';
import { 
  Add as AddIcon, 
  Instagram as InstagramIcon, 
  Schedule as ScheduleIcon, 
  Send as SendIcon,
  CalendarMonth as CalendarIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  VideoLibrary as StoryIcon
} from '@mui/icons-material';
import { Client, Post, PostImage } from '../types';
import ClientManager from '../components/ClientManager';
import ImageUploader from '../components/ImageUploader';
import CaptionEditor from '../components/CaptionEditor';
import DateTimePicker from '../components/DateTimePicker';
import { scheduleInstagramPost, uploadImagesToImgBB } from '../services/postService';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [images, setImages] = useState<PostImage[]>([]);
  const [caption, setCaption] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [postNowLoading, setPostNowLoading] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
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
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));


  useEffect(() => {
  const loadClients = async () => {
    try {
      const supabaseClients = await clientService.getClients();
      setClients(supabaseClients);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      showNotification('Erro ao carregar clientes', 'error');
    }
  };

  loadClients();
}, []);

  // Efeito para registrar quando as imagens mudam
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
    setImages([...newImages]); // Cria uma nova referência para garantir a atualização
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

  // Função para validar os dados antes do envio
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

    if (!caption) {
      showNotification('Adicione uma legenda para a postagem', 'warning');
      return false;
    }

    return true;
  };

  // Função para preparar os dados da postagem
  const preparePostData = (immediate = false) => {
    const selectedClient = getSelectedClient();
    if (!selectedClient) return null;

    return {
      clientId: selectedClientId,
      caption: caption,
      images: images.sort((a, b) => a.order - b.order).map(img => img.url),
      scheduledDate: immediate ? new Date().toISOString() : new Date(scheduledDate).toISOString(),
      immediate: immediate
    };
  };

  // Função para limpar o formulário após envio bem-sucedido
  const resetForm = () => {
    setImages([]);
    setCaption('');
    setScheduledDate('');
  };

  
const handleSubmit = async () => {
  if (!validatePostData()) return;
  
  if (!scheduledDate) {
    showNotification('Defina uma data para agendamento', 'warning');
    return;
  }

  setLoading(true);

  try {
    const selectedClient = getSelectedClient();
    if (!selectedClient) {
      showNotification('Cliente não encontrado', 'error');
      return;
    }

    // Primeiro, fazer upload de todas as imagens para o ImgBB
    showNotification('Enviando imagens...', 'info');
    
    console.log(`Preparando upload de ${images.length} imagens`);
    const imageUrls = await uploadImagesToImgBB(images);
    
    if (imageUrls.length === 0) {
      showNotification('Falha ao fazer upload das imagens', 'error');
      return;
    }
    
    if (imageUrls.length < images.length) {
      showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
    }
    
    // Preparar dados para envio com as URLs do ImgBB
    const postData = {
      clientId: selectedClientId,
      caption: caption,
      images: imageUrls, // Usar as URLs retornadas pelo ImgBB
      scheduledDate: new Date(scheduledDate).toISOString(),
      immediate: false,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    // Salvar no Supabase
    await postService.saveScheduledPost(postData);

    // Enviar para o webhook do N8N junto com as credenciais do cliente
    await scheduleInstagramPost(postData, selectedClient);

    // Limpar formulário após sucesso
    resetForm();

    showNotification('Postagem agendada com sucesso!', 'success');
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

    // Primeiro, fazer upload de todas as imagens para o ImgBB
    showNotification('Enviando imagens...', 'info');
    
    console.log(`Preparando upload de ${images.length} imagens`);
    const imageUrls = await uploadImagesToImgBB(images);
    
    if (imageUrls.length === 0) {
      showNotification('Falha ao fazer upload das imagens', 'error');
      return;
    }
    
    if (imageUrls.length < images.length) {
      showNotification(`Atenção: Apenas ${imageUrls.length} de ${images.length} imagens foram processadas`, 'warning');
    }
    
    // Preparar dados para envio com as URLs do ImgBB
    const postData = {
      clientId: selectedClientId,
      caption: caption,
      images: imageUrls, // Usar as URLs retornadas pelo ImgBB
      scheduledDate: new Date().toISOString(),
      immediate: true,
      status: 'posted',
      createdAt: new Date().toISOString()
    };

    // Salvar no Supabase
    await postService.saveScheduledPost(postData);

    // Enviar para o webhook do N8N junto com as credenciais do cliente
    await scheduleInstagramPost(postData, selectedClient);

    // Limpar formulário após sucesso
    resetForm();

    showNotification('Postagem enviada com sucesso!', 'success');
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

  const selectedClient = getSelectedClient();

  // Navegação principal
  const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, active: false },
    { label: 'Agendamento', icon: <CalendarIcon />, active: true },
    { label: 'Clientes', icon: <PersonIcon />, onClick: () => setClientDialogOpen(true), active: false },
    { label: 'Configurações', icon: <SettingsIcon />, active: false }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header moderno */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: '#fff', 
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ height: 70 }}>
            {/* Logo e nome da aplicação */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mr: 3
            }}>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  backgroundColor: '#E1306C', 
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5,
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                }}
              >
                <InstagramIcon sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography 
                  variant="h6" 
                  component="div" 
                  sx={{ 
                    fontWeight: 'bold', 
                    letterSpacing: '1px',
                    color: '#121212',
                    fontFamily: '"Montserrat", sans-serif',
                    lineHeight: 1.1
                  }}
                >
                  AUPE
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}
                >
                  Instagram Scheduler
                </Typography>
              </Box>
            </Box>

            {/* Menu para dispositivos móveis */}
            {isMobile ? (
              <IconButton 
                edge="end" 
                color="inherit" 
                aria-label="menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{ 
                  ml: 'auto',
                  color: '#121212'
                }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <>
                {/* Menu de navegação principal */}
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  height: '100%'
                }}>
                  {navigationItems.map((item, index) => (
                    <Box 
                      key={index}
                      onClick={item.onClick}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        px: 2.5,
                        cursor: 'pointer',
                        color: item.active ? '#121212' : 'text.secondary',
                        borderBottom: item.active ? '2px solid #121212' : 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.04)',
                          color: '#121212'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {!isMedium && (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                          {item.icon}
                        </Box>
                      )}
                      <Typography sx={{ fontWeight: item.active ? 500 : 400 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Área do usuário */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  ml: 2
                }}>
                  <Button 
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setClientDialogOpen(true)}
                    sx={{ 
                      backgroundColor: '#121212',
                      '&:hover': {
                        backgroundColor: '#333'
                      },
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 2
                    }}
                  >
                    Novo Cliente
                  </Button>
                  <Avatar 
                    sx={{ 
                      ml: 2, 
                      width: 36, 
                      height: 36,
                      bgcolor: 'primary.main',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    A
                  </Avatar>
                </Box>
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Menu mobile expandido */}
      {isMobile && mobileMenuOpen && (
        <Box sx={{ 
          backgroundColor: '#fff', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }}>
          {navigationItems.map((item, index) => (
            <Box 
              key={index}
              onClick={() => {
                if (item.onClick) item.onClick();
                setMobileMenuOpen(false);
              }}
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                p: 2,
                cursor: 'pointer',
                color: item.active ? '#121212' : 'text.secondary',
                borderLeft: item.active ? '4px solid #121212' : '4px solid transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: '#121212'
                }
              }}
            >
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>
              <Typography sx={{ fontWeight: item.active ? 500 : 400 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

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
          
          {/* Botão para criar stories */}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<StoryIcon />}
            onClick={handleCreateStory}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Criar Story
          </Button>
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
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              Cliente
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              onClick={() => setClientDialogOpen(true)}
              size="small"
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
                        src={client.logoUrl} 
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
                        <Avatar 
                          src={client.logoUrl} 
                          alt={client.name}
                          sx={{ width: 24, height: 24 }}
                        >
                          {client.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={client.name} 
                        secondary={`@${client.instagram}`} 
                        primaryTypographyProps={{ variant: 'body1' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

          {selectedClient && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2, 
              borderRadius: 1, 
              bgcolor: 'rgba(0,0,0,0.02)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <Avatar 
                src={selectedClient.logoUrl} 
                alt={selectedClient.name}
                sx={{ width: 48, height: 48, mr: 2 }}
              >
                {selectedClient.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedClient.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    @{selectedClient.instagram}
                  </Typography>
                </Box>
              </Box>
            </Box>
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
          </Box>

          <ImageUploader 
            images={images} 
            onChange={handleImagesChange} 
            caption={caption}
            clientName={selectedClient?.name || 'Cliente'}
            clientUsername={selectedClient?.instagram || 'cliente'}
          />
          
          <Divider sx={{ my: 4 }} />
          
          <CaptionEditor caption={caption} onChange={handleCaptionChange} />
          
          <Divider sx={{ my: 4 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ScheduleIcon sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6">
              Agendamento
            </Typography>
          </Box>
          
          <DateTimePicker scheduledDate={scheduledDate} onChange={handleDateChange} />

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            {/* Botão para postar agora */}
            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<SendIcon />}
              onClick={handlePostNow}
              disabled={postNowLoading || loading || !selectedClientId || images.length === 0}
              sx={{ 
                px: 4, 
                py: 1.5, 
                borderRadius: 2,
                borderColor: '#121212',
                color: '#121212',
                '&:hover': {
                  backgroundColor: 'rgba(18,18,18,0.04)',
                  borderColor: '#000'
                }
              }}
            >
              {postNowLoading ? 'Enviando...' : 'Postar Agora'}
            </Button>

            {/* Botão para agendar */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<ScheduleIcon />}
              onClick={handleSubmit}
              disabled={loading || postNowLoading || !selectedClientId || images.length === 0 || !scheduledDate}
              sx={{ 
                px: 4, 
                py: 1.5, 
                borderRadius: 2,
                backgroundColor: '#121212',
                '&:hover': {
                  backgroundColor: '#333'
                }
              }}
            >
              {loading ? 'Agendando...' : 'Agendar Postagem'}
            </Button>
          </Box>
        </Paper>
      </Container>

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

      {/* FAB para mobile */}
      {isMobile && (
        <Fab 
          color="primary" 
          aria-label="add-client" 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            backgroundColor: '#121212',
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
    </Box>
  );
};

export default CreatePost;
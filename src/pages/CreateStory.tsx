import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Chip,
  Alert,
  Breadcrumbs,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Card,
  CardContent,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import { 
  DateTimePicker 
} from '@mui/x-date-pickers/DateTimePicker';
import { 
  LocalizationProvider 
} from '@mui/x-date-pickers/LocalizationProvider';
import { 
  AdapterDateFns 
} from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { 
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Instagram as InstagramIcon,
  RestartAlt as RestartIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  CalendarMonth as CalendarIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Add as AddIcon
} from '@mui/icons-material';
import StoryEditor from '../components/StoryEditor';
import StoryPreview from '../components/StoryPreview';
import { Story, Client } from '../types';
import { clientService } from '../services/supabaseClient';

const CreateStory: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  // Chave para forçar o remonte do componente StoryEditor
  const [editorKey, setEditorKey] = useState<number>(0);
  
  // Estados para gerenciar clientes
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Carregar clientes ao iniciar
  useEffect(() => {
    const loadClients = async () => {
      try {
        const supabaseClients = await clientService.getClients();
        setClients(supabaseClients);
        if (supabaseClients.length > 0) {
          setSelectedClientId(supabaseClients[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
      }
    };

    loadClients();
  }, []);
  
  // Função para mostrar notificações
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Função para obter o cliente selecionado
  const getSelectedClient = (): Client | undefined => {
    return clients.find(client => client.id === selectedClientId);
  };

  const selectedClient = getSelectedClient();
  const hasInstagramAuth = selectedClient?.accessToken && selectedClient?.instagramAccountId;

  // Função para salvar o story
  const handleSaveStory = (newStory: Story) => {
    // Atualizar o story com o ID do cliente selecionado
    const updatedStory = {
      ...newStory,
      clientId: selectedClientId
    };
    
    setStory(updatedStory);
    console.log('Story salvo:', updatedStory);
  };
  
  // Função para agendar o story
  const handleScheduleStory = () => {
    if (!story || !scheduledDate || !selectedClientId) {
      showNotification('Selecione um cliente e defina uma data para agendamento', 'warning');
      return;
    }
    
    if (!hasInstagramAuth) {
      showNotification('Esta conta não está conectada ao Instagram', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    const scheduledStory: Story = {
      ...story,
      clientId: selectedClientId,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled'
    };
    
    // Simulando uma chamada de API
    setTimeout(() => {
      setStory(scheduledStory);
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Aqui você pode adicionar a lógica para salvar no banco de dados
      console.log('Story agendado:', scheduledStory);
      
      showNotification('Story agendado com sucesso!', 'success');
      
      // Reset após 3 segundos
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }, 1500);
  };
  
  const handleNext = () => {
    if (activeStep === 0 && !selectedClientId) {
      showNotification('Selecione um cliente antes de continuar', 'warning');
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Função para resetar o editor e começar de novo
  const handleReset = () => {
    setStory(null);
    setResetConfirmOpen(false);
    // Incrementamos a chave para forçar o remonte do componente
    setEditorKey(prev => prev + 1);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleAddClient = async (client: Client) => {
    setSelectedClientId(client.id);
    setClientDialogOpen(false);
  };
  
  const steps = [
    {
      label: 'Criar Story',
      description: 'Crie seu story com texto, emojis e outros elementos',
      content: (
        <Box sx={{ mt: 2 }}>
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
                        src={client.logoUrl || client.profilePicture} 
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
                            src={client.logoUrl || client.profilePicture} 
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

            {/* Card de conta selecionada com status de conexão */}
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

          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EditIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
            <Typography variant="h6">
              Editor de Story
            </Typography>
            
            {/* Indicador de conta selecionada */}
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
                onClick={() => setResetConfirmOpen(true)}
                size="small"
                sx={{ color: theme.palette.error.main }}
              >
                Começar de novo
              </Button>
            </Box>
          )}
          
          <StoryEditor 
            key={editorKey} // Isso força o componente a remontar quando a chave muda
            clientId={selectedClientId} // Usa o ID do cliente selecionado
            onSave={handleSaveStory}
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
                  color: '#ffffff',
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Avançar para Agendamento
              </Button>
            </Box>
          )}
        </Box>
      )
    },
    {
      label: 'Agendar Publicação',
      description: 'Defina quando seu story será publicado',
      content: (
        <Box sx={{ mt: 2 }}>
          {/* Exibe a conta selecionada no topo da etapa de agendamento */}
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
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isTablet ? 'column' : 'row', 
            gap: 3,
            alignItems: 'stretch'
          }}>
            {/* Painel de Agendamento */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                flex: 1,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                Agendamento
              </Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DateTimePicker
                  label="Data e Hora de Publicação"
                  value={scheduledDate}
                  onChange={(newValue) => setScheduledDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                      sx: { mb: 2 }
                    }
                  }}
                />
              </LocalizationProvider>
              
              {scheduledDate && (
                <Box sx={{ mb: 3 }}>
                  <Chip 
                    label={`Será publicado em ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm")}`} 
                    color="primary" 
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(25, 118, 210, 0.7)',
                      color: 'rgba(0, 0, 0, 0.87)', // Texto escuro para melhor contraste
                      fontWeight: 'medium',
                      backgroundColor: 'rgba(25, 118, 210, 0.08)' // Fundo azul claro para melhor contraste
                    }}
                  />
                </Box>
              )}
              
              <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: theme.palette.primary.main }}
                >
                  Voltar
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleScheduleStory}
                  disabled={isSubmitting || isSuccess || !scheduledDate || !hasInstagramAuth}
                  startIcon={isSubmitting ? null : isSuccess ? <CheckCircleIcon /> : <InstagramIcon />}
                  sx={{ 
                    color: '#ffffff',
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {isSubmitting ? 'Agendando...' : isSuccess ? 'Agendado!' : 'Agendar Story'}
                </Button>
              </Box>
              
              {/* Aviso caso a conta não esteja conectada */}
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
            
            {/* Prévia */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                width: isTablet ? '100%' : '300px',
                borderRadius: 2,
                bgcolor: '#fafafa'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <VisibilityIcon sx={{ mr: 1 }} />
                Prévia
              </Typography>
              
              {selectedClient && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={selectedClient.profilePicture || selectedClient.logoUrl}
                    alt={selectedClient.name}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  >
                    {selectedClient.name.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    @{selectedClient.instagram}
                  </Typography>
                </Box>
              )}
              
              <Box 
                sx={{ 
                  width: '100%',
                  height: 534, // Proporção 9:16
                  mx: 'auto',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {story && <StoryPreview story={story} />}
              </Box>
            </Paper>
          </Box>
        </Box>
      )
    }
  ];
  
  return (
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
        <Link to="/calendar" style={{ display: 'flex', alignItems: 'center', color: theme.palette.text.secondary, textDecoration: 'none' }}>
          <CalendarIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Calendário
        </Link>
        <Typography
          sx={{ display: 'flex', alignItems: 'center' }}
          color="text.primary"
        >
          <EditIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Criar Story
        </Typography>
      </Breadcrumbs>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          bgcolor: theme.palette.background.default,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InstagramIcon sx={{ mr: 2, color: '#E1306C', fontSize: 28 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Criar Story
            </Typography>
            {selectedClient && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                Para: <b>@{selectedClient.instagram}</b>
              </Typography>
            )}
          </Box>
        </Box>
        
        <Chip 
          label={activeStep === 0 ? "Editando" : "Agendando"} 
          color="primary" 
          variant={activeStep === 0 ? "outlined" : "filled"}
          sx={{ 
            // Melhorando o contraste do chip "Editando"
            ...(activeStep === 0 ? {
              borderColor: 'rgba(25, 118, 210, 0.7)',
              color: 'rgba(0, 0, 0, 0.87)', // Texto escuro para melhor contraste
              backgroundColor: 'rgba(25, 118, 210, 0.08)', // Fundo azul claro para melhor contraste
              fontWeight: 'medium'
            } : {
              color: '#ffffff', // Garantindo contraste para o texto no chip preenchido
              fontWeight: 'medium'
            })
          }}
        />
      </Paper>
      
      <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "horizontal"} sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
              {isMobile && <Typography variant="body2" color="text.secondary">{step.description}</Typography>}
            </StepLabel>
            {isMobile && <StepContent>{step.content}</StepContent>}
          </Step>
        ))}
      </Stepper>
      
      {!isMobile && (
        <Fade in={true} timeout={500}>
          <Box>
            {steps[activeStep].content}
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
          <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
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
            <Zoom in={previewOpen}>
              <Box 
                sx={{ 
                  width: '100%',
                  height: 600, // Proporção 9:16
                  mx: 'auto',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <StoryPreview story={story} />
              </Box>
            </Zoom>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPreviewOpen(false)}
            sx={{ color: theme.palette.primary.main }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de confirmação para resetar */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Começar de novo?
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Você perderá todas as alterações feitas neste story. Esta ação não pode ser desfeita.
          </Alert>
          <Typography>
            Tem certeza que deseja começar um novo story do zero?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResetConfirmOpen(false)}
            variant="outlined"
            sx={{ color: theme.palette.primary.main }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReset}
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ 
              color: '#ffffff',
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            Começar de novo
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateStory;
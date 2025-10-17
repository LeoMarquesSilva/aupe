import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Chip,
  Alert,
  AppBar,
  Toolbar,
  Breadcrumbs
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
  AddPhotoAlternate as AddPhotoIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import StoryEditor from '../components/StoryEditor';
import StoryPreview from '../components/StoryPreview';
import Header from '../components/Header';
import { Story } from '../types';

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
  // Chave para forçar o remonte do componente StoryEditor
  const [editorKey, setEditorKey] = useState<number>(0);
  
  // Função para salvar o story
  const handleSaveStory = (newStory: Story) => {
    setStory(newStory);
    
    // Aqui você pode adicionar a lógica para salvar no banco de dados
    console.log('Story salvo:', newStory);
  };
  
  // Função para agendar o story
  const handleScheduleStory = () => {
    if (!story || !scheduledDate) return;
    
    setIsSubmitting(true);
    
    const scheduledStory: Story = {
      ...story,
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
      
      // Reset após 3 segundos
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }, 1500);
  };
  
  const handleNext = () => {
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
  
  const steps = [
    {
      label: 'Criar Story',
      description: 'Crie seu story com texto, emojis e outros elementos',
      content: (
        <Box sx={{ mt: 2 }}>
          {story && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<RestartIcon />}
                onClick={() => setResetConfirmOpen(true)}
                size="small"
              >
                Começar de novo
              </Button>
            </Box>
          )}
          
          <StoryEditor 
            key={editorKey} // Isso força o componente a remontar quando a chave muda
            clientId="client-id" // Substitua pelo ID do cliente selecionado
            onSave={handleSaveStory}
            initialStory={story || undefined}
          />
          
          {story && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                onClick={() => setPreviewOpen(true)}
                startIcon={<VisibilityIcon />}
              >
                Visualizar
              </Button>
              
              <Button 
                variant="contained" 
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
                disabled={!story}
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
                  />
                </Box>
              )}
              
              <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Voltar
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleScheduleStory}
                  disabled={isSubmitting || isSuccess || !scheduledDate}
                  startIcon={isSubmitting ? null : isSuccess ? <CheckCircleIcon /> : <InstagramIcon />}
                >
                  {isSubmitting ? 'Agendando...' : isSuccess ? 'Agendado!' : 'Agendar Story'}
                </Button>
              </Box>
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
          <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <InstagramIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            Criar Story
          </Typography>
          
          <Chip 
            label={activeStep === 0 ? "Editando" : "Agendando"} 
            color="primary" 
            variant={activeStep === 0 ? "outlined" : "filled"}
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
            <InstagramIcon sx={{ mr: 1 }} />
            Prévia do Story
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
            <Button onClick={() => setPreviewOpen(false)}>
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
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReset}
              variant="contained" 
              color="error"
              startIcon={<DeleteIcon />}
            >
              Começar de novo
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default CreateStory;
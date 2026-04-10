import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  Breadcrumbs
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Story } from '../types';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

const EditStory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        // Aqui você implementaria a lógica real para buscar o story pelo ID
        // const storyData = await postService.getStoryById(id);
        // setStory(storyData);
        
        // Por enquanto, apenas simular um carregamento
        setTimeout(() => {
          setStory({
            id: id || '',
            clientId: 'placeholder-client-id',
            image: {
              id: 'preview',
              url: 'https://via.placeholder.com/1080x1920',
              width: 1080,
              height: 1920,
              aspectRatio: 9/16
            },
            elements: [],
            scheduledDate: new Date().toISOString(),
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            duration: 15
          });
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Erro ao carregar story:', err);
        setError('Não foi possível carregar os dados do story. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: 4 }}>
        {/* Breadcrumbs de navegação */}
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
          sx={{ mb: 3 }}
        >
          <Button 
            component="a"
            onClick={() => navigate('/')}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none' 
            }}
            startIcon={<HomeIcon fontSize="small" />}
          >
            Início
          </Button>
          <Button
            component="a"
            onClick={() => navigate('/story-calendar')}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none' 
            }}
          >
            Calendário de Conteúdo
          </Button>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <EditIcon sx={{ mr: 0.5 }} fontSize="small" />
            Editar Story
          </Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: GLASS.text.heading }}>
          Editar Story
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{
            p: 3,
            bgcolor: 'error.light',
            color: 'error.contrastText',
            borderRadius: GLASS.radius.card,
          }}>
            <Typography>{error}</Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/story-calendar')}
              sx={{
                mt: 2,
                borderRadius: GLASS.radius.button,
                backgroundColor: GLASS.accent.orange,
                '&:hover': { backgroundColor: GLASS.accent.orangeDark },
              }}
              startIcon={<ArrowBackIcon />}
            >
              Voltar ao Calendário
            </Button>
          </Paper>
        ) : (
          <Paper sx={{
            p: 3,
            background: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            borderRadius: GLASS.radius.card,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}>
            <Typography variant="body1" sx={{ mb: 3, color: GLASS.text.body }}>
              Página de edição em desenvolvimento. ID do Story: {id}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/story-calendar')}
              startIcon={<ArrowBackIcon />}
              sx={{
                borderRadius: GLASS.radius.button,
                backgroundColor: GLASS.accent.orange,
                boxShadow: GLASS.shadow.button,
                '&:hover': {
                  backgroundColor: GLASS.accent.orangeDark,
                  boxShadow: GLASS.shadow.buttonHover,
                },
              }}
            >
              Voltar ao Calendário
            </Button>
          </Paper>
        )}
      </Container>
  );
};

export default EditStory;
import React, { useState, useEffect } from 'react';
import { clientService, postService } from '../services/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Alert, 
  Divider, 
  Avatar,
  useTheme,
  useMediaQuery,
  Chip,
  Card,
  CardContent,
  Badge,
  Tooltip,
  Stack,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Instagram as InstagramIcon, 
  Schedule as ScheduleIcon, 
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  ViewCarousel as CarouselIcon
} from '@mui/icons-material';
import { Client, PostImage, ScheduledPost, ReelVideo } from '../types';
import ImageUploader from '../components/ImageUploader';
import VideoUploader from '../components/VideoUploader';
import CaptionEditor from '../components/CaptionEditor';
import DateTimePicker from '../components/DateTimePicker';
import AppSnackbar from '../components/AppSnackbar';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { uploadImagesToSupabaseStorage } from '../services/postService';
import { supabaseVideoStorageService } from '../services/supabaseVideoStorageService';

const EditPost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [post, setPost] = useState<ScheduledPost | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Estados do formulário
  const [images, setImages] = useState<PostImage[]>([]);
  const [video, setVideo] = useState<ReelVideo | null>(null);
  const [coverImage, setCoverImage] = useState<PostImage[]>([]);
  const [caption, setCaption] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [shareToFeed, setShareToFeed] = useState<boolean>(true);
  
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Carregar post existente
  useEffect(() => {
    const loadPost = async () => {
      if (!postId) {
        showNotification('ID do post não fornecido', 'error');
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Buscar todos os posts e encontrar o específico
        const allPosts = await postService.getScheduledPostsWithClient();
        const foundPost = allPosts.find(p => p.id === postId);
        
        if (!foundPost) {
          showNotification('Post não encontrado', 'error');
          navigate('/');
          return;
        }

        setPost(foundPost);
        
        // Carregar dados do cliente
        if (foundPost.clientId) {
          const clientData = await clientService.getClientById(foundPost.clientId);
          if (clientData) {
            setClient(clientData);
          }
        }

        // Preencher formulário com dados existentes
        if (foundPost.postType === 'reels' && foundPost.video) {
          // Para Reels, carregar vídeo
          // Converter URL do vídeo para ReelVideo
          const videoUrl = typeof foundPost.video === 'string' ? foundPost.video : foundPost.video;
          const reelVideo: ReelVideo = {
            id: `existing-video-${foundPost.id}`,
            url: videoUrl,
            publicUrl: videoUrl,
            path: videoUrl,
            fileName: videoUrl.split('/').pop() || 'video.mp4',
            file: undefined,
            size: 0,
            duration: 0,
            width: 1080,
            height: 1920,
            aspectRatio: 9/16,
            format: 'video/mp4'
          };
          setVideo(reelVideo);
        } else if (foundPost.images && foundPost.images.length > 0) {
          // Para posts/carrosséis, carregar imagens
          const imageArray: PostImage[] = foundPost.images.map((img, index) => {
            const url = typeof img === 'string' ? img : img.url;
            return {
              id: `existing-${index}`,
              url: url,
              order: index,
              file: undefined
            };
          });
          setImages(imageArray);
        }

        // Carregar capa do Reel se existir
        if (foundPost.coverImage) {
          setCoverImage([{
            id: 'cover-existing',
            url: foundPost.coverImage,
            order: 0,
            file: undefined
          }]);
        }

        setCaption(foundPost.caption || '');
        setScheduledDate(foundPost.scheduledDate || '');
        setShareToFeed(foundPost.shareToFeed ?? true);

      } catch (error) {
        console.error('Erro ao carregar post:', error);
        showNotification('Erro ao carregar post', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, navigate]);

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

  const canEdit = () => {
    if (!post) return false;
    // Não pode editar posts já publicados ou em processamento
    const nonEditableStatuses: string[] = ['posted', 'processing'];
    return !nonEditableStatuses.includes(post.status);
  };

  const validateForm = () => {
    if (!post) {
      showNotification('Post não encontrado', 'error');
      return false;
    }

    if (post.postType === 'reels') {
      if (!video) {
        showNotification('Adicione um vídeo para o Reel', 'warning');
        return false;
      }
    } else {
      if (images.length === 0) {
        showNotification('Adicione pelo menos uma imagem', 'warning');
        return false;
      }
    }

    if (!caption.trim()) {
      showNotification('Adicione uma legenda', 'warning');
      return false;
    }

    if (!scheduledDate) {
      showNotification('Defina uma data e hora para agendamento', 'warning');
      return false;
    }

    // Validar se a data é no futuro (se não for imediato)
    const scheduledDateTime = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduledDateTime <= now && !post.immediate) {
      showNotification('A data/hora deve ser no futuro', 'warning');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !post || !canEdit()) {
      return;
    }

    setSaving(true);

    try {
      showNotification('Salvando alterações...', 'info');

      let processedImages: string[] = [];
      let processedVideo: string | undefined;
      let processedCoverImage: string | undefined;

      // Processar imagens (para posts e carrosséis)
      if (post.postType !== 'reels' && images.length > 0) {
        // Verificar se há novas imagens para fazer upload
        const newImages = images.filter(img => img.file);
        const existingImages = images.filter(img => !img.file);

        if (newImages.length > 0) {
          const uploadedUrls = await uploadImagesToSupabaseStorage(newImages);
          processedImages = [
            ...existingImages.map(img => img.url),
            ...uploadedUrls
          ];
        } else {
          processedImages = existingImages.map(img => img.url);
        }
      }

      // Processar vídeo (para Reels)
      if (post.postType === 'reels' && video) {
        if (video.file) {
          // Novo vídeo - fazer upload
          const uploadResult = await supabaseVideoStorageService.uploadVideo(
            video.file,
            post.clientId
          );
          processedVideo = uploadResult.publicUrl;
        } else if (video.publicUrl) {
          // Vídeo existente - usar URL atual
          processedVideo = video.publicUrl;
        }
      }

      // Processar capa do Reel
      if (post.postType === 'reels' && coverImage.length > 0) {
        const cover = coverImage[0];
        if (cover.file) {
          const uploadedUrls = await uploadImagesToSupabaseStorage([cover]);
          processedCoverImage = uploadedUrls[0];
        } else {
          processedCoverImage = cover.url;
        }
      }

      // Preparar dados de atualização
      const updateData: any = {
        caption,
        scheduledDate,
        shareToFeed: post.postType === 'reels' ? shareToFeed : undefined,
      };

      if (post.postType === 'reels') {
        if (processedVideo) {
          updateData.video = processedVideo;
        }
        if (processedCoverImage) {
          updateData.coverImage = processedCoverImage;
        }
      } else {
        if (processedImages.length > 0) {
          updateData.images = processedImages;
        }
        // Atualizar tipo de post baseado no número de imagens
        if (processedImages.length > 1) {
          updateData.postType = 'carousel';
        } else {
          updateData.postType = 'post';
        }
      }

      // Se a data mudou para o passado, marcar como imediato
      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();
      if (scheduledDateTime <= now) {
        updateData.immediate = true;
      }

      // Ao reagendar para uma data futura, voltar status para 'pending' para o cron processar de novo
      const wasAlreadySentOrFailed = post.status === 'sent_to_n8n' || post.status === 'failed';
      if (wasAlreadySentOrFailed && scheduledDateTime > now) {
        updateData.status = 'pending';
        updateData.errorMessage = null;
        updateData.retryCount = 0;
      }

      // Atualizar post
      await postService.updateScheduledPost(post.id, updateData);

      showNotification('Post atualizado com sucesso!', 'success');
      
      // Redirecionar após 1 segundo
      setTimeout(() => {
        if (post.clientId) {
          navigate(`/client/${post.clientId}`);
        } else {
          navigate('/');
        }
      }, 1000);

    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error);
      showNotification(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getPostTypeIcon = () => {
    if (!post) return <ImageIcon />;
    switch (post.postType) {
      case 'reels':
        return <VideoIcon />;
      case 'carousel':
        return <CarouselIcon />;
      case 'stories':
        return <ImageIcon />;
      default:
        return <ImageIcon />;
    }
  };

  const getPostTypeLabel = () => {
    if (!post) return 'Post';
    switch (post.postType) {
      case 'reels':
        return 'Reel';
      case 'carousel':
        return 'Carrossel';
      case 'stories':
        return 'Story';
      default:
        return 'Post';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'sent_to_n8n':
        return 'info';
      case 'processing':
        return 'primary';
      case 'posted':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Agendado';
      case 'sent_to_n8n':
        return 'Enviado';
      case 'processing':
        return 'Processando';
      case 'posted':
        return 'Publicado';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Post não encontrado</Alert>
      </Container>
    );
  }

  const editable = canEdit();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none' }}
          >
            Voltar
          </Button>
          <Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold',
              fontFamily: '"Montserrat", sans-serif',
              color: '#121212',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              {getPostTypeIcon()}
              Editar {getPostTypeLabel()}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Atualize as informações do post agendado
            </Typography>
          </Box>
        </Box>
        
        <Stack direction="row" spacing={1}>
          <Chip 
            label={getStatusLabel(post.status)}
            color={getStatusColor(post.status) as any}
            size="small"
          />
          {!editable && (
            <Chip 
              label="Não editável"
              color="error"
              size="small"
              icon={<ErrorIcon />}
            />
          )}
        </Stack>
      </Box>

      {/* Alerta se não puder editar */}
      {!editable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Este post não pode ser editado porque já foi publicado ou está em processamento.
        </Alert>
      )}

      {/* Informações do Cliente */}
      {client && (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge 
              color={client.accessToken ? "success" : "error"} 
              overlap="circular"
              badgeContent={client.accessToken ? <CheckCircleIcon fontSize="small" /> : <ErrorIcon fontSize="small" />}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
            >
              <Avatar 
                src={client.profilePicture || client.logoUrl} 
                alt={client.name}
                sx={{ width: 56, height: 56 }}
              >
                {client.name.charAt(0)}
              </Avatar>
            </Badge>
            
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                {client.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <InstagramIcon sx={{ fontSize: 16, color: '#E1306C' }} />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  @{client.instagram}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Formulário de Edição */}
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
            Editar Conteúdo
          </Typography>
        </Box>

        {/* Upload de Mídia baseado no tipo */}
        {post.postType === 'reels' ? (
          <>
            <VideoUploader
              video={video}
              onChange={setVideo}
              disabled={!editable}
            />
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Imagem de Capa (Opcional)
              </Typography>
              <ImageUploader
                images={coverImage}
                onChange={setCoverImage}
                maxImages={1}
                disabled={!editable}
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={shareToFeed}
                    onChange={(e) => setShareToFeed(e.target.checked)}
                    disabled={!editable}
                  />
                }
                label="Compartilhar no feed"
              />
            </Box>
          </>
        ) : (
          <ImageUploader 
            images={images} 
            onChange={setImages}
            caption={caption}
            clientName={client?.name || 'Cliente'}
            clientUsername={client?.instagram || 'cliente'}
            disabled={!editable}
          />
        )}

        <Divider sx={{ my: 4 }} />
        
        <CaptionEditor 
          caption={caption} 
          onChange={setCaption}
          disabled={!editable}
        />
        
        <Divider sx={{ my: 4 }} />
        
        <DateTimePicker 
          scheduledDate={scheduledDate} 
          onChange={setScheduledDate}
          disabled={!editable}
        />

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !editable}
            sx={{ 
              textTransform: 'none',
              backgroundColor: '#121212',
              '&:hover': {
                backgroundColor: '#333'
              }
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Box>
      </Paper>

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

export default EditPost;

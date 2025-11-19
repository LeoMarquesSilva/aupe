import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as ViewCarouselIcon,
  Send as SendIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface ScheduledPost {
  id: string;
  caption: string;
  images: string[];
  scheduled_date: string;
  status: 'pending' | 'sent_to_n8n' | 'processing' | 'published' | 'failed' | 'cancelled';
  created_at: string;
  post_type?: 'post' | 'carousel' | 'reels' | 'stories';
  video?: string;
}

interface ScheduledPostsListProps {
  posts: ScheduledPost[];
  onEditPost: (post: ScheduledPost) => void;
  onDeletePost: (postId: string) => void;
}

const ScheduledPostsList: React.FC<ScheduledPostsListProps> = ({
  posts,
  onEditPost,
  onDeletePost
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'sent_to_n8n':
        return 'info';
      case 'processing':
        return 'primary';
      case 'published':
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
      case 'published':
        return 'Publicado';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon fontSize="small" />;
      case 'sent_to_n8n':
        return <SendIcon fontSize="small" />;
      case 'processing':
        return <SyncIcon fontSize="small" />;
      case 'published':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getMediaTypeIcon = (post: ScheduledPost) => {
    if (post.video) {
      return <VideoIcon fontSize="small" color="action" />;
    } else if (post.images && post.images.length > 1) {
      return <ViewCarouselIcon fontSize="small" color="action" />;
    } else {
      return <ImageIcon fontSize="small" color="action" />;
    }
  };

  const getMediaTypeLabel = (post: ScheduledPost) => {
    if (post.post_type === 'reels') {
      return 'Reels';
    } else if (post.post_type === 'stories') {
      return 'Stories';
    } else if (post.images && post.images.length > 1) {
      return `Carrossel (${post.images.length} imagens)`;
    } else if (post.video) {
      return 'Vídeo';
    } else {
      return 'Imagem';
    }
  };

  const formatScheduledDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (posts.length === 0) {
    return (
      <Alert severity="info">
        Não há posts agendados para este cliente.
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {posts.map((post) => (
        <Grid item xs={12} sm={6} md={4} key={post.id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {post.images && post.images.length > 0 && (
              <CardMedia
                component="img"
                height="200"
                image={post.images[0]}
                alt={post.caption}
                sx={{ objectFit: 'cover' }}
              />
            )}
            
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Chip 
                  label={getStatusLabel(post.status)}
                  color={getStatusColor(post.status) as any}
                  size="small"
                  icon={getStatusIcon(post.status)}
                />
                <Box>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEditPost(post)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton size="small" onClick={() => onDeletePost(post.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2, height: 60, overflow: 'hidden' }}>
                {post.caption && post.caption.length > 100 
                  ? `${post.caption.substring(0, 100)}...` 
                  : post.caption || 'Sem legenda'}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatScheduledDate(post.scheduled_date)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getMediaTypeIcon(post)}
                <Typography variant="caption" color="text.secondary">
                  {getMediaTypeLabel(post)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ScheduledPostsList;
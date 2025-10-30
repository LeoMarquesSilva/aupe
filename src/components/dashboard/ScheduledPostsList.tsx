import React from 'react';
import {
  Grid,
  Paper,
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
  ViewCarousel as ViewCarouselIcon
} from '@mui/icons-material';

interface ScheduledPost {
  id: string;
  caption: string;
  images: string[];
  scheduled_date: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  created_at: string;
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
      case 'draft':
        return 'default';
      case 'scheduled':
        return 'primary';
      case 'posted':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendado';
      case 'posted':
        return 'Publicado';
      case 'failed':
        return 'Falhou';
      default:
        return status;
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
                  : post.caption}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatScheduledDate(post.scheduled_date)}
                </Typography>
              </Box>
              
              {post.images && post.images.length > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <ViewCarouselIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {post.images.length} imagens
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ScheduledPostsList;
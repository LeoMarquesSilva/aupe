import React, { useState, useMemo } from 'react';
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
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Divider
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
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface ScheduledPost {
  id: string;
  caption: string;
  images: string[];
  scheduled_date: string;
  status: 'pending' | 'sent_to_n8n' | 'processing' | 'published' | 'posted' | 'failed' | 'cancelled';
  created_at: string;
  post_type?: 'post' | 'carousel' | 'reels' | 'stories';
  video?: string;
  user_id?: string;
  profiles?: {
    id: string;
    email: string;
    full_name?: string;
  };
  posted_at?: string;
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
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'sent_to_n8n':
        return 'info';
      case 'processing':
        return 'primary';
      case 'published':
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
      case 'published':
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon fontSize="small" />;
      case 'sent_to_n8n':
        return <SendIcon fontSize="small" />;
      case 'processing':
        return <SyncIcon fontSize="small" />;
      case 'published':
      case 'posted':
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
      return <VideoIcon fontSize="small" />;
    } else if (post.images && post.images.length > 1) {
      return <ViewCarouselIcon fontSize="small" />;
    } else {
      return <ImageIcon fontSize="small" />;
    }
  };

  const getMediaTypeLabel = (post: ScheduledPost) => {
    if (post.post_type === 'reels') {
      return 'Reels';
    } else if (post.post_type === 'stories') {
      return 'Stories';
    } else if (post.images && post.images.length > 1) {
      return 'Carrossel';
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

  // Filtrar posts
  const filteredPosts = useMemo(() => {
    if (filter === 'all') return posts;
    if (filter === 'scheduled') {
      return posts.filter(p => p.status === 'pending' || p.status === 'sent_to_n8n' || p.status === 'processing');
    }
    if (filter === 'published') {
      return posts.filter(p => p.status === 'published' || p.status === 'posted');
    }
    return posts;
  }, [posts, filter]);

  if (posts.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Não há posts agendados para este cliente.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filtros */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Posts Agendados
        </Typography>
        
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, newFilter) => {
            if (newFilter) setFilter(newFilter);
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.75,
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              },
              '&:not(.Mui-selected)': {
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }
            }
          }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="scheduled">Agendados</ToggleButton>
          <ToggleButton value="published">Publicados</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Cards */}
      <Grid container spacing={2}>
        {filteredPosts.map((post) => {
          const imageUrl = Array.isArray(post.images) && post.images.length > 0 
            ? (typeof post.images[0] === 'string' 
                ? post.images[0] 
                : (post.images[0] as any)?.url || null)
            : null;
          
          const userName = post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Usuário';

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={post.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}>
                {/* Imagem */}
                {imageUrl && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={imageUrl}
                    alt={post.caption}
                    sx={{ 
                      objectFit: 'cover',
                      bgcolor: 'grey.100'
                    }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
                  {/* Status e Ações */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Chip 
                      label={getStatusLabel(post.status)}
                      color={getStatusColor(post.status) as any}
                      size="small"
                      icon={getStatusIcon(post.status)}
                      sx={{ 
                        fontSize: '0.6875rem',
                        height: 24,
                        fontWeight: 500
                      }}
                    />
                    <Box>
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small" 
                          onClick={() => onEditPost(post)}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small" 
                          onClick={() => onDeletePost(post.id)} 
                          color="error"
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  {/* Caption */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 1.5, 
                      minHeight: 40,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '0.8125rem',
                      color: 'text.secondary',
                      lineHeight: 1.4
                    }}
                  >
                    {post.caption || 'Sem legenda'}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Informações */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
                    {/* Tipo de mídia */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getMediaTypeIcon(post)}
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {getMediaTypeLabel(post)}
                      </Typography>
                    </Box>
                    
                    {/* Data agendada */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {formatScheduledDate(post.scheduled_date)}
                      </Typography>
                    </Box>
                    
                    {/* Data de publicação (se publicado) */}
                    {post.posted_at && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon fontSize="small" sx={{ color: 'success.main', fontSize: 14 }} />
                        <Typography variant="caption" color="success.main" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          Publicado em {formatScheduledDate(post.posted_at)}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Usuário que criou */}
                    {post.profiles && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 20, height: 20, bgcolor: 'primary.main', fontSize: '0.625rem' }}>
                          {userName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {userName}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ScheduledPostsList;

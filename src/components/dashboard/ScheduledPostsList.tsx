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
  Divider,
  Snackbar,
  Button,
  Checkbox,
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
  Person as PersonIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { imageUrlService } from '../../services/imageUrlService';

interface ScheduledPost {
  id: string;
  caption: string;
  images: string[];
  scheduled_date: string;
  status: 'pending' | 'sent_to_n8n' | 'processing' | 'published' | 'posted' | 'failed' | 'cancelled';
  created_at: string;
  post_type?: 'post' | 'carousel' | 'reels' | 'stories';
  video?: string;
  /** Capa do vídeo (reels); pode vir como cover_image do banco */
  coverImage?: string;
  cover_image?: string;
  user_id?: string;
  organization_id?: string;
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
  onRefreshPosts?: () => void | Promise<void>;
  /** When provided, enables selection and "Enviar para aprovação" for pending posts */
  onSendForApproval?: (postIds: string[]) => void;
}

const ScheduledPostsList: React.FC<ScheduledPostsListProps> = ({
  posts,
  onEditPost,
  onDeletePost,
  onRefreshPosts,
  onSendForApproval,
}) => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

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

  const pendingPosts = useMemo(() => filteredPosts.filter(p => p.status === 'pending'), [filteredPosts]);
  const canSelectForApproval = Boolean(onSendForApproval) && pendingPosts.length > 0;
  const selectedCount = selectedIds.size;

  const toggleSelect = (postId: string, isPending: boolean) => {
    if (!isPending) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleSendForApproval = () => {
    if (selectedCount === 0 || !onSendForApproval) return;
    onSendForApproval(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  if (posts.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Não há posts agendados para este cliente.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filtros e ação de aprovação */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={600}>
            Posts Agendados
          </Typography>
          {canSelectForApproval && (
            <Tooltip title="Gera um link para o cliente aprovar ou solicitar alterações depois.">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ThumbUpIcon />}
                  onClick={handleSendForApproval}
                  disabled={selectedCount === 0}
                >
                  Enviar para aprovação do cliente {selectedCount > 0 ? `(${selectedCount})` : ''}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
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
          const isReels = post.post_type === 'reels' || !!post.video;
          const coverUrl = post.coverImage || (post as any).cover_image || null;
          const imageUrl = !isReels && Array.isArray(post.images) && post.images.length > 0
            ? (typeof post.images[0] === 'string'
                ? post.images[0]
                : (post.images[0] as any)?.url || null)
            : null;
          const videoUrl = post.video || (isReels && Array.isArray(post.images) && post.images.length > 0 && typeof post.images[0] === 'string' ? post.images[0] : null);
          const thumbnailUrl = isReels
            ? (coverUrl ? imageUrlService.getPublicUrl(coverUrl) : null)
            : (imageUrl ? (imageUrlService.getPublicUrl(imageUrl) || imageUrl) : null);

          const userName = post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Usuário';
          const isPending = post.status === 'pending';
          const isSelected = selectedIds.has(post.id);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={post.id}>
              <Card sx={{ 
                position: 'relative',
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
                {/* Checkbox para aprovação (apenas posts pendentes) */}
                {canSelectForApproval && (
                  <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                    <Checkbox
                      checked={isSelected}
                      disabled={!isPending}
                      onChange={() => toggleSelect(post.id, isPending)}
                      size="small"
                      sx={{ bgcolor: 'background.paper', borderRadius: 0.5, p: 0.25 }}
                    />
                  </Box>
                )}
                {/* Imagem / capa do reel / frame do vídeo */}
                {thumbnailUrl && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={thumbnailUrl}
                    alt={post.caption}
                    sx={{ 
                      objectFit: 'cover',
                      bgcolor: 'grey.100'
                    }}
                  />
                )}
                {isReels && !thumbnailUrl && videoUrl && (
                  <Box
                    sx={{
                      height: 140,
                      bgcolor: 'grey.900',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <video
                      src={imageUrlService.getPublicUrl(videoUrl)}
                      muted
                      preload="metadata"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none'
                      }}
                      crossOrigin="anonymous"
                    />
                  </Box>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ScheduledPostsList;

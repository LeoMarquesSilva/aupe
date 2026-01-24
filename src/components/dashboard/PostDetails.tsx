import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon
} from '@mui/icons-material';
import { InstagramPost, instagramMetricsService } from '../../services/instagramMetricsService';

interface PostDetailsProps {
  open: boolean;
  post: InstagramPost | null;
  onClose: () => void;
  formatTimestamp: (timestamp: string) => string;
}

const PostDetails: React.FC<PostDetailsProps> = ({
  open,
  post,
  onClose,
  formatTimestamp
}) => {
  if (!post) return null;

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon />;
      case 'VIDEO':
        return <VideoIcon />;
      case 'CAROUSEL_ALBUM':
        return <CarouselIcon />;
      default:
        return <ImageIcon />;
    }
  };

  const getMediaTypeLabel = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return 'Imagem';
      case 'VIDEO':
        return 'Vídeo';
      case 'CAROUSEL_ALBUM':
        return 'Carrossel';
      default:
        return type;
    }
  };

  // Métricas reais
  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  
  // Engajamento total (métricas reais)
  const totalEngagement = likes + comments + saved + shares;
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" fontWeight={600}>
          Detalhes do Post
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {/* Imagem */}
        <Box sx={{ mb: 3, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'grey.100' }}>
          <CardMedia
            component="img"
            image={post.thumbnail_url || post.media_url}
            alt={post.caption}
            sx={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
          />
        </Box>

        {/* Informações básicas */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
              Publicado em
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatTimestamp(post.timestamp)}
            </Typography>
          </Box>
          <Chip 
            icon={getMediaTypeIcon(post.media_type)}
            label={getMediaTypeLabel(post.media_type)}
            size="small"
            sx={{ 
              height: 28,
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          />
        </Box>
            
        {/* Métricas */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Métricas
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 1.5, 
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  Curtidas
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {likes.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 1.5, 
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  Comentários
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {comments.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            {reach > 0 && (
              <Grid item xs={6}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 1.5, 
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Alcance
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {reach.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            )}
            {impressions > 0 && (
              <Grid item xs={6}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 1.5, 
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Impressões
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {impressions.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            )}
            <Grid item xs={6}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 1.5, 
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  Engajamento
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {totalEngagement.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            {engagementRate > 0 && (
              <Grid item xs={6}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 1.5, 
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'success.light'
                }}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5, color: 'white' }}>
                    Taxa de Engajamento
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                    {engagementRate.toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Legenda */}
        {post.caption && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              Legenda
            </Typography>
            <Typography variant="body2" sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              color: 'text.secondary'
            }}>
              {post.caption}
            </Typography>
          </Box>
        )}

        {/* Botão */}
        <Button 
          variant="outlined" 
          startIcon={<LinkIcon />}
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          fullWidth
          sx={{ 
            mt: 2,
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Ver no Instagram
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostDetails;
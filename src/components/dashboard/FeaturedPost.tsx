import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Box,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
  IconButton
} from '@mui/material';
import {
  ThumbUp as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Visibility as VisibilityIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  TrendingUp as TrendingUpIcon,
  People as ReachIcon,
  Share as ShareIcon,
  Bookmark as SaveIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { InstagramPost } from '../../services/instagramMetricsService';

interface FeaturedPostProps {
  post: InstagramPost;
  onViewDetails: (post: InstagramPost) => void;
  formatTimeAgo: (timestamp: string) => string;
}

const FeaturedPost: React.FC<FeaturedPostProps> = ({ post, onViewDetails, formatTimeAgo }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getMediaTypeIcon = (type: string, productType?: string) => {
    if (productType === 'REELS') return <VideoIcon sx={{ color: '#E91E63' }} />;
    
    switch (type) {
      case 'IMAGE':
        return <ImageIcon sx={{ color: '#2196F3' }} />;
      case 'VIDEO':
        return <VideoIcon sx={{ color: '#FF9800' }} />;
      case 'CAROUSEL_ALBUM':
        return <CarouselIcon sx={{ color: '#9C27B0' }} />;
      default:
        return <ImageIcon sx={{ color: '#2196F3' }} />;
    }
  };

  const getMediaTypeLabel = (type: string, productType?: string) => {
    if (productType === 'REELS') return 'Reels';
    
    switch (type) {
      case 'IMAGE':
        return 'Foto';
      case 'VIDEO':
        return 'Vídeo';
      case 'CAROUSEL_ALBUM':
        return 'Carrossel';
      default:
        return type;
    }
  };

  const getMediaTypeColor = (type: string, productType?: string) => {
    if (productType === 'REELS') return '#E91E63';
    
    switch (type) {
      case 'IMAGE':
        return '#2196F3';
      case 'VIDEO':
        return '#FF9800';
      case 'CAROUSEL_ALBUM':
        return '#9C27B0';
      default:
        return '#2196F3';
    }
  };

  // Calcular métricas
  const engagement = post.insights?.engagement || (post.like_count + post.comments_count);
  const reach = post.insights?.reach || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;

  return (
    <Grid item xs={12}>
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8]
          }
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          pb: 2,
          background: `linear-gradient(135deg, ${getMediaTypeColor(post.media_type, post.media_product_type)}15 0%, transparent 100%)`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
              Post Mais Engajado
            </Typography>
            
            <Chip 
              icon={getMediaTypeIcon(post.media_type, post.media_product_type)}
              label={getMediaTypeLabel(post.media_type, post.media_product_type)}
              sx={{ 
                fontWeight: 600,
                backgroundColor: `${getMediaTypeColor(post.media_type, post.media_product_type)}20`,
                color: getMediaTypeColor(post.media_type, post.media_product_type),
                border: `1px solid ${getMediaTypeColor(post.media_type, post.media_product_type)}40`
              }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 500
          }}>
            📅 Publicado {formatTimeAgo(post.timestamp)}
          </Typography>
        </Box>

        <Card sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          boxShadow: 'none',
          backgroundColor: 'transparent'
        }}>
          {/* Imagem */}
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              sx={{ 
                width: isMobile ? '100%' : 280,
                height: isMobile ? 250 : 280,
                objectFit: 'cover'
              }}
              image={post.thumbnail_url || post.media_url}
              alt={post.caption || 'Post do Instagram'}
            />
            
            {/* Badge de Engajamento */}
            <Box sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="caption" sx={{ 
                color: 'white', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}>
                🔥 {post.engagement_rate?.toFixed(1) || '0.0'}%
              </Typography>
            </Box>
          </Box>

          {/* Conteúdo */}
          <CardContent sx={{ 
            flex: '1 0 auto', 
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Caption */}
            <Box>
              <Typography variant="body1" sx={{ 
                mb: 3,
                lineHeight: 1.6,
                color: theme.palette.text.primary,
                fontWeight: 400
              }}>
                {post.caption && post.caption.length > 150 
                  ? `${post.caption.substring(0, 150)}...` 
                  : post.caption || 'Sem legenda'}
              </Typography>
            </Box>

            {/* Métricas */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: theme.palette.error.main + '10' }}>
                    <LikeIcon sx={{ color: theme.palette.error.main, mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                      {post.like_count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Curtidas
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: theme.palette.info.main + '10' }}>
                    <CommentIcon sx={{ color: theme.palette.info.main, mb: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                      {post.comments_count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Comentários
                    </Typography>
                  </Box>
                </Grid>

                {reach > 0 && (
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: theme.palette.warning.main + '10' }}>
                      <ReachIcon sx={{ color: theme.palette.warning.main, mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                        {reach.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Alcance
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {saved > 0 && (
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: theme.palette.success.main + '10' }}>
                      <SaveIcon sx={{ color: theme.palette.success.main, mb: 0.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {saved.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Salvos
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Ações */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button 
                startIcon={<VisibilityIcon />}
                variant="contained"
                onClick={() => onViewDetails(post)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3
                }}
              >
                Ver Detalhes
              </Button>
              
              <Button 
                startIcon={<LaunchIcon />}
                variant="outlined"
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3
                }}
              >
                Abrir no Instagram
              </Button>

              {/* Botão de Compartilhar */}
              <IconButton 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Post do Instagram',
                      text: post.caption || '',
                      url: post.permalink
                    });
                  } else {
                    navigator.clipboard.writeText(post.permalink);
                  }
                }}
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2
                }}
              >
                <ShareIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Grid>
  );
};

export default FeaturedPost;
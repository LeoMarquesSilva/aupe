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
  Divider
} from '@mui/material';
import {
  ThumbUp as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Visibility as VisibilityIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  TrendingUp as TrendingUpIcon,
  People as ReachIcon,
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

  // Calcular métricas reais
  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  
  // Engajamento total (métricas reais)
  const totalEngagement = likes + comments + saved + shares;
  
  // Taxa de engajamento (se tiver reach)
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  return (
    <Grid item xs={12}>
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: getMediaTypeColor(post.media_type, post.media_product_type),
            boxShadow: `0 4px 12px ${getMediaTypeColor(post.media_type, post.media_product_type)}20`
          }
        }}
      >
        {/* Header Minimalista */}
        <Box sx={{ 
          p: 2.5, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TrendingUpIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Post Mais Engajado
            </Typography>
            <Chip 
              icon={getMediaTypeIcon(post.media_type, post.media_product_type)}
              label={getMediaTypeLabel(post.media_type, post.media_product_type)}
              size="small"
              sx={{ 
                fontWeight: 500,
                fontSize: '0.75rem',
                height: 24,
                bgcolor: `${getMediaTypeColor(post.media_type, post.media_product_type)}10`,
                color: getMediaTypeColor(post.media_type, post.media_product_type),
                border: `1px solid ${getMediaTypeColor(post.media_type, post.media_product_type)}30`
              }}
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {formatTimeAgo(post.timestamp)}
          </Typography>
        </Box>

        <Card sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          boxShadow: 'none',
          backgroundColor: 'transparent'
        }}>
          {/* Imagem */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <CardMedia
              component="img"
              sx={{ 
                width: isMobile ? '100%' : 240,
                height: isMobile ? 240 : 240,
                objectFit: 'cover',
                bgcolor: 'grey.100'
              }}
              image={post.thumbnail_url || post.media_url}
              alt={post.caption || 'Post do Instagram'}
            />
            
            {/* Badge de Engajamento Minimalista */}
            {engagementRate > 0 && (
              <Box sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'success.main',
                borderRadius: 1.5,
                px: 1,
                py: 0.5
              }}>
                <Typography variant="caption" sx={{ 
                  color: 'white', 
                  fontWeight: 700,
                  fontSize: '0.6875rem'
                }}>
                  {engagementRate.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Conteúdo */}
          <CardContent sx={{ 
            flex: '1 0 auto', 
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Caption */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ 
                lineHeight: 1.6,
                color: 'text.secondary',
                fontSize: '0.875rem'
              }}>
                {post.caption && post.caption.length > 120 
                  ? `${post.caption.substring(0, 120)}...` 
                  : post.caption || 'Sem legenda'}
              </Typography>
            </Box>

            {/* Métricas Minimalistas */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}>
                    <LikeIcon sx={{ color: 'error.main', fontSize: 18 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {likes.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                        Curtidas
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}>
                    <CommentIcon sx={{ color: 'info.main', fontSize: 18 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {comments.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                        Comentários
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {reach > 0 && (
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'grey.50'
                    }}>
                      <ReachIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {reach.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                          Alcance
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {impressions > 0 && (
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'grey.50'
                    }}>
                      <VisibilityIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {impressions.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                          Impressões
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Ações Minimalistas */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined"
                size="small"
                onClick={() => onViewDetails(post)}
                sx={{ 
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  px: 2,
                  py: 0.75
                }}
              >
                Ver Detalhes
              </Button>
              
              <Button 
                variant="outlined"
                size="small"
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<LaunchIcon sx={{ fontSize: 16 }} />}
                sx={{ 
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  px: 2,
                  py: 0.75
                }}
              >
                Instagram
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Grid>
  );
};

export default FeaturedPost;
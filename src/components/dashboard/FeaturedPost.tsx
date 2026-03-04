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
  Divider,
  alpha
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

const MEDIA_COLORS: Record<string, string> = {
  REELS:          '#7c3aed',
  VIDEO:          '#d97706',
  IMAGE:          '#0891b2',
  CAROUSEL_ALBUM: '#6366f1',
};

interface FeaturedPostProps {
  post: InstagramPost;
  onViewDetails: (post: InstagramPost) => void;
  formatTimeAgo: (timestamp: string) => string;
}

const FeaturedPost: React.FC<FeaturedPostProps> = ({ post, onViewDetails, formatTimeAgo }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const resolveColor = (type: string, productType?: string) => {
    if (productType === 'REELS') return MEDIA_COLORS.REELS;
    return MEDIA_COLORS[type] || MEDIA_COLORS.IMAGE;
  };

  const getMediaTypeIcon = (type: string, productType?: string) => {
    const color = resolveColor(type, productType);
    if (productType === 'REELS') return <VideoIcon sx={{ color }} />;
    switch (type) {
      case 'IMAGE': return <ImageIcon sx={{ color }} />;
      case 'VIDEO': return <VideoIcon sx={{ color }} />;
      case 'CAROUSEL_ALBUM': return <CarouselIcon sx={{ color }} />;
      default: return <ImageIcon sx={{ color }} />;
    }
  };

  const getMediaTypeLabel = (type: string, productType?: string) => {
    if (productType === 'REELS') return 'Reels';
    switch (type) {
      case 'IMAGE': return 'Foto';
      case 'VIDEO': return 'Vídeo';
      case 'CAROUSEL_ALBUM': return 'Carrossel';
      default: return type;
    }
  };

  const mediaColor = resolveColor(post.media_type, post.media_product_type);

  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  const totalEngagement = likes + comments + saved + shares;
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  const statItems = [
    { icon: <LikeIcon sx={{ color: '#d97706', fontSize: 18 }} />, value: likes, label: 'Curtidas', bg: '#fffbeb' },
    { icon: <CommentIcon sx={{ color: '#7c3aed', fontSize: 18 }} />, value: comments, label: 'Comentários', bg: '#f5f3ff' },
    ...(reach > 0 ? [{ icon: <ReachIcon sx={{ color: '#0891b2', fontSize: 18 }} />, value: reach, label: 'Alcance', bg: '#ecfeff' }] : []),
    ...(impressions > 0 ? [{ icon: <VisibilityIcon sx={{ color: '#6366f1', fontSize: 18 }} />, value: impressions, label: 'Impressões', bg: '#eef2ff' }] : []),
  ];

  return (
    <Grid item xs={12}>
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: alpha(mediaColor, 0.4),
            boxShadow: `0 8px 25px -5px ${alpha(mediaColor, 0.12)}`
          }
        }}
      >
        <Box sx={{ 
          px: 2.5, 
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: 2, 
              bgcolor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUpIcon sx={{ color: '#059669', fontSize: 18 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Post Mais Engajado
            </Typography>
            <Chip 
              icon={getMediaTypeIcon(post.media_type, post.media_product_type)}
              label={getMediaTypeLabel(post.media_type, post.media_product_type)}
              size="small"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 26,
                bgcolor: alpha(mediaColor, 0.08),
                color: mediaColor,
                border: `1px solid ${alpha(mediaColor, 0.2)}`,
                '& .MuiChip-icon': { ml: 0.5 }
              }}
            />
          </Box>
          
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
            {formatTimeAgo(post.timestamp)}
          </Typography>
        </Box>

        <Card sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          boxShadow: 'none',
          backgroundColor: 'transparent',
          borderRadius: 0
        }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <CardMedia
              component="img"
              sx={{ 
                width: isMobile ? '100%' : 260,
                height: isMobile ? 260 : 260,
                objectFit: 'cover',
                bgcolor: 'grey.100'
              }}
              image={post.thumbnail_url || post.media_url}
              alt={post.caption || 'Post do Instagram'}
            />
            
            {engagementRate > 0 && (
              <Box sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: 2,
                px: 1.25,
                py: 0.5,
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)'
              }}>
                <Typography variant="caption" sx={{ 
                  color: 'white', 
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.02em'
                }}>
                  {engagementRate.toFixed(1)}% eng.
                </Typography>
              </Box>
            )}
          </Box>

          <CardContent sx={{ 
            flex: '1 0 auto', 
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ 
                lineHeight: 1.65,
                color: 'text.secondary',
                fontSize: '0.875rem'
              }}>
                {post.caption && post.caption.length > 140 
                  ? `${post.caption.substring(0, 140)}...` 
                  : post.caption || 'Sem legenda'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Grid container spacing={1.5}>
                {statItems.map((item, idx) => (
                  <Grid item xs={6} sm={3} key={idx}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: item.bg,
                      transition: 'transform 0.2s ease',
                      '&:hover': { transform: 'translateY(-1px)' }
                    }}>
                      {item.icon}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '0.9rem' }}>
                          {item.value.toLocaleString('pt-BR')}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          {item.label}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button 
                variant="contained"
                size="small"
                disableElevation
                onClick={() => onViewDetails(post)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  px: 2.5,
                  py: 0.75,
                  bgcolor: theme.palette.text.primary,
                  color: 'background.paper',
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.85) }
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
                startIcon={<LaunchIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  px: 2.5,
                  py: 0.75,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': { 
                    borderColor: 'text.primary',
                    bgcolor: alpha(theme.palette.text.primary, 0.04)
                  }
                }}
              >
                Abrir no Instagram
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Grid>
  );
};

export default FeaturedPost;

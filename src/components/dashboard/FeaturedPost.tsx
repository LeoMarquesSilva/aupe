import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  FavoriteBorder as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  BookmarkBorder as SaveIcon,
  IosShare as ShareIcon,
  Visibility as ReachIcon,
  RemoveRedEye as ImpressionsIcon,
  OpenInNew as ExternalIcon,
  TrendingUp as TrendingUpIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
} from '@mui/icons-material';
import { InstagramPost } from '../../services/instagramMetricsService';

interface FeaturedPostProps {
  post: InstagramPost;
  onViewDetails: (post: InstagramPost) => void;
  formatTimeAgo: (timestamp: string) => string;
}

const getMediaTypeLabel = (type: string, productType?: string) => {
  if (productType === 'REELS') return 'Reels';
  switch (type) {
    case 'IMAGE': return 'Foto';
    case 'VIDEO': return 'Vídeo';
    case 'CAROUSEL_ALBUM': return 'Carrossel';
    default: return type;
  }
};

const getMediaTypeIcon = (type: string, productType?: string) => {
  if (productType === 'REELS') return <VideoIcon sx={{ fontSize: 13 }} />;
  switch (type) {
    case 'VIDEO': return <VideoIcon sx={{ fontSize: 13 }} />;
    case 'CAROUSEL_ALBUM': return <CarouselIcon sx={{ fontSize: 13 }} />;
    default: return <ImageIcon sx={{ fontSize: 13 }} />;
  }
};

const FeaturedPost: React.FC<FeaturedPostProps> = ({ post, onViewDetails, formatTimeAgo }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  const totalEngagement = likes + comments + saved + shares;
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('pt-BR');
  };

  const engagementColor = engagementRate >= 5 ? '#059669' : engagementRate >= 2 ? '#d97706' : '#6b7280';

  const statItems = [
    { icon: <LikeIcon />, value: likes, label: 'Curtidas' },
    { icon: <CommentIcon />, value: comments, label: 'Comentários' },
    ...(saved > 0 ? [{ icon: <SaveIcon />, value: saved, label: 'Salvos' }] : []),
    ...(shares > 0 ? [{ icon: <ShareIcon />, value: shares, label: 'Shares' }] : []),
    ...(reach > 0 ? [{ icon: <ReachIcon />, value: reach, label: 'Alcance' }] : []),
    ...(impressions > 0 ? [{ icon: <ImpressionsIcon />, value: impressions, label: 'Impressões' }] : []),
  ];

  return (
    <Box sx={{
      bgcolor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        px: 2.5,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#f74211',
            flexShrink: 0,
          }} />
          <Typography sx={{
            fontWeight: 600,
            fontSize: '0.82rem',
            color: '#111827',
            letterSpacing: '-0.01em',
          }}>
            Post mais engajado
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#9ca3af' }}>
          {getMediaTypeIcon(post.media_type, post.media_product_type)}
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af' }}>
            {getMediaTypeLabel(post.media_type, post.media_product_type)}
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Image */}
        <Box
          onClick={() => onViewDetails(post)}
          sx={{
            position: 'relative',
            width: isMobile ? '100%' : 200,
            minHeight: isMobile ? 200 : 'auto',
            flexShrink: 0,
            cursor: 'pointer',
            bgcolor: '#f9fafb',
            overflow: 'hidden',
          }}
        >
          {(post.thumbnail_url || post.media_url) ? (
            <Box
              component="img"
              src={post.thumbnail_url || post.media_url}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          ) : (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#d1d5db',
            }}>
              <ImageIcon sx={{ fontSize: 40 }} />
            </Box>
          )}

          {/* Engagement Rate Badge */}
          {engagementRate > 0 && (
            <Box sx={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              px: 1,
              py: 0.4,
              borderRadius: '8px',
              bgcolor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
            }}>
              <TrendingUpIcon sx={{ fontSize: 12, color: engagementColor }} />
              <Typography sx={{
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {engagementRate.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Content */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          {/* Caption + time */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Typography sx={{
              fontSize: '0.78rem',
              color: '#6b7280',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 0.75,
            }}>
              {post.caption || 'Sem legenda'}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#d1d5db', fontWeight: 500 }}>
              {formatTimeAgo(post.timestamp)}
            </Typography>
          </Box>

          {/* Metrics Grid */}
          <Box sx={{
            px: 2,
            pb: 2,
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(statItems.length, 3)}, 1fr)`,
            gap: '1px',
            bgcolor: '#f3f4f6',
            borderRadius: '10px',
            mx: 2,
            overflow: 'hidden',
          }}>
            {statItems.slice(0, 6).map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  bgcolor: '#fff',
                  py: 1.25,
                  px: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                }}
              >
                <Box sx={{ color: '#d1d5db', '& .MuiSvgIcon-root': { fontSize: 14 } }}>
                  {item.icon}
                </Box>
                <Typography sx={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#111827',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatNumber(item.value)}
                </Typography>
                <Typography sx={{
                  fontSize: '0.6rem',
                  color: '#9ca3af',
                  fontWeight: 500,
                  lineHeight: 1,
                }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Actions */}
          <Box sx={{
            px: 2,
            py: 1.5,
            mt: 'auto',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: 1,
          }}>
            <Box
              component="button"
              onClick={() => onViewDetails(post)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                py: 0.85,
                border: 'none',
                borderRadius: '8px',
                bgcolor: '#111827',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: '#1f2937' },
              }}
            >
              Ver detalhes
            </Box>
            <Box
              component="a"
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                bgcolor: '#fff',
                color: '#6b7280',
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'border-color 0.15s ease',
                '&:hover': { borderColor: '#d1d5db' },
              }}
            >
              <ExternalIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FeaturedPost;

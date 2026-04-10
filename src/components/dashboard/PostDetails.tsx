import React from 'react';
import {
  Dialog,
  Typography,
  Box,
  IconButton,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  FavoriteBorder as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  BookmarkBorder as SaveIcon,
  IosShare as ShareIcon,
  Visibility as ReachIcon,
  RemoveRedEye as ImpressionsIcon,
  PlayCircleOutline as VideoViewsIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  Movie as ReelsIcon,
  OpenInNew as ExternalIcon,
  CalendarToday as DateIcon,
  TrendingUp as EngagementIcon,
} from '@mui/icons-material';
import { InstagramPost } from '../../services/instagramMetricsService';

interface PostDetailsProps {
  open: boolean;
  post: InstagramPost | null;
  onClose: () => void;
  formatTimestamp: (timestamp: string) => string;
}

const MEDIA_MAP: Record<string, { icon: React.ReactElement; label: string }> = {
  REELS: { icon: <ReelsIcon />, label: 'Reels' },
  IMAGE: { icon: <ImageIcon />, label: 'Imagem' },
  VIDEO: { icon: <VideoIcon />, label: 'Vídeo' },
  CAROUSEL_ALBUM: { icon: <CarouselIcon />, label: 'Carrossel' },
};

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
};

const PostDetails: React.FC<PostDetailsProps> = ({ open, post, onClose, formatTimestamp }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!post) return null;

  const likes = post.like_count || 0;
  const comments = post.comments_count || 0;
  const saved = post.insights?.saved || 0;
  const shares = post.insights?.shares || 0;
  const reach = post.insights?.reach || 0;
  const impressions = post.insights?.impressions || 0;
  const videoViews = post.insights?.video_views || 0;
  const totalEngagement = likes + comments + saved + shares;
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  const mediaKey = post.media_product_type === 'REELS' ? 'REELS' : post.media_type;
  const media = MEDIA_MAP[mediaKey] || MEDIA_MAP.IMAGE;

  const metrics = [
    { icon: <LikeIcon />, label: 'Curtidas', value: likes, color: '#f59e0b', show: true },
    { icon: <CommentIcon />, label: 'Comentários', value: comments, color: '#8b5cf6', show: true },
    { icon: <SaveIcon />, label: 'Salvamentos', value: saved, color: '#10b981', show: saved > 0 },
    { icon: <ShareIcon />, label: 'Compartilhamentos', value: shares, color: '#06b6d4', show: shares > 0 },
    { icon: <ReachIcon />, label: 'Alcance', value: reach, color: '#3b82f6', show: reach > 0 },
    { icon: <ImpressionsIcon />, label: 'Impressões', value: impressions, color: '#6366f1', show: impressions > 0 },
    { icon: <VideoViewsIcon />, label: 'Visualizações', value: videoViews, color: '#ec4899', show: videoViews > 0 },
  ].filter(m => m.show);

  const engColor = engagementRate >= 5 ? '#059669' : engagementRate >= 2 ? '#d97706' : '#6b7280';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          overflow: 'hidden',
          bgcolor: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18)',
          maxHeight: isMobile ? '100%' : '90vh',
        }
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 2.5 },
        py: 1.5,
        borderBottom: '1px solid #f3f4f6',
        bgcolor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
            Detalhes do post
          </Typography>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            px: 0.75,
            py: 0.25,
            borderRadius: '6px',
            bgcolor: '#f3f4f6',
            color: '#6b7280',
            '& .MuiSvgIcon-root': { fontSize: 12 },
          }}>
            {React.cloneElement(media.icon, { sx: { fontSize: 12 } })}
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
              {media.label}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            width: 32,
            height: 32,
            color: '#9ca3af',
            '&:hover': { bgcolor: '#f3f4f6' },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'auto',
        flex: 1,
      }}>
        {/* Left: Media */}
        <Box sx={{
          flex: { xs: 'none', md: '0 0 48%' },
          maxWidth: { md: '48%' },
          bgcolor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 280, md: 420 },
          maxHeight: { xs: 380 },
          position: 'relative',
          borderRight: { md: '1px solid #f3f4f6' },
        }}>
          {(post.thumbnail_url || post.media_url) ? (
            <Box
              component="img"
              src={post.thumbnail_url || post.media_url}
              alt=""
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                maxHeight: { xs: 380, md: 520 },
              }}
            />
          ) : (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              color: '#d1d5db',
            }}>
              {React.cloneElement(media.icon, { sx: { fontSize: 48 } })}
              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Sem preview disponível
              </Typography>
            </Box>
          )}
        </Box>

        {/* Right: Info */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          minWidth: 0,
        }}>
          {/* Engagement Rate + Date Row */}
          <Box sx={{
            px: { xs: 2, md: 2.5 },
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            borderBottom: '1px solid #f3f4f6',
          }}>
            {engagementRate > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: `${engColor}0A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <EngagementIcon sx={{ fontSize: 18, color: engColor }} />
                </Box>
                <Box>
                  <Typography sx={{
                    fontSize: '0.58rem',
                    fontWeight: 600,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                    mb: 0.25,
                  }}>
                    Taxa de engajamento
                  </Typography>
                  <Typography sx={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: engColor,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {engagementRate.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#9ca3af' }}>
              <DateIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 500 }}>
                {formatTimestamp(post.timestamp)}
              </Typography>
            </Box>
          </Box>

          {/* Metrics Grid */}
          <Box sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
            bgcolor: '#f3f4f6',
            mx: { xs: 2, md: 2.5 },
            my: 0.5,
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {metrics.map(m => (
              <Box key={m.label} sx={{
                bgcolor: '#fff',
                py: 1.5,
                px: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: `${m.color}0A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: m.color,
                  '& .MuiSvgIcon-root': { fontSize: 16 },
                }}>
                  {m.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: '0.58rem',
                    fontWeight: 600,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    mb: 0.3,
                  }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatNumber(m.value)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Total Engagement */}
          {totalEngagement > 0 && (
            <Box sx={{
              mx: { xs: 2, md: 2.5 },
              mt: 1,
              px: 2,
              py: 1.25,
              borderRadius: '10px',
              bgcolor: '#f9fafb',
              border: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Typography sx={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>
                Engajamento total
              </Typography>
              <Typography sx={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#111827',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatNumber(totalEngagement)}
                <Typography component="span" sx={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 500, ml: 0.5 }}>
                  interações
                </Typography>
              </Typography>
            </Box>
          )}

          {/* Caption */}
          {post.caption && (
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, flex: 1, overflow: 'auto' }}>
              <Typography sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: '#d1d5db',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 0.75,
              }}>
                Legenda
              </Typography>
              <Typography sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                color: '#6b7280',
                fontSize: '0.8rem',
                maxHeight: 160,
                overflow: 'auto',
                '&::-webkit-scrollbar': { width: 3 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#e5e7eb', borderRadius: 2 },
              }}>
                {post.caption}
              </Typography>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            mt: 'auto',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: 1,
          }}>
            <Button
              disableElevation
              startIcon={<ExternalIcon sx={{ fontSize: '15px !important' }} />}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                py: 1.1,
                bgcolor: '#111827',
                color: '#fff',
                '&:hover': { bgcolor: '#1f2937' },
              }}
            >
              Ver no Instagram
            </Button>
            <Button
              onClick={onClose}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                py: 1.1,
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                minWidth: 90,
                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
              }}
            >
              Fechar
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default PostDetails;

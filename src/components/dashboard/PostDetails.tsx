import React from 'react';
import {
  Dialog,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Divider,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  FavoriteBorder as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  BookmarkBorder as SaveIcon,
  Share as ShareIcon,
  Visibility as ReachIcon,
  RemoveRedEye as ImpressionsIcon,
  PlayCircleOutline as VideoViewsIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  ViewCarousel as CarouselIcon,
  Movie as ReelsIcon,
  OpenInNew as OpenIcon,
  TrendingUp as EngagementIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';
import { InstagramPost } from '../../services/instagramMetricsService';

interface PostDetailsProps {
  open: boolean;
  post: InstagramPost | null;
  onClose: () => void;
  formatTimestamp: (timestamp: string) => string;
}

const METRIC_COLORS = {
  likes: '#d97706',
  comments: '#6366f1',
  saved: '#059669',
  shares: '#0891b2',
  reach: '#7c3aed',
  impressions: '#2563eb',
  engagement: '#dc2626',
  videoViews: '#e11d48',
};

const MEDIA_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  REELS: { icon: <ReelsIcon />, label: 'Reels', color: '#7c3aed' },
  IMAGE: { icon: <ImageIcon />, label: 'Imagem', color: '#0891b2' },
  VIDEO: { icon: <VideoIcon />, label: 'Vídeo', color: '#d97706' },
  CAROUSEL_ALBUM: { icon: <CarouselIcon />, label: 'Carrossel', color: '#6366f1' },
};

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  suffix?: string;
  highlight?: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ icon, label, value, color, suffix, highlight }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 1.5,
      borderRadius: 2.5,
      bgcolor: highlight ? alpha(color, 0.06) : 'transparent',
      border: '1px solid',
      borderColor: highlight ? alpha(color, 0.18) : alpha(theme.palette.divider, 0.6),
      transition: 'all 0.2s ease',
      '&:hover': {
        bgcolor: alpha(color, 0.06),
        borderColor: alpha(color, 0.25),
      }
    }}>
      <Box sx={{
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: alpha(color, 0.1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        flexShrink: 0,
        '& .MuiSvgIcon-root': { fontSize: 18 }
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2, fontSize: '1rem' }}>
          {value.toLocaleString('pt-BR')}{suffix || ''}
        </Typography>
      </Box>
    </Box>
  );
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
  const media = MEDIA_CONFIG[mediaKey] || MEDIA_CONFIG.IMAGE;

  const metrics = [
    { icon: <LikeIcon />, label: 'Curtidas', value: likes, color: METRIC_COLORS.likes, show: true },
    { icon: <CommentIcon />, label: 'Comentários', value: comments, color: METRIC_COLORS.comments, show: true },
    { icon: <SaveIcon />, label: 'Salvamentos', value: saved, color: METRIC_COLORS.saved, show: saved > 0 },
    { icon: <ShareIcon />, label: 'Compartilhamentos', value: shares, color: METRIC_COLORS.shares, show: shares > 0 },
    { icon: <ReachIcon />, label: 'Alcance', value: reach, color: METRIC_COLORS.reach, show: reach > 0 },
    { icon: <ImpressionsIcon />, label: 'Impressões', value: impressions, color: METRIC_COLORS.impressions, show: impressions > 0 },
    { icon: <VideoViewsIcon />, label: 'Visualizações', value: videoViews, color: METRIC_COLORS.videoViews, show: videoViews > 0 },
  ].filter(m => m.show);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 4,
          overflow: 'hidden',
          bgcolor: 'background.default',
          maxHeight: isMobile ? '100%' : '92vh',
        }
      }}
    >
      {/* Sticky header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 3 },
        py: 1.5,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Detalhes do Post
          </Typography>
          <Chip
            icon={React.cloneElement(media.icon as React.ReactElement, { sx: { fontSize: '14px !important' } })}
            label={media.label}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: alpha(media.color, 0.08),
              color: media.color,
              border: '1px solid',
              borderColor: alpha(media.color, 0.2),
              '& .MuiChip-icon': { color: media.color }
            }}
          />
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'auto',
      }}>
        {/* Left: Media */}
        <Box sx={{
          flex: { xs: 'none', md: '0 0 50%' },
          maxWidth: { md: '50%' },
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 280, md: 400 },
          maxHeight: { xs: 360, md: '100%' },
          position: 'relative',
        }}>
          {(post.thumbnail_url || post.media_url) ? (
            <Box
              component="img"
              src={post.thumbnail_url || post.media_url}
              alt={post.caption || 'Post'}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                maxHeight: { xs: 360, md: 520 },
              }}
            />
          ) : (
            <Box sx={{ color: 'grey.600', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              {React.cloneElement(media.icon as React.ReactElement, { sx: { fontSize: 48 } })}
              <Typography variant="caption" sx={{ color: 'grey.500' }}>Sem preview</Typography>
            </Box>
          )}
        </Box>

        {/* Right: Info */}
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Engagement rate highlight + date */}
          <Box sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            {engagementRate > 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 2.5,
                bgcolor: alpha(engagementRate >= 3 ? '#059669' : engagementRate >= 1 ? '#d97706' : '#dc2626', 0.08),
                border: '1px solid',
                borderColor: alpha(engagementRate >= 3 ? '#059669' : engagementRate >= 1 ? '#d97706' : '#dc2626', 0.2),
              }}>
                <EngagementIcon sx={{ fontSize: 18, color: engagementRate >= 3 ? '#059669' : engagementRate >= 1 ? '#d97706' : '#dc2626' }} />
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.58rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1, display: 'block' }}>
                    Taxa de Engajamento
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2, color: engagementRate >= 3 ? '#059669' : engagementRate >= 1 ? '#d97706' : '#dc2626' }}>
                    {engagementRate.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
              <DateIcon sx={{ fontSize: 15 }} />
              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.78rem' }}>
                {formatTimestamp(post.timestamp)}
              </Typography>
            </Box>
          </Box>

          {/* Metrics grid */}
          <Box sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)' },
            gap: 1,
          }}>
            {metrics.map((m) => (
              <MetricItem
                key={m.label}
                icon={m.icon}
                label={m.label}
                value={m.value}
                color={m.color}
                highlight={m.label === 'Curtidas' || m.label === 'Alcance'}
              />
            ))}
            {totalEngagement > 0 && (
              <Box sx={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1,
                px: 2,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem' }}>
                  Engajamento total
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {totalEngagement.toLocaleString('pt-BR')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                  interações
                </Typography>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Caption */}
          {post.caption && (
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, flex: 1, overflow: 'auto' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75, display: 'block' }}>
                Legenda
              </Typography>
              <Typography variant="body2" sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.65,
                color: 'text.secondary',
                fontSize: '0.82rem',
                maxHeight: 180,
                overflow: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
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
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            gap: 1,
          }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<OpenIcon sx={{ fontSize: '16px !important' }} />}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                py: 1,
                bgcolor: 'text.primary',
                color: 'background.paper',
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.85) },
              }}
            >
              Ver no Instagram
            </Button>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                py: 1,
                borderColor: 'divider',
                color: 'text.secondary',
                minWidth: 90,
                '&:hover': { borderColor: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.03) },
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

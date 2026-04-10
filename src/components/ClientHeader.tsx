import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  AddBox as PostAddIcon,
  AddPhotoAlternate as StoryAddIcon,
  CalendarMonth as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  VideoLibrary as ReelsIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Share as ShareIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { GLASS } from '../theme/glassTokens';
import { Client } from '../types';
import { InstagramProfile } from '../services/instagramMetricsService';
import { CacheStatus } from '../services/instagramCacheService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientHeaderProps {
  client: Client;
  profile: InstagramProfile | null;
  onCreatePost: () => void;
  onCreateStory: () => void;
  onCreateReels?: () => void;
  onViewCalendar: () => void;
  cacheStatus?: Omit<CacheStatus, 'clientId' | 'errorMessage'> | null;
  isStale?: boolean;
  formatTimeAgo?: (timestamp: string) => string;
  onForceRefresh?: () => void;
  syncInProgress?: boolean;
  postsStats?: {
    published: number;
    scheduled: number;
  };
  onExportPDF?: () => void;
  onShareLink?: () => void;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({
  client,
  profile,
  onCreatePost,
  onCreateStory,
  onCreateReels,
  onViewCalendar,
  cacheStatus,
  isStale = false,
  formatTimeAgo,
  onForceRefresh,
  syncInProgress = false,
  postsStats,
  onExportPDF,
  onShareLink
}) => {
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const hasInstagramAuth = client.accessToken && client.instagramAccountId;
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);

  const defaultFormatTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  };

  const getTimeAgo = (timestamp: Date) => {
    const dateStr = timestamp.toISOString();
    return formatTimeAgo ? formatTimeAgo(dateStr) : defaultFormatTimeAgo(dateStr);
  };

  const getAvatarImage = () => {
    if (profile?.profile_picture_url) return profile.profile_picture_url;
    if (client.profilePicture) return client.profilePicture;
    return client.logoUrl;
  };

  const statusColor = hasInstagramAuth ? GLASS.accent.orange : GLASS.status.disconnected.color;

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 3,
        borderRadius: GLASS.radius.card,
        bgcolor: GLASS.surface.bg,
        backdropFilter: `blur(${GLASS.surface.blur})`,
        WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
        border: `1px solid ${GLASS.border.outer}`,
        boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: hasInstagramAuth
            ? isStale
              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
              : `linear-gradient(90deg, ${GLASS.accent.orange}, ${GLASS.accent.orangeLight})`
            : `linear-gradient(90deg, ${GLASS.status.disconnected.color}, ${GLASS.status.disconnected.colorDark})`,
        },
      }}
    >
      {/* Row 1: Identity + Primary Action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        {/* Left: Avatar + Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={getAvatarImage()}
              alt={client.name}
              sx={{
                width: { xs: 52, md: 60 },
                height: { xs: 52, md: 60 },
                border: `3px solid ${hasInstagramAuth ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`,
                boxShadow: GLASS.shadow.avatar,
                bgcolor: statusColor,
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
            {/* Status dot */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: hasInstagramAuth ? GLASS.accent.orange : GLASS.status.disconnected.color,
                border: '2.5px solid #fff',
                boxShadow: `0 1px 4px ${hasInstagramAuth ? GLASS.status.connected.glow : 'rgba(0,0,0,0.1)'}`,
              }}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: GLASS.text.heading,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                fontSize: { xs: '1.25rem', md: '1.4rem' },
              }}
            >
              {client.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: GLASS.text.muted,
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                <InstagramIcon sx={{ fontSize: 15, color: GLASS.accent.orange }} />
                @{client.instagram}
              </Box>
              {profile && (
                <Typography
                  component="span"
                  sx={{ fontSize: '0.75rem', fontWeight: 600, color: GLASS.text.muted }}
                >
                  {profile.followers_count.toLocaleString('pt-BR')} seguidores
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Right: Primary CTA */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box
            component="button"
            onClick={onCreatePost}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 2,
              py: 1,
              border: 'none',
              borderRadius: GLASS.radius.button,
              bgcolor: GLASS.text.heading,
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 650,
              fontFamily: 'inherit',
              boxShadow: GLASS.shadow.button,
              transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              '&:hover': {
                bgcolor: '#131940',
                boxShadow: GLASS.shadow.buttonHover,
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.3)',
              },
            }}
          >
            <PostAddIcon sx={{ fontSize: 16, color: GLASS.accent.orangeLight }} />
            Criar Post
          </Box>

          {/* Dropdown for secondary create actions */}
          <Tooltip title="Mais opções de criação" placement="bottom">
            <IconButton
              size="small"
              onClick={(e) => setCreateMenuAnchor(e.currentTarget)}
              sx={{
                width: 36,
                height: 36,
                border: `1px solid ${GLASS.border.outer}`,
                bgcolor: GLASS.header.actionBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                '&:hover': {
                  bgcolor: GLASS.surface.bgHover,
                  borderColor: GLASS.accent.orange,
                },
              }}
            >
              <AddIcon sx={{ fontSize: 18, color: GLASS.text.muted }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={createMenuAnchor}
            open={Boolean(createMenuAnchor)}
            onClose={() => setCreateMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { onCreateStory(); setCreateMenuAnchor(null); }}>
              <ListItemIcon><StoryAddIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Criar Story" />
            </MenuItem>
            {onCreateReels && (
              <MenuItem onClick={() => { onCreateReels(); setCreateMenuAnchor(null); }}>
                <ListItemIcon><ReelsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Criar Reels" />
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Row 2: Meta bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, md: 1.5 },
          mt: 2,
          pt: 2,
          borderTop: `1px solid ${GLASS.border.subtle}`,
          flexWrap: 'wrap',
        }}
      >
        {/* Cache status pill */}
        {cacheStatus && hasInstagramAuth && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1.25,
              py: 0.4,
              borderRadius: GLASS.radius.badge,
              bgcolor: isStale ? 'rgba(245, 158, 11, 0.08)' : GLASS.status.connected.bg,
              border: `1px solid ${isStale ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            }}
          >
            {cacheStatus.syncStatus === 'completed' ? (
              <CheckCircleOutlineIcon sx={{ fontSize: 13, color: isStale ? '#d97706' : GLASS.accent.orange }} />
            ) : cacheStatus.syncStatus === 'failed' ? (
              <ErrorOutlineIcon sx={{ fontSize: 13, color: '#ef4444' }} />
            ) : (
              <ScheduleIcon sx={{ fontSize: 13, color: isStale ? '#d97706' : GLASS.accent.blue }} />
            )}
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: isStale ? '#92400e' : GLASS.status.connected.colorDark }}>
              {isStale ? 'Desatualizado' : 'Atualizado'} · {getTimeAgo(cacheStatus.lastFullSync)}
            </Typography>
            <Chip
              label={`${cacheStatus.postsCount} posts`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 700,
                bgcolor: isStale ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: isStale ? '#92400e' : GLASS.accent.orangeDark,
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            {onForceRefresh && (
              <Tooltip title="Atualizar dados">
                <IconButton
                  size="small"
                  onClick={onForceRefresh}
                  disabled={syncInProgress}
                  sx={{
                    width: 22,
                    height: 22,
                    color: isStale ? '#d97706' : GLASS.accent.orange,
                    '&:hover': { bgcolor: isStale ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' },
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Post stats pills */}
        {postsStats && postsStats.published > 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: GLASS.radius.badge,
              bgcolor: GLASS.metric.published.iconBg,
              border: `1px solid ${GLASS.metric.published.iconBorder}`,
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: GLASS.accent.orange, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 650, color: GLASS.accent.orangeDark }}>
              {postsStats.published} publicados
            </Typography>
          </Box>
        )}
        {postsStats && postsStats.scheduled > 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: GLASS.radius.badge,
              bgcolor: GLASS.metric.scheduled.iconBg,
              border: `1px solid ${GLASS.metric.scheduled.iconBorder}`,
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: GLASS.accent.blue, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 650, color: GLASS.accent.blueDark }}>
              {postsStats.scheduled} agendados
            </Typography>
          </Box>
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Quick action icon buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Calendário">
            <IconButton
              size="small"
              onClick={onViewCalendar}
              sx={{
                width: 34,
                height: 34,
                border: `1px solid ${GLASS.border.outer}`,
                bgcolor: GLASS.header.actionBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                '&:hover': { bgcolor: GLASS.surface.bgHover, borderColor: GLASS.accent.orange },
              }}
            >
              <CalendarIcon sx={{ fontSize: 16, color: GLASS.text.muted }} />
            </IconButton>
          </Tooltip>
          {onShareLink && (
            <Tooltip title="Compartilhar">
              <IconButton
                size="small"
                onClick={onShareLink}
                sx={{
                  width: 34,
                  height: 34,
                  border: `1px solid ${GLASS.border.outer}`,
                  bgcolor: GLASS.header.actionBg,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                  '&:hover': { bgcolor: GLASS.surface.bgHover, borderColor: GLASS.accent.orange },
                }}
              >
                <ShareIcon sx={{ fontSize: 16, color: GLASS.text.muted }} />
              </IconButton>
            </Tooltip>
          )}
          {onExportPDF && (
            <Tooltip title="Exportar PDF">
              <IconButton
                size="small"
                onClick={onExportPDF}
                sx={{
                  width: 34,
                  height: 34,
                  border: `1px solid ${GLASS.border.outer}`,
                  bgcolor: GLASS.header.actionBg,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                  '&:hover': { bgcolor: GLASS.surface.bgHover, borderColor: GLASS.accent.orange },
                }}
              >
                <PdfIcon sx={{ fontSize: 16, color: GLASS.text.muted }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientHeader;

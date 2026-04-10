import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Typography,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Image as ImageIcon,
  VideoLibrary as ReelsIcon,
  ViewCarousel as CarouselIcon,
  AutoStories as StoryIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import * as SocialPlatformIcons from './icons/SocialPlatformIcons';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '../types';
import { imageUrlService } from '../services/imageUrlService';
import { GLASS } from '../theme/glassTokens';

export type ApprovalKanbanColumn = 'internal' | 'awaiting' | 'approved' | 'scheduled' | 'adjustments';

export interface ApprovalKanbanPost {
  id: string;
  caption?: string;
  images?: (string | { url: string })[];
  video?: string;
  coverImage?: string;
  cover_image?: string;
  scheduledDate?: string;
  scheduled_date?: string;
  postType?: string;
  post_type?: string;
  approvalFeedback?: string | null;
  postingPlatform?: 'instagram' | 'linkedin';
  requiresInternalApproval?: boolean;
  internalApprovalStatus?: 'pending' | 'approved' | 'rejected' | null;
  client?: Client;
  createdAt?: string;
  approvalRespondedAt?: string | null;
  approvalStatus?: string;
}

interface ApprovalKanbanCardProps {
  post: ApprovalKanbanPost;
  column: ApprovalKanbanColumn;
  onClick?: () => void;
}

const getThumbnailUrl = (post: ApprovalKanbanPost): string | null => {
  const cover = post.coverImage ?? (post as { cover_image?: string }).cover_image;
  if (cover) return cover;
  const arr = post.images ?? [];
  const first = arr[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url;
  return null;
};

const getTypeLabel = (post: ApprovalKanbanPost): string => {
  const type = post.postType ?? post.post_type;
  if (type === 'roteiro') return 'Roteiro';
  if (type === 'reels' || post.video) return 'Reels';
  if (type === 'stories') return 'Story';
  if (Array.isArray(post.images) && post.images.length > 1) return 'Carrossel';
  return 'Post';
};

const getTypeIcon = (post: ApprovalKanbanPost) => {
  const type = post.postType ?? post.post_type;
  if (type === 'roteiro') return <DescriptionIcon sx={{ fontSize: 20 }} />;
  if (type === 'reels' || post.video) return <ReelsIcon sx={{ fontSize: 20 }} />;
  if (type === 'stories') return <StoryIcon sx={{ fontSize: 20 }} />;
  if (Array.isArray(post.images) && post.images.length > 1) return <CarouselIcon sx={{ fontSize: 20 }} />;
  return <ImageIcon sx={{ fontSize: 20 }} />;
};

const getClientAvatarUrl = (client: Client | undefined): string | undefined => {
  if (!client) return undefined;
  const raw = client.profilePicture || client.logoUrl;
  if (!raw) return undefined;
  return imageUrlService.getPublicUrl(raw);
};

const formatDate = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  try {
    return format(new Date(raw), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
};

const getCardTitle = (post: ApprovalKanbanPost, typeLabel: string): string => {
  const caption = (post.caption || '').trim();
  if (caption.length > 0) {
    const truncated = caption.length > 40 ? `${caption.slice(0, 40)}…` : caption;
    return truncated;
  }
  return typeLabel;
};

const ApprovalKanbanCard: React.FC<ApprovalKanbanCardProps> = ({ post, column, onClick }) => {
  const theme = useTheme();
  const isRoteiro = (post.postType ?? post.post_type) === 'roteiro';
  const thumbnailUrl = isRoteiro ? null : getThumbnailUrl(post);
  const typeLabel = getTypeLabel(post);
  const dateRaw = post.scheduledDate ?? post.scheduled_date;
  const scheduledStr = formatDate(dateRaw ?? undefined);
  const commentCount = post.approvalFeedback ? 1 : 0;
  const client = post.client;
  const scheduledDate = dateRaw ? new Date(dateRaw) : null;
  const isOverdue = column === 'adjustments' && scheduledDate && isPast(scheduledDate);
  const cardTitle = getCardTitle(post, typeLabel);
  const platform = post.postingPlatform ?? 'instagram';
  const isLinkedInPlatform = platform === 'linkedin';

  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: GLASS.radius.inner,
        border: `1px solid ${GLASS.border.outer}`,
        bgcolor: GLASS.surface.bgStrong,
        backdropFilter: `blur(${GLASS.surface.blur})`,
        WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
        boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        overflow: 'hidden',
        transition: `box-shadow ${GLASS.motion.duration.normal} ${GLASS.motion.easing}, transform ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
        cursor: onClick ? 'pointer' : undefined,
        '&:hover': {
          boxShadow: GLASS.shadow.cardHover,
        },
        '&:focus-visible': {
          outline: `2px solid ${GLASS.accent.orange}`,
          outlineOffset: 2,
        },
      }}
    >
      {thumbnailUrl ? (
        <CardMedia
          component="img"
          image={imageUrlService.getPublicUrl(thumbnailUrl) || thumbnailUrl}
          alt=""
          sx={{
            aspectRatio: '16/9',
            objectFit: 'cover',
            borderRadius: 0,
          }}
        />
      ) : (
        <Box
          sx={{
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.text.secondary, 0.08),
            color: 'text.secondary',
            borderRadius: 0,
          }}
        >
          {getTypeIcon(post)}
        </Box>
      )}

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              fontSize: '0.875rem',
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
            }}
          >
            {cardTitle}
          </Typography>
          <Chip
            size="small"
            label={typeLabel}
            sx={{
              height: 20,
              fontSize: '0.6875rem',
              fontWeight: 500,
              bgcolor: alpha(theme.palette.text.secondary, 0.08),
              color: 'text.secondary',
              border: 'none',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          />
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', mb: 1 }}>
          Tipo: {typeLabel}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {column === 'internal' && (
            <Chip
              size="small"
              label="Revisão do gestor"
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: alpha(theme.palette.secondary.main, 0.18),
                color: theme.palette.secondary.dark,
                border: 'none',
                borderRadius: '9999px',
              }}
            />
          )}
          <Chip
            size="small"
            icon={
              isLinkedInPlatform ? (
                <SocialPlatformIcons.LinkedInBrandIcon sx={{ fontSize: '16px !important', color: `${theme.palette.primary.main} !important` }} />
              ) : (
                <SocialPlatformIcons.InstagramBrandIcon sx={{ fontSize: '16px !important' }} />
              )
            }
            label={isLinkedInPlatform ? 'LinkedIn' : 'Instagram'}
            sx={{
              height: 20,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: isLinkedInPlatform ? 'rgba(247,66,17,0.12)' : alpha(theme.palette.secondary.main, 0.16),
              color: isLinkedInPlatform ? GLASS.accent.orange : theme.palette.secondary.dark,
              border: 'none',
              borderRadius: '9999px',
              '& .MuiChip-icon': { ml: '6px' },
            }}
          />
        </Box>
        {column === 'scheduled' && (
          <Chip
            size="small"
            label="Na fila de publicação"
            sx={{
              mb: 1,
              height: 20,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: 'rgba(247,66,17,0.12)',
              color: GLASS.accent.orangeDark,
              border: 'none',
              borderRadius: '9999px',
            }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          {isOverdue ? (
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'error.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 14 }} />
              Vencido
            </Typography>
          ) : scheduledStr ? (
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Agendado: {scheduledStr}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Sem data
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            pt: 1.5,
            mt: 1.5,
            borderTop: `1px solid ${GLASS.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: GLASS.accent.orange,
                fontSize: '0.75rem',
                fontWeight: 600,
                '&:hover': { color: GLASS.accent.orangeDark },
              }}
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
              Ver detalhes
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <CommentIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                {commentCount}
              </Typography>
            </Box>
          </Box>
          {client && (
            <Avatar
              src={getClientAvatarUrl(client)}
              sx={{
                width: 28,
                height: 28,
                fontSize: '0.75rem',
                bgcolor: theme.palette.divider,
                color: 'text.primary',
                border: '2px solid white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {client.name?.charAt(0) ?? '?'}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ApprovalKanbanCard;

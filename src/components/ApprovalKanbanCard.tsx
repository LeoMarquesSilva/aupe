import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Typography,
  Avatar,
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

const BORDER = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';
const ACCENT = '#10b981';
const ACCENT_HOVER = '#059669';
const BG_SLATE_100 = '#f1f5f9';
const BORDER_SLATE_100 = '#f1f5f9';

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
        borderRadius: '16px',
        border: `1px solid ${BORDER}`,
        bgcolor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        cursor: onClick ? 'pointer' : undefined,
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
        '&:focus-visible': {
          outline: `2px solid ${ACCENT}`,
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
            bgcolor: BG_SLATE_100,
            color: TEXT_SECONDARY,
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
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.875rem',
              color: TEXT_PRIMARY,
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
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.6875rem',
              fontWeight: 500,
              bgcolor: BG_SLATE_100,
              color: '#475569',
              border: 'none',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          />
        </Box>

        <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontSize: '0.75rem', display: 'block', mb: 1, fontFamily: '"Poppins", sans-serif' }}>
          Tipo: {typeLabel}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {column === 'internal' && (
            <Chip
              size="small"
              label="Revisão do gestor"
              sx={{
                height: 20,
                fontFamily: '"Poppins", sans-serif',
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: 'rgba(139, 92, 246, 0.12)',
                color: '#6d28d9',
                border: 'none',
                borderRadius: '9999px',
              }}
            />
          )}
          <Chip
            size="small"
            icon={
              isLinkedInPlatform ? (
                <SocialPlatformIcons.LinkedInBrandIcon sx={{ fontSize: '16px !important', color: '#0A66C2 !important' }} />
              ) : (
                <SocialPlatformIcons.InstagramBrandIcon sx={{ fontSize: '16px !important' }} />
              )
            }
            label={isLinkedInPlatform ? 'LinkedIn' : 'Instagram'}
            sx={{
              height: 20,
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: isLinkedInPlatform ? 'rgba(10, 102, 194, 0.12)' : 'rgba(225, 48, 108, 0.1)',
              color: isLinkedInPlatform ? '#0A66C2' : '#C13584',
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
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: 'rgba(37, 99, 235, 0.12)',
              color: '#1d4ed8',
              border: 'none',
              borderRadius: '9999px',
            }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <CalendarIcon sx={{ fontSize: 14, color: TEXT_SECONDARY }} />
          {isOverdue ? (
            <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 14 }} />
              Vencido
            </Typography>
          ) : scheduledStr ? (
            <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontSize: '0.75rem', color: TEXT_SECONDARY }}>
              Agendado: {scheduledStr}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontSize: '0.75rem', color: TEXT_SECONDARY }}>
              Sem data
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            pt: 1.5,
            mt: 1.5,
            borderTop: `1px solid ${BORDER_SLATE_100}`,
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
                color: ACCENT,
                fontFamily: '"Poppins", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                '&:hover': { color: ACCENT_HOVER },
              }}
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
              Ver detalhes
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: TEXT_SECONDARY }}>
              <CommentIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontFamily: '"Poppins", sans-serif', fontSize: '0.75rem' }}>
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
                bgcolor: '#e2e8f0',
                color: TEXT_PRIMARY,
                fontFamily: '"Poppins", sans-serif',
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

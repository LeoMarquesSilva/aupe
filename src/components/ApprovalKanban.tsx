import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  useMediaQuery,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Schedule as AwaitingIcon,
  CheckCircle as ApprovedIcon,
  EventAvailable as ScheduledIcon,
  Build as AdjustmentsIcon,
  FactCheck as InternalIcon,
  TaskAlt as CompletedIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { GLASS } from '../theme/glassTokens';
import ApprovalKanbanCard, {
  type ApprovalKanbanColumn,
  type ApprovalKanbanPost,
} from './ApprovalKanbanCard';
import { type ApprovalStatus, normalizeApprovalStatus } from '../types';

export interface ApprovalKanbanPostInput extends ApprovalKanbanPost {
  approvalStatus?: ApprovalStatus;
  requiresApproval?: boolean;
  forApprovalOnly?: boolean;
  requiresInternalApproval?: boolean;
  internalApprovalStatus?: 'pending' | 'approved' | 'rejected' | null;
  internalApprovalComment?: string | null;
  postingPlatform?: 'instagram' | 'linkedin';
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  approvalRespondedAt?: string | null;
  /** Fila operacional (ex.: posted = já publicado) */
  status?: string;
  postedAt?: string | null;
  posted_at?: string | null;
}

interface ApprovalKanbanProps {
  posts: ApprovalKanbanPostInput[];
  onCardClick?: (post: ApprovalKanbanPostInput) => void;
  loading?: boolean;
}

const COLUMNS: { id: ApprovalKanbanColumn; title: string; caption: string; icon: React.ReactNode; hint?: string }[] = [
  {
    id: 'internal',
    title: 'Pré-aprovação interna',
    caption: 'Revisão do gestor',
    icon: <InternalIcon />,
    hint:
      'O gestor aprova pelo link de revisão interna. Quando aprovado, o cartão passa para "Aguardando cliente". O link enviado ao cliente não é criado automaticamente: gere-o na página Aprovações.',
  },
  {
    id: 'awaiting',
    title: 'Aguardando cliente',
    caption: 'Link enviado ou pronto',
    icon: <AwaitingIcon />,
    hint:
      'Conteúdo liberado após a pré-aprovação interna (se houver). Use "Gerar link ao cliente" na página Aprovações para o cliente aprovar ou pedir ajustes.',
  },
  { id: 'approved', title: 'Aprovados', caption: 'Liberados pelo cliente', icon: <ApprovedIcon /> },
  { id: 'scheduled', title: 'Aprovados/Agendados', caption: 'Na fila de publicação', icon: <ScheduledIcon /> },
  { id: 'adjustments', title: 'Ajustes', caption: 'Cliente pediu revisão', icon: <AdjustmentsIcon /> },
  {
    id: 'completed',
    title: 'Publicados',
    caption: 'Conteúdo finalizado',
    icon: <CompletedIcon />,
    hint: 'Conteúdo já publicado no canal. Cartões compactos para não poluir o funil.',
  },
];

function CardSkeleton() {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '12px', mb: 1.5 }} />
      <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="40%" height={16} sx={{ mb: 1.5 }} />
      <Box sx={{ pt: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="circular" width={28} height={28} />
      </Box>
    </Paper>
  );
}

const ApprovalKanban: React.FC<ApprovalKanbanProps> = ({ posts, onCardClick, loading = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const boardGridSx = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, minmax(286px, 1fr))',
    gap: 2,
    alignItems: 'stretch',
    minWidth: isMobile ? 'auto' : 6 * 286 + 5 * 16,
  };
  const scrollAreaSx = {
    overflowX: isMobile ? 'visible' : 'auto',
    overflowY: 'hidden',
    pb: isMobile ? 0 : 1,
    mx: isMobile ? 0 : -0.5,
    px: isMobile ? 0 : 0.5,
    scrollbarGutter: 'stable',
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha(GLASS.accent.orange, 0.42)} transparent`,
    '&::-webkit-scrollbar': {
      height: 10,
    },
    '&::-webkit-scrollbar-track': {
      borderRadius: 999,
      backgroundColor: alpha(theme.palette.text.primary, 0.05),
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 999,
      backgroundColor: alpha(GLASS.accent.orange, 0.36),
      border: `2px solid ${alpha(theme.palette.background.paper, 0.72)}`,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: alpha(GLASS.accent.orange, 0.56),
    },
  };
  const colors = {
    internal: theme.palette.secondary.main,
    awaiting: theme.palette.warning.main,
    approved: theme.palette.success.main,
    scheduled: theme.palette.primary.main,
    adjustments: theme.palette.text.secondary,
    completed: theme.palette.success.dark,
  } as const;
  const getPostColumn = (post: ApprovalKanbanPostInput): ApprovalKanbanColumn | null => {
    const normalizedStatus = normalizeApprovalStatus(post.approvalStatus);
    const isRoteiro = (post.postType ?? post.post_type) === 'roteiro';
    const reqInt = post.requiresInternalApproval === true;
    const intOk = post.internalApprovalStatus === 'approved';
    const pub = String(post.status ?? '').toLowerCase();
    const isPublished = pub === 'posted' || pub === 'published';

    if (reqInt && !intOk) {
      return 'internal';
    }

    if (normalizedStatus === 'pending') return 'awaiting';
    if (normalizedStatus === 'rejected') return 'adjustments';
    if (normalizedStatus === 'approved') {
      if (isPublished) return 'completed';
      if (isRoteiro) return 'approved';
      return post.forApprovalOnly === false ? 'scheduled' : 'approved';
    }
    return null;
  };

  const withApproval = posts.filter(
    (p) =>
      p.requiresApproval === true ||
      p.forApprovalOnly === true ||
      (normalizeApprovalStatus(p.approvalStatus) === 'approved' && p.forApprovalOnly === false)
  );
  const byColumn = COLUMNS.map((col) => ({
    ...col,
    items: withApproval.filter((p) => getPostColumn(p) === col.id),
  }));

  if (loading) {
    return (
      <Box
        sx={{
          ...scrollAreaSx,
        }}
      >
        <Box sx={boardGridSx}>
        {COLUMNS.map((col) => (
          <Box key={col.id} sx={{ minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: GLASS.radius.inner,
                border: `1px solid ${GLASS.border.outer}`,
                borderTop: `3px solid ${colors[col.id as keyof typeof colors]}`,
                overflow: 'hidden',
                minHeight: 260,
                height: '100%',
                bgcolor: alpha(colors[col.id as keyof typeof colors], 0.035),
                backdropFilter: `blur(${GLASS.surface.blur})`,
                WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
                boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
              }}
            >
              <Box
                sx={{
                  px: 1.35,
                  py: 1.2,
                  minHeight: 74,
                  borderBottom: `1px solid ${GLASS.border.subtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  background: `linear-gradient(135deg, ${alpha(colors[col.id as keyof typeof colors], 0.16)} 0%, ${alpha(colors[col.id as keyof typeof colors], 0.045)} 100%)`,
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors[col.id as keyof typeof colors],
                    bgcolor: alpha(colors[col.id as keyof typeof colors], 0.13),
                    border: `1px solid ${alpha(colors[col.id as keyof typeof colors], 0.18)}`,
                    flexShrink: 0,
                    '& .MuiSvgIcon-root': { fontSize: 19 },
                  }}
                >
                  {col.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: GLASS.text.heading, fontSize: '0.83rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {col.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: GLASS.text.muted, display: 'block', fontSize: '0.68rem', lineHeight: 1.2, mt: 0.3 }}>
                    {col.caption}
                  </Typography>
                </Box>
                <Skeleton variant="rounded" width={34} height={24} sx={{ borderRadius: 999 }} />
              </Box>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <CardSkeleton />
                <CardSkeleton />
              </Box>
            </Paper>
          </Box>
        ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...scrollAreaSx,
      }}
    >
      <Box sx={boardGridSx}>
      {byColumn.map((col, colIndex) => (
        <motion.div
          key={col.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: colIndex * 0.08 }}
          style={{ height: '100%' }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: GLASS.radius.inner,
              border: `1px solid ${GLASS.border.outer}`,
              borderTop: `3px solid ${colors[col.id as keyof typeof colors]}`,
              overflow: 'hidden',
              minHeight: 260,
              height: '100%',
              bgcolor: alpha(colors[col.id as keyof typeof colors], 0.035),
              backdropFilter: `blur(${GLASS.surface.blur})`,
              WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
              boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
              transition: `border-color ${GLASS.motion.duration.normal} ${GLASS.motion.easing}, box-shadow ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              '&:hover': {
                borderColor: alpha(colors[col.id as keyof typeof colors], 0.38),
                boxShadow: GLASS.shadow.cardHover,
              },
            }}
          >
            <Box
              sx={{
                px: 1.35,
                py: 1.2,
                minHeight: 74,
                borderBottom: `1px solid ${GLASS.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                background: `linear-gradient(135deg, ${alpha(colors[col.id as keyof typeof colors], 0.16)} 0%, ${alpha(colors[col.id as keyof typeof colors], 0.045)} 100%)`,
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors[col.id as keyof typeof colors],
                  bgcolor: alpha(colors[col.id as keyof typeof colors], 0.13),
                  border: `1px solid ${alpha(colors[col.id as keyof typeof colors], 0.18)}`,
                  flexShrink: 0,
                  '& .MuiSvgIcon-root': { fontSize: 19 },
                }}
              >
                {col.icon}
              </Box>
              {col.hint ? (
                <Tooltip title={col.hint} arrow placement="top">
                  <Box
                    component="span"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      cursor: 'help',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      component="span"
                      sx={{
                        color: GLASS.text.heading,
                        fontSize: '0.83rem',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        borderBottom: `1px dotted ${GLASS.text.muted}`,
                      }}
                    >
                      {col.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: GLASS.text.muted, display: 'block', fontSize: '0.68rem', lineHeight: 1.2, mt: 0.3 }}>
                      {col.caption}
                    </Typography>
                  </Box>
                </Tooltip>
              ) : (
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{
                      color: GLASS.text.heading,
                      fontSize: '0.83rem',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    }}
                  >
                    {col.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: GLASS.text.muted, display: 'block', fontSize: '0.68rem', lineHeight: 1.2, mt: 0.3 }}>
                    {col.caption}
                  </Typography>
                </Box>
              )}
              <Box
                component="span"
                sx={{
                  minWidth: 34,
                  height: 26,
                  px: 1,
                  borderRadius: 999,
                  bgcolor: alpha(colors[col.id as keyof typeof colors], 0.14),
                  border: `1px solid ${alpha(colors[col.id as keyof typeof colors], 0.22)}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: colors[col.id as keyof typeof colors],
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {col.items.length}
              </Box>
            </Box>
            <Box
              sx={{
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                minHeight: isMobile ? 220 : 360,
                maxHeight: isMobile ? 360 : 'min(64vh, 620px)',
                overflow: 'auto',
                bgcolor: 'transparent',
                scrollbarWidth: 'thin',
                scrollbarColor: `${alpha(colors[col.id as keyof typeof colors], 0.42)} transparent`,
                '&::-webkit-scrollbar': {
                  width: 8,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  borderRadius: 999,
                  backgroundColor: alpha(colors[col.id as keyof typeof colors], 0.28),
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: alpha(colors[col.id as keyof typeof colors], 0.44),
                },
              }}
            >
              {col.items.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 2,
                    textAlign: 'center',
                    color: 'text.secondary',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {col.icon}
                  <Typography variant="body2">
                    {col.id === 'internal' && 'Nenhum item em revisão interna.'}
                    {col.id === 'awaiting' && 'Nenhum item aguardando o cliente.'}
                    {col.id === 'approved' && 'Nenhum item aprovado.'}
                    {col.id === 'scheduled' && 'Nenhum item aprovado e agendado.'}
                    {col.id === 'adjustments' && 'Nenhum item com ajuste solicitado.'}
                    {col.id === 'completed' && 'Nenhum item publicado ainda neste filtro.'}
                  </Typography>
                </Box>
              ) : (
                col.items.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                  >
                    <ApprovalKanbanCard
                      post={post as ApprovalKanbanPost}
                      column={col.id}
                      onClick={onCardClick ? () => onCardClick(post) : undefined}
                    />
                  </motion.div>
                ))
              )}
            </Box>
          </Paper>
        </motion.div>
      ))}
      </Box>
    </Box>
  );
};

export default ApprovalKanban;

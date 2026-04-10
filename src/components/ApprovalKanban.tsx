import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  useMediaQuery,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Schedule as AwaitingIcon,
  CheckCircle as ApprovedIcon,
  EventAvailable as ScheduledIcon,
  Build as AdjustmentsIcon,
  FactCheck as InternalIcon,
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
}

interface ApprovalKanbanProps {
  posts: ApprovalKanbanPostInput[];
  onCardClick?: (post: ApprovalKanbanPostInput) => void;
  loading?: boolean;
}

const COLUMNS: { id: ApprovalKanbanColumn; title: string; icon: React.ReactNode; hint?: string }[] = [
  {
    id: 'internal',
    title: 'Pré-aprovação interna',
    icon: <InternalIcon />,
    hint:
      'O gestor aprova pelo link de revisão interna. Quando aprovado, o cartão passa para "Aguardando cliente". O link enviado ao cliente não é criado automaticamente: gere-o na página Aprovações.',
  },
  {
    id: 'awaiting',
    title: 'Aguardando cliente',
    icon: <AwaitingIcon />,
    hint:
      'Conteúdo liberado após a pré-aprovação interna (se houver). Use "Gerar link ao cliente" na página Aprovações para o cliente aprovar ou pedir ajustes.',
  },
  { id: 'approved', title: 'Aprovados', icon: <ApprovedIcon /> },
  { id: 'scheduled', title: 'Aprovados/Agendados', icon: <ScheduledIcon /> },
  { id: 'adjustments', title: 'Ajustes', icon: <AdjustmentsIcon /> },
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
  const isMobile = useMediaQuery('(max-width:900px)');
  const colors = {
    internal: theme.palette.secondary.main,
    awaiting: theme.palette.warning.main,
    approved: theme.palette.success.main,
    scheduled: theme.palette.primary.main,
    adjustments: theme.palette.text.secondary,
  } as const;
  const getPostColumn = (post: ApprovalKanbanPostInput): ApprovalKanbanColumn | null => {
    const normalizedStatus = normalizeApprovalStatus(post.approvalStatus);
    const isRoteiro = (post.postType ?? post.post_type) === 'roteiro';
    const reqInt = post.requiresInternalApproval === true;
    const intOk = post.internalApprovalStatus === 'approved';

    if (reqInt && !intOk) {
      return 'internal';
    }

    if (normalizedStatus === 'pending') return 'awaiting';
    if (normalizedStatus === 'rejected') return 'adjustments';
    if (normalizedStatus === 'approved') {
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
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((col, colIndex) => (
          <Box key={col.id}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: GLASS.radius.inner,
                border: `1px solid ${GLASS.border.outer}`,
                borderTop: `3px solid ${colors[col.id as keyof typeof colors]}`,
                overflow: 'hidden',
                minHeight: 200,
                bgcolor: GLASS.surface.bg,
                backdropFilter: `blur(${GLASS.surface.blur})`,
                WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
                boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderBottom: `1px solid ${GLASS.border.subtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ color: colors[col.id as keyof typeof colors], '& .MuiSvgIcon-root': { fontSize: 18 } }}>
                  {col.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, color: GLASS.text.heading, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.title}
                </Typography>
                <Skeleton variant="rounded" width={24} height={20} />
              </Box>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <CardSkeleton />
                <CardSkeleton />
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))',
        gap: 2,
        alignItems: 'flex-start',
      }}
    >
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
              minHeight: 200,
              bgcolor: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
              WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
              boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderBottom: `1px solid ${GLASS.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors[col.id as keyof typeof colors],
                  '& .MuiSvgIcon-root': { fontSize: 18 },
                }}
              >
                {col.icon}
              </Box>
              {col.hint ? (
                <Tooltip title={col.hint} arrow placement="top">
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    component="span"
                    sx={{
                      flex: 1,
                      color: GLASS.text.heading,
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'help',
                      borderBottom: `1px dotted ${GLASS.text.muted}`,
                    }}
                  >
                    {col.title}
                  </Typography>
                </Tooltip>
              ) : (
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{
                    flex: 1,
                    color: GLASS.text.heading,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col.title}
                </Typography>
              )}
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: GLASS.radius.buttonSm,
                  bgcolor: GLASS.surface.bgStrong,
                  border: `1px solid ${GLASS.border.subtle}`,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: GLASS.text.muted,
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
                maxHeight: isMobile ? 320 : 420,
                overflow: 'auto',
                bgcolor: 'transparent',
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
  );
};

export default ApprovalKanban;

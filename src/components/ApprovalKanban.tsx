import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  useMediaQuery,
} from '@mui/material';
import {
  Schedule as AwaitingIcon,
  CheckCircle as ApprovedIcon,
  EventAvailable as ScheduledIcon,
  Build as AdjustmentsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ApprovalKanbanCard, {
  type ApprovalKanbanColumn,
  type ApprovalKanbanPost,
} from './ApprovalKanbanCard';
import { type ApprovalStatus, normalizeApprovalStatus } from '../types';

const COLORS = {
  awaiting: '#f59e0b',
  approved: '#10b981',
  scheduled: '#2563eb',
  adjustments: '#64748b',
} as const;

const BG_COLUMN = '#f8fafc';
const BORDER = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';

export interface ApprovalKanbanPostInput extends ApprovalKanbanPost {
  approvalStatus?: ApprovalStatus;
  requiresApproval?: boolean;
  forApprovalOnly?: boolean;
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

const COLUMNS: { id: ApprovalKanbanColumn; title: string; icon: React.ReactNode }[] = [
  { id: 'awaiting', title: 'Aguardando aprovação', icon: <AwaitingIcon /> },
  { id: 'approved', title: 'Aprovados', icon: <ApprovedIcon /> },
  { id: 'scheduled', title: 'Aprovados/Agendados', icon: <ScheduledIcon /> },
  { id: 'adjustments', title: 'Ajustes', icon: <AdjustmentsIcon /> },
];

function CardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: '16px',
        border: `1px solid ${BORDER}`,
        bgcolor: '#ffffff',
      }}
    >
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '12px', mb: 1.5 }} />
      <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="40%" height={16} sx={{ mb: 1.5 }} />
      <Box sx={{ pt: 1.5, borderTop: `1px solid #f1f5f9`, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="circular" width={28} height={28} />
      </Box>
    </Paper>
  );
}

const ApprovalKanban: React.FC<ApprovalKanbanProps> = ({ posts, onCardClick, loading = false }) => {
  const isMobile = useMediaQuery('(max-width:900px)');
  const getPostColumn = (post: ApprovalKanbanPostInput): ApprovalKanbanColumn | null => {
    const normalizedStatus = normalizeApprovalStatus(post.approvalStatus);
    const isRoteiro = (post.postType ?? post.post_type) === 'roteiro';

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
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((col, colIndex) => (
          <Box key={col.id}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '10px',
                border: `1px solid ${BORDER}`,
                overflow: 'hidden',
                minHeight: 200,
                bgcolor: BG_COLUMN,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderBottom: `1px solid ${BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ color: COLORS[col.id as keyof typeof COLORS], '& .MuiSvgIcon-root': { fontSize: 18 } }}>
                  {col.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, color: TEXT_PRIMARY, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
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
              borderRadius: '10px',
              border: `1px solid ${BORDER}`,
              overflow: 'hidden',
              minHeight: 200,
              bgcolor: BG_COLUMN,
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderBottom: `1px solid ${BORDER}`,
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
                  color: COLORS[col.id as keyof typeof COLORS],
                  '& .MuiSvgIcon-root': { fontSize: 18 },
                }}
              >
                {col.icon}
              </Box>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{
                  flex: 1,
                  color: TEXT_PRIMARY,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: '"Poppins", sans-serif',
                }}
              >
                {col.title}
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: '#e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: TEXT_SECONDARY,
                  fontFamily: '"Poppins", sans-serif',
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
                bgcolor: BG_COLUMN,
              }}
            >
              {col.items.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 2,
                    textAlign: 'center',
                    color: TEXT_SECONDARY,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {col.icon}
                  <Typography variant="body2" sx={{ fontFamily: '"Poppins", sans-serif' }}>
                    {col.id === 'awaiting' && 'Nenhum item aguardando aprovação.'}
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

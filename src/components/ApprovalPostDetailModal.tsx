import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Avatar,
  Chip,
  useTheme,
  alpha,
  CardMedia,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
  LinkOff as LinkOffIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { roleService } from '../services/roleService';
import { imageUrlService } from '../services/imageUrlService';
import { postService } from '../services/supabaseClient';
import { removePostFromApproval, updateInternalApproval } from '../services/approvalService';
import DateTimePicker from './DateTimePicker';
import type { ApprovalKanbanPostInput } from './ApprovalKanban';
import * as SocialPlatformIcons from './icons/SocialPlatformIcons';
import { GLASS } from '../theme/glassTokens';

interface ApprovalPostDetailModalProps {
  open: boolean;
  post: ApprovalKanbanPostInput | null;
  onClose: () => void;
  onScheduleSuccess?: () => void;
  onRemoveFromApproval?: () => void;
  onDeletePost?: () => void;
  onEditRequest?: () => void;
  onInternalApprovalSuccess?: () => void;
}

const getThumbnailUrl = (post: ApprovalKanbanPostInput): string | null => {
  const arr = post.images ?? [];
  const first = arr[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url;
  if (post.video) return post.video;
  return null;
};

/** Retorna todas as URLs de imagem do post (para carrossel) */
const getAllImageUrls = (post: ApprovalKanbanPostInput): string[] => {
  const arr = post.images ?? [];
  return arr.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'url' in item) return (item as { url: string }).url;
    return '';
  }).filter(Boolean);
};

const isCarousel = (post: ApprovalKanbanPostInput): boolean =>
  Array.isArray(post.images) && post.images.length > 1;

const isVideoPost = (post: ApprovalKanbanPostInput): boolean =>
  !!(post.video || post.postType === 'reels' || post.post_type === 'reels');

const getTypeLabel = (post: ApprovalKanbanPostInput): string => {
  const type = post.postType ?? post.post_type;
  if (type === 'roteiro') return 'Roteiro';
  if (type === 'reels' || post.video) return 'Reels';
  if (type === 'stories') return 'Story';
  if (Array.isArray(post.images) && post.images.length > 1) return 'Carrossel';
  return 'Post';
};

const getStatusLabel = (status: string | undefined, isInPublishingQueue: boolean): string => {
  switch (status) {
    case 'pending':
      return 'Aguardando aprovação';
    case 'approved':
      return isInPublishingQueue ? 'Aprovado • Na fila' : 'Aprovado';
    case 'rejected':
      return 'Ajustes solicitados';
    default:
      return status ?? '—';
  }
};

const ApprovalPostDetailModal: React.FC<ApprovalPostDetailModalProps> = ({
  open,
  post,
  onClose,
  onScheduleSuccess,
  onRemoveFromApproval,
  onDeletePost,
  onEditRequest,
  onInternalApprovalSuccess,
}) => {
  const theme = useTheme();
  const [creatorLabel, setCreatorLabel] = useState<string>('—');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [internalComment, setInternalComment] = useState('');
  const [internalBusy, setInternalBusy] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !post?.userId) {
      setCreatorLabel('—');
      return;
    }
    let cancelled = false;
    roleService.getUserProfileById(post.userId).then((profile) => {
      if (cancelled) return;
      setCreatorLabel(
        profile?.full_name?.trim() || profile?.email || '—'
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, post?.userId]);

  useEffect(() => {
    if (open && post) {
      const initial = post.scheduledDate ?? post.scheduled_date ?? '';
      setScheduleDate(initial || '');
      setScheduleError(null);
      setInternalComment('');
      setInternalError(null);
    }
  }, [open, post]);

  const handleInternalDecision = async (status: 'approved' | 'rejected') => {
    if (!post || internalBusy) return;
    setInternalBusy(true);
    setInternalError(null);
    try {
      await updateInternalApproval(post.id, status, internalComment);
      onInternalApprovalSuccess?.();
      onClose();
    } catch (e) {
      setInternalError(e instanceof Error ? e.message : 'Erro ao registrar revisão interna.');
    } finally {
      setInternalBusy(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!post || !scheduleDate || scheduling) return;
    if ((post.postType ?? post.post_type) === 'roteiro') return;
    if (scheduleDate === (post.scheduledDate ?? post.scheduled_date ?? '')) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      const isLinkedIn = (post.postingPlatform ?? 'instagram') === 'linkedin';
      const isAlreadyScheduledInQueue = post.approvalStatus === 'approved' && post.forApprovalOnly === false;
      await postService.updateScheduledPost(post.id, {
        scheduledDate: scheduleDate,
        ...(isLinkedIn
          ? {}
          : isAlreadyScheduledInQueue
            ? {}
            : { forApprovalOnly: false }),
      });
      onScheduleSuccess?.();
      onClose();
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : 'Erro ao salvar data do post.');
    } finally {
      setScheduling(false);
    }
  };

  const handleRemoveFromApproval = async () => {
    if (!post || removing) return;
    if (!window.confirm('Remover este post da aprovação? Ele sairá de "Aguardando aprovação" e do link enviado ao cliente.')) return;
    setRemoving(true);
    setActionError(null);
    try {
      await removePostFromApproval(post.id);
      onRemoveFromApproval?.();
      onClose();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao remover da aprovação.');
    } finally {
      setRemoving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || deleting) return;
    if (!window.confirm('Excluir este post permanentemente? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    setActionError(null);
    try {
      await postService.deleteScheduledPost(post.id);
      onDeletePost?.();
      onClose();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao excluir post.');
    } finally {
      setDeleting(false);
    }
  };

  if (!post) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          },
        }}
      >
        <DialogTitle>Detalhes da postagem</DialogTitle>
        <DialogContent />
      </Dialog>
    );
  }

  const thumbnailUrl = getThumbnailUrl(post);
  const typeLabel = getTypeLabel(post);
  const initialScheduleDate = post.scheduledDate ?? post.scheduled_date ?? '';
  const scheduledStr = post.scheduledDate ?? post.scheduled_date
    ? format(new Date(post.scheduledDate ?? post.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;
  const createdAtStr = post.createdAt
    ? format(new Date(post.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;
  const respondedStr = post.approvalRespondedAt
    ? format(new Date(post.approvalRespondedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;
  const client = post.client;
  const isApproved = post.approvalStatus === 'approved';
  const isRoteiro = (post.postType ?? post.post_type) === 'roteiro';
  const isLinkedIn = (post.postingPlatform ?? 'instagram') === 'linkedin';
  const isInPublishingQueue = isApproved && post.forApprovalOnly === false;
  const needsInternal = post.requiresInternalApproval === true && post.internalApprovalStatus !== 'approved';
  const hasScheduleChanged = Boolean(scheduleDate) && scheduleDate !== initialScheduleDate;
  const clientAvatarUrl = client
    ? imageUrlService.getPublicUrl(client.profilePicture || client.logoUrl)
    : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: GLASS.radius.card,
          bgcolor: GLASS.surface.bgStrong,
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
          border: `1px solid ${GLASS.border.outer}`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, color: GLASS.text.heading }}>
        Detalhes da postagem
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Vídeo (Reels / post com video) */}
          {isVideoPost(post) && post.video && (
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'grey.900',
                maxHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                src={imageUrlService.getPublicUrl(post.video)}
                controls
                playsInline
                style={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}

          {/* Carrossel: todas as imagens */}
          {!post.video && isCarousel(post) && (() => {
            const urls = getAllImageUrls(post);
            return (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Carrossel ({urls.length} imagens)
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 1,
                    borderRadius: 2,
                    bgcolor: 'grey.200',
                    p: 1,
                    '& > *': { flexShrink: 0 },
                  }}
                >
                  {urls.map((url, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 200,
                        minWidth: 200,
                        height: 280,
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'grey.300',
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={imageUrlService.getPublicUrl(url) || url}
                        alt={`Slide ${idx + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}

          {/* Imagem única (post sem carrossel e sem vídeo) */}
          {!post.video && !isCarousel(post) && thumbnailUrl && (
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'grey.200',
                maxHeight: 400,
              }}
            >
              <CardMedia
                component="img"
                image={imageUrlService.getPublicUrl(thumbnailUrl) || thumbnailUrl}
                alt=""
                sx={{ maxHeight: 400, width: '100%', objectFit: 'contain' }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={typeLabel}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.12),
                color: theme.palette.success.dark,
                fontWeight: 600,
              }}
            />
            <Chip
              label={getStatusLabel(post.approvalStatus, isInPublishingQueue)}
              size="small"
              color={
                post.approvalStatus === 'approved'
                  ? 'success'
                  : post.approvalStatus === 'rejected'
                    ? 'error'
                    : 'warning'
              }
              sx={{ fontWeight: 510 }}
            />
            {isInPublishingQueue && !isLinkedIn && (
              <Chip
                label="Publicação automática ativa"
                size="small"
                variant="outlined"
                color="info"
                sx={{ fontWeight: 510 }}
              />
            )}
            {isLinkedIn && (
              <Chip
                size="small"
                icon={
                  <SocialPlatformIcons.LinkedInBrandIcon
                    sx={{ fontSize: '16px !important', color: `${GLASS.accent.orange} !important` }}
                  />
                }
                label="LinkedIn"
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  bgcolor: 'rgba(247, 66, 17, 0.12)',
                  color: GLASS.accent.orange,
                  border: 'none',
                  borderRadius: '9999px',
                  '& .MuiChip-icon': { ml: '6px' },
                }}
              />
            )}
          </Box>

          {needsInternal && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
                bgcolor: alpha(theme.palette.secondary.main, 0.06),
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Pré-aprovação interna
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {post.internalApprovalStatus === 'rejected'
                  ? 'Conteúdo reprovado na revisão interna. Ajuste e registre nova decisão, ou aprove se já estiver ok.'
                  : 'A equipe precisa aprovar antes de incluir este post no link enviado ao cliente.'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Comentário (opcional)"
                value={internalComment}
                onChange={(e) => setInternalComment(e.target.value)}
                multiline
                minRows={2}
                sx={{ mb: 1.5 }}
              />
              {internalError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {internalError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={internalBusy}
                  onClick={() => handleInternalDecision('approved')}
                  sx={{ textTransform: 'none' }}
                >
                  {internalBusy ? <CircularProgress size={20} color="inherit" /> : 'Aprovar internamente'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={internalBusy}
                  onClick={() => handleInternalDecision('rejected')}
                  sx={{ textTransform: 'none' }}
                >
                  Reprovar internamente
                </Button>
              </Box>
            </Box>
          )}

          {post.approvalStatus === 'pending' && (onRemoveFromApproval || onDeletePost) && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                bgcolor: alpha(theme.palette.warning.main, 0.06),
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Ações
              </Typography>
              {actionError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {actionError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {onRemoveFromApproval && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={removing ? <CircularProgress size={18} color="inherit" /> : <LinkOffIcon />}
                    onClick={handleRemoveFromApproval}
                    disabled={removing || deleting}
                    sx={{ textTransform: 'none' }}
                  >
                    {removing ? 'Removendo…' : 'Remover da aprovação'}
                  </Button>
                )}
                {onDeletePost && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    onClick={handleDeletePost}
                    disabled={removing || deleting}
                    sx={{ textTransform: 'none' }}
                  >
                    {deleting ? 'Excluindo…' : 'Excluir post'}
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {isApproved && !isRoteiro && !isLinkedIn && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                bgcolor: alpha(theme.palette.success.main, 0.06),
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                {isInPublishingQueue ? 'Ajustar agendamento' : 'Agendar postagem'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {isInPublishingQueue
                  ? 'Este post já está na fila de publicação. Ajuste a data e horário para reagendar.'
                  : 'Ajuste a data e horário e clique em "Agendar post" para enviar para a fila de publicação.'}
              </Typography>
              <DateTimePicker
                scheduledDate={scheduleDate || (post.scheduledDate ?? post.scheduled_date ?? new Date().toISOString())}
                onChange={setScheduleDate}
              />
              {isInPublishingQueue && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  O envio para o Instagram acontece automaticamente no horário agendado.
                </Alert>
              )}
              {scheduleError && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {scheduleError}
                </Alert>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={scheduling ? <CircularProgress size={18} color="inherit" /> : <ScheduleIcon />}
                onClick={handleSchedulePost}
                disabled={scheduling || !scheduleDate || !hasScheduleChanged}
                fullWidth
                sx={{ mt: 1.5, textTransform: 'none' }}
              >
                {scheduling
                  ? (isInPublishingQueue ? 'Salvando…' : 'Agendando…')
                  : !hasScheduleChanged
                    ? 'Sem alterações de data'
                    : (isInPublishingQueue ? 'Salvar nova data' : 'Agendar post')}
              </Button>
            </Box>
          )}

          {isApproved && isRoteiro && (
            <Alert severity="info">
              Roteiro aprovado. Este tipo de conteúdo é de aprovação interna e não entra na fila de postagem automática.
            </Alert>
          )}

          {isApproved && isLinkedIn && (
            <Alert severity="info">
              Conteúdo LinkedIn aprovado pelo cliente. Não há publicação automática no sistema; use a data como referência para postar manualmente no LinkedIn.
            </Alert>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Legenda
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
              {post.caption?.trim() || 'Sem legenda'}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {scheduledStr && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Data agendada
                  </Typography>
                  <Typography variant="body2">
                    {scheduledStr}
                  </Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Usuário que enviou
                </Typography>
                <Typography variant="body2">
                  {creatorLabel}
                </Typography>
              </Box>
            </Box>
            {createdAtStr && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Data de envio
                  </Typography>
                  <Typography variant="body2">
                    {createdAtStr}
                  </Typography>
                </Box>
              </Box>
            )}
            {respondedStr ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Data de aprovação
                  </Typography>
                  <Typography variant="body2">
                    {respondedStr}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Aguardando resposta do cliente
                </Typography>
              </Box>
            )}
          </Box>

          {client && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: GLASS.radius.inner,
                border: `1px solid ${GLASS.border.outer}`,
                bgcolor: GLASS.surface.bg,
                backdropFilter: `blur(${GLASS.surface.blur})`,
                WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
                boxShadow: GLASS.shadow.cardInset,
              }}
            >
              <Avatar
                src={clientAvatarUrl}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: 'rgba(247, 66, 17, 0.15)',
                }}
              >
                {client.name?.charAt(0) ?? '?'}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {client.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {client.instagram ? `@${client.instagram}` : '—'}
                </Typography>
              </Box>
            </Box>
          )}

          {post.approvalStatus === 'rejected' && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                bgcolor: alpha(theme.palette.error.main, 0.05),
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Corrigir e reenviar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Faça os ajustes solicitados pelo cliente e reenvie o post para aprovação.
              </Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={<EditIcon />}
                onClick={() => {
                  onEditRequest?.();
                  onClose();
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Editar e reenviar
              </Button>
            </Box>
          )}

          {post.approvalStatus === 'rejected' && post.approvalFeedback && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                borderLeft: `4px solid ${theme.palette.info.main}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 600,
                  color: 'text.primary',
                }}
              >
                <CommentIcon sx={{ fontSize: 16 }} />
                Ajustes solicitados
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {post.approvalFeedback}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
      </DialogActions>

    </Dialog>
  );
};

export default ApprovalPostDetailModal;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { postService } from '../services/supabaseClient';
import {
  addPostsToApprovalRequest,
  getPostIdsInActiveLinks,
} from '../services/approvalService';
import { GLASS } from '../theme/glassTokens';

interface AddPostsToLinkDialogProps {
  open: boolean;
  onClose: () => void;
  /** approval_requests.id do link ao qual os posts serão adicionados */
  requestId: string | null;
  clientId: string | null;
  clientName: string;
  onAdded?: () => void;
}

type PostRow = {
  id: string;
  caption?: string;
  images?: (string | { url: string })[];
  video?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  status?: string;
  approval_status?: string;
  approvalStatus?: string;
  post_type?: string;
  postType?: string;
  requires_internal_approval?: boolean;
  requiresInternalApproval?: boolean;
  internal_approval_status?: string | null;
  internalApprovalStatus?: string | null;
};

function isInternalReady(post: PostRow): boolean {
  const req = post.requiresInternalApproval === true || post.requires_internal_approval === true;
  if (!req) return true;
  const st = post.internalApprovalStatus ?? post.internal_approval_status;
  return st === 'approved';
}

function getImageUrl(post: PostRow): string | null {
  const first = (post.images ?? [])[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) return (first as { url: string }).url;
  return null;
}

function getTypeLabel(post: PostRow): string {
  const type = post.postType ?? post.post_type;
  if (type === 'reels' || post.video) return 'Reels';
  if (type === 'stories') return 'Story';
  if (Array.isArray(post.images) && post.images.length > 1) return 'Carrossel';
  if (type === 'roteiro') return 'Roteiro';
  return 'Post';
}

function getScheduledDate(post: PostRow): string {
  const raw = post.scheduledDate ?? post.scheduled_date;
  if (!raw) return '—';
  try {
    return format(new Date(raw), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
}

const AddPostsToLinkDialog: React.FC<AddPostsToLinkDialogProps> = ({
  open,
  onClose,
  requestId,
  clientId,
  clientName,
  onAdded,
}) => {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, activeIds] = await Promise.all([
        postService.getScheduledPostsByClient(clientId),
        getPostIdsInActiveLinks(clientId),
      ]);
      const list = (data || []) as PostRow[];
      const pending = list.filter((p) => {
        const status = p.status;
        const approval = p.approvalStatus ?? p.approval_status;
        return status === 'pending' && approval !== 'approved';
      });
      setPosts(pending);
      setLinkedIds(activeIds);
    } catch {
      setError('Não foi possível carregar os posts do cliente.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSuccess(null);
      setError(null);
      load();
    }
  }, [open, load]);

  const eligiblePosts = useMemo(
    () => posts.filter((p) => !linkedIds.has(p.id) && isInternalReady(p)),
    [posts, linkedIds]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!requestId || selected.size === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await addPostsToApprovalRequest(requestId, Array.from(selected));
      setSuccess(
        `${res.added} post(s) adicionado(s) ao link. O cliente já os vê no mesmo link enviado.`
      );
      setSelected(new Set());
      onAdded?.();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar posts ao link.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: GLASS.radius.card,
          maxHeight: '90vh',
          bgcolor: GLASS.surface.bgStrong,
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
          border: `1px solid ${GLASS.border.outer}`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Adicionar posts ao link</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Os posts selecionados entram no <strong>mesmo link</strong> já enviado a{' '}
          <strong>{clientName}</strong> — sem gerar um novo URL. Eles aparecem como
          &quot;aguardando aprovação&quot;; os posts já aprovados no link não são alterados.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : eligiblePosts.length === 0 ? (
          <Alert severity="info">
            Nenhum post disponível para adicionar. Crie novo conteúdo em &quot;Adicionar
            conteúdo&quot; ou verifique se os posts já não estão em outro link ativo.
          </Alert>
        ) : (
          <Grid container spacing={1.5}>
            {eligiblePosts.map((post) => {
              const imageUrl = getImageUrl(post);
              const isSelected = selected.has(post.id);
              return (
                <Grid item xs={12} sm={6} key={post.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(post.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggle(post.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ alignSelf: 'center', py: 0 }}
                    />
                    {imageUrl ? (
                      <CardMedia
                        component="img"
                        sx={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }}
                        image={imageUrl}
                        alt=""
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {post.video ? (
                          <VideoIcon fontSize="small" color="action" />
                        ) : (
                          <ImageIcon fontSize="small" color="action" />
                        )}
                      </Box>
                    )}
                    <CardContent sx={{ flex: 1, py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <ScheduleIcon sx={{ fontSize: 12 }} />
                        {getScheduledDate(post)}
                      </Typography>
                      <Chip
                        label={getTypeLabel(post)}
                        size="small"
                        sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontSize: '0.75rem',
                        }}
                      >
                        {post.caption || 'Sem legenda'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
        <Tooltip title={selected.size === 0 ? 'Selecione ao menos um post' : ''}>
          <span>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
              onClick={handleAdd}
              disabled={saving || selected.size === 0}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: GLASS.accent.orange,
                '&:hover': { bgcolor: GLASS.accent.orangeDark },
              }}
            >
              {saving ? 'Adicionando…' : `Adicionar ao link${selected.size ? ` (${selected.size})` : ''}`}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default AddPostsToLinkDialog;

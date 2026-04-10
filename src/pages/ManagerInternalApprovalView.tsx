/**
 * Public page: gestor approves/rejects internal pre-approval via token (no login).
 */
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  TextField,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  Chip,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FactCheck as FactCheckIcon,
  OpenInFull as OpenInFullIcon,
} from '@mui/icons-material';
import { Instagram as InstagramIcon } from '@mui/icons-material';
import * as SocialPlatformIcons from '../components/icons/SocialPlatformIcons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  fetchInternalApprovalByToken,
  submitInternalApprovalResponse,
  type InternalApprovalPublicData,
} from '../services/approvalService';
import PublicApprovalPostExpandedDialog from '../components/PublicApprovalPostExpandedDialog';
import {
  PostMediaPreview,
  getFirstImageUrl,
  getImageUrls,
  POST_TYPE,
} from '../components/PublicApprovalPostMedia';
import { GLASS } from '../theme/glassTokens';
import { resolveAgencyLogoSrc } from '../services/imageUrlService';

type PostRow = InternalApprovalPublicData['posts'][number];

const APP_NAME = 'INSYT';

const ManagerInternalApprovalView: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const rawToken = tokenFromPath || tokenFromQuery || '';
  const decodedToken = rawToken ? decodeURIComponent(rawToken) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InternalApprovalPublicData | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [focusPost, setFocusPost] = useState<PostRow | null>(null);

  useEffect(() => {
    if (!decodedToken) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchInternalApprovalByToken(decodedToken)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Link inválido ou expirado.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decodedToken]);

  const handleApprove = async (postId: string) => {
    setSubmitting(postId);
    try {
      const result = await submitInternalApprovalResponse(decodedToken, postId, 'approve');
      setData((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId ? { ...p, internalApprovalStatus: 'approved' } : p
              ),
            }
          : null
      );
      setSnackbar({
        open: true,
        message:
          result.message ||
          'Aprovado. No painel INSYT o post aparece na coluna "Aguardando cliente". Gere o link ao cliente na página Aprovações.',
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: e instanceof Error ? e.message : 'Erro ao aprovar.',
        severity: 'error',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleRejectSubmit = async (postId: string) => {
    setSubmitting(postId);
    try {
      const result = await submitInternalApprovalResponse(
        decodedToken,
        postId,
        'reject',
        rejectComment
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      internalApprovalStatus: 'rejected',
                      internalApprovalComment: rejectComment,
                    }
                  : p
              ),
            }
          : null
      );
      setRejectPostId(null);
      setRejectComment('');
      setSnackbar({
        open: true,
        message:
          result.message ||
          'Ajustes registrados. A equipe verá o comentário no painel; o cartão permanece em revisão interna até nova aprovação.',
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: e instanceof Error ? e.message : 'Erro ao enviar.',
        severity: 'error',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const renderHeader = (expiresAt?: string) => (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderRadius: '0 0 20px 20px',
        backgroundColor: GLASS.surface.bgStrong,
        backdropFilter: `blur(${GLASS.surface.blur})`,
        WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
        border: `1px solid ${GLASS.border.outer}`,
        borderTop: 'none',
        boxShadow: GLASS.shadow.card,
      }}
    >
      <Toolbar sx={{ minHeight: 56, py: 0, px: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: { xs: 1, md: 3 } }}>
          <Avatar
            src={resolveAgencyLogoSrc(data?.organization?.agencyLogoUrl)}
            alt={APP_NAME}
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              boxShadow: GLASS.shadow.avatar,
              border: `2px solid ${GLASS.accent.orange}`,
            }}
          />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="subtitle1" sx={{  fontWeight: 600, color: GLASS.text.heading }}>
              {APP_NAME}
            </Typography>
            <Typography variant="caption" sx={{  color: GLASS.text.muted }}>
              Revisão interna (gestor)
            </Typography>
          </Box>
        </Box>
        <FactCheckIcon sx={{ ml: 1, color: GLASS.accent.orange, display: { xs: 'none', sm: 'block' } }} />
        {expiresAt && (
          <Typography variant="caption" sx={{ ml: 'auto', color: GLASS.text.muted, fontWeight: 500 }}>
            Link expira em {format(parseISO(expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
        {renderHeader()}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Carregando...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
        {renderHeader()}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Paper elevation={0} sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}>
            <Typography variant="h6" color="error" gutterBottom>
              Link inválido ou expirado
            </Typography>
            <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
              {error || 'Peça um novo link à equipe.'}
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {renderHeader(data.expiresAt)}
      <Box sx={{ px: isMobile ? 0 : 2, maxWidth: 500, mx: 'auto' }}>
        <Box sx={{ py: 2, px: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            {data.organization.name}
          </Typography>
          {data.label && (
            <Chip label={data.label} size="small" sx={{ mt: 1 }} />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Revise o conteúdo e aprove ou solicite ajustes antes do envio ao cliente.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', maxWidth: 420, mx: 'auto' }}>
            Depois da sua aprovação, a equipe gera o link ao cliente na página Aprovações (não é automático).
          </Typography>
        </Box>

        {data.posts.length === 0 ? (
          <Paper elevation={0} sx={{
            mx: 2,
            p: 3,
            textAlign: 'center',
            borderRadius: GLASS.radius.inner,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}>
            <Typography sx={{ color: GLASS.text.muted }}>Nenhum item nesta solicitação.</Typography>
          </Paper>
        ) : (
          data.posts.map((post: PostRow) => {
            const st = post.internalApprovalStatus;
            const isApproved = st === 'approved';
            const isRejected = st === 'rejected';
            const isDone = isApproved || isRejected;
            const firstImage = getFirstImageUrl(post as never);
            const imageUrls = getImageUrls(post as never);
            const isRejectOpen = rejectPostId === post.id;
            const scheduledDate = post.scheduledDate
              ? format(new Date(post.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : '';

            return (
              <Paper
                key={post.id}
                elevation={0}
                sx={{
                  mb: 2,
                  overflow: 'hidden',
                  borderRadius: GLASS.radius.inner,
                  maxWidth: 500,
                  mx: isMobile ? 1 : 0,
                  bgcolor: GLASS.surface.bg,
                  backdropFilter: `blur(${GLASS.surface.blur})`,
                  WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
                  border: `1px solid ${GLASS.border.outer}`,
                  boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                    {post.clientName}
                  </Typography>
                  {(post.postingPlatform ?? 'instagram') === 'linkedin' ? (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      <SocialPlatformIcons.LinkedInBrandIcon
                        sx={{ fontSize: 22, color: '#0A66C2' }}
                      />
                    </Box>
                  ) : (
                    <InstagramIcon sx={{ fontSize: 20, color: '#E4405F' }} />
                  )}
                  <Chip
                    label={
                      post.postType === POST_TYPE.ROTEIRO
                        ? 'Roteiro'
                        : post.postType === POST_TYPE.REELS
                          ? 'Reels'
                          : post.postType === POST_TYPE.STORIES
                            ? 'Story'
                            : 'Post'
                    }
                    size="small"
                  />
                </Box>

                <Box sx={{ px: 1.5, pb: 1, pt: 0 }}>
                  <Button
                    variant="outlined"
                    size="medium"
                    fullWidth={isMobile}
                    startIcon={<OpenInFullIcon />}
                    onClick={() => setFocusPost(post)}
                    aria-label="Ampliar conteúdo do post para leitura"
                    sx={{
                      py: 1,
                      minHeight: 44,
                      textTransform: 'none',
                      color: GLASS.accent.orange,
                      borderColor: GLASS.accent.orange,
                      borderRadius: GLASS.radius.button,
                      '&:hover': {
                        borderColor: GLASS.accent.orangeDark,
                        bgcolor: GLASS.status.connected.bg,
                      },
                    }}
                  >
                    Ampliar conteúdo
                  </Button>
                </Box>

                {post.postType === POST_TYPE.ROTEIRO ? (
                  <Box sx={{ px: 2, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {post.caption}
                    </Typography>
                  </Box>
                ) : (
                  <PostMediaPreview
                    postType={post.postType || 'post'}
                    imageUrls={imageUrls}
                    firstImage={firstImage}
                    videoUrl={post.video}
                    coverImageUrl={post.coverImage}
                  />
                )}

                {post.postType !== POST_TYPE.ROTEIRO && post.caption && (
                  <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {post.caption}
                    </Typography>
                  </Box>
                )}

                {scheduledDate && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, display: 'block', pb: 1 }}>
                    Agendado: {scheduledDate}
                  </Typography>
                )}

                {isDone && (
                  <Box sx={{ px: 1.5, pb: 1.5 }}>
                    <Chip
                      icon={isApproved ? <CheckCircleIcon /> : <CancelIcon />}
                      label={isApproved ? 'Aprovado' : 'Ajustes solicitados'}
                      color={isApproved ? 'success' : 'warning'}
                      size="small"
                    />
                    {isRejected && post.internalApprovalComment && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {post.internalApprovalComment}
                      </Typography>
                    )}
                  </Box>
                )}

                {!isDone && (
                  <Box sx={{ p: 1.5, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {!isRejectOpen ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          disabled={!!submitting}
                          onClick={() => handleApprove(post.id)}
                          sx={{
                            bgcolor: GLASS.accent.orange,
                            borderRadius: GLASS.radius.button,
                            boxShadow: GLASS.shadow.button,
                            '&:hover': {
                              bgcolor: GLASS.accent.orangeDark,
                              boxShadow: GLASS.shadow.buttonHover,
                            },
                          }}
                        >
                          {submitting === post.id ? '...' : 'Aprovar'}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="warning"
                          startIcon={<CancelIcon />}
                          disabled={!!submitting}
                          onClick={() => {
                            setRejectPostId(post.id);
                            setRejectComment('');
                          }}
                        >
                          Solicitar ajustes
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <TextField
                          label="Comentário para a equipe"
                          multiline
                          minRows={2}
                          fullWidth
                          size="small"
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button onClick={() => setRejectPostId(null)} disabled={!!submitting}>
                            Cancelar
                          </Button>
                          <Button
                            variant="contained"
                            color="warning"
                            disabled={!!submitting}
                            onClick={() => handleRejectSubmit(post.id)}
                          >
                            {submitting === post.id ? '...' : 'Enviar'}
                          </Button>
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            );
          })
        )}
      </Box>

      <PublicApprovalPostExpandedDialog
        open={!!focusPost}
        onClose={() => setFocusPost(null)}
        post={focusPost}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagerInternalApprovalView;

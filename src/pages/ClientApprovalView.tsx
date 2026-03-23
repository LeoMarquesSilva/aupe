import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Avatar,
  Button,
  TextField,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  IconButton,
  Collapse,
  Chip,
  AppBar,
  Toolbar,
  Link,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInFull as OpenInFullIcon,
  AttachFile as AttachFileIcon,
  Instagram as InstagramIcon,
} from '@mui/icons-material';
import * as SocialPlatformIcons from '../components/icons/SocialPlatformIcons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  fetchApprovalRequestByToken,
  submitApprovalResponse,
  uploadApprovalFeedbackAttachment,
  type ApprovalRequestPublicData,
} from '../services/approvalService';
import { ImageUrlService } from '../services/imageUrlService';
import PublicApprovalPostExpandedDialog from '../components/PublicApprovalPostExpandedDialog';
import {
  POST_TYPE,
  getFirstImageUrl,
  getImageUrls,
  PostMediaPreview,
} from '../components/PublicApprovalPostMedia';

export { POST_TYPE, getFirstImageUrl, getImageUrls, PostMediaPreview } from '../components/PublicApprovalPostMedia';

type PostItem = ApprovalRequestPublicData['posts'][number];

const AGENCY_LOGO_URL = '/LOGO-AUPE.jpg';
const APP_NAME = 'AUPE';

const ClientApprovalView: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const rawToken = tokenFromPath || tokenFromQuery || '';
  const decodedToken = rawToken ? decodeURIComponent(rawToken) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApprovalRequestPublicData | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [rejectAttachments, setRejectAttachments] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [focusPost, setFocusPost] = useState<PostItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openRejectForPost = (postId: string) => {
    setRejectPostId(postId);
    setRejectFeedback('');
    setRejectAttachments([]);
  };
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [captionExpanded, setCaptionExpanded] = useState<Record<string, boolean>>({});
  const CAPTION_PREVIEW_LENGTH = 120;

  useEffect(() => {
    if (!decodedToken) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApprovalRequestByToken(decodedToken)
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
    return () => { cancelled = true; };
  }, [decodedToken]);

  const handleApprove = async (postId: string) => {
    setSubmitting(postId);
    try {
      const result = await submitApprovalResponse(decodedToken, postId, 'approve');
      setData((prev) => prev ? {
        ...prev,
        posts: prev.posts.map((p) => p.id === postId ? { ...p, approvalStatus: 'approved' as const } : p),
      } : null);
      setSnackbar({
        open: true,
        message: result.message || 'Postagem aprovada!',
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({ open: true, message: e instanceof Error ? e.message : 'Erro ao aprovar.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleRejectSubmit = async (postId: string) => {
    setSubmitting(postId);
    try {
      const result = await submitApprovalResponse(
        decodedToken,
        postId,
        'reject',
        rejectFeedback,
        rejectAttachments
      );
      setData((prev) => prev ? {
        ...prev,
        posts: prev.posts.map((p) => p.id === postId
          ? {
            ...p,
            approvalStatus: 'rejected' as const,
            approvalFeedback: rejectFeedback,
            approvalFeedbackAttachments: rejectAttachments.length ? [...rejectAttachments] : undefined,
          }
          : p),
      } : null);
      setRejectPostId(null);
      setRejectFeedback('');
      setRejectAttachments([]);
      setSnackbar({
        open: true,
        message: result.message || 'Solicitação de alteração enviada.',
        severity: 'success',
      });
    } catch (e) {
      setSnackbar({ open: true, message: e instanceof Error ? e.message : 'Erro ao enviar.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const clientPhotoUrl = data?.client?.profilePicture ?? data?.client?.logoUrl;
  const username = data?.client?.instagram?.replace(/^@/, '') || data?.client?.name || 'cliente';

  const renderHeader = (expiresAt?: string) => (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderRadius: '0 0 20px 20px',
        backgroundColor: theme.palette.background.paper,
        boxShadow: `0 4px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)'}`,
      }}
    >
      <Toolbar sx={{ minHeight: 56, py: 0, px: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: { xs: 1, md: 3 } }}>
          <Avatar
            src={AGENCY_LOGO_URL}
            alt={APP_NAME}
            sx={{ width: 36, height: 36, flexShrink: 0, boxShadow: theme.shadows[1] }}
          />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 600,
                color: theme.palette.text.primary,
                lineHeight: 1.2,
              }}
            >
              {APP_NAME}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Poppins", sans-serif',
                color: theme.palette.text.secondary,
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              Aprovação de postagens
            </Typography>
          </Box>
        </Box>
        {expiresAt && (
          <Typography
            variant="caption"
            sx={{
              ml: 'auto',
              color: theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 6, px: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Carregando...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
        {renderHeader()}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, flex: 1 }}>
          <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Link inválido ou expirado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error || 'Peça um novo link ao seu gestor. O gestor envia o link; use-o para aprovar as postagens.'}
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {renderHeader(data.expiresAt)}
      <Box
        sx={{
          px: isMobile ? 0 : 2,
          maxWidth: 500,
          mx: 'auto',
        }}
      >
        <Box sx={{ py: 2, px: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Aprovação de postagens
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seu gestor enviou este link para você aprovar. Revise e aprove ou solicite alterações nas postagens abaixo.
          </Typography>
        </Box>

      {data.posts.length === 0 ? (
        <Paper sx={{ mx: 2, p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhuma postagem pendente nesta solicitação.</Typography>
        </Paper>
      ) : (
        data.posts.map((post) => {
          const isApproved = post.approvalStatus === 'approved';
          const isRejected = post.approvalStatus === 'rejected';
          const isDone = isApproved || isRejected;
          const firstImage = getFirstImageUrl(post);
          const imageUrls = getImageUrls(post);
          const isRejectOpen = rejectPostId === post.id;
          const caption = post.caption || '';
          const isCaptionLong = caption.length > CAPTION_PREVIEW_LENGTH;
          const expanded = captionExpanded[post.id];
          const captionShow = isCaptionLong && !expanded ? caption.slice(0, CAPTION_PREVIEW_LENGTH) + '...' : caption;
          const scheduledDate = post.scheduledDate ? format(new Date(post.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';

          return (
            <Paper
              key={post.id}
              elevation={1}
              sx={{
                mb: 2,
                overflow: 'hidden',
                borderRadius: 2,
                maxWidth: 500,
                mx: isMobile ? 1 : 0,
              }}
            >
              {/* Instagram-style header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, flexWrap: 'wrap' }}>
                <Avatar
                  src={clientPhotoUrl ? ImageUrlService.getPublicUrl(clientPhotoUrl) : undefined}
                  sx={{ width: 40, height: 40 }}
                >
                  {username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                  @{username}
                </Typography>
                {(post.postingPlatform ?? 'instagram') === 'linkedin' ? (
                  <Box
                    component="span"
                    title="LinkedIn"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mr: 0.5,
                    }}
                  >
                    <SocialPlatformIcons.LinkedInBrandIcon
                      sx={{ fontSize: 22, color: '#0A66C2' }}
                    />
                  </Box>
                ) : (
                  <InstagramIcon sx={{ fontSize: 22, color: '#E4405F', mr: 0.5 }} titleAccess="Instagram" />
                )}
                <Chip
                  label={
                    post.postType === POST_TYPE.ROTEIRO
                      ? 'Roteiro'
                      : post.postType === POST_TYPE.REELS
                        ? 'Reels'
                        : post.postType === POST_TYPE.STORIES
                          ? 'Story'
                          : post.postType === POST_TYPE.CAROUSEL || (post.images?.length ?? 0) > 1
                            ? 'Carrossel'
                            : 'Post'
                  }
                  size="small"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              </Box>

              <Box sx={{ px: 1.5, pb: 1, pt: 0 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  fullWidth={isMobile}
                  startIcon={<OpenInFullIcon />}
                  onClick={() => setFocusPost(post)}
                  aria-label="Ampliar conteúdo do post para leitura"
                  sx={{
                    py: 1,
                    minHeight: 44,
                    fontFamily: '"Poppins", sans-serif',
                    textTransform: 'none',
                  }}
                >
                  Ampliar conteúdo
                </Button>
              </Box>

              {post.postType === POST_TYPE.ROTEIRO ? (
                <Box sx={{
                  px: 2, py: 3,
                  bgcolor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                    Roteiro de Reels
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: '#1e293b', lineHeight: 1.7 }}>
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

              {/* Caption (skip for roteiro — already shown inline) */}
              {caption && post.postType !== POST_TYPE.ROTEIRO && (
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {captionShow}
                    {isCaptionLong && (
                      <IconButton
                        size="small"
                        onClick={() => setCaptionExpanded((prev) => ({ ...prev, [post.id]: !expanded }))}
                        sx={{ verticalAlign: 'middle', ml: -0.5 }}
                      >
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    )}
                  </Typography>
                </Box>
              )}

              {/* Scheduled date */}
              {scheduledDate && (
                <Box sx={{ px: 1.5, pb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {(post.postingPlatform ?? 'instagram') === 'linkedin'
                      ? `Data de referência: ${scheduledDate} (sem publicação automática)`
                      : `Agendado para: ${scheduledDate}`}
                  </Typography>
                </Box>
              )}

              {/* Actions */}
              <Box sx={{ p: 2, pt: 1 }}>
                {isDone ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isApproved && (
                      <>
                        <CheckCircleIcon color="success" />
                        <Typography color="success.main" fontWeight={500}>Aprovado</Typography>
                      </>
                    )}
                    {isRejected && (
                      <>
                        <CancelIcon color="error" />
                        <Typography color="error.main" fontWeight={500}>Alteração solicitada</Typography>
                        {post.approvalFeedback && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {post.approvalFeedback}
                          </Typography>
                        )}
                        {post.approvalFeedbackAttachments && post.approvalFeedbackAttachments.length > 0 && (
                          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {post.approvalFeedbackAttachments.map((u, i) => (
                              <Link
                                key={u}
                                href={u.startsWith('http') ? u : ImageUrlService.getPublicUrl(u)}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                              >
                                Anexo {i + 1}
                              </Link>
                            ))}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                ) : (
                  <>
                    <Collapse in={isRejectOpen}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f || !rejectPostId || rejectAttachments.length >= 5) return;
                          setUploadingAttachment(true);
                          try {
                            const url = await uploadApprovalFeedbackAttachment(decodedToken, rejectPostId, f);
                            setRejectAttachments((prev) => [...prev, url]);
                          } catch (err) {
                            setSnackbar({
                              open: true,
                              message: err instanceof Error ? err.message : 'Erro ao enviar anexo.',
                              severity: 'error',
                            });
                          } finally {
                            setUploadingAttachment(false);
                          }
                        }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="O que você gostaria de alterar?"
                        value={rejectFeedback}
                        onChange={(e) => setRejectFeedback(e.target.value)}
                        sx={{ mb: 1.5 }}
                        disabled={!!submitting}
                        inputProps={{ maxLength: 2000 }}
                        helperText={rejectFeedback.length > 0 ? `${rejectFeedback.length}/2000` : undefined}
                      />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={uploadingAttachment ? <CircularProgress size={16} /> : <AttachFileIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!!submitting || uploadingAttachment || rejectAttachments.length >= 5}
                        >
                          Anexar (máx. 5, 4 MB)
                        </Button>
                        {rejectAttachments.map((u) => (
                          <Chip
                            key={u}
                            size="small"
                            label="Anexo"
                            onDelete={() => setRejectAttachments((prev) => prev.filter((x) => x !== u))}
                            disabled={!!submitting}
                          />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => handleRejectSubmit(post.id)}
                          disabled={!!submitting}
                        >
                          {submitting === post.id ? <CircularProgress size={24} /> : 'Enviar'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => { setRejectPostId(null); setRejectFeedback(''); setRejectAttachments([]); }}
                          disabled={!!submitting}
                        >
                          Cancelar
                        </Button>
                      </Box>
                    </Collapse>
                    {!isRejectOpen && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          fullWidth
                          startIcon={submitting === post.id ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                          onClick={() => handleApprove(post.id)}
                          disabled={!!submitting}
                          sx={{ py: 1.5 }}
                        >
                          Aprovar postagem
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="large"
                          fullWidth
                          startIcon={<CancelIcon />}
                          onClick={() => openRejectForPost(post.id)}
                          disabled={!!submitting}
                          sx={{ py: 1.5 }}
                        >
                          Solicitar alteração
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
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
        autoHideDuration={4000}
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

export default ClientApprovalView;

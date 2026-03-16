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
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  fetchApprovalRequestByToken,
  submitApprovalResponse,
  type ApprovalRequestPublicData,
} from '../services/approvalService';
import { ImageUrlService } from '../services/imageUrlService';

type PostItem = ApprovalRequestPublicData['posts'][number];

const AGENCY_LOGO_URL = '/LOGO-AUPE.jpg';
const APP_NAME = 'AUPE';
const POST_TYPE = { POST: 'post', CAROUSEL: 'carousel', REELS: 'reels', STORIES: 'stories', ROTEIRO: 'roteiro' } as const;

function getFirstImageUrl(post: PostItem): string | undefined {
  const raw = post.images?.[0];
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'url' in raw) return (raw as { url: string }).url;
  return undefined;
}

function getImageUrls(post: PostItem): string[] {
  const arr = post.images ?? [];
  return arr.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'url' in item) return (item as { url: string }).url;
    return '';
  }).filter(Boolean);
}

/** Aspect ratio CSS por tipo (Instagram): feed 4:5, reels/stories 9:16 — evita corte */
function getMediaAspectRatioCss(postType: string): string {
  switch (postType) {
    case POST_TYPE.REELS:
    case POST_TYPE.STORIES:
      return '9 / 16'; // vertical
    case POST_TYPE.CAROUSEL:
    case POST_TYPE.POST:
    default:
      return '4 / 5'; // feed portrait
  }
}

/** Container de mídia por tipo: aspect-ratio correto e object-fit contain (nunca corta) */
function PostMediaPreview({
  postType,
  imageUrls,
  firstImage,
  videoUrl,
  coverImageUrl,
}: {
  postType: string;
  imageUrls: string[];
  firstImage: string | undefined;
  videoUrl?: string;
  coverImageUrl?: string;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const aspectRatioCss = getMediaAspectRatioCss(postType);
  const isReels = postType === POST_TYPE.REELS;
  const isStories = postType === POST_TYPE.STORIES;
  const isCarousel = postType === POST_TYPE.CAROUSEL || imageUrls.length > 1;
  const isVertical = isReels || isStories;

  const containerSx = {
    width: '100%',
    bgcolor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative' as const,
    aspectRatio: aspectRatioCss,
    maxHeight: isVertical ? 560 : 420,
  };

  const mediaSx = {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    display: 'block',
  };

  // Reels: vídeo 9:16 ou capa
  if (isReels) {
    return (
      <Box sx={containerSx}>
        {videoUrl ? (
          <video
            src={ImageUrlService.getPublicUrl(videoUrl)}
            poster={coverImageUrl ? ImageUrlService.getPublicUrl(coverImageUrl) : undefined}
            controls
            style={{ ...mediaSx }}
          />
        ) : coverImageUrl ? (
          <img
            src={ImageUrlService.getPublicUrl(coverImageUrl)}
            alt=""
            style={{ ...mediaSx }}
          />
        ) : firstImage ? (
          <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
        ) : (
          <Typography color="text.secondary">Reels</Typography>
        )}
      </Box>
    );
  }

  // Stories: 9:16, primeira imagem ou vídeo
  if (isStories) {
    return (
      <Box sx={containerSx}>
        {firstImage ? (
          <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
        ) : (
          <Typography color="text.secondary">Story</Typography>
        )}
      </Box>
    );
  }

  // Carrossel: várias imagens, fundo neutro (sem faixas pretas), botões prev/next visíveis
  if (isCarousel && imageUrls.length > 0) {
    const total = imageUrls.length;
    const goTo = (index: number) => {
      const next = Math.max(0, Math.min(index, total - 1));
      setCarouselIndex(next);
      const el = carouselRef.current;
      if (el) {
        const slide = el.children[next] as HTMLElement;
        slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    };

    return (
      <Box
        sx={{
          width: '100%',
          bgcolor: '#e8e8e8',
          aspectRatio: aspectRatioCss,
          maxHeight: 420,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          ref={carouselRef}
          onScroll={() => {
            const el = carouselRef.current;
            if (!el || imageUrls.length <= 1) return;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            setCarouselIndex(Math.min(index, imageUrls.length - 1));
          }}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            height: '100%',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& > *': { scrollSnapAlign: 'start', scrollSnapStop: 'always', flexShrink: 0 },
          }}
        >
          {imageUrls.map((url, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                minWidth: '100%',
                height: '100%',
                bgcolor: '#e8e8e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={ImageUrlService.getPublicUrl(url)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>
          ))}
        </Box>

        {/* Botões prev/next bem visíveis */}
        {total > 1 && (
          <>
            <IconButton
              onClick={() => goTo(carouselIndex - 1)}
              disabled={carouselIndex === 0}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
                '&:hover': { bgcolor: 'white', boxShadow: 3 },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
                '& .MuiSvgIcon-root': { fontSize: 28 },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={() => goTo(carouselIndex + 1)}
              disabled={carouselIndex === total - 1}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
                '&:hover': { bgcolor: 'white', boxShadow: 3 },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
                '& .MuiSvgIcon-root': { fontSize: 28 },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
            {/* Indicador de posição (ex.: 1/5) */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {carouselIndex + 1} / {total}
            </Typography>
          </>
        )}
      </Box>
    );
  }

  // Post (imagem única): 4:5, contain
  if (firstImage) {
    return (
      <Box sx={containerSx}>
        <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
      </Box>
    );
  }

  return (
    <Box sx={{ ...containerSx, minHeight: 200 }}>
      <Typography color="text.secondary">Mídia</Typography>
    </Box>
  );
}

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
  const openRejectForPost = (postId: string) => {
    setRejectPostId(postId);
    setRejectFeedback('');
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
      const result = await submitApprovalResponse(decodedToken, postId, 'reject', rejectFeedback);
      setData((prev) => prev ? {
        ...prev,
        posts: prev.posts.map((p) => p.id === postId
          ? { ...p, approvalStatus: 'rejected' as const, approvalFeedback: rejectFeedback }
          : p),
      } : null);
      setRejectPostId(null);
      setRejectFeedback('');
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
                    Agendado para: {scheduledDate}
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
                      </>
                    )}
                  </Box>
                ) : (
                  <>
                    <Collapse in={isRejectOpen}>
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
                          onClick={() => { setRejectPostId(null); setRejectFeedback(''); }}
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

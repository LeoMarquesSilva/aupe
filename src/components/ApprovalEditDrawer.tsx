import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Send as SendIcon,
  AddPhotoAlternate as PostIcon,
  ViewCarousel as CarouselIcon,
  VideoLibrary as ReelsIcon,
  AutoStories as StoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { PostImage, ReelVideo } from '../types';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import CaptionEditor from './CaptionEditor';
import DateTimePicker from './DateTimePicker';
import { uploadImagesToSupabaseStorage } from '../services/postService';
import { postService } from '../services/supabaseClient';
import { imageUrlService } from '../services/imageUrlService';
import type { ApprovalKanbanPostInput } from './ApprovalKanban';

export type EditablePostType = 'post' | 'carousel' | 'stories' | 'reels' | 'roteiro';

interface ApprovalEditDrawerProps {
  open: boolean;
  post: ApprovalKanbanPostInput | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const TYPE_OPTIONS: { id: EditablePostType; label: string; icon: React.ReactNode }[] = [
  { id: 'post', label: 'Post', icon: <PostIcon /> },
  { id: 'carousel', label: 'Carrossel', icon: <CarouselIcon /> },
  { id: 'stories', label: 'Story', icon: <StoryIcon /> },
  { id: 'reels', label: 'Reels', icon: <ReelsIcon /> },
  { id: 'roteiro', label: 'Roteiro de Reels', icon: <DescriptionIcon /> },
];

function resolvePostType(post: ApprovalKanbanPostInput): EditablePostType {
  const type = (post.postType ?? post.post_type ?? '').toLowerCase();
  if (type === 'reels') return 'reels';
  if (type === 'stories') return 'stories';
  if (type === 'roteiro') return 'roteiro';
  if (type === 'carousel') return 'carousel';
  if (Array.isArray(post.images) && post.images.length > 1) return 'carousel';
  if (post.video) return 'reels';
  return 'post';
}

function buildInitialImages(post: ApprovalKanbanPostInput): PostImage[] {
  const arr = post.images ?? [];
  return arr.map((item, idx) => {
    const rawUrl = typeof item === 'string' ? item : (item as { url: string }).url;
    const publicUrl = imageUrlService.getPublicUrl(rawUrl) || rawUrl;
    return { id: `existing-${idx}`, url: publicUrl, order: idx };
  });
}

function buildInitialVideo(post: ApprovalKanbanPostInput): ReelVideo | null {
  if (!post.video) return null;
  const publicUrl = imageUrlService.getPublicUrl(post.video) || post.video;
  return {
    id: 'existing-video',
    url: post.video,
    publicUrl,
    path: post.video,
    fileName: 'video.mp4',
    size: 0,
    duration: 0,
    width: 0,
    height: 0,
    aspectRatio: 9 / 16,
    format: 'mp4',
  };
}

const ApprovalEditDrawer: React.FC<ApprovalEditDrawerProps> = ({
  open,
  post,
  onClose,
  onSaveSuccess,
}) => {
  const [contentType, setContentType] = useState<EditablePostType>('post');
  const [images, setImages] = useState<PostImage[]>([]);
  const [video, setVideo] = useState<ReelVideo | null>(null);
  const [coverImage, setCoverImage] = useState<PostImage[]>([]);
  const [caption, setCaption] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && post) {
      setContentType(resolvePostType(post));
      setImages(buildInitialImages(post));
      setVideo(buildInitialVideo(post));
      setCaption(post.caption ?? '');
      setScheduledDate(post.scheduledDate ?? post.scheduled_date ?? '');
      const coverUrl = post.coverImage ?? post.cover_image;
      if (coverUrl) {
        const publicUrl = imageUrlService.getPublicUrl(coverUrl) || coverUrl;
        setCoverImage([{ id: 'existing-cover', url: publicUrl, order: 0 }]);
      } else {
        setCoverImage([]);
      }
      setError(null);
    }
  }, [open, post?.id]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const getMaxImages = () => (contentType === 'carousel' ? 10 : 1);
  const getMinImages = () => (contentType === 'carousel' ? 2 : 1);

  const canSave = () => {
    if (contentType === 'roteiro') return caption.trim().length > 0;
    if (contentType === 'reels') return !!video?.url;
    return images.length >= getMinImages();
  };

  const handleSave = async () => {
    if (!post || saving) return;
    setSaving(true);
    setError(null);
    try {
      let imageUrls: string[] = [];
      let coverUrl: string | undefined;

      if (contentType !== 'roteiro' && contentType !== 'reels' && images.length > 0) {
        imageUrls = await uploadImagesToSupabaseStorage(images);
      }
      if (contentType === 'reels' && coverImage.length > 0) {
        const covers = await uploadImagesToSupabaseStorage(coverImage);
        coverUrl = covers[0];
      }

      const updates: Record<string, unknown> = {
        caption: caption.trim(),
        scheduledDate: scheduledDate || undefined,
        approvalStatus: 'pending',
        approvalFeedback: null,
        approvalRespondedAt: null,
        postType: contentType,
      };

      if (contentType === 'reels') {
        updates.video = video?.url ?? post.video;
        if (coverUrl) updates.coverImage = coverUrl;
        updates.images = [];
      } else if (contentType === 'roteiro') {
        updates.images = [];
        updates.video = null;
      } else {
        updates.images = imageUrls.length > 0 ? imageUrls : undefined;
        updates.video = null;
      }

      await postService.updateScheduledPost(post.id, updates);
      onSaveSuccess();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = TYPE_OPTIONS.find((t) => t.id === contentType)?.label ?? contentType;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: 'warning.main', fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Poppins", sans-serif' }}>
              Editar e reenviar
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: '"Poppins", sans-serif' }}>
          Faça os ajustes solicitados e clique em "Reenviar para aprovação". O post voltará para "Aguardando aprovação".
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontFamily: '"Poppins", sans-serif', mb: 1, display: 'block' }}>
            Tipo de conteúdo
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                icon={opt.icon as React.ReactElement}
                label={opt.label}
                variant={contentType === opt.id ? 'filled' : 'outlined'}
                color={contentType === opt.id ? 'primary' : 'default'}
                onClick={() => {
                  setContentType(opt.id);
                  setImages([]);
                  setVideo(null);
                  setCoverImage([]);
                }}
                sx={{ fontSize: '0.8rem', fontFamily: '"Poppins", sans-serif' }}
              />
            ))}
          </Stack>
        </Box>

        {contentType !== 'roteiro' && contentType !== 'reels' && (
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={getMaxImages()}
            aspectRatio={contentType === 'stories' ? '9:16' : '1:1'}
            helperText={
              contentType === 'carousel'
                ? 'Adicione 2 a 10 imagens.'
                : contentType === 'stories'
                  ? 'Uma imagem para o story.'
                  : 'Uma imagem para o post.'
            }
          />
        )}

        {contentType === 'reels' && (
          <>
            <VideoUploader video={video} onChange={setVideo} />
            <Typography variant="subtitle2" sx={{ fontFamily: '"Poppins", sans-serif' }}>
              Capa (opcional)
            </Typography>
            <ImageUploader images={coverImage} onChange={setCoverImage} maxImages={1} aspectRatio="1:1" />
          </>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: '"Poppins", sans-serif' }}>
            Data e horário de agendamento
          </Typography>
          <DateTimePicker
            scheduledDate={scheduledDate || new Date().toISOString()}
            onChange={setScheduledDate}
          />
        </Box>

        <CaptionEditor
          caption={caption}
          onChange={setCaption}
          label={contentType === 'roteiro' ? 'Roteiro' : undefined}
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 2 }}>
        <Button
          onClick={handleClose}
          sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          onClick={handleSave}
          disabled={saving || !canSave()}
          sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none', fontWeight: 600 }}
        >
          {saving ? 'Salvando…' : `Reenviar ${typeLabel} para aprovação`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalEditDrawer;

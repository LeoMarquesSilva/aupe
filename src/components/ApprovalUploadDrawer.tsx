import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  AddPhotoAlternate as PostIcon,
  ViewCarousel as CarouselIcon,
  VideoLibrary as ReelsIcon,
  AutoStories as StoryIcon,
  Save as SaveIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { PostImage, ReelVideo } from '../types';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import CaptionEditor from './CaptionEditor';
import DateTimePicker from './DateTimePicker';
import { uploadImagesToSupabaseStorage } from '../services/postService';
import { saveContentForApproval, SaveContentForApprovalPayload } from '../services/approvalService';

function getDefaultScheduledDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export type ApprovalContentType = 'post' | 'carousel' | 'stories' | 'reels' | 'roteiro';

interface ApprovalUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

const TYPE_OPTIONS: { id: ApprovalContentType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'post', label: 'Post', icon: <PostIcon />, description: 'Imagem única no feed' },
  { id: 'carousel', label: 'Carrossel', icon: <CarouselIcon />, description: '2 a 10 imagens' },
  { id: 'stories', label: 'Story', icon: <StoryIcon />, description: 'Formato 9:16' },
  { id: 'reels', label: 'Reels', icon: <ReelsIcon />, description: 'Vídeo curto' },
  { id: 'roteiro', label: 'Roteiro de Reels', icon: <DescriptionIcon />, description: 'Apenas texto/roteiro' },
];

const ApprovalUploadDrawer: React.FC<ApprovalUploadDrawerProps> = ({
  open,
  onClose,
  clientId,
  onSuccess,
}) => {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [contentType, setContentType] = useState<ApprovalContentType | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [video, setVideo] = useState<ReelVideo | null>(null);
  const [coverImage, setCoverImage] = useState<PostImage[]>([]);
  const [caption, setCaption] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string>(getDefaultScheduledDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep('type');
    setContentType(null);
    setImages([]);
    setVideo(null);
    setCoverImage([]);
    setCaption('');
    setScheduledDate(getDefaultScheduledDate());
    setError(null);
    onClose();
  };

  const handleSelectType = (type: ApprovalContentType) => {
    setContentType(type);
    setStep('form');
    setImages([]);
    setVideo(null);
    setCoverImage([]);
    setCaption('');
    setScheduledDate(getDefaultScheduledDate());
    setError(null);
  };

  const handleBack = () => {
    setStep('type');
    setContentType(null);
  };

  const getMinImages = () => (contentType === 'carousel' ? 2 : 1);
  const getMaxImages = () => {
    if (contentType === 'carousel') return 10;
    return 1;
  };

  const canSave = () => {
    if (contentType === 'roteiro') return caption.trim().length > 0;
    if (contentType === 'reels') return !!video?.url;
    return images.length >= getMinImages();
  };

  const handleSave = async () => {
    if (!clientId || !contentType) return;
    setSaving(true);
    setError(null);
    try {
      let imageUrls: string[] = [];
      let coverUrl: string | undefined;
      if (images.length > 0) {
        imageUrls = await uploadImagesToSupabaseStorage(images);
      }
      if (coverImage.length > 0) {
        const covers = await uploadImagesToSupabaseStorage(coverImage);
        coverUrl = covers[0];
      }
      const payload: SaveContentForApprovalPayload = {
        postType: contentType,
        caption: caption.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
        video: video?.url,
        coverImage: coverUrl,
        scheduledDate: scheduledDate || undefined,
      };
      await saveContentForApproval(clientId, payload);
      onSuccess();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar conteúdo.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTypeLabel = TYPE_OPTIONS.find((t) => t.id === contentType)?.label ?? contentType ?? '';

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
            {step === 'form' && (
              <IconButton onClick={handleBack} size="small" sx={{ mr: 0.5 }}>
                <BackIcon fontSize="small" />
              </IconButton>
            )}
            <Typography variant="h6" fontWeight={600} sx={{ fontFamily: '"Poppins", sans-serif' }}>
              {step === 'type' ? 'Adicionar conteúdo' : `Novo ${selectedTypeLabel}`}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {step === 'type' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: '"Poppins", sans-serif' }}>
              Escolha o tipo de conteúdo. Este conteúdo não será agendado para postar — apenas para aprovação do cliente.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.5}>
              {TYPE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  icon={opt.icon as React.ReactElement}
                  label={opt.label}
                  onClick={() => handleSelectType(opt.id)}
                  sx={{ py: 2, px: 1.5, fontSize: '0.95rem', fontFamily: '"Poppins", sans-serif' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {step === 'form' && contentType && (
          <>
            {contentType !== 'roteiro' && (contentType === 'post' || contentType === 'carousel' || contentType === 'stories') && (
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
                <Typography variant="subtitle2" sx={{ mt: 0.5, fontFamily: '"Poppins", sans-serif' }}>
                  Capa (opcional)
                </Typography>
                <ImageUploader images={coverImage} onChange={setCoverImage} maxImages={1} aspectRatio="1:1" />
              </>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: '"Poppins", sans-serif' }}>
                Data e horário do agendamento
              </Typography>
              <DateTimePicker
                scheduledDate={scheduledDate || getDefaultScheduledDate()}
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
          </>
        )}
      </DialogContent>

      {step === 'form' && (
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={handleClose}
            sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !canSave()}
            sx={{ fontFamily: '"Poppins", sans-serif', textTransform: 'none' }}
          >
            {saving ? 'Salvando…' : 'Salvar para aprovação'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ApprovalUploadDrawer;

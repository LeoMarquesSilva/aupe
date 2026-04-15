import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PostImage } from '../types';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import InstagramIcon from '@mui/icons-material/Instagram';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { GLASS } from '../theme/glassTokens';
import { INSTAGRAM_MAX_IMAGE_BYTES, supabaseStorageService } from '../services/supabaseStorageService';

interface ImageUploaderProps {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  caption?: string;
  clientName?: string;
  clientUsername?: string;
  maxImages?: number;
  aspectRatio?: string;
  helperText?: string;
  disabled?: boolean;
}

function formatFileSizeMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface CompressionPreviewState {
  originalDataUrl: string;
  compressedObjectUrl: string;
  originalSize: number;
  compressedSize: number;
  displayName: string;
  totalOversized: number;
  totalFiles: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onChange, 
  caption = '', 
  clientName = 'Pré-visualização',
  clientUsername = 'cliente',
  maxImages = 10,
  aspectRatio = '1:1',
  helperText = '',
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const [compressionModalOpen, setCompressionModalOpen] = useState(false);
  const [pendingFilesForCompression, setPendingFilesForCompression] = useState<File[] | null>(null);
  const [compressionPreview, setCompressionPreview] = useState<CompressionPreviewState | null>(null);
  const [compressionPreviewLoading, setCompressionPreviewLoading] = useState(false);
  const [compressionAgreed, setCompressionAgreed] = useState(false);

  const clearCompressionPreviewUrls = useCallback(() => {
    setCompressionPreview((prev) => {
      if (prev?.compressedObjectUrl) {
        URL.revokeObjectURL(prev.compressedObjectUrl);
      }
      return null;
    });
  }, []);

  const buildCompressionPreview = useCallback(async (filesToHandle: File[]): Promise<CompressionPreviewState | null> => {
    const firstOversized = filesToHandle.find((f) => f.size > INSTAGRAM_MAX_IMAGE_BYTES);
    if (!firstOversized) return null;

    const originalDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem para prévia.'));
      reader.readAsDataURL(firstOversized);
    });

    const prepared = await supabaseStorageService.prepareImageForInstagram(firstOversized, {
      oversizeStrategy: 'auto_compress',
    });

    if (prepared.skipped || !prepared.file) {
      throw new Error(
        prepared.reason || 'Não foi possível gerar uma versão dentro do limite de 8 MB para pré-visualização.'
      );
    }

    const compressedObjectUrl = URL.createObjectURL(prepared.file);

    return {
      originalDataUrl,
      compressedObjectUrl,
      originalSize: firstOversized.size,
      compressedSize: prepared.file.size,
      displayName: firstOversized.name,
      totalOversized: filesToHandle.filter((f) => f.size > INSTAGRAM_MAX_IMAGE_BYTES).length,
      totalFiles: filesToHandle.length,
    };
  }, []);

  // ✅ Calcular proporção para o preview
  const getAspectRatioPadding = (ratio: string): string => {
    const [width, height] = ratio.split(':').map(Number);
    return `${(height / width) * 100}%`;
  };

  // Função para criar URL de preview local
  const createLocalImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const processDroppedFiles = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;
    if (acceptedFiles.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError(`Máximo de ${maxImages} imagem${maxImages > 1 ? 'ns' : ''} permitida${maxImages > 1 ? 's' : ''}.`);
      return;
    }

    let warningMessage: string | null = null;
    const filesWithinLimit = acceptedFiles.slice(0, remainingSlots);
    if (acceptedFiles.length > remainingSlots) {
      warningMessage = `Apenas ${remainingSlots} imagem${remainingSlots > 1 ? 'ns' : ''} foi${remainingSlots > 1 ? 'ram' : ''} adicionada${remainingSlots > 1 ? 's' : ''} devido ao limite de ${maxImages}.`;
    }

    const filesToProcess: File[] = filesWithinLimit;

    setUploading(true);
    setError(null);

    try {
      const newImages: PostImage[] = [];
      const failedCompression: string[] = [];

      for (const originalFile of filesToProcess) {
        try {
          console.log('Processando arquivo:', originalFile.name, originalFile.type, originalFile.size);

          if (!originalFile.type.startsWith('image/')) {
            console.error('Arquivo não é uma imagem:', originalFile.type);
            continue;
          }

          let finalFile = originalFile;
          if (originalFile.size > INSTAGRAM_MAX_IMAGE_BYTES) {
            const prepared = await supabaseStorageService.prepareImageForInstagram(originalFile, {
              oversizeStrategy: 'auto_compress'
            });

            if (prepared.skipped || !prepared.file) {
              failedCompression.push(originalFile.name);
              continue;
            }

            finalFile = prepared.file;
          }

          const localPreview = await createLocalImagePreview(finalFile);
          console.log('Preview local criado com tamanho:', localPreview.length);

          const newImage: PostImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url: localPreview,
            order: images.length + newImages.length,
            file: finalFile
          };

          newImages.push(newImage);
        } catch (err) {
          console.error('Erro ao criar preview local:', err);
        }
      }

      if (failedCompression.length > 0) {
        const failedMsg = `${failedCompression.length} imagem${failedCompression.length > 1 ? 'ns' : ''} não pôde ser comprimida para menos de 8 MB: ${failedCompression.join(', ')}.`;
        warningMessage = warningMessage ? `${warningMessage} ${failedMsg}` : failedMsg;
      }

      console.log('Novas imagens criadas:', newImages.length);

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        console.log('Atualizando imagens:', updatedImages.length);
        onChange(updatedImages);
      }

      if (warningMessage) {
        setNotice((prev) => (prev ? `${prev} ${warningMessage}` : warningMessage));
      }
    } catch (err) {
      console.error('Erro ao processar imagens:', err);
      setError('Erro ao processar imagens. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [images, onChange, maxImages, disabled]);

  const handleCancelCompressionModal = useCallback(() => {
    clearCompressionPreviewUrls();
    setPendingFilesForCompression(null);
    setCompressionModalOpen(false);
    setCompressionAgreed(false);
    setCompressionPreviewLoading(false);
  }, [clearCompressionPreviewUrls]);

  const handleConfirmCompressionModal = useCallback(async () => {
    if (!compressionAgreed || !pendingFilesForCompression) return;
    const files = pendingFilesForCompression;
    clearCompressionPreviewUrls();
    setPendingFilesForCompression(null);
    setCompressionModalOpen(false);
    setCompressionAgreed(false);
    await processDroppedFiles(files);
  }, [compressionAgreed, pendingFilesForCompression, clearCompressionPreviewUrls, processDroppedFiles]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      if (acceptedFiles.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        setError(`Máximo de ${maxImages} imagem${maxImages > 1 ? 'ns' : ''} permitida${maxImages > 1 ? 's' : ''}.`);
        return;
      }

      const filesToHandle = acceptedFiles.slice(0, remainingSlots);
      const hasOversized = filesToHandle.some((f) => f.size > INSTAGRAM_MAX_IMAGE_BYTES);

      if (!hasOversized) {
        await processDroppedFiles(filesToHandle);
        return;
      }

      setError(null);
      setPendingFilesForCompression(filesToHandle);
      setCompressionAgreed(false);
      clearCompressionPreviewUrls();
      setCompressionModalOpen(true);
      setCompressionPreviewLoading(true);

      try {
        const preview = await buildCompressionPreview(filesToHandle);
        setCompressionPreview(preview);
      } catch (e) {
        console.error(e);
        setError(
          e instanceof Error
            ? e.message
            : 'Não foi possível preparar a pré-visualização. Tente outra imagem ou tamanho menor.'
        );
        setCompressionModalOpen(false);
        setPendingFilesForCompression(null);
      } finally {
        setCompressionPreviewLoading(false);
      }
    },
    [
      disabled,
      maxImages,
      images.length,
      processDroppedFiles,
      buildCompressionPreview,
      clearCompressionPreviewUrls,
    ]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    disabled: disabled || uploading || images.length >= maxImages || compressionPreviewLoading
  });

  const removeImage = (index: number) => {
    if (disabled) return;
    const newImages = [...images];
    newImages.splice(index, 1);
    
    const reorderedImages = newImages.map((item, index) => ({
      ...item,
      order: index
    }));
    
    if (currentPreviewIndex >= reorderedImages.length) {
      setCurrentPreviewIndex(Math.max(0, reorderedImages.length - 1));
    }
    
    onChange(reorderedImages);
  };

  const handleDragEnd = (result: any) => {
    if (disabled) return;
    if (!result.destination) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    if (fromIndex === toIndex) return;
    
    const updatedImages = [...images];
    const [movedItem] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedItem);
    
    const reorderedImages = updatedImages.map((item, index) => ({
      ...item,
      order: index
    }));
    
    if (currentPreviewIndex === fromIndex) {
      setCurrentPreviewIndex(toIndex);
    } else if (
      (currentPreviewIndex > fromIndex && currentPreviewIndex <= toIndex) ||
      (currentPreviewIndex < fromIndex && currentPreviewIndex >= toIndex)
    ) {
      setCurrentPreviewIndex(
        currentPreviewIndex + (fromIndex < toIndex ? -1 : 1)
      );
    }
    
    onChange(reorderedImages);
  };

  const nextPreviewImage = () => {
    if (currentPreviewIndex < images.length - 1) {
      setCurrentPreviewIndex(currentPreviewIndex + 1);
    }
  };

  const prevPreviewImage = () => {
    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(currentPreviewIndex - 1);
    }
  };

  const formatCaption = (text: string): React.ReactNode => {
    if (!text) return null;
    
    const displayText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    return (
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        <Box component="span" sx={{ fontWeight: 'medium', mr: 0.5 }}>
          {clientUsername}
        </Box>
        {displayText.split(' ').map((word, i) => {
          if (word.startsWith('#')) {
            return (
              <Box 
                component="span" 
                key={i} 
                sx={{ color: '#3897f0', fontWeight: 'medium' }}
              >
                {word}{' '}
              </Box>
            );
          } else if (word.startsWith('@')) {
            return (
              <Box 
                component="span" 
                key={i} 
                sx={{ color: '#3897f0', fontWeight: 'medium' }}
              >
                {word}{' '}
              </Box>
            );
          } else {
            return <React.Fragment key={i}>{word}{' '}</React.Fragment>;
          }
        })}
      </Typography>
    );
  };

  console.log("Renderizando ImageUploader com", images.length, "imagens");

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Imagens do Carrossel ({images.length}/{maxImages})
      </Typography>
      
      {helperText && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {helperText}
        </Typography>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Dialog
        open={compressionModalOpen}
        onClose={() => {
          if (!compressionPreviewLoading) handleCancelCompressionModal();
        }}
        disableEscapeKeyDown={compressionPreviewLoading}
        maxWidth="xl"
        fullWidth
        aria-labelledby="compression-dialog-title"
        PaperProps={{
          sx: {
            maxHeight: '92vh',
          },
        }}
      >
        <DialogTitle id="compression-dialog-title">Compactação para o Instagram</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            O Instagram aceita até <strong>8 MB</strong> por imagem. Abaixo você vê uma prévia de como a
            primeira imagem acima do limite ficará após a compactação (JPEG otimizado). Você precisa
            concordar para adicionar ao carrossel.
          </Typography>

          {compressionPreview && compressionPreview.totalOversized > 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {compressionPreview.totalOversized} imagens excedem 8 MB. A comparação mostra a{' '}
              <strong>primeira</strong> delas ({compressionPreview.displayName}); as demais seguem o
              mesmo processo.
            </Alert>
          )}

          {compressionPreviewLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!compressionPreviewLoading && compressionPreview && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {compressionPreview.displayName}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: { xs: 2, md: 2.5 },
                  alignItems: 'stretch',
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                    Original
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      minHeight: { xs: 280, sm: 360 },
                      height: { xs: '48vh', md: '58vh' },
                      maxHeight: { xs: 420, md: 620 },
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={compressionPreview.originalDataUrl}
                      alt="Original"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {formatFileSizeMb(compressionPreview.originalSize)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                    Após compactação (prévia)
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      minHeight: { xs: 280, sm: 360 },
                      height: { xs: '48vh', md: '58vh' },
                      maxHeight: { xs: 420, md: 620 },
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={compressionPreview.compressedObjectUrl}
                      alt="Após compactação"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {formatFileSizeMb(compressionPreview.compressedSize)} — dentro do limite do Instagram
                  </Typography>
                </Box>
              </Box>

              <FormControlLabel
                sx={{ mt: 2 }}
                control={
                  <Checkbox
                    checked={compressionAgreed}
                    onChange={(_, checked) => setCompressionAgreed(checked)}
                    color="primary"
                  />
                }
                label="Li a prévia e concordo em aplicar esta compactação às imagens acima do limite."
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelCompressionModal} disabled={compressionPreviewLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleConfirmCompressionModal()}
            disabled={
              compressionPreviewLoading || !compressionPreview || !compressionAgreed || !pendingFilesForCompression
            }
          >
            Adicionar imagens
          </Button>
        </DialogActions>
      </Dialog>
      
      {images.length < maxImages && (
        <Box
          {...getRootProps()}
          sx={{
            border: `2px dashed ${GLASS.border.outer}`,
            borderRadius: GLASS.radius.inner,
            p: 3,
            textAlign: 'center',
            mb: 3,
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: uploading ? GLASS.surface.bgStrong : GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: GLASS.shadow.cardInset,
            transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
            '&:hover': {
              background: uploading ? GLASS.surface.bgStrong : GLASS.surface.bgHover,
              borderColor: uploading ? GLASS.border.outer : GLASS.accent.orange,
            },
            opacity: uploading ? 0.7 : 1
          }}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress size={24} sx={{ mb: 1 }} />
              <Typography variant="body2">Processando imagens...</Typography>
            </Box>
          ) : (
            <>
              <Typography>
                Arraste e solte imagens aqui, ou clique para selecionar
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Formatos aceitos: JPG, JPEG, PNG
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Máximo: {maxImages - images.length} imagem{maxImages - images.length !== 1 ? 's' : ''} restante{maxImages - images.length !== 1 ? 's' : ''}
              </Typography>
            </>
          )}
        </Box>
      )}

      {images.length > 0 && (
        <>
          {/* ✅ Instagram-like Preview com tamanho controlado */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <InstagramIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
              Pré-visualização do Instagram
            </Typography>
            
            <Box 
              sx={{ 
                border: '1px solid #dbdbdb',
                borderRadius: 2,
                overflow: 'hidden',
                maxWidth: 400, // ✅ Limitar largura máxima
                width: '100%',
                mx: 'auto',
                backgroundColor: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {/* Instagram Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1.5, 
                borderBottom: '1px solid #efefef'
              }}>
                <Box 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    backgroundColor: '#efefef',
                    mr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <InstagramIcon fontSize="small" sx={{ color: '#8e8e8e' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 'medium', fontSize: '0.9rem', lineHeight: 1.2 }}>
                    {clientName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#8e8e8e', lineHeight: 1.2 }}>
                    @{clientUsername}
                  </Typography>
                </Box>
                <Box sx={{ color: '#8e8e8e', fontSize: 20 }}>•••</Box>
              </Box>
              
              {/* ✅ Instagram Image com tamanho controlado */}
              <Box 
                sx={{ 
                  position: 'relative',
                  width: '100%',
                  paddingTop: getAspectRatioPadding(aspectRatio),
                  backgroundColor: '#fafafa',
                  maxHeight: 500 // ✅ Limitar altura máxima
                }}
              >
                {images.length > 0 && images[currentPreviewIndex] && (
                  <Box
                    component="img"
                    src={images[currentPreviewIndex].url}
                    alt={`Imagem ${currentPreviewIndex + 1} do carrossel`}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: aspectRatio === '9:16' ? 'contain' : 'cover',
                      backgroundColor: '#fafafa'
                    }}
                    onError={(e) => {
                      console.error("Erro ao carregar imagem no preview:", images[currentPreviewIndex].url);
                      e.currentTarget.src = "https://via.placeholder.com/400x400?text=Erro+na+imagem";
                    }}
                  />
                )}
                
                {/* Indicadores de navegação */}
                {images.length > 1 && (
                  <>
                    <Box sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      borderRadius: 10,
                      px: 1,
                      py: 0.5,
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {currentPreviewIndex + 1}/{images.length}
                    </Box>
                    
                    {currentPreviewIndex > 0 && (
                      <Box
                        onClick={prevPreviewImage}
                        sx={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          color: '#000',
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 2
                        }}
                      >
                        ←
                      </Box>
                    )}
                    
                    {currentPreviewIndex < images.length - 1 && (
                      <Box
                        onClick={nextPreviewImage}
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          color: '#000',
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 2
                        }}
                      >
                        →
                      </Box>
                    )}
                  </>
                )}
              </Box>
              
              {/* Instagram Actions */}
              <Box sx={{ px: 2, pt: 1.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  mb: 1.5
                }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <FavoriteBorderIcon sx={{ fontSize: 24, color: '#262626' }} />
                    <ChatBubbleOutlineIcon sx={{ fontSize: 24, color: '#262626' }} />
                    <SendIcon sx={{ fontSize: 24, color: '#262626' }} />
                  </Box>
                  <BookmarkBorderIcon sx={{ fontSize: 24, color: '#262626' }} />
                </Box>
                
                {images.length > 1 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mb: 1.5
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 0.5,
                      justifyContent: 'center'
                    }}>
                      {images.map((_, idx) => (
                        <Box
                          key={idx}
                          onClick={() => setCurrentPreviewIndex(idx)}
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: idx === currentPreviewIndex ? '#3897f0' : '#dbdbdb',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                  0 curtidas
                </Typography>
                
                {caption && (
                  <Box sx={{ mb: 1.5 }}>
                    {formatCaption(caption)}
                  </Box>
                )}
                
                <Typography variant="body2" sx={{ color: '#8e8e8e', mb: 1.5, fontSize: '0.75rem' }}>
                  {maxImages === 1 ? 'Imagem única' : `Carrossel com ${images.length} imagem${images.length !== 1 ? 'ns' : ''}`}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* ✅ Drag and Drop com thumbnails menores e melhor alinhamento */}
          {images.length > 1 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Arraste as imagens para reordenar
              </Typography>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="image-list" direction="horizontal">
                  {(provided) => (
                    <Box 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        justifyContent: 'center'
                      }}
                    >
                      {images.map((image, index) => (
                        <Draggable key={image.id} draggableId={image.id} index={index}>
                          {(provided, snapshot) => {
                            const draggableNode = (
                              <Box 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{ 
                                  opacity: snapshot.isDragging ? 0.8 : 1
                                }}
                              >
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: 120, // ✅ Tamanho fixo menor
                                    height: 120, // ✅ Tamanho fixo menor
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    boxShadow: snapshot.isDragging 
                                      ? '0 8px 16px rgba(0,0,0,0.2)' 
                                      : '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                      transform: 'scale(1.03)',
                                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                    },
                                    border: index === currentPreviewIndex 
                                      ? '2px solid #3897f0' 
                                      : '1px solid #dbdbdb',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setCurrentPreviewIndex(index)}
                                >
                                  {image.url && (
                                    <Box
                                      component="img"
                                      src={image.url}
                                      alt={`Imagem ${index + 1}`}
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                      }}
                                      onError={(e) => {
                                        console.error("Erro ao carregar imagem:", image.url);
                                        e.currentTarget.src = "https://via.placeholder.com/120x120?text=Erro";
                                      }}
                                    />
                                  )}
                                  
                                  {/* ✅ Drag Handle melhor posicionado */}
                                  <Box 
                                    {...provided.dragHandleProps}
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      left: 4,
                                      backgroundColor: 'rgba(0,0,0,0.7)',
                                      color: 'white',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'grab',
                                      zIndex: 1
                                    }}
                                  >
                                    <DragIndicatorIcon sx={{ fontSize: 16 }} />
                                  </Box>
                                  
                                  {/* ✅ Delete Button melhor posicionado */}
                                  <IconButton
                                    size="small"
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      backgroundColor: 'rgba(220,0,0,0.8)',
                                      color: 'white',
                                      width: '24px',
                                      height: '24px',
                                      '&:hover': {
                                        backgroundColor: 'rgba(220,0,0,0.9)',
                                      },
                                      zIndex: 1
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(index);
                                    }}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                  
                                  {/* ✅ Image Number melhor posicionado */}
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      bottom: 4,
                                      left: 4,
                                      backgroundColor: 'rgba(0,0,0,0.7)',
                                      color: 'white',
                                      padding: '2px 6px',
                                      fontSize: '11px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      zIndex: 1
                                    }}
                                  >
                                    {index + 1}
                                  </Box>
                                </Box>
                              </Box>
                            );

                            return snapshot.isDragging
                              ? createPortal(draggableNode, document.body)
                              : draggableNode;
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}

          {/* ✅ Lista simples para imagem única com tamanho controlado */}
          {images.length === 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 150, // ✅ Tamanho fixo menor
                  height: 150, // ✅ Tamanho fixo menor
                  borderRadius: 1,
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '2px solid #3897f0'
                }}
              >
                <Box
                  component="img"
                  src={images[0].url}
                  alt="Imagem de capa"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                
                {/* ✅ Delete Button melhor posicionado */}
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(220,0,0,0.8)',
                    color: 'white',
                    width: '28px',
                    height: '28px',
                    '&:hover': {
                      backgroundColor: 'rgba(220,0,0,0.9)',
                    },
                    zIndex: 1
                  }}
                  onClick={() => removeImage(0)}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ImageUploader;
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PostImage } from '../types';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import InstagramIcon from '@mui/icons-material/Instagram';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';

interface ImageUploaderProps {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  caption?: string;
  clientName?: string;
  clientUsername?: string;
  maxImages?: number;
  aspectRatio?: string;
  helperText?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onChange, 
  caption = '', 
  clientName = 'Pré-visualização',
  clientUsername = 'cliente',
  maxImages = 10,
  aspectRatio = '1:1',
  helperText = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError(`Máximo de ${maxImages} imagem${maxImages > 1 ? 'ns' : ''} permitida${maxImages > 1 ? 's' : ''}.`);
      return;
    }
    
    const filesToProcess = acceptedFiles.slice(0, remainingSlots);
    if (acceptedFiles.length > remainingSlots) {
      setError(`Apenas ${remainingSlots} imagem${remainingSlots > 1 ? 'ns' : ''} foi${remainingSlots > 1 ? 'ram' : ''} adicionada${remainingSlots > 1 ? 's' : ''} devido ao limite de ${maxImages}.`);
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const newImages: PostImage[] = [];
      
      for (const file of filesToProcess) {
        try {
          console.log("Processando arquivo:", file.name, file.type, file.size);
          
          if (!file.type.startsWith('image/')) {
            console.error("Arquivo não é uma imagem:", file.type);
            continue;
          }
          
          const localPreview = await createLocalImagePreview(file);
          console.log("Preview local criado com tamanho:", localPreview.length);
          
          const newImage: PostImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url: localPreview,
            order: images.length + newImages.length,
            file: file
          };
          
          newImages.push(newImage);
        } catch (err) {
          console.error('Erro ao criar preview local:', err);
        }
      }
      
      console.log("Novas imagens criadas:", newImages.length);
      
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        console.log("Atualizando imagens:", updatedImages.length);
        onChange(updatedImages);
      }
      
    } catch (err) {
      console.error('Erro ao processar imagens:', err);
      setError('Erro ao processar imagens. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [images, onChange, maxImages]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    disabled: uploading || images.length >= maxImages
  });

  const removeImage = (index: number) => {
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
      
      {images.length < maxImages && (
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            mb: 3,
            cursor: uploading ? 'not-allowed' : 'pointer',
            backgroundColor: uploading ? '#f5f5f5' : '#f9f9f9',
            '&:hover': {
              backgroundColor: uploading ? '#f5f5f5' : '#f0f0f0'
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
              <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
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
                          {(provided, snapshot) => (
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
                          )}
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
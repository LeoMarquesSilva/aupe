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
  caption?: string; // Legenda do post
  clientName?: string; // Nome do cliente para exibir na pré-visualização
  clientUsername?: string; // Username do cliente para exibir na pré-visualização
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onChange, 
  caption = '', 
  clientName = 'Pré-visualização',
  clientUsername = 'cliente'
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

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
    
    setUploading(true);
    setError(null);
    
    try {
      const newImages: PostImage[] = [];
      
      // Criar previews locais para todas as imagens
      for (const file of acceptedFiles) {
        try {
          console.log("Processando arquivo:", file.name, file.type, file.size);
          
          // Verificar se o arquivo é realmente uma imagem
          if (!file.type.startsWith('image/')) {
            console.error("Arquivo não é uma imagem:", file.type);
            continue;
          }
          
          // Criar preview local imediatamente
          const localPreview = await createLocalImagePreview(file);
          console.log("Preview local criado com tamanho:", localPreview.length);
          
          // Adicionar imagem com preview local
          const newImage: PostImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url: localPreview, // Usar preview local temporariamente
            order: images.length + newImages.length,
            file: file // Guardar o arquivo para upload posterior
          };
          
          newImages.push(newImage);
        } catch (err) {
          console.error('Erro ao criar preview local:', err);
        }
      }
      
      console.log("Novas imagens criadas:", newImages.length);
      
      // Atualizar o estado com as novas imagens (com preview local)
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
  }, [images, onChange]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    disabled: uploading
  });

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    
    // Atualiza a ordem das imagens restantes
    const reorderedImages = newImages.map((item, index) => ({
      ...item,
      order: index
    }));
    
    // Ajustar o índice de preview se necessário
    if (currentPreviewIndex >= reorderedImages.length) {
      setCurrentPreviewIndex(Math.max(0, reorderedImages.length - 1));
    }
    
    onChange(reorderedImages);
  };

  // Função para lidar com o fim do arrasto
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    if (fromIndex === toIndex) return;
    
    const updatedImages = [...images];
    const [movedItem] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedItem);
    
    // Atualiza a ordem das imagens
    const reorderedImages = updatedImages.map((item, index) => ({
      ...item,
      order: index
    }));
    
    // Atualizar o índice de preview se a imagem atual foi movida
    if (currentPreviewIndex === fromIndex) {
      setCurrentPreviewIndex(toIndex);
    } else if (
      (currentPreviewIndex > fromIndex && currentPreviewIndex <= toIndex) ||
      (currentPreviewIndex < fromIndex && currentPreviewIndex >= toIndex)
    ) {
      // Ajustar o índice se a movimentação afetou a posição da imagem atual
      setCurrentPreviewIndex(
        currentPreviewIndex + (fromIndex < toIndex ? -1 : 1)
      );
    }
    
    onChange(reorderedImages);
  };

  // Navegar para a próxima imagem no preview
  const nextPreviewImage = () => {
    if (currentPreviewIndex < images.length - 1) {
      setCurrentPreviewIndex(currentPreviewIndex + 1);
    }
  };

  // Navegar para a imagem anterior no preview
  const prevPreviewImage = () => {
    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(currentPreviewIndex - 1);
    }
  };

  // Formatar a legenda para exibição
  const formatCaption = (text: string): React.ReactNode => {
    if (!text) return null;
    
    // Limitar a exibição a 100 caracteres com "..." se for maior
    const displayText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    // Destacar hashtags e menções
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
        Imagens do Carrossel ({images.length})
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          mb: 3,
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
          '&:hover': {
            backgroundColor: '#f0f0f0'
          }
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
          </>
        )}
      </Box>

      {images.length > 0 && (
        <>
          {/* Instagram-like Preview */}
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
                maxWidth: 500,
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
              
              {/* Instagram Image */}
              <Box 
                sx={{ 
                  position: 'relative',
                  paddingTop: '100%',
                  backgroundColor: '#fafafa'
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
                      objectFit: 'contain',
                      backgroundColor: '#fafafa'
                    }}
                    onError={(e) => {
                      console.error("Erro ao carregar imagem no preview:", images[currentPreviewIndex].url);
                      e.currentTarget.src = "https://via.placeholder.com/500?text=Erro+na+imagem";
                    }}
                  />
                )}
                
                {/* Indicadores de navegação */}
                {images.length > 1 && (
                  <>
                    {/* Indicador de posição */}
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
                    
                    {/* Botão anterior */}
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
                    
                    {/* Botão próximo */}
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
                {/* Ícones de ação */}
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
                
                {/* Indicadores de posição (bolinhas) */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mb: 1.5
                }}>
                  {images.length > 1 && (
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
                  )}
                </Box>
                
                {/* Curtidas */}
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                  0 curtidas
                </Typography>
                
                {/* Legenda */}
                {caption && (
                  <Box sx={{ mb: 1.5 }}>
                    {formatCaption(caption)}
                  </Box>
                )}
                
                {/* Informação do carrossel */}
                <Typography variant="body2" sx={{ color: '#8e8e8e', mb: 1.5, fontSize: '0.75rem' }}>
                  Carrossel com {images.length} imagem{images.length !== 1 ? 'ns' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* Drag and Drop Image Reordering */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
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
                    margin: -1
                  }}
                >
                  {images.map((image, index) => (
                    <Draggable key={image.id} draggableId={image.id} index={index}>
                      {(provided, snapshot) => (
                        <Box 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{ 
                            width: { 
                              xs: '50%', // 6/12 em telas pequenas
                              sm: '33.33%', // 4/12 em telas médias
                              md: '25%', // 3/12 em telas grandes
                              lg: '16.66%' // 2/12 em telas muito grandes
                            },
                            padding: 1,
                            opacity: snapshot.isDragging ? 0.8 : 1
                          }}
                        >
                          <Box
                            sx={{
                              position: 'relative',
                              paddingTop: '100%',
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
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  console.error("Erro ao carregar imagem:", image.url);
                                  e.currentTarget.src = "https://via.placeholder.com/150?text=Erro+na+imagem";
                                }}
                              />
                            )}
                            
                            {/* Drag Handle */}
                            <Box 
                              {...provided.dragHandleProps}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'grab',
                                zIndex: 1
                              }}
                            >
                              <DragIndicatorIcon fontSize="small" />
                            </Box>
                            
                            {/* Delete Button */}
                            <IconButton
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                p: 0.5,
                                m: 0.5,
                                '&:hover': {
                                  backgroundColor: 'rgba(220,0,0,0.7)',
                                },
                                zIndex: 1
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                            
                            {/* Image Number */}
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                padding: '2px 8px',
                                fontSize: '12px',
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
    </Box>
  );
};

export default ImageUploader;
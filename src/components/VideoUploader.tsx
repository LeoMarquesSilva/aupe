import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  VideoLibrary as VideoIcon
} from '@mui/icons-material';
import { supabaseVideoStorageService, VideoUploadResult } from '../services/supabaseVideoStorageService';
import { authService } from '../services/supabaseClient';
import { ReelVideo } from '../types';

interface VideoUploaderProps {
  video: ReelVideo | null;
  onChange: (video: ReelVideo | null) => void;
  maxFileSize?: number; // em MB
  maxDuration?: number; // em segundos
  acceptedFormats?: string[];
  showPreview?: boolean;
  disabled?: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  video,
  onChange,
  maxFileSize = 2048,
  maxDuration = 90,
  acceptedFormats = ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm', 'video/avi'],
  showPreview = true,
  disabled = false
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    warnings?: string[];
  } | null>(null);
  
  const [metadataProcessed, setMetadataProcessed] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  // ✅ Resetar estados quando o vídeo muda
  useEffect(() => {
    if (!video) {
      setMetadataProcessed(null);
      setIsPlaying(false);
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
        setLocalVideoUrl(null);
      }
    }
  }, [video?.id, localVideoUrl]);

  // ✅ Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
    };
  }, [localVideoUrl]);

  // Função para formatar tamanho de arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ Função para calcular dimensões do preview baseado no aspect ratio
  const getPreviewDimensions = () => {
    if (!video) return { width: 300, height: 200 };
    
    const maxWidth = 300;
    const maxHeight = 400;
    const aspectRatio = video.aspectRatio;
    
    // Para vídeos verticais (como Reels 9:16)
    if (aspectRatio < 1) {
      const height = Math.min(maxHeight, maxWidth / aspectRatio);
      const width = height * aspectRatio;
      return { width: Math.round(width), height: Math.round(height) };
    }
    
    // Para vídeos horizontais
    const width = Math.min(maxWidth, maxHeight * aspectRatio);
    const height = width / aspectRatio;
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Função para validar arquivo antes do upload
  const validateFile = (file: File) => {
    console.log('🔍 Validando arquivo:', {
      name: file.name,
      type: file.type,
      size: file.size,
      maxSize: maxFileSize * 1024 * 1024,
      maxSizeFormatted: formatFileSize(maxFileSize * 1024 * 1024)
    });

    const validation = {
      valid: true,
      error: undefined as string | undefined,
      warnings: [] as string[]
    };

    // Verificar se é um arquivo de vídeo
    if (!file.type.startsWith('video/')) {
      validation.valid = false;
      validation.error = 'Por favor, selecione um arquivo de vídeo válido';
      return validation;
    }

    // Verificar tamanho do arquivo
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      validation.valid = false;
      const maxSizeFormatted = maxFileSize >= 1024 
        ? `${(maxFileSize / 1024).toFixed(1)}GB` 
        : `${maxFileSize}MB`;
      validation.error = `Arquivo muito grande. Máximo: ${maxSizeFormatted}`;
      return validation;
    }

    // Verificar formato (mais flexível)
    const isAcceptedFormat = acceptedFormats.some(format => 
      file.type === format || file.type.includes(format.split('/')[1])
    );
    
    if (!isAcceptedFormat) {
      validation.warnings.push(`Formato ${file.type} pode não ser totalmente compatível`);
    }

    // Avisos baseados no tamanho
    const warningThreshold = maxSizeBytes * 0.8; // 80% do limite
    if (file.size > warningThreshold) {
      const sizeGB = file.size / (1024 * 1024 * 1024);
      if (sizeGB >= 1) {
        validation.warnings.push(`Arquivo grande (${sizeGB.toFixed(1)}GB) - pode demorar para fazer upload`);
      } else {
        validation.warnings.push('Arquivo grande - pode demorar para fazer upload');
      }
    }

    setValidationResult(validation);
    
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido');
      return false;
    }
    
    setError(null);
    return true;
  };

  // Função para processar arquivo selecionado
  const handleFileSelect = useCallback(async (file: File) => {
    console.log('🎬 Arquivo selecionado:', file.name, file.type, formatFileSize(file.size));

    if (!validateFile(file)) return;

    // ✅ Criar URL local para preview imediato
    const localUrl = URL.createObjectURL(file);
    setLocalVideoUrl(localUrl);

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setMetadataProcessed(null);

    try {
      console.log('🚀 Iniciando upload de vídeo:', file.name);
      
      // Obter usuário atual
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Progresso mais realista para arquivos grandes
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = file.size > 500 * 1024 * 1024 ? 
            Math.random() * 5 : 
            Math.random() * 15;
          
          const newProgress = Math.min(prev + increment, 85);
          return newProgress;
        });
      }, file.size > 500 * 1024 * 1024 ? 1000 : 500);

      const uploadResult: VideoUploadResult = await supabaseVideoStorageService.uploadVideo(file, user.id, {
        maxSize: maxFileSize,
        maxDuration: maxDuration,
        generateThumbnail: true
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('✅ Upload resultado:', uploadResult);

      // Criar objeto ReelVideo
      const reelVideo: ReelVideo = {
        id: `video-${Date.now()}`,
        url: uploadResult.url,
        publicUrl: uploadResult.publicUrl,
        path: uploadResult.path,
        fileName: file.name,
        file: file, // ✅ Manter referência para preview local
        size: uploadResult.size,
        duration: uploadResult.duration || 0,
        width: 1080, // Será atualizado quando o vídeo carregar
        height: 1920,
        aspectRatio: 9/16,
        thumbnail: uploadResult.thumbnail,
        format: file.type
      };

      console.log('✅ ReelVideo criado:', reelVideo);
      onChange(reelVideo);

      // Limpar progresso após um breve delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1500);

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload';
      setError(`Erro no upload: ${errorMessage}`);
      onChange(null);
      // Limpar URL local em caso de erro
      URL.revokeObjectURL(localUrl);
      setLocalVideoUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [maxFileSize, maxDuration, onChange]);

  // ✅ Função para processar metadados sem loop
  const handleVideoMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!video || metadataProcessed === video.id) return;
    
    const videoElement = e.target as HTMLVideoElement;
    console.log('📐 Dimensões do vídeo carregadas:', {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
      duration: videoElement.duration
    });
    
    // Marcar como processado
    setMetadataProcessed(video.id);
    
    // Atualizar dimensões reais do vídeo apenas se necessário
    if (videoElement.videoWidth && videoElement.videoHeight) {
      const updatedVideo: ReelVideo = {
        ...video,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        aspectRatio: videoElement.videoWidth / videoElement.videoHeight,
        duration: videoElement.duration || video.duration
      };
      onChange(updatedVideo);
    }
  }, [video, metadataProcessed, onChange]);

  // ✅ Função para obter URL do vídeo de forma segura
  const getVideoUrl = useCallback(() => {
    if (!video) return '';
    
    // ✅ Priorizar URL local para preview mais rápido
    if (localVideoUrl) {
      return localVideoUrl;
    }
    
    // ✅ Fallback para URL pública do Supabase
    return video.publicUrl || video.url;
  }, [video, localVideoUrl]);

  // Função para lidar com drop de arquivos
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      handleFileSelect(videoFile);
    } else {
      setError('Por favor, selecione um arquivo de vídeo válido');
    }
  }, [disabled, isUploading, handleFileSelect]);

  // Função para lidar com seleção de arquivo
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo selecionado via input:', file.name, file.type);
      handleFileSelect(file);
    }
  };

  // Função para remover vídeo
  const handleRemoveVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    // ✅ Limpar URL local
    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
      setLocalVideoUrl(null);
    }
    
    onChange(null);
    setError(null);
    setValidationResult(null);
    setMetadataProcessed(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🗑️ Vídeo removido');
  };

  // ✅ Função para controlar reprodução com melhor tratamento
  const togglePlayback = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // ✅ Aguardar o vídeo carregar antes de reproduzir
        if (videoRef.current.readyState < 2) {
          console.log('🔄 Aguardando vídeo carregar...');
          await new Promise((resolve) => {
            const handleCanPlay = () => {
              videoRef.current?.removeEventListener('canplay', handleCanPlay);
              resolve(void 0);
            };
            videoRef.current?.addEventListener('canplay', handleCanPlay);
          });
        }
        
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir vídeo:', error);
      setError('Erro ao reproduzir vídeo. Tente novamente.');
    }
  }, [isPlaying]);

  // ✅ Tratar eventos de reprodução
  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);
  const handleVideoEnded = () => setIsPlaying(false);

  // Função para abrir seletor de arquivo
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Função para formatar limite de tamanho
  const getFormattedSizeLimit = () => {
    return maxFileSize >= 1024 
      ? `${(maxFileSize / 1024).toFixed(1)}GB` 
      : `${maxFileSize}MB`;
  };

  // ✅ Obter dimensões do preview
  const previewDimensions = getPreviewDimensions();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <VideoIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        Upload de Vídeo
      </Typography>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      {!video ? (
        // Área de upload
        <Paper
          elevation={0}
          sx={{
            border: `2px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
            cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: disabled || isUploading ? theme.palette.divider : theme.palette.primary.main,
              backgroundColor: disabled || isUploading ? 'action.disabledBackground' : 'action.hover'
            }
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={disabled || isUploading ? undefined : openFileSelector}
        >
          {isUploading ? (
            <Box>
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Enviando vídeo...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mt: 2, mb: 1, borderRadius: 1, height: 8 }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(uploadProgress)}% concluído
              </Typography>
              {uploadProgress < 50 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Arquivos grandes podem levar alguns minutos...
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Clique ou arraste um vídeo aqui
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Formatos aceitos: MP4, MOV, WEBM, AVI
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <Chip size="small" label={`Máx. ${getFormattedSizeLimit()}`} color="primary" />
                <Chip size="small" label={`Máx. ${maxDuration}s`} />
                <Chip size="small" label="9:16 recomendado" />
              </Stack>
            </Box>
          )}
        </Paper>
      ) : (
        // ✅ Preview do vídeo com dimensões adaptáveis
        showPreview && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card sx={{ width: previewDimensions.width, maxWidth: '100%' }}>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="video"
                  ref={videoRef}
                  src={getVideoUrl()}
                  sx={{
                    width: previewDimensions.width,
                    height: previewDimensions.height,
                    objectFit: 'cover',
                    backgroundColor: 'black'
                  }}
                  onLoadedMetadata={handleVideoMetadata}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                  onError={(e) => {
                    console.error('❌ Erro ao carregar vídeo:', e);
                    setError('Erro ao carregar preview do vídeo');
                  }}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  controls={false}
                />
                
                {/* ✅ Controles de reprodução melhorados */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    cursor: 'pointer',
                    '&:hover': { opacity: 1 }
                  }}
                  onClick={togglePlayback}
                >
                  <IconButton
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
                      fontSize: '2rem'
                    }}
                    size="large"
                  >
                    {isPlaying ? <PauseIcon fontSize="large" /> : <PlayIcon fontSize="large" />}
                  </IconButton>
                </Box>

                {/* Botão de remover */}
                <IconButton
                  onClick={handleRemoveVideo}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.9)' }
                  }}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>

                {/* ✅ Indicador de carregamento */}
                {!metadataProcessed && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    Carregando...
                  </Box>
                )}
              </Box>

              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" noWrap sx={{ maxWidth: '70%' }}>
                    {video.fileName}
                  </Typography>
                  <Tooltip title="Ver detalhes">
                    <IconButton size="small" onClick={() => setShowDetails(true)}>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip 
                    size="small" 
                    label={formatFileSize(video.size)}
                    color={video.size > maxFileSize * 1024 * 1024 ? 'error' : 
                           video.size > maxFileSize * 1024 * 1024 * 0.8 ? 'warning' : 'success'}
                  />
                  <Chip 
                    size="small" 
                    label={formatDuration(video.duration)}
                    color={video.duration > maxDuration ? 'error' : 'success'}
                  />
                  <Chip 
                    size="small" 
                    label={`${video.width}x${video.height}`}
                    color={Math.abs(video.aspectRatio - 9/16) < 0.1 ? 'success' : 'warning'}
                  />
                </Stack>

                {/* Mostrar avisos de validação */}
                {validationResult?.warnings && validationResult.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {validationResult.warnings.join('. ')}
                  </Alert>
                )}

                {/* ✅ Status de upload - corrigido o warning do DOM */}
                <Alert severity="success" sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon sx={{ mr: 1 }} />
                    <span>Vídeo carregado com sucesso!</span>
                  </Box>
                </Alert>
              </CardContent>
            </Card>
          </Box>
        )
      )}

      {/* Mensagem de erro */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Erro:</strong> {error}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Verifique se o arquivo é um vídeo válido e não excede {getFormattedSizeLimit()}.
          </Typography>
        </Alert>
      )}

      {/* Dialog de detalhes */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Vídeo</DialogTitle>
        <DialogContent>
          {video && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Nome do arquivo</Typography>
                <Typography variant="body1">{video.fileName}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Tamanho</Typography>
                <Typography variant="body1">
                  {formatFileSize(video.size)}
                  {video.size > 1024 * 1024 * 1024 && (
                    <Chip size="small" label="Arquivo grande" color="info" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Duração</Typography>
                <Typography variant="body1">{formatDuration(video.duration)}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Resolução</Typography>
                <Typography variant="body1">{video.width} x {video.height}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Proporção</Typography>
                <Typography variant="body1">
                  {video.aspectRatio.toFixed(2)} 
                  {Math.abs(video.aspectRatio - 9/16) < 0.1 && (
                    <Chip size="small" label="Ideal para Reels" color="success" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Formato</Typography>
                <Typography variant="body1">{video.format}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">URL do Supabase</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'success.main' }}>
                  {video.publicUrl}
                </Typography>
              </Box>

              {video.thumbnail && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Thumbnail
                  </Typography>
                  <img 
                    src={video.thumbnail} 
                    alt="Thumbnail"
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoUploader;
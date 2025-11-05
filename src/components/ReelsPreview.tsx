import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Avatar,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeOff as MuteIcon,
  VolumeUp as UnmuteIcon,
  Favorite as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
// ✅ CORRIGIDO: Usar o serviço correto
import { VideoUploadResult } from '../services/supabaseVideoStorageService';

interface ReelsPreviewProps {
  video: {
    id: string;
    url: string;
    thumbnail?: string;
    duration: number;
    width: number;
    height: number;
  };
  client: {
    name: string;
    username?: string;
    profilePicture?: string;
  };
  caption?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
}

const ReelsPreview: React.FC<ReelsPreviewProps> = ({
  video,
  client,
  caption = '',
  onEdit,
  onDelete,
  autoPlay = false,
  showControls = true
}) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Auto play quando o componente monta
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card 
        sx={{ 
          maxWidth: 350,
          mx: 'auto',
          backgroundColor: 'black',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Vídeo */}
        <Box sx={{ position: 'relative', aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            src={video.url}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            loop
            muted={isMuted}
            playsInline
            poster={video.thumbnail}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Overlay com controles */}
          {showControls && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 2
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={client.profilePicture}
                    sx={{ width: 32, height: 32 }}
                  >
                    {client.name.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                    {client.username || client.name}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ color: 'white', backgroundColor: alpha('black', 0.3) }}
                >
                  <MoreIcon />
                </IconButton>
              </Box>

              {/* Centro - Botão de play */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <IconButton
                  onClick={togglePlay}
                  sx={{
                    backgroundColor: alpha('white', 0.2),
                    color: 'white',
                    '&:hover': {
                      backgroundColor: alpha('white', 0.3)
                    }
                  }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
              </Box>

              {/* Footer */}
              <Box>
                {/* Ações laterais */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Stack spacing={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <IconButton sx={{ color: 'white' }}>
                        <LikeIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                        1.2k
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <IconButton sx={{ color: 'white' }}>
                        <CommentIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                        89
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <IconButton sx={{ color: 'white' }}>
                        <ShareIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                        Share
                      </Typography>
                    </Box>

                    <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                      {isMuted ? <MuteIcon /> : <UnmuteIcon />}
                    </IconButton>
                  </Stack>
                </Box>

                {/* Caption */}
                {caption && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'white', 
                      mb: 1,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                    }}
                  >
                    <strong>{client.username || client.name}</strong> {caption}
                  </Typography>
                )}

                {/* Info chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={formatDuration(video.duration)}
                    sx={{
                      backgroundColor: alpha('black', 0.6),
                      color: 'white',
                      fontSize: '0.7rem'
                    }}
                  />
                  <Chip
                    size="small"
                    label={`${video.width}x${video.height}`}
                    sx={{
                      backgroundColor: alpha('black', 0.6),
                      color: 'white',
                      fontSize: '0.7rem'
                    }}
                  />
                </Stack>
              </Box>
            </Box>
          )}
        </Box>
      </Card>

      {/* Menu de opções */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {onEdit && (
          <MenuItem onClick={() => { onEdit(); handleMenuClose(); }}>
            Editar
          </MenuItem>
        )}
        <MenuItem onClick={() => setShowDialog(true)}>
          Ver detalhes
        </MenuItem>
        {onDelete && (
          <MenuItem onClick={() => { onDelete(); handleMenuClose(); }} sx={{ color: 'error.main' }}>
            Excluir
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de detalhes */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Reel</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
              <Typography variant="body1">{client.name}</Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Username</Typography>
              <Typography variant="body1">{client.username || 'Não definido'}</Typography>
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
                {(video.width / video.height).toFixed(2)}
                {Math.abs((video.width / video.height) - 9/16) < 0.1 && (
                  <Chip size="small" label="Ideal para Reels" color="success" sx={{ ml: 1 }} />
                )}
              </Typography>
            </Box>

            {caption && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Legenda</Typography>
                <Typography variant="body1">{caption}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">URL do vídeo</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'primary.main' }}>
                {video.url}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReelsPreview;
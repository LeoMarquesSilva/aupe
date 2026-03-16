import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Stack,
  Collapse,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Warning as WarningIcon,
  FolderOpen as PickFileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { VideoFormatInfo } from '../services/videoFormatValidator';

interface VideoConversionDialogProps {
  open: boolean;
  file: File | null;
  formatInfo: VideoFormatInfo | null;
  onClose: () => void;
  onPickAnother: () => void;
  onFileReady: (file: File) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const VideoConversionDialog: React.FC<VideoConversionDialogProps> = ({
  open,
  file,
  formatInfo,
  onClose,
  onPickAnother,
}) => {
  const theme = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const handlePickAnother = useCallback(() => {
    setShowHelp(false);
    onPickAnother();
  }, [onPickAnother]);

  const handleClose = useCallback(() => {
    setShowHelp(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <WarningIcon sx={{ color: theme.palette.warning.main }} />
        <span>Formato de vídeo incompatível</span>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          O vídeo selecionado usa o codec <strong>HEVC (H.265)</strong>, que
          é rejeitado pela API do Instagram para Reels. O vídeo precisa estar
          em <strong>MP4 com codec H.264</strong>.
        </Alert>

        {file && formatInfo && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'action.hover',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Detalhes do arquivo
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={file.name}
                variant="outlined"
                sx={{ maxWidth: 220 }}
              />
              <Chip size="small" label={formatFileSize(file.size)} />
              <Chip
                size="small"
                label={formatInfo.container.toUpperCase()}
              />
              <Chip size="small" label="HEVC / H.265" color="error" />
            </Stack>
          </Box>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            Como resolver (leva menos de 1 minuto):
          </Typography>
          <Typography variant="body2">
            Converta o vídeo para <strong>MP4 H.264</strong> usando uma
            ferramenta gratuita e faça o upload novamente.
          </Typography>
        </Alert>

        <Button
          variant="contained"
          startIcon={<PickFileIcon />}
          onClick={handlePickAnother}
          fullWidth
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: theme.palette.primary.main,
          }}
        >
          Escolher outro arquivo (já convertido)
        </Button>

        <Divider sx={{ my: 2.5 }} />

        <Box>
          <Button
            size="small"
            onClick={() => setShowHelp(!showHelp)}
            endIcon={showHelp ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Como converter o vídeo gratuitamente
          </Button>
          <Collapse in={!showHelp}>
            <Box
              sx={{
                p: 2,
                mt: 1,
                backgroundColor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                HandBrake (Desktop - Windows/Mac/Linux)
              </Typography>
              <Typography variant="body2" component="div" sx={{ pl: 1, mb: 2 }}>
                1. Baixe grátis em{' '}
                <strong>handbrake.fr</strong>
                <br />
                2. Abra o vídeo no HandBrake
                <br />
                3. Em "Video Codec" selecione <strong>H.264 (x264)</strong>
                <br />
                4. Preset sugerido: <strong>"Fast 1080p30"</strong>
                <br />
                5. Clique "Start Encode"
                <br />
                6. Use o arquivo .mp4 gerado para fazer o upload
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                CapCut (Mobile/Desktop)
              </Typography>
              <Typography variant="body2" component="div" sx={{ pl: 1, mb: 2 }}>
                1. Importe o vídeo
                <br />
                2. Exporte selecionando o codec <strong>H.264/AVC</strong>
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                VLC (Desktop - já possui?)
              </Typography>
              <Typography variant="body2" component="div" sx={{ pl: 1 }}>
                1. Menu: Mídia {'->'} Converter/Salvar
                <br />
                2. Adicione o vídeo e clique "Converter"
                <br />
                3. Perfil: <strong>Video - H.264 + MP3 (MP4)</strong>
                <br />
                4. Escolha destino e clique "Iniciar"
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoConversionDialog;

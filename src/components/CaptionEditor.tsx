import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { GLASS } from '../theme/glassTokens';

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  disabled?: boolean;
  label?: string;
}

const CaptionEditor: React.FC<CaptionEditorProps> = ({ caption, onChange, disabled = false, label }) => {
  return (
    <Box sx={{
      mb: 4,
      p: 3,
      background: GLASS.surface.bg,
      backdropFilter: `blur(${GLASS.surface.blur})`,
      WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
      border: `1px solid ${GLASS.border.outer}`,
      borderRadius: GLASS.radius.inner,
      boxShadow: GLASS.shadow.cardInset,
    }}>
      <Typography variant="h6" sx={{ mb: 2, color: GLASS.text.heading }}>
        {label || 'Legenda da Postagem'}
      </Typography>
      <TextField
        multiline
        rows={6}
        fullWidth
        variant="outlined"
        placeholder="Digite a legenda da sua postagem aqui... Use hashtags e emojis conforme necessário."
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: GLASS.radius.button,
            background: GLASS.surface.bgStrong,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: GLASS.accent.orange,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: GLASS.accent.orange,
            },
          },
        }}
      />
      <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: GLASS.text.muted }}>
        {caption.length} caracteres
      </Typography>
    </Box>
  );
};

export default CaptionEditor;
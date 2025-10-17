import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
}

const CaptionEditor: React.FC<CaptionEditorProps> = ({ caption, onChange }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Legenda da Postagem
      </Typography>
      <TextField
        multiline
        rows={6}
        fullWidth
        variant="outlined"
        placeholder="Digite a legenda da sua postagem aqui... Use hashtags e emojis conforme necessário."
        value={caption}
        onChange={(e) => onChange(e.target.value)}
      />
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'right' }}>
        {caption.length} caracteres
      </Typography>
    </Box>
  );
};

export default CaptionEditor;
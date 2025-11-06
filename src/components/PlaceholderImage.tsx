import React from 'react';
import { Box, Typography } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';

interface PlaceholderImageProps {
  width?: number | string;
  height?: number | string;
  text?: string;
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ 
  width = '100%', 
  height = 200, 
  text = 'Imagem não disponível' 
}) => {
  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.200',
        color: 'grey.600',
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'grey.400'
      }}
    >
      <ImageIcon sx={{ fontSize: 48, mb: 1 }} />
      <Typography variant="body2" align="center">
        {text}
      </Typography>
    </Box>
  );
};

export default PlaceholderImage;
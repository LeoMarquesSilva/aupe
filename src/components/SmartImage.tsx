import React from 'react';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { Refresh as RefreshIcon, Image as ImageIcon } from '@mui/icons-material';
import { useImageLoader } from '../hooks/useImageLoader';

interface SmartImageProps {
  src: string | undefined | null;
  alt?: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  showRefreshButton?: boolean;
  validateUrl?: boolean;
  fallbackText?: string;
  sx?: any;
  onClick?: () => void;
  onError?: (error: any) => void;
}

const SmartImage = React.forwardRef<HTMLDivElement, SmartImageProps & React.HTMLAttributes<HTMLDivElement>>(
  function SmartImage(props, ref) {
    const {
      src,
      alt = 'Imagem',
      width = '100%',
      height = 'auto',
      borderRadius = 0,
      objectFit = 'cover',
      showRefreshButton = false,
      validateUrl = false,
      fallbackText,
      sx = {},
      onClick,
      onError,
      ...otherProps
    } = props;

    const { src: imageSrc, isLoading, isError, reload } = useImageLoader(src, {
      validateUrl,
      fallbackUrl: fallbackText ? `/api/placeholder/400/400?text=${encodeURIComponent(fallbackText)}` : undefined
    });

    const handleImageError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      if (onError) {
        onError(e);
      }
    }, [onError]);

    const handleRefresh = React.useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      reload();
    }, [reload]);

    const baseProps = {
      ref,
      onClick,
      ...otherProps,
      sx: {
        width,
        height,
        borderRadius,
        cursor: onClick ? 'pointer' : 'default',
        ...sx
      }
    };

    if (isLoading) {
      return (
        <Box
          {...baseProps}
          sx={{
            ...baseProps.sx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100'
          }}
        >
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (isError && !imageSrc) {
      return (
        <Box
          {...baseProps}
          sx={{
            ...baseProps.sx,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.200',
            color: 'grey.600',
            border: '1px dashed',
            borderColor: 'grey.400'
          }}
        >
          <ImageIcon sx={{ fontSize: 32, mb: 1 }} />
          <Box sx={{ fontSize: 12, textAlign: 'center' }}>
            {fallbackText || 'Imagem não disponível'}
          </Box>
          {showRefreshButton && (
            <IconButton size="small" onClick={handleRefresh} sx={{ mt: 1 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
    }

    return (
      <Box
        {...baseProps}
        sx={{
          ...baseProps.sx,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt={alt}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            display: 'block'
          }}
          onError={handleImageError}
        />
        
        {showRefreshButton && isError && (
          <IconButton
            size="small"
            onClick={handleRefresh}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)'
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  }
);

export default SmartImage;
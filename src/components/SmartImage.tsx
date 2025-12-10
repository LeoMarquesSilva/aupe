import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useImageLoader } from '../hooks/useImageLoader';
import { useRefreshableUrl } from '../hooks/useRefreshableUrl';

interface SmartImageProps {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  fallbackText?: string;
  clientId?: string;
  autoRefresh?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  sx?: any;
}

const SmartImage = React.forwardRef<HTMLDivElement, SmartImageProps & React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const {
      src,
      alt = 'Imagem',
      width = 40,
      height = 40,
      borderRadius = 1,
      fallbackText,
      clientId,
      autoRefresh = true, // ✅ autoRefresh ativado por padrão
      onError,
      onLoad,
      sx,
      ...otherProps
    } = props;

    const [imageLoadError, setImageLoadError] = React.useState(false);
    const [isImageLoaded, setIsImageLoaded] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    // ✅ Hook com autoRefresh ativo
    const { 
      url: refreshedUrl, 
      notifyLoadError 
    } = useRefreshableUrl({
      clientId: clientId || '',
      url: src,
      autoRefresh
    });
    
    const { isLoading: imageLoaderLoading } = useImageLoader(src || '');

    // ✅ URL final (usar a refreshed se disponível, senão a original)
    const finalSrc = refreshedUrl || src;

    // ✅ HANDLER de erro MELHORADO com notificação automática
    const handleImageError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      console.warn('❌ Erro ao carregar imagem:', finalSrc);
      setImageLoadError(true);
      setIsLoading(false);
      
      // ✅ Se for URL do Instagram, tentar refresh automático
      if (finalSrc && clientId && autoRefresh && (
        finalSrc.includes('fbcdn.net') || 
        finalSrc.includes('instagram.com') || 
        finalSrc.includes('facebook.com') ||
        finalSrc.includes('scontent-')
      )) {
        console.log('⚠️ URL do Instagram expirada - tentando refresh automático');
        notifyLoadError();
      }
      
      if (onError) {
        onError(e);
      }
    }, [finalSrc, clientId, autoRefresh, notifyLoadError, onError]);

    // ✅ HANDLER de sucesso no carregamento
    const handleImageLoad = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsImageLoaded(true);
      setImageLoadError(false);
      setIsLoading(false);
      
      if (onLoad) {
        onLoad(e);
      }
    }, [onLoad]);

    // ✅ HANDLER para início do carregamento
    const handleImageLoadStart = React.useCallback(() => {
      setIsLoading(true);
      setImageLoadError(false);
      setIsImageLoaded(false);
    }, []);

    // ✅ RESETAR estado quando URL muda
    React.useEffect(() => {
      setImageLoadError(false);
      setIsImageLoaded(false);
      setIsLoading(false);
    }, [finalSrc]);

    // ✅ MOSTRAR loading se estiver carregando
    if (isLoading || imageLoaderLoading) {
      return (
        <Box
          ref={ref}
          sx={{
            width: width,
            height: height,
            borderRadius: borderRadius,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'grey.200',
            ...sx
          }}
          {...otherProps}
        >
          <CircularProgress size={16} />
        </Box>
      );
    }

    // ✅ MOSTRAR fallback se houver erro (SEM botão de refresh)
    if (imageLoadError || !finalSrc) {
      return (
        <Box
          ref={ref}
          sx={{
            width: width,
            height: height,
            borderRadius: borderRadius,
            bgcolor: 'grey.100',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'grey.300',
            p: 1,
            ...sx
          }}
          {...otherProps}
        >
          <WarningIcon sx={{ fontSize: 16, color: 'grey.500', mb: 0.5 }} />
          <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
            {fallbackText || 'Logo indisponível'}
          </Typography>
        </Box>
      );
    }

    // ✅ MOSTRAR imagem normal (SEM botão de refresh)
    return (
      <Box
        ref={ref}
        component="img"
        src={finalSrc}
        alt={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={handleImageLoadStart}
        sx={{
          width: width,
          height: height,
          borderRadius: borderRadius,
          objectFit: 'cover',
          border: '1px solid',
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
          ...sx
        }}
        {...otherProps}
      />
    );
  }
);

SmartImage.displayName = 'SmartImage';

export default SmartImage;
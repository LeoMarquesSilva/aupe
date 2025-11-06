import { useState, useEffect } from 'react';
import { imageUrlService } from '../services/imageUrlService';

interface UseImageLoaderOptions {
  fallbackUrl?: string;
  validateUrl?: boolean;
}

interface UseImageLoaderResult {
  src: string;
  isLoading: boolean;
  isError: boolean;
  reload: () => void;
}

export const useImageLoader = (
  initialUrl: string | undefined | null,
  options: UseImageLoaderOptions = {}
): UseImageLoaderResult => {
  const [src, setSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const {
    fallbackUrl = imageUrlService.getPlaceholder(),
    validateUrl = false
  } = options;

  const loadImage = async (url: string | undefined | null) => {
    setIsLoading(true);
    setIsError(false);

    try {
      if (!url) {
        setSrc(fallbackUrl);
        setIsLoading(false);
        return;
      }

      // Processar a URL usando o imageUrlService
      const processedUrl = imageUrlService.getPublicUrl(url);

      if (validateUrl) {
        // Validar se a imagem existe
        const isValid = await imageUrlService.validateImageUrl(processedUrl);
        setSrc(isValid ? processedUrl : fallbackUrl);
      } else {
        setSrc(processedUrl);
      }
    } catch (error) {
      console.warn('Erro ao carregar imagem:', error);
      setSrc(fallbackUrl);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const reload = () => {
    loadImage(initialUrl);
  };

  useEffect(() => {
    loadImage(initialUrl);
  }, [initialUrl, fallbackUrl, validateUrl]);

  return {
    src,
    isLoading,
    isError,
    reload
  };
};

export default useImageLoader;
import React, { useRef, useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { ImageUrlService } from '../services/imageUrlService';

export const POST_TYPE = {
  POST: 'post',
  CAROUSEL: 'carousel',
  REELS: 'reels',
  STORIES: 'stories',
  ROTEIRO: 'roteiro',
} as const;

type PostLikeImages = { images?: (string | { url: string })[] };

export function getFirstImageUrl(post: PostLikeImages): string | undefined {
  const raw = post.images?.[0];
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'url' in raw) return (raw as { url: string }).url;
  return undefined;
}

export function getImageUrls(post: PostLikeImages): string[] {
  const arr = post.images ?? [];
  return arr
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item) return (item as { url: string }).url;
      return '';
    })
    .filter(Boolean);
}

function getMediaAspectRatioCss(postType: string): string {
  switch (postType) {
    case POST_TYPE.REELS:
    case POST_TYPE.STORIES:
      return '9 / 16';
    case POST_TYPE.CAROUSEL:
    case POST_TYPE.POST:
    default:
      return '4 / 5';
  }
}

export function PostMediaPreview({
  postType,
  imageUrls,
  firstImage,
  videoUrl,
  coverImageUrl,
  size = 'default',
}: {
  postType: string;
  imageUrls: string[];
  firstImage: string | undefined;
  videoUrl?: string;
  coverImageUrl?: string;
  size?: 'default' | 'expanded';
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const aspectRatioCss = getMediaAspectRatioCss(postType);
  const isReels = postType === POST_TYPE.REELS;
  const isStories = postType === POST_TYPE.STORIES;
  const isCarousel = postType === POST_TYPE.CAROUSEL || imageUrls.length > 1;
  const isVertical = isReels || isStories;

  const expandedVertical = {
    xs: 'min(88vh, 800px)',
    sm: 'min(85vh, 920px)',
  };
  const expandedFeed = {
    xs: 'min(72vh, 620px)',
    sm: 'min(76vh, 720px)',
  };

  const containerSx = {
    width: '100%',
    maxWidth: size === 'expanded' ? { xs: '100%', sm: 960 } : undefined,
    mx: size === 'expanded' ? 'auto' : undefined,
    bgcolor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative' as const,
    aspectRatio: aspectRatioCss,
    maxHeight:
      size === 'expanded'
        ? isVertical
          ? expandedVertical
          : expandedFeed
        : isVertical
          ? 560
          : 420,
  };

  const mediaSx = {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    display: 'block',
  };

  if (isReels) {
    return (
      <Box sx={containerSx}>
        {videoUrl ? (
          <video
            src={ImageUrlService.getPublicUrl(videoUrl)}
            poster={coverImageUrl ? ImageUrlService.getPublicUrl(coverImageUrl) : undefined}
            controls
            style={{ ...mediaSx }}
          />
        ) : coverImageUrl ? (
          <img src={ImageUrlService.getPublicUrl(coverImageUrl)} alt="" style={{ ...mediaSx }} />
        ) : firstImage ? (
          <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
        ) : (
          <Typography color="text.secondary">Reels</Typography>
        )}
      </Box>
    );
  }

  if (isStories) {
    return (
      <Box sx={containerSx}>
        {firstImage ? (
          <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
        ) : (
          <Typography color="text.secondary">Story</Typography>
        )}
      </Box>
    );
  }

  if (isCarousel && imageUrls.length > 0) {
    const total = imageUrls.length;
    const goTo = (index: number) => {
      const next = Math.max(0, Math.min(index, total - 1));
      setCarouselIndex(next);
      const el = carouselRef.current;
      if (el) {
        const slide = el.children[next] as HTMLElement;
        slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    };

    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: size === 'expanded' ? { xs: '100%', sm: 960 } : undefined,
          mx: size === 'expanded' ? 'auto' : undefined,
          bgcolor: '#e8e8e8',
          aspectRatio: aspectRatioCss,
          maxHeight: size === 'expanded' ? expandedFeed : 420,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          ref={carouselRef}
          onScroll={() => {
            const el = carouselRef.current;
            if (!el || imageUrls.length <= 1) return;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            setCarouselIndex(Math.min(index, imageUrls.length - 1));
          }}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            height: '100%',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& > *': { scrollSnapAlign: 'start', scrollSnapStop: 'always', flexShrink: 0 },
          }}
        >
          {imageUrls.map((url, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                minWidth: '100%',
                height: '100%',
                bgcolor: '#e8e8e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={ImageUrlService.getPublicUrl(url)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>
          ))}
        </Box>

        {total > 1 && (
          <>
            <IconButton
              onClick={() => goTo(carouselIndex - 1)}
              disabled={carouselIndex === 0}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
                '&:hover': { bgcolor: 'white', boxShadow: 3 },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
                '& .MuiSvgIcon-root': { fontSize: 28 },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={() => goTo(carouselIndex + 1)}
              disabled={carouselIndex === total - 1}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
                '&:hover': { bgcolor: 'white', boxShadow: 3 },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
                '& .MuiSvgIcon-root': { fontSize: 28 },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {carouselIndex + 1} / {total}
            </Typography>
          </>
        )}
      </Box>
    );
  }

  if (firstImage) {
    return (
      <Box sx={containerSx}>
        <img src={ImageUrlService.getPublicUrl(firstImage)} alt="" style={{ ...mediaSx }} />
      </Box>
    );
  }

  return (
    <Box sx={{ ...containerSx, minHeight: 200 }}>
      <Typography color="text.secondary">Mídia</Typography>
    </Box>
  );
}

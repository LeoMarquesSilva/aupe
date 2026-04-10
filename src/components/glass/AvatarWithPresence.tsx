import React from 'react';
import { Box } from '@mui/material';
import { GLASS, GlassStatus } from '../../theme/glassTokens';

interface AvatarWithPresenceProps {
  src?: string;
  alt: string;
  size?: number;
  status?: GlassStatus;
  fallbackText?: string;
}

const AvatarWithPresence: React.FC<AvatarWithPresenceProps> = ({
  src,
  alt,
  size = 72,
  status = 'connected',
  fallbackText,
}) => {
  const dotSize = Math.max(14, size * 0.2);
  const dotOffset = size * 0.04;
  const borderWidth = Math.max(3, size * 0.05);
  const statusConfig = GLASS.status[status];

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: GLASS.radius.avatar,
          border: `${borderWidth}px solid rgba(255, 255, 255, 0.9)`,
          boxShadow: GLASS.shadow.avatar,
          overflow: 'hidden',
          bgcolor: 'grey.100',
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              fontSize: size * 0.32,
              fontWeight: 700,
              color: GLASS.text.muted,
              bgcolor: 'rgba(241, 245, 249, 0.9)',
            }}
          >
            {(fallbackText || alt).charAt(0).toUpperCase()}
          </Box>
        )}
      </Box>

      {/* Status indicator dot */}
      <Box
        sx={{
          position: 'absolute',
          bottom: dotOffset,
          right: dotOffset,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          bgcolor: statusConfig.dot,
          border: '2.5px solid white',
          boxShadow: `0 0 8px ${statusConfig.glow}`,
        }}
        aria-label={status === 'connected' ? 'Conectado' : 'Desconectado'}
      />
    </Box>
  );
};

export default AvatarWithPresence;

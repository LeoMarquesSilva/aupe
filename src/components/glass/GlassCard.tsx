import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { GLASS, GlassStatus } from '../../theme/glassTokens';

interface GlassCardProps extends Omit<BoxProps, 'ref'> {
  status?: GlassStatus;
  isSelected?: boolean;
  disableHover?: boolean;
  children: React.ReactNode;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ status = 'connected', isSelected = false, disableHover = false, children, sx, ...props }, ref) => {
    const statusGlow = GLASS.glow[status];
    const selectedGlow = isSelected ? GLASS.glow.selected : statusGlow;
    const overlay = status === 'connected' ? GLASS.overlay.mint : GLASS.overlay.neutral;

    return (
      <Box
        ref={ref}
        sx={{
          position: 'relative',
          borderRadius: GLASS.radius.card,
          background: `${overlay}, ${GLASS.surface.bg}`,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}, ${selectedGlow}`,
          border: `1px solid ${GLASS.border.outer}`,
          overflow: 'hidden',
          transition: `box-shadow ${GLASS.motion.duration.normal} ${GLASS.motion.easing}, transform ${GLASS.motion.duration.normal} ${GLASS.motion.easing}, background ${GLASS.motion.duration.slow} ${GLASS.motion.easing}`,
          display: 'flex',
          flexDirection: 'column',

          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            border: `1px solid ${GLASS.border.light}`,
            pointerEvents: 'none',
          },

          ...(!disableHover && {
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: `${GLASS.shadow.cardHover}, ${GLASS.shadow.cardInset}, ${GLASS.glow.hover}, ${selectedGlow}`,
              background: `${overlay}, ${GLASS.surface.bgHover}`,
            },
          }),

          '&:focus-visible': {
            outline: 'none',
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}, 0 0 0 3px rgba(247, 66, 17, 0.3)`,
          },

          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;

import React from 'react';
import { Box, Typography } from '@mui/material';
import { GLASS, GlassStatus } from '../../theme/glassTokens';

interface StatusBadgeProps {
  status: GlassStatus;
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = GLASS.status[status];
  const displayLabel = label || (status === 'connected' ? 'Conectado' : 'Desconectado');

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        px: 1.2,
        py: 0.4,
        borderRadius: GLASS.radius.badge,
        bgcolor: config.bg,
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: config.color,
          boxShadow: `0 0 6px ${config.glow}`,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: config.colorDark,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1,
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
};

export default StatusBadge;

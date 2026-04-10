import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { GLASS } from '../../theme/glassTokens';

interface GrowthBadgeProps {
  value: number;
  label?: string;
}

const GrowthBadge: React.FC<GrowthBadgeProps> = ({ value, label = 'engajamento' }) => {
  const isPositive = value >= 0;
  const color = isPositive ? GLASS.accent.orange : '#ef4444';
  const bg = isPositive ? 'rgba(247, 66, 17, 0.08)' : 'rgba(239, 68, 68, 0.08)';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        px: 1,
        py: 0.4,
        borderRadius: GLASS.radius.badge,
        bgcolor: bg,
      }}
    >
      <Icon size={13} color={color} strokeWidth={2.2} />
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 650,
          color,
          lineHeight: 1,
        }}
      >
        {isPositive ? '+' : ''}{value}% {label}
      </Typography>
    </Box>
  );
};

export default GrowthBadge;

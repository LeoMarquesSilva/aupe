import React from 'react';
import { Box, Typography } from '@mui/material';
import { ArrowRight } from 'lucide-react';
import { GLASS } from '../../theme/glassTokens';

interface MetricBlockProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  iconBorder?: string;
  hoverActionLabel?: string;
  onHoverAction?: () => void;
  children?: React.ReactNode;
}

const MetricBlock: React.FC<MetricBlockProps> = ({
  label,
  value,
  icon,
  iconBg = GLASS.metric.scheduled.iconBg,
  iconColor = GLASS.metric.scheduled.iconColor,
  iconBorder = GLASS.metric.scheduled.iconBorder,
  hoverActionLabel,
  onHoverAction,
  children,
}) => {
  return (
    <Box
      sx={{
        py: 0.5,
        position: 'relative',
        cursor: onHoverAction ? 'pointer' : 'default',
        borderRadius: '14px',
        transition: `background ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
        '&:hover': onHoverAction ? {
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          '& .metric-hover-action': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        } : undefined,
      }}
      onClick={(e) => {
        if (onHoverAction) {
          e.stopPropagation();
          onHoverAction();
        }
      }}
      role={onHoverAction ? 'button' : undefined}
      tabIndex={onHoverAction ? 0 : undefined}
      onKeyDown={(e) => {
        if (onHoverAction && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          onHoverAction();
        }
      }}
    >
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: GLASS.text.metricLabel,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          mb: 1.2,
        }}
      >
        {label}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: iconBg,
            border: `1px solid ${iconBorder}`,
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        <Typography
          sx={{
            fontSize: '2.8rem',
            fontWeight: 800,
            color: GLASS.text.metric,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            fontFamily: '"Cabinet Grotesk", sans-serif',
          }}
        >
          {value}
        </Typography>
      </Box>

      {children && (
        <Box sx={{ mt: 1 }}>
          {children}
        </Box>
      )}

      {hoverActionLabel && onHoverAction && (
        <Box
          className="metric-hover-action"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.8,
            opacity: 0,
            transform: 'translateY(4px)',
            transition: `opacity ${GLASS.motion.duration.normal} ${GLASS.motion.easing}, transform ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: GLASS.accent.orange,
              lineHeight: 1,
            }}
          >
            {hoverActionLabel}
          </Typography>
          <ArrowRight size={12} color={GLASS.accent.orange} strokeWidth={2.2} />
        </Box>
      )}
    </Box>
  );
};

export default MetricBlock;

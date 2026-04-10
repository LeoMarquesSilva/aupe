import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { GLASS } from '../../theme/glassTokens';

type ActionButtonVariant = 'primary' | 'secondary' | 'accent';

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  glassVariant?: ActionButtonVariant;
}

const variantStyles: Record<ActionButtonVariant, Record<string, any>> = {
  primary: {
    bgcolor: GLASS.text.heading,
    color: '#ffffff',
    border: 'none',
    boxShadow: GLASS.shadow.button,
    '&:hover': {
      bgcolor: '#131940',
      boxShadow: GLASS.shadow.buttonHover,
    },
    '&:active': {
      bgcolor: '#0a0f2d',
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `0 0 0 3px rgba(15, 23, 42, 0.3)`,
    },
  },
  secondary: {
    bgcolor: GLASS.surface.bg,
    color: GLASS.text.body,
    border: `1px solid ${GLASS.border.outer}`,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: GLASS.surface.bgHover,
      boxShadow: GLASS.shadow.button,
    },
    '&:active': {
      bgcolor: GLASS.surface.bgStrong,
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `0 0 0 3px rgba(100, 116, 139, 0.2)`,
    },
  },
  accent: {
    bgcolor: GLASS.accent.orange,
    color: '#ffffff',
    border: 'none',
    boxShadow: `0 2px 10px -2px ${GLASS.status.connected.glow}`,
    '&:hover': {
      bgcolor: GLASS.accent.orangeDark,
      boxShadow: `0 6px 20px -4px ${GLASS.status.connected.glow}`,
    },
    '&:active': {
      bgcolor: '#047857',
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `0 0 0 3px rgba(247, 66, 17, 0.3)`,
    },
  },
};

const ActionButton: React.FC<ActionButtonProps> = ({
  glassVariant = 'secondary',
  children,
  sx,
  ...props
}) => {
  const styles = variantStyles[glassVariant];

  return (
    <Button
      disableElevation
      sx={{
        borderRadius: GLASS.radius.button,
        textTransform: 'none',
        fontWeight: 650,
        fontSize: '0.8rem',
        px: 2,
        py: 1,
        minWidth: 0,
        transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
        ...styles,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ActionButton;

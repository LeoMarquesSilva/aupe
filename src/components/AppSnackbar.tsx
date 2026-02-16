import React from 'react';
import { Snackbar, Alert, alpha, useTheme } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

export type AppSnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

export interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity: AppSnackbarSeverity;
  onClose: () => void;
  autoHideDuration?: number;
}

const severityIcon = {
  success: <SuccessIcon sx={{ fontSize: 22 }} />,
  error: <ErrorIcon sx={{ fontSize: 22 }} />,
  info: <InfoIcon sx={{ fontSize: 22 }} />,
  warning: <WarningIcon sx={{ fontSize: 22 }} />,
};

const AppSnackbar: React.FC<AppSnackbarProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 5000,
}) => {
  const theme = useTheme();

  const severityBorder = {
    success: alpha(theme.palette.success.main, 0.4),
    error: alpha(theme.palette.error.main, 0.35),
    info: alpha(theme.palette.primary.main, 0.3),
    warning: alpha(theme.palette.warning.main, 0.4),
  };

  const severityColor = {
    success: theme.palette.success.dark,
    error: theme.palette.error.dark,
    info: theme.palette.primary.dark,
    warning: theme.palette.warning.dark,
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbar-root': { bottom: 24 },
      }}
    >
      <Alert
        onClose={onClose}
        icon={severityIcon[severity]}
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 420,
          fontFamily: '"Poppins", sans-serif',
          fontSize: '0.9375rem',
          fontWeight: 500,
          borderRadius: 2.5,
          boxShadow: theme.shadows[4],
          backgroundColor: theme.palette.background.paper,
          borderWidth: 1,
          borderColor: severityBorder[severity],
          color: theme.palette.text.primary,
          '& .MuiAlert-icon': {
            color: severityColor[severity],
            opacity: 1,
          },
          '& .MuiAlert-message': {
            color: theme.palette.text.primary,
          },
          '& .MuiAlert-action .MuiIconButton-root': {
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
            },
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;

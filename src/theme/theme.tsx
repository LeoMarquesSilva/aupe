import { createTheme } from '@mui/material/styles';

const INSYT_TOKENS = {
  primary: '#f74211',
  primaryLight: '#ff6b42',
  primaryDark: '#d4380d',
  secondary: '#525663',
  secondaryLight: '#7a7e8a',
  secondaryDark: '#3a3d47',
  navy: '#0a0f2d',
  mediumBlue: '#3e54b5',
  lightBlue: '#bbc9f9',
  backgroundDefault: '#f6f6f6',
  backgroundPaper: '#ffffff',
  backgroundSubtle: 'rgba(255, 255, 255, 0.55)',
  textPrimary: '#0a0f2d',
  textSecondary: '#525663',
  border: 'rgba(82, 86, 99, 0.18)',
  borderMuted: 'rgba(82, 86, 99, 0.12)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const theme = createTheme({
  palette: {
    primary: {
      main: INSYT_TOKENS.primary,
      light: INSYT_TOKENS.primaryLight,
      dark: INSYT_TOKENS.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: INSYT_TOKENS.secondary,
      light: INSYT_TOKENS.secondaryLight,
      dark: INSYT_TOKENS.secondaryDark,
      contrastText: '#ffffff',
    },
    background: {
      default: INSYT_TOKENS.backgroundDefault,
      paper: INSYT_TOKENS.backgroundPaper,
    },
    text: {
      primary: INSYT_TOKENS.textPrimary,
      secondary: INSYT_TOKENS.textSecondary,
    },
    error: {
      main: INSYT_TOKENS.error,
    },
    warning: {
      main: INSYT_TOKENS.warning,
    },
    info: {
      main: INSYT_TOKENS.mediumBlue,
    },
    success: {
      main: INSYT_TOKENS.success,
    },
    divider: INSYT_TOKENS.border,
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 800,
      fontSize: '2.25rem',
      letterSpacing: '-0.03em',
      lineHeight: 1.08,
    },
    h2: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 800,
      fontSize: '1.875rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
    },
    h3: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 800,
      fontSize: '1.5rem',
      letterSpacing: '-0.015em',
    },
    h4: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 800,
      fontSize: '1.375rem',
      letterSpacing: '-0.015em',
      lineHeight: 1.24,
    },
    h5: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: '1.125rem',
    },
    h6: {
      fontFamily: '"Cabinet Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontWeight: 300,
      fontSize: '1rem',
      lineHeight: 1.55,
    },
    body2: {
      fontWeight: 300,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.75rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(10, 15, 45, 0.06), 0 1px 2px rgba(10, 15, 45, 0.04)',
    '0 4px 12px -2px rgba(10, 15, 45, 0.08)',
    '0 8px 24px -4px rgba(10, 15, 45, 0.1)',
    '0 12px 32px -6px rgba(10, 15, 45, 0.12)',
    '0 16px 40px -8px rgba(10, 15, 45, 0.14)',
    ...Array(19).fill('0 16px 40px -8px rgba(10, 15, 45, 0.14)'),
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * {
          box-sizing: border-box;
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          boxShadow: 'none',
          border: `1px solid ${INSYT_TOKENS.borderMuted}`,
          fontWeight: 600,
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.22)',
          },
          '&:hover': {
            boxShadow: '0 4px 12px -2px rgba(10, 15, 45, 0.1)',
          },
        },
        contained: {
          borderColor: 'transparent',
          '&:hover': {
            boxShadow: '0 8px 20px -4px rgba(247, 66, 17, 0.3)',
          },
        },
        containedPrimary: {
          backgroundImage: 'var(--gradient-01)',
          backgroundSize: '240px 240px, auto',
          backgroundBlendMode: 'soft-light, normal',
          backgroundColor: INSYT_TOKENS.primary,
          '&:hover': {
            background: INSYT_TOKENS.primaryDark,
            backgroundColor: INSYT_TOKENS.primaryDark,
          },
        },
        containedSecondary: {
          backgroundColor: INSYT_TOKENS.navy,
          '&:hover': {
            backgroundColor: '#131940',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
        outlinedPrimary: {
          borderColor: INSYT_TOKENS.primary,
          color: INSYT_TOKENS.primary,
          backgroundColor: 'rgba(247, 66, 17, 0.03)',
          '&:hover': {
            borderColor: INSYT_TOKENS.primaryDark,
            backgroundColor: 'rgba(247, 66, 17, 0.08)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(10, 15, 45, 0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(10, 15, 45, 0.06), 0 1px 2px rgba(10, 15, 45, 0.04)',
          border: `1px solid ${INSYT_TOKENS.borderMuted}`,
          backgroundColor: '#ffffff',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 14,
        },
        /* Sem borda/sombra padrão: elevation 0 é “flat”. Borda em cards vem de MuiCard ou sx no Paper. */
        elevation0: {
          backgroundColor: '#ffffff',
          border: 'none',
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 4px 12px -2px rgba(10, 15, 45, 0.08)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: INSYT_TOKENS.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: INSYT_TOKENS.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: INSYT_TOKENS.primary,
            boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.12)',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderRadius: 8,
          '&:focus-visible': {
            outline: 'none',
            boxShadow: 'inset 0 0 0 2px rgba(247, 66, 17, 0.25)',
          },
          '&:hover': {
            backgroundColor: 'rgba(247, 66, 17, 0.06)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(247, 66, 17, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(247, 66, 17, 0.14)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: '#ffffff',
          border: `1px solid ${INSYT_TOKENS.borderMuted}`,
          boxShadow: '0 16px 48px -8px rgba(10, 15, 45, 0.2)',
        },
        root: {
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(10, 15, 45, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(247, 66, 17, 0.08)',
            color: INSYT_TOKENS.primaryDark,
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(247, 66, 17, 0.12)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: 'inset 0 0 0 2px rgba(247, 66, 17, 0.22)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: INSYT_TOKENS.textSecondary,
          minWidth: 34,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          '&.Mui-selected': {
            color: INSYT_TOKENS.primaryDark,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.72rem',
        },
        colorPrimary: {
          backgroundColor: INSYT_TOKENS.primary,
        },
        colorSecondary: {
          backgroundColor: INSYT_TOKENS.secondary,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: INSYT_TOKENS.primary,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.22)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: INSYT_TOKENS.border,
          color: INSYT_TOKENS.textSecondary,
          borderRadius: 8,
          '&.Mui-selected': {
            color: INSYT_TOKENS.primaryDark,
            backgroundColor: 'rgba(247, 66, 17, 0.08)',
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(247, 66, 17, 0.12)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: 'inset 0 0 0 2px rgba(247, 66, 17, 0.22)',
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: INSYT_TOKENS.primary,
            color: '#ffffff',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.22)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: INSYT_TOKENS.primary,
            '& + .MuiSwitch-track': {
              backgroundColor: INSYT_TOKENS.primary,
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(82, 86, 99, 0.12)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: INSYT_TOKENS.navy,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          color: '#dc2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
        },
        standardInfo: {
          backgroundColor: 'rgba(62, 84, 181, 0.1)',
          color: '#3e54b5',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(82, 86, 99, 0.1)',
        },
      },
    },
  },
});

export default theme;

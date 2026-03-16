import { createTheme } from '@mui/material/styles';

// Paleta minimalista e tecnológica (inspirada Supabase/Vercel)
const BRAND_COLORS = {
  primary: '#0f766e',       // teal (accent)
  primaryLight: '#14b8a6',
  primaryDark: '#0d9488',
  secondary: '#64748b',     // slate-500
  secondaryLight: '#94a3b8',
  secondaryDark: '#475569',
  backgroundDefault: '#f8fafc',
  backgroundPaper: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  borderMuted: '#f1f5f9',
  offWhite: '#fafafa',
};

// Criação do tema com identidade minimalista/tech
const theme = createTheme({
  palette: {
    primary: {
      main: BRAND_COLORS.primary,
      light: BRAND_COLORS.primaryLight,
      dark: BRAND_COLORS.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: BRAND_COLORS.secondary,
      light: BRAND_COLORS.secondaryLight,
      dark: BRAND_COLORS.secondaryDark,
      contrastText: '#ffffff',
    },
    background: {
      default: BRAND_COLORS.backgroundDefault,
      paper: BRAND_COLORS.backgroundPaper,
    },
    text: {
      primary: BRAND_COLORS.textPrimary,
      secondary: BRAND_COLORS.textSecondary,
    },
    error: {
      main: '#dc2626',
    },
    warning: {
      main: '#d97706',
    },
    info: {
      main: BRAND_COLORS.primary,
    },
    success: {
      main: '#059669',
    },
    divider: BRAND_COLORS.border,
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '2.5rem',
      textTransform: 'lowercase',
    },
    h2: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '2rem',
      textTransform: 'lowercase',
    },
    h3: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '1.75rem',
      textTransform: 'lowercase',
    },
    h4: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '1.5rem',
      textTransform: 'lowercase',
    },
    h5: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '1.25rem',
      textTransform: 'lowercase',
    },
    h6: {
      fontFamily: '"Argent CF", serif',
      fontWeight: 400,
      fontSize: '1rem',
      textTransform: 'lowercase',
    },
    subtitle1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
    },
    subtitle2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
    },
    body2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 300,
      fontSize: '0.875rem',
    },
    button: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
    caption: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 300,
      fontSize: '0.75rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Argent CF';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
        }
        
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 300;
        }
        
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
        }
        
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 500;
        }
        
        @font-face {
          font-family: 'Poppins';
          font-style: normal;
          font-display: swap;
          font-weight: 700;
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
          },
        },
        containedPrimary: {
          backgroundColor: BRAND_COLORS.primary,
          '&:hover': {
            backgroundColor: BRAND_COLORS.primaryDark,
          },
        },
        containedSecondary: {
          backgroundColor: BRAND_COLORS.secondary,
          '&:hover': {
            backgroundColor: BRAND_COLORS.secondaryDark,
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
        outlinedPrimary: {
          borderColor: BRAND_COLORS.primary,
          color: BRAND_COLORS.primary,
          '&:hover': {
            borderColor: BRAND_COLORS.primaryDark,
            backgroundColor: 'rgba(15, 118, 110, 0.04)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
          border: `1px solid ${BRAND_COLORS.border}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': {
            borderColor: BRAND_COLORS.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: BRAND_COLORS.secondary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: BRAND_COLORS.primary,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          '&:hover': {
            backgroundColor: 'rgba(15, 118, 110, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(15, 118, 110, 0.12)',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 500,
          '&.Mui-selected': {
            color: BRAND_COLORS.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        colorPrimary: {
          backgroundColor: BRAND_COLORS.primary,
        },
        colorSecondary: {
          backgroundColor: BRAND_COLORS.secondary,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: BRAND_COLORS.primary,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: BRAND_COLORS.primary,
            '& + .MuiSwitch-track': {
              backgroundColor: BRAND_COLORS.primary,
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          backgroundColor: BRAND_COLORS.border,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 500,
          backgroundColor: 'rgba(15, 118, 110, 0.04)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          color: '#dc2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(217, 119, 6, 0.1)',
          color: '#d97706',
        },
        standardInfo: {
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          color: BRAND_COLORS.primary,
        },
      },
    },
  },
});

export default theme;

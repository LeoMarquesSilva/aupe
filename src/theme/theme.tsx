import { createTheme } from '@mui/material/styles';

// Cores da identidade visual da marca
const BRAND_COLORS = {
  primary: '#510000',      // vinho escuro
  secondary: '#3A1D1A',    // marrom café escuro
  lightGray: '#D7CFCF',    // cinza claro rosado
  neutralGray: '#CFCFCF',  // cinza claro neutro
  softBlack: '#0E0E0E',    // preto suave
  greenBlack: '#151B19',   // preto esverdeado
  pureBlack: '#000000',    // preto puro
  offWhite: '#EDEBE9',     // off-white
};

// Criação do tema com a identidade visual da marca
const theme = createTheme({
  palette: {
    primary: {
      main: BRAND_COLORS.primary,
      light: '#6b1a1a',
      dark: '#3c0000',
      contrastText: BRAND_COLORS.offWhite,
    },
    secondary: {
      main: BRAND_COLORS.secondary,
      light: '#533a37',
      dark: '#271310',
      contrastText: BRAND_COLORS.offWhite,
    },
    background: {
      default: BRAND_COLORS.offWhite,
      paper: '#FFFFFF',
    },
    text: {
      primary: BRAND_COLORS.softBlack,
      secondary: BRAND_COLORS.secondary,
    },
    error: {
      main: '#b71c1c',
    },
    warning: {
      main: '#8B4513',
    },
    info: {
      main: '#510000',
    },
    success: {
      main: '#2e7d32',
    },
    divider: BRAND_COLORS.lightGray,
  },
  typography: {
    // Definindo as fontes da marca
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
      fontWeight: 300, // Light
      fontSize: '0.875rem',
    },
    button: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500, // Medium
      fontSize: '0.875rem',
      textTransform: 'none',
    },
    caption: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 300, // Light
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
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        containedPrimary: {
          backgroundColor: BRAND_COLORS.primary,
          '&:hover': {
            backgroundColor: '#6b1a1a',
          },
        },
        containedSecondary: {
          backgroundColor: BRAND_COLORS.secondary,
          '&:hover': {
            backgroundColor: '#533a37',
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
            borderColor: '#6b1a1a',
            backgroundColor: 'rgba(81, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${BRAND_COLORS.lightGray}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': {
            borderColor: BRAND_COLORS.neutralGray,
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
            backgroundColor: 'rgba(81, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(81, 0, 0, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(81, 0, 0, 0.12)',
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
          backgroundColor: BRAND_COLORS.lightGray,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 500,
          backgroundColor: 'rgba(81, 0, 0, 0.04)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          color: '#2e7d32',
        },
        standardError: {
          backgroundColor: 'rgba(183, 28, 28, 0.1)',
          color: '#b71c1c',
        },
        standardWarning: {
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
          color: '#8B4513',
        },
        standardInfo: {
          backgroundColor: 'rgba(81, 0, 0, 0.1)',
          color: BRAND_COLORS.primary,
        },
      },
    },
  },
});

export default theme;
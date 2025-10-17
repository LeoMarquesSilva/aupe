import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import InstagramCallback from './pages/InstagramCallback';

// Criando um tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#E1306C', // Cor rosa do Instagram
    },
    secondary: {
      main: '#833AB4', // Cor roxa do Instagram
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <Routes>
            <Route path="/" element={<CreatePost />} />
            <Route path="/create-story" element={<CreateStory />} />
            <Route path="/api/instagram-auth/callback" element={<InstagramCallback />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
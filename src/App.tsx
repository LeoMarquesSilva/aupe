import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import InstagramCallback from './pages/InstagramCallback';
import StoryCalendar from './pages/StoryCalendar';
import EditStory from './pages/EditStory';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <CssBaseline />
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Switch>
              <Route exact path="/" component={StoryCalendar} />
              <Route path="/calendar" component={StoryCalendar} />
              <Route path="/create-post" component={CreatePost} />
              <Route path="/create-story" component={CreateStory} />
              <Route path="/edit-story/:id" component={EditStory} />
              <Route path="/api/instagram-auth/callback" component={InstagramCallback} />
            </Switch>
          </Box>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
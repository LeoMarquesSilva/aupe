import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import InstagramCallback from './pages/InstagramCallback';
import Callback from './pages/Callback'; // Importando o componente de callback
import StoryCalendar from './pages/StoryCalendar';
import EditStory from './pages/EditStory';
import ClientDashboard from './pages/ClientDashboard';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import Header from './components/Header';

// Layout compartilhado para todas as páginas
const PageLayout = ({ children }: { children: React.ReactNode }) => (
  <Box 
    sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column',
      color: 'text.primary'
    }}
  >
    <Header />
    <Box 
      className="page-container fade-in" 
      sx={{ 
        flex: 1, 
        pt: 2,
        pb: 4
      }}
    >
      {children}
    </Box>
  </Box>
);

// Layout sem cabeçalho para páginas de callback
const CallbackLayout = ({ children }: { children: React.ReactNode }) => (
  <Box 
    sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column',
      color: 'text.primary'
    }}
  >
    {children}
  </Box>
);

// Configuração do router sem as flags futuras que causam erro
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <PageLayout><ClientDashboard /></PageLayout>,
    },
    {
      path: "/clients",
      element: <PageLayout><ClientDashboard /></PageLayout>,
    },
    {
      path: "/calendar",
      element: <PageLayout><StoryCalendar /></PageLayout>,
    },
    {
      path: "/calendar/:clientId",
      element: <PageLayout><StoryCalendar /></PageLayout>,
    },
    {
      path: "/create-post",
      element: <PageLayout><CreatePost /></PageLayout>,
    },
    {
      path: "/create-story",
      element: <PageLayout><CreateStory /></PageLayout>,
    },
    {
      path: "/edit-story/:id",
      element: <PageLayout><EditStory /></PageLayout>,
    },
    {
      path: "/api/instagram-auth/callback",
      element: <CallbackLayout><InstagramCallback /></CallbackLayout>,
    },
    // Adicionando a rota /callback que já está validada no Facebook Developer
    {
      path: "/callback",
      element: <CallbackLayout><Callback /></CallbackLayout>,
    },
  ]
);

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <CssBaseline />
      <RouterProvider router={router} />
    </LocalizationProvider>
  );
}

export default App;
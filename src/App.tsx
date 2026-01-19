import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';

// Context e Componentes de Auth
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Components
import Header from './components/Header';

// Pages - Public
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import EmailConfirmation from './pages/EmailConfirmation'; // ✅ Nova importação
import Landing from './pages/Landing';

// Pages - Protected
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import CreateReels from './pages/CreateReels';
import InstagramCallback from './pages/InstagramCallback';
import StoryCalendar from './pages/StoryCalendar';
import EditStory from './pages/EditStory';
import EditPost from './pages/EditPost';
import ClientDashboard from './pages/ClientDashboard';
import SingleClientDashboard from './pages/SingleClientDashboard';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';

// Layout compartilhado para todas as páginas protegidas
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

// Layout para páginas públicas (login, etc)
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <Box 
    sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    {children}
  </Box>
);

// Componente para verificar se o usuário está logado antes de renderizar rotas protegidas
const ProtectedPageLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <PageLayout>
      {children}
    </PageLayout>
  </ProtectedRoute>
);

// Componente para páginas que requerem role de admin
const AdminPageLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRole="admin">
    <PageLayout>
      {children}
    </PageLayout>
  </ProtectedRoute>
);

// Componente para páginas que requerem role de super_admin (sem header)
const SuperAdminPageLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRole="super_admin" redirectTo="/super-admin/login">
    <CallbackLayout>
      {children}
    </CallbackLayout>
  </ProtectedRoute>
);

// Componente para callback que precisa de autenticação
const ProtectedCallbackLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <CallbackLayout>
      {children}
    </CallbackLayout>
  </ProtectedRoute>
);

// Configuração do router com autenticação
const router = createBrowserRouter([
  // Rotas públicas
  {
    path: "/landing",
    element: <PublicLayout><Landing /></PublicLayout>,
  },
  {
    path: "/login",
    element: <PublicLayout><Login /></PublicLayout>,
  },
  {
    path: "/reset-password",
    element: <PublicLayout><ResetPassword /></PublicLayout>,
  },
  {
    path: "/email-confirmation", // ✅ Nova rota para confirmação de email
    element: <PublicLayout><EmailConfirmation /></PublicLayout>,
  },
  {
    path: "/super-admin/login",
    element: <PublicLayout><SuperAdminLogin /></PublicLayout>,
  },

  // Rotas protegidas - Dashboard
  {
    path: "/",
    element: <ProtectedPageLayout><ClientDashboard /></ProtectedPageLayout>,
  },
  {
    path: "/clients",
    element: <ProtectedPageLayout><ClientDashboard /></ProtectedPageLayout>,
  },
  {
    path: "/client/:clientId",
    element: <ProtectedPageLayout><SingleClientDashboard /></ProtectedPageLayout>,
  },
  
  // Rotas protegidas - Calendário
  {
    path: "/calendar",
    element: <ProtectedPageLayout><StoryCalendar /></ProtectedPageLayout>,
  },
  {
    path: "/calendar/:clientId",
    element: <ProtectedPageLayout><StoryCalendar /></ProtectedPageLayout>,
  },
  
  // Rotas protegidas - Criação de conteúdo
  {
    path: "/create-post",
    element: <ProtectedPageLayout><CreatePost /></ProtectedPageLayout>,
  },
  {
    path: "/create-story",
    element: <ProtectedPageLayout><CreateStory /></ProtectedPageLayout>,
  },
  {
    path: "/create-reels",
    element: <ProtectedPageLayout><CreateReels /></ProtectedPageLayout>,
  },
  {
    path: "/edit-story/:id",
    element: <ProtectedPageLayout><EditStory /></ProtectedPageLayout>,
  },
  {
    path: "/edit-post/:postId",
    element: <ProtectedPageLayout><EditPost /></ProtectedPageLayout>,
  },
  {
    path: "/clients/:clientId/edit-post/:postId",
    element: <ProtectedPageLayout><EditPost /></ProtectedPageLayout>,
  },
  
  // Rotas protegidas - Configurações
  {
    path: "/settings",
    element: <ProtectedPageLayout><Settings /></ProtectedPageLayout>,
  },
  
  // Rota administrativa - APENAS ADMINS
  {
    path: "/admin",
    element: <AdminPageLayout><AdminSettings /></AdminPageLayout>,
  },
  
  // Rotas Super Admin - APENAS SUPER_ADMINS
  {
    path: "/super-admin",
    element: <SuperAdminPageLayout><SuperAdminDashboard /></SuperAdminPageLayout>,
  },
  
  // Rotas protegidas - Callbacks do Instagram
  {
    path: "/api/instagram-auth/callback",
    element: <ProtectedCallbackLayout><InstagramCallback /></ProtectedCallbackLayout>,
  },
  {
    path: "/callback",
    element: <ProtectedCallbackLayout><InstagramCallback /></ProtectedCallbackLayout>,
  },
  
  // Rotas protegidas - Checkout Stripe
  {
    path: "/checkout",
    element: <ProtectedCallbackLayout><Checkout /></ProtectedCallbackLayout>,
  },
  {
    path: "/checkout/success",
    element: <ProtectedCallbackLayout><CheckoutSuccess /></ProtectedCallbackLayout>,
  },
  {
    path: "/checkout/cancel",
    element: <ProtectedCallbackLayout><CheckoutCancel /></ProtectedCallbackLayout>,
  },
  
  // Rota catch-all - redireciona para dashboard se logado, senão para login
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

// Componente principal da aplicação
function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;
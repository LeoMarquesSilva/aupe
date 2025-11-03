import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { Security, AdminPanelSettings } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { roleService, UserRole } from '../services/roleService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [roleLoading, setRoleLoading] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState(true);
  const [userRole, setUserRole] = React.useState<UserRole>('user');
  const [roleChecked, setRoleChecked] = React.useState(false);

  // Verificar role apenas se foi especificada e ainda não foi verificada
  React.useEffect(() => {
    const checkRole = async () => {
      // Se não precisa verificar role ou já foi verificado, não fazer nada
      if (!user || !requiredRole || roleChecked) {
        if (!requiredRole) {
          setHasPermission(true);
          setRoleChecked(true);
        }
        return;
      }

      try {
        setRoleLoading(true);
        
        const currentUserRole = await roleService.getCurrentUserRole();
        setUserRole(currentUserRole);
        
        // Verificar se tem a role necessária
        let hasAccess = false;
        
        if (requiredRole === 'admin') {
          hasAccess = currentUserRole === 'admin';
        } else if (requiredRole === 'moderator') {
          hasAccess = ['admin', 'moderator'].includes(currentUserRole);
        } else {
          hasAccess = true;
        }
        
        setHasPermission(hasAccess);
        setRoleChecked(true);
        
      } catch (error) {
        console.error('❌ Erro ao verificar role:', error);
        setHasPermission(false);
        setRoleChecked(true);
      } finally {
        setRoleLoading(false);
      }
    };

    checkRole();
  }, [user?.id, requiredRole, roleChecked]); // Dependências específicas

  // Reset quando usuário muda
  React.useEffect(() => {
    setRoleChecked(false);
    setHasPermission(true);
    setUserRole('user');
  }, [user?.id]);

  // Loading da autenticação ou da verificação de role
  if (loading || (requiredRole && roleLoading)) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Verificando autenticação...' : 'Verificando permissões...'}
        </Typography>
      </Box>
    );
  }

  // Usuário não autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário sem a role necessária
  if (requiredRole && !hasPermission && roleChecked) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 3
      }}>
        <Alert 
          severity="error" 
          icon={<Security />}
          sx={{ maxWidth: 600 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AdminPanelSettings sx={{ mr: 1 }} />
            <Typography variant="h6">Acesso Negado</Typography>
          </Box>
          <Typography variant="body1" gutterBottom>
            Você não tem permissão para acessar esta página.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Seu role atual:</strong> {userRole}<br />
            <strong>Role necessária:</strong> {requiredRole}<br />
            <strong>Usuário:</strong> {user.email}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Entre em contato com um administrador se você acredita que isso é um erro.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Usuário autenticado e com permissão
  return <>{children}</>;
};

export default ProtectedRoute;
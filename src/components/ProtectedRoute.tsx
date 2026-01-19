import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { roleService, UserRole } from '../services/roleService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

// Cache de roles para evitar consultas desnecessárias
const roleCache = new Map<string, { role: UserRole; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login'
}) => {
  const { user, loading: authLoading } = useAuth();
  const [roleLoading, setRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Memoizar a verificação de permissão
  const hasPermission = useMemo(() => {
    if (!requiredRole || !userRole) return true;
    
    const roleHierarchy: Record<UserRole, number> = {
      'user': 1,
      'moderator': 2,
      'admin': 3,
      'super_admin': 4
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }, [userRole, requiredRole]);

  // Função para verificar role com cache
  const checkUserRole = useCallback(async (userId: string) => {
    // Verificar cache primeiro
    const cached = roleCache.get(userId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Role obtida do cache:', cached.role);
      setUserRole(cached.role);
      return;
    }

    try {
      setRoleLoading(true);
      
      const currentUserProfile = await roleService.getCurrentUserProfile();
      const currentUserRole = currentUserProfile?.role || 'user';
      
      // Atualizar cache
      roleCache.set(userId, { role: currentUserRole, timestamp: now });
      
      console.log('✅ Role obtida do servidor:', currentUserRole);
      setUserRole(currentUserRole);
    } catch (error) {
      console.error('❌ Erro ao verificar role do usuário:', error);
      setUserRole('user'); // Fallback para user
    } finally {
      setRoleLoading(false);
    }
  }, []);

  // Verificar role apenas quando o usuário muda
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }

    // Se já temos a role e o usuário não mudou, não fazer nova consulta
    if (userRole && roleCache.has(user.id)) {
      const cached = roleCache.get(user.id);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return; // Usar cache válido
      }
    }

    checkUserRole(user.id);
  }, [user?.id, checkUserRole]); // Apenas quando o ID do usuário muda

  // Mostrar loading apenas no carregamento inicial do auth
  if (authLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Carregando...
        </Typography>
      </Box>
    );
  }

  // Se não está logado, redirecionar para login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Mostrar loading apenas se ainda está carregando a role pela primeira vez
  if (roleLoading && userRole === null) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Verificando permissões...
        </Typography>
      </Box>
    );
  }

  // Se tem role requerida mas não tem permissão, mostrar acesso negado
  if (requiredRole && !hasPermission) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <Typography variant="h6" color="error">
          Acesso Negado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Você não tem permissão para acessar esta página.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Role necessária: <strong>{requiredRole}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sua role atual: <strong>{userRole || 'Não definida'}</strong>
        </Typography>
      </Box>
    );
  }

  // Se chegou até aqui, tem permissão - renderizar sem loading
  return <>{children}</>;
};

export default ProtectedRoute;
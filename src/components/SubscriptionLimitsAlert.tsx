// Subscription Limits Alert Component
// Mostra informações sobre limites de subscription
// INSYT - Instagram Scheduler

import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  LinearProgress,
  Typography,
  Button,
  Link as MuiLink
} from '@mui/material';
import { subscriptionLimitsService, SubscriptionLimits } from '../services/subscriptionLimitsService';
import { Link } from 'react-router-dom';

interface SubscriptionLimitsAlertProps {
  type: 'client' | 'post';
  showProgress?: boolean;
}

const SubscriptionLimitsAlert: React.FC<SubscriptionLimitsAlertProps> = ({ 
  type, 
  showProgress = true 
}) => {
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLimits = async () => {
      try {
        const currentLimits = await subscriptionLimitsService.getCurrentLimits();
        setLimits(currentLimits);
      } catch (error) {
        console.error('Erro ao carregar limites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLimits();
  }, []);

  if (loading || !limits) {
    return null;
  }

  // Se há erro (sem subscription), mostrar alerta crítico
  if (limits.error) {
    // Verificar se é Enterprise (não mostrar erro)
    const planName = limits.subscription?.plan?.name?.toLowerCase() || '';
    const isEnterprise = planName === 'enterprise';
    
    if (isEnterprise) {
      // Enterprise não tem limites, não mostrar alerta de erro
      return null;
    }
    
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Assinatura Necessária</AlertTitle>
        {limits.error}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            component={Link}
            to="/"
            size="small"
          >
            Ver Planos
          </Button>
        </Box>
      </Alert>
    );
  }

  // Verificar se é Enterprise (não mostrar limites)
  const planName = limits.subscription?.plan?.name?.toLowerCase() || '';
  const isEnterprise = planName === 'enterprise';
  
  if (isEnterprise) {
    // Enterprise tem limites ilimitados, não mostrar alerta
    return null;
  }

  // Verificar se está próximo do limite
  const isClientLimit = type === 'client';
  const current = isClientLimit ? limits.currentClients : limits.currentPostsThisMonth;
  const max = isClientLimit ? limits.maxClients : limits.maxPostsPerMonth;
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  // Se está no limite, mostrar alerta de erro
  if (isAtLimit) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>
          {isClientLimit ? 'Limite de Contas Atingido' : 'Limite de Posts Atingido'}
        </AlertTitle>
        {isClientLimit 
          ? `Você atingiu o limite de ${max} contas Instagram. Faça upgrade do seu plano para adicionar mais contas.`
          : `Você atingiu o limite de ${max.toLocaleString('pt-BR')} posts este mês. Faça upgrade do seu plano para agendar mais posts.`
        }
        {showProgress && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {current} / {max} {isClientLimit ? 'contas' : 'posts'}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={100} 
              color="error"
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            component={Link}
            to="/"
            size="small"
          >
            Fazer Upgrade
          </Button>
        </Box>
      </Alert>
    );
  }

  // Se está próximo do limite, mostrar alerta de aviso
  if (isNearLimit) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>
          {isClientLimit ? 'Limite de Contas Próximo' : 'Limite de Posts Próximo'}
        </AlertTitle>
        {isClientLimit
          ? `Você está usando ${current} de ${max} contas Instagram. Considere fazer upgrade do seu plano.`
          : `Você está usando ${current.toLocaleString('pt-BR')} de ${max.toLocaleString('pt-BR')} posts este mês. Considere fazer upgrade do seu plano.`
        }
        {showProgress && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {current} / {max} {isClientLimit ? 'contas' : 'posts'} ({percentage.toFixed(0)}%)
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={percentage} 
              color="warning"
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}
      </Alert>
    );
  }

  // Se está tudo ok, mostrar info discreta
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Typography variant="body2">
          {isClientLimit
            ? `${current} / ${max} contas Instagram`
            : `${current.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')} posts este mês`
          }
        </Typography>
        {showProgress && (
          <Box sx={{ width: '60%', ml: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={percentage} 
              color="info"
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>
        )}
      </Box>
    </Alert>
  );
};

export default SubscriptionLimitsAlert;

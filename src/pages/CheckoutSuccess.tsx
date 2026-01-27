// Página de Sucesso do Checkout
// INSYT - Instagram Scheduler

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { subscriptionService } from '../services/subscriptionService';
import { roleService } from '../services/roleService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    // Verificar status da subscription após checkout
    const verifySubscription = async () => {
      if (!sessionId) {
        setError('Session ID não encontrado');
        setLoading(false);
        return;
      }

      try {
        // Aguardar um pouco para o webhook processar
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Buscar perfil do usuário para obter organization_id
        const profile = await roleService.getCurrentUserProfile();
        if (!profile || !(profile as any).organization_id) {
          setError('Organização não encontrada');
          setLoading(false);
          return;
        }

        const organizationId = (profile as any).organization_id;

        // Tentar buscar subscription até 5 vezes (webhook pode demorar)
        let attempts = 0;
        let foundSubscription = null;

        while (attempts < 5 && !foundSubscription) {
          foundSubscription = await subscriptionService.getSubscriptionByOrganization(organizationId);
          
          if (!foundSubscription) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (foundSubscription) {
          setSubscription(foundSubscription);
          setPlan(foundSubscription.plan);
        } else {
          console.warn('⚠️ Subscription ainda não foi criada pelo webhook');
          // Não é erro crítico, apenas avisar
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao verificar subscription:', err);
        setError('Erro ao verificar status do pagamento');
        setLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            Voltar ao Início
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Pagamento Confirmado!
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sua assinatura foi ativada com sucesso.
        </Typography>

        {subscription && plan && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ textAlign: 'left', mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Plano
                </Typography>
                <Chip 
                  label={plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} 
                  color="primary" 
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={subscription.status === 'active' ? 'Ativa' : subscription.status} 
                  color={subscription.status === 'active' ? 'success' : 'default'} 
                  size="small"
                />
              </Box>

              {subscription.current_period_end && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Próxima cobrança
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Limites do Plano
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  • Até {plan.max_clients} contas Instagram
                </Typography>
                <Typography variant="body2">
                  • {plan.max_posts_per_month.toLocaleString('pt-BR')} posts por mês
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 3 }} />
          </>
        )}

        {!subscription && !error && (
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            A assinatura está sendo processada. Você receberá um email de confirmação em breve.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/"
            sx={{ minWidth: 150 }}
          >
            Ir para Dashboard
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            to="/settings"
            sx={{ minWidth: 150 }}
          >
            Configurações
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutSuccess;

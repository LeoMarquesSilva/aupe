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
import { GLASS } from '../theme/glassTokens';
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

  const glassPaper = {
    p: 4,
    textAlign: 'center' as const,
    background: GLASS.surface.bg,
    backdropFilter: `blur(${GLASS.surface.blur})`,
    border: `1px solid ${GLASS.border.outer}`,
    borderRadius: GLASS.radius.card,
    boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: GLASS.accent.orange }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={0} sx={glassPaper}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: GLASS.radius.inner }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{
              bgcolor: GLASS.accent.orange,
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: GLASS.accent.orangeDark },
            }}
          >
            Voltar ao Início
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={0} sx={glassPaper}>
        <CheckCircleIcon sx={{ fontSize: 80, color: GLASS.accent.orange, mb: 2 }} />
        
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: GLASS.text.heading }}>
          Pagamento Confirmado!
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: GLASS.text.muted }}>
          Sua assinatura foi ativada com sucesso.
        </Typography>

        {subscription && plan && (
          <>
            <Divider sx={{ my: 3, borderColor: GLASS.border.subtle }} />
            <Box sx={{ textAlign: 'left', mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: GLASS.text.muted }}>
                  Plano
                </Typography>
                <Chip 
                  label={plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} 
                  size="small"
                  sx={{
                    bgcolor: 'rgba(247, 66, 17, 0.1)',
                    color: GLASS.accent.orangeDark,
                    fontWeight: 600,
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: GLASS.text.muted }}>
                  Status
                </Typography>
                <Chip 
                  label={subscription.status === 'active' ? 'Ativa' : subscription.status} 
                  size="small"
                  sx={{
                    bgcolor: subscription.status === 'active' ? 'rgba(247, 66, 17, 0.1)' : undefined,
                    color: subscription.status === 'active' ? GLASS.accent.orangeDark : undefined,
                    fontWeight: 600,
                  }}
                />
              </Box>

              {subscription.current_period_end && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: GLASS.text.muted }}>
                    Próxima cobrança
                  </Typography>
                  <Typography variant="body2" sx={{ color: GLASS.text.body }}>
                    {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  background: GLASS.surface.bgMetric,
                  backdropFilter: `blur(${GLASS.surface.blur})`,
                  border: `1px solid ${GLASS.border.subtle}`,
                  borderRadius: GLASS.radius.inner,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: GLASS.text.muted }} gutterBottom>
                  Limites do Plano
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, color: GLASS.text.body }}>
                  • Até {plan.max_clients} contas Instagram
                </Typography>
                <Typography variant="body2" sx={{ color: GLASS.text.body }}>
                  • {plan.max_posts_per_month.toLocaleString('pt-BR')} posts por mês
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 3, borderColor: GLASS.border.subtle }} />
          </>
        )}

        {!subscription && !error && (
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left', borderRadius: GLASS.radius.inner }}>
            A assinatura está sendo processada. Você receberá um email de confirmação em breve.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/"
            sx={{
              minWidth: 150,
              bgcolor: GLASS.accent.orange,
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(247, 66, 17, 0.3)',
              '&:hover': {
                bgcolor: GLASS.accent.orangeDark,
                boxShadow: '0 6px 20px rgba(247, 66, 17, 0.4)',
              },
            }}
          >
            Ir para Dashboard
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            to="/settings"
            sx={{
              minWidth: 150,
              borderColor: GLASS.accent.orange,
              color: GLASS.accent.orangeDark,
              borderRadius: GLASS.radius.button,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: GLASS.accent.orangeDark,
                bgcolor: 'rgba(247, 66, 17, 0.06)',
              },
            }}
          >
            Configurações
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutSuccess;

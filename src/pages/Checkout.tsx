// Página de Checkout - Redireciona para Stripe Checkout
// INSYT - Instagram Scheduler

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Container,
  Paper
} from '@mui/material';
import { subscriptionService } from '../services/subscriptionService';
import { stripeService } from '../services/stripeService';
import { supabase } from '../services/supabaseClient';
import { roleService } from '../services/roleService';

const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCheckout = async () => {
      if (!planId) {
        setError('Plano não especificado');
        setLoading(false);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        // 1. Verificar autenticação
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Você precisa estar logado para fazer checkout');
          setLoading(false);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // 2. Buscar perfil do usuário para obter organization_id
        const profile = await roleService.getCurrentUserProfile();
        if (!profile) {
          setError('Perfil do usuário não encontrado');
          setLoading(false);
          return;
        }

        // Verificar se profile tem organization_id
        const organizationId = (profile as any).organization_id;
        if (!organizationId) {
          setError('Organização não encontrada. Entre em contato com o suporte.');
          setLoading(false);
          return;
        }

        // 3. Buscar plano
        const plans = await subscriptionService.getAllPlans();
        const plan = plans.find(p => p.id === planId);

        if (!plan) {
          setError('Plano não encontrado');
          setLoading(false);
          return;
        }

        if (!plan.stripe_price_id) {
          setError('Plano não possui preço configurado no Stripe');
          setLoading(false);
          return;
        }

        // 4. Criar checkout e redirecionar
        await stripeService.startCheckout(
          plan.stripe_price_id,
          organizationId,
          user.id
        );

        // Se chegou aqui, o redirecionamento já aconteceu
      } catch (err: any) {
        console.error('❌ Erro no checkout:', err);
        setError(err.message || 'Erro ao processar checkout. Tente novamente.');
        setLoading(false);
      }
    };

    handleCheckout();
  }, [planId, navigate]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Redirecionando em alguns segundos...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: 'background.default' }}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h6" color="text.primary">
        Preparando checkout...
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Você será redirecionado para o Stripe em instantes
      </Typography>
    </Box>
  );
};

export default Checkout;

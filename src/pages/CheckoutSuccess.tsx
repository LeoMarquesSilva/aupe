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
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aqui você pode buscar a subscription criada no banco
        // Por enquanto, apenas mostrar sucesso
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

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sua assinatura foi ativada com sucesso.
          {sessionId && (
            <Box component="span" display="block" sx={{ mt: 1, fontSize: '0.875rem' }}>
              ID da sessão: {sessionId}
            </Box>
          )}
        </Typography>

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

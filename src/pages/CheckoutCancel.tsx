// Página de Cancelamento do Checkout
// INSYT - Instagram Scheduler

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CancelIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Pagamento Cancelado
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          O pagamento foi cancelado. Nenhuma cobrança foi realizada.
          Você pode tentar novamente quando estiver pronto.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/')}
            sx={{ minWidth: 150 }}
          >
            Voltar ao Início
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(-1)}
            sx={{ minWidth: 150 }}
          >
            Tentar Novamente
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutCancel;

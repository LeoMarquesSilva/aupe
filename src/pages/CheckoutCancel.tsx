// Página de Cancelamento do Checkout
// INSYT - Instagram Scheduler

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { GLASS } from '../theme/glassTokens';

const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          background: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
          border: `1px solid ${GLASS.border.outer}`,
          borderRadius: GLASS.radius.card,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }}
      >
        <CancelIcon sx={{ fontSize: 80, color: '#f59e0b', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: GLASS.text.heading }}>
          Pagamento Cancelado
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: GLASS.text.muted }}>
          O pagamento foi cancelado. Nenhuma cobrança foi realizada.
          Você pode tentar novamente quando estiver pronto.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/')}
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
            Voltar ao Início
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(-1)}
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
            Tentar Novamente
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutCancel;

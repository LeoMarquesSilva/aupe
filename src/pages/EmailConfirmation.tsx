import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { GLASS } from '../theme/glassTokens';

const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'email') {
          setStatus('error');
          setMessage('Link de confirmação inválido');
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        });

        if (error) {
          console.error('❌ Erro na confirmação:', error);
          setStatus('error');
          setMessage(`Erro na confirmação: ${error.message}`);
        } else {
          setStatus('success');
          setMessage('Email confirmado com sucesso!');
          
          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        console.error('❌ Erro inesperado:', error);
        setStatus('error');
        setMessage('Erro inesperado na confirmação do email');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(GLASS.accent.orange, 0.08)} 0%, ${alpha(GLASS.accent.orangeLight, 0.05)} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: GLASS.radius.card,
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Green accent bar */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${GLASS.accent.orange}, ${GLASS.accent.orangeLight})`,
            }}
          />

          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: GLASS.radius.inner,
              background: alpha(GLASS.accent.orange, 0.1),
              border: `1px solid ${alpha(GLASS.accent.orange, 0.2)}`,
              color: GLASS.accent.orange,
              mb: 2,
              mt: 1,
            }}
          >
            <EmailIcon sx={{ fontSize: 48 }} />
          </Box>
          
          <Typography variant="h4" gutterBottom sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
            Confirmação de Email
          </Typography>

          {status === 'loading' && (
            <Box sx={{ mt: 3 }}>
              <CircularProgress size={40} sx={{ color: GLASS.accent.orange }} />
              <Typography variant="body1" sx={{ mt: 2, color: GLASS.text.body }}>
                Confirmando seu email...
              </Typography>
            </Box>
          )}

          {status === 'success' && (
            <Box sx={{ mt: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: GLASS.accent.orange, mb: 2 }} />
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  borderRadius: GLASS.radius.button,
                  backgroundColor: alpha(GLASS.accent.orange, 0.08),
                  border: `1px solid ${alpha(GLASS.accent.orange, 0.2)}`,
                }}
              >
                {message}
              </Alert>
              <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                Você será redirecionado para a página de login em alguns segundos...
              </Typography>
            </Box>
          )}

          {status === 'error' && (
            <Box sx={{ mt: 3 }}>
              <ErrorIcon sx={{ fontSize: 48, color: '#ef4444', mb: 2 }} />
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: GLASS.radius.button,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {message}
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  mt: 2,
                  borderRadius: GLASS.radius.button,
                  fontWeight: 600,
                  textTransform: 'none',
                  background: `linear-gradient(45deg, ${GLASS.accent.orange}, ${GLASS.accent.orangeLight})`,
                  boxShadow: `0 4px 14px ${alpha(GLASS.accent.orange, 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${GLASS.accent.orangeDark}, ${GLASS.accent.orange})`,
                    boxShadow: `0 6px 20px ${alpha(GLASS.accent.orange, 0.4)}`,
                  },
                }}
              >
                Ir para Login
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default EmailConfirmation;

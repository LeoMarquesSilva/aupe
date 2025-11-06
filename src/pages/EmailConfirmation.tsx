import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';

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
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom>
          Confirmação de Email
        </Typography>

        {status === 'loading' && (
          <Box sx={{ mt: 3 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Confirmando seu email...
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box sx={{ mt: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Você será redirecionado para a página de login em alguns segundos...
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Box sx={{ mt: 3 }}>
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Alert severity="error" sx={{ mb: 2 }}>
              {message}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mt: 2 }}
            >
              Ir para Login
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EmailConfirmation;
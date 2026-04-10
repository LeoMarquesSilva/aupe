import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { GLASS } from '../theme/glassTokens';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verificar se temos os tokens necessários na URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Link de recuperação inválido ou expirado');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      
      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const glassInputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: GLASS.radius.button,
      backgroundColor: GLASS.surface.bg,
      backdropFilter: `blur(${GLASS.surface.blur})`,
      '& fieldset': {
        borderColor: GLASS.border.outer,
      },
      '&:hover fieldset': {
        borderColor: GLASS.accent.orange,
      },
      '&.Mui-focused fieldset': {
        borderColor: GLASS.accent.orange,
        borderWidth: 2,
        boxShadow: `0 0 0 3px ${alpha(GLASS.accent.orange, 0.12)}`,
      },
    },
    '& .MuiInputLabel-root': {
      color: GLASS.text.muted,
      '&.Mui-focused': {
        color: GLASS.accent.orange,
      },
    },
  };

  if (success) {
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
        <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: GLASS.radius.card,
              background: GLASS.surface.bgStrong,
              backdropFilter: `blur(${GLASS.surface.blurStrong})`,
              WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
              border: `1px solid ${GLASS.border.outer}`,
              boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
              textAlign: 'center',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 60, color: GLASS.accent.orange, mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
              Senha Redefinida!
            </Typography>
            <Typography variant="body1" sx={{ color: GLASS.text.muted }}>
              Sua senha foi alterada com sucesso. Você será redirecionado para o login em alguns segundos.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

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
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
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

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, mt: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: GLASS.radius.inner,
                background: alpha(GLASS.accent.orange, 0.1),
                border: `1px solid ${alpha(GLASS.accent.orange, 0.2)}`,
                color: GLASS.accent.orange,
                mb: 2,
              }}
            >
              <LockIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ color: GLASS.text.heading, fontWeight: 700 }}>
              Redefinir Senha
            </Typography>
            <Typography variant="body2" textAlign="center" sx={{ color: GLASS.text.muted }}>
              Digite sua nova senha
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: GLASS.radius.button,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Nova Senha"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: GLASS.accent.orange }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={glassInputSx}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Nova Senha"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: GLASS.accent.orange }} />
                  </InputAdornment>
                ),
              }}
              sx={glassInputSx}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                borderRadius: GLASS.radius.button,
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(45deg, ${GLASS.accent.orange}, ${GLASS.accent.orangeLight})`,
                boxShadow: `0 4px 14px ${alpha(GLASS.accent.orange, 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${GLASS.accent.orangeDark}, ${GLASS.accent.orange})`,
                  boxShadow: `0 6px 20px ${alpha(GLASS.accent.orange, 0.4)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: GLASS.border.outer,
                  color: GLASS.text.muted,
                },
                transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              }}
              disabled={loading}
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;

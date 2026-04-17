import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { isMetaAppReviewEmail } from '../config/metaAppReview';
import { GLASS } from '../theme/glassTokens';

const META_APP_REVIEW_IG_CONNECT_PATH = '/connect/instagram-business';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [formData, setFormData] = useState({ email: '', password: '' });

  React.useEffect(() => {
    if (user) {
      if (isMetaAppReviewEmail(user.email)) {
        navigate(META_APP_REVIEW_IG_CONNECT_PATH);
        return;
      }
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectAfterLogin);
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      console.log('Login realizado com sucesso:', data.user?.email);
      if (isMetaAppReviewEmail(data.user?.email)) {
        navigate(META_APP_REVIEW_IG_CONNECT_PATH);
        return;
      }
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectAfterLogin);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Verifique seu email e clique no link de confirmação antes de fazer login.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setError('Digite seu email para redefinir a senha.');
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch {
      setError('Não foi possível enviar o email de redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
    setResetEmail('');
    setResetSuccess(false);
    setError(null);
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      backgroundColor: '#fafafa',
      fontSize: '0.9rem',
      '& fieldset': { borderColor: 'rgba(82,86,99,0.2)' },
      '&:hover fieldset': { borderColor: GLASS.accent.orange },
      '&.Mui-focused fieldset': {
        borderColor: GLASS.accent.orange,
        borderWidth: 2,
        boxShadow: `0 0 0 3px ${alpha(GLASS.accent.orange, 0.10)}`,
      },
    },
    '& .MuiInputLabel-root': {
      color: GLASS.text.muted,
      fontSize: '0.9rem',
      '&.Mui-focused': { color: GLASS.accent.orange },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT PANEL: Brand ───────────────────────────────────── */}
      {!isMobile && (
        <Box
          className="grain-overlay premium-header-bg"
          sx={{
            width: '45%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            p: { md: 5, lg: 7 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-04.png"
            alt="INSYT"
            sx={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
          />

          {/* Center content */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 6 }}>
            <Typography
              sx={{
                fontFamily: '"Cabinet Grotesk", sans-serif',
                fontWeight: 800,
                fontSize: { md: '2rem', lg: '2.6rem' },
                color: '#fff',
                letterSpacing: '-0.035em',
                lineHeight: 1.15,
                mb: 2,
              }}
            >
              Gerencie suas redes sociais com inteligência.
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '1rem',
                lineHeight: 1.65,
                maxWidth: 380,
                fontWeight: 400,
              }}
            >
              Agendamento, aprovação de clientes e métricas, tudo em um fluxo único e prático.
            </Typography>

            {/* Feature list */}
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                'Agendamento automático de posts e Reels',
                'Fluxo de aprovação para clientes',
                'Dashboard de métricas por conta',
              ].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 6, height: 6, borderRadius: '50%',
                      bgcolor: GLASS.accent.orange, flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', fontWeight: 500 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Bottom tag */}
          <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em' }}>
            © {new Date().getFullYear()} INSYT - Todos os direitos reservados
          </Typography>
        </Box>
      )}

      {/* ── RIGHT PANEL: Form ────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#f6f6f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 5 },
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile: logo mark only */}
          {isMobile && (
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                component="img"
                src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-07.png"
                alt="INSYT"
                sx={{ height: 52, width: 'auto', objectFit: 'contain' }}
              />
            </Box>
          )}

          {/* Form card */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '18px',
              border: `1px solid rgba(82,86,99,0.12)`,
              boxShadow: '0 4px 24px rgba(10,15,45,0.07)',
              p: { xs: 3.5, md: 4.5 },
            }}
          >
            {/* Icon + heading */}
            <Box sx={{ mb: 3.5 }}>
              <Box
                component="img"
                src="/Fundo transparente [digital]/logo-insyt-fundo-transparente-07.png"
                alt="INSYT"
                sx={{
                  height: 40,
                  width: 'auto',
                  objectFit: 'contain',
                  display: isMobile ? 'none' : 'block',
                  mb: 2.5,
                }}
              />
              <Typography
                sx={{
                  fontFamily: '"Cabinet Grotesk", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.55rem',
                  color: GLASS.text.heading,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  mb: 0.5,
                }}
              >
                Entrar na plataforma
              </Typography>
              <Typography variant="body2" sx={{ color: GLASS.text.muted, fontWeight: 400 }}>
                Bem-vindo de volta. Insira suas credenciais.
              </Typography>
            </Box>

            {error && (
              <Fade in>
                <Alert
                  severity="error"
                  sx={{
                    mb: 2.5,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    '& .MuiAlert-message': { color: GLASS.text.body },
                  }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleInputChange('email')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(82,86,99,0.5)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, ...inputSx }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange('password')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'rgba(82,86,99,0.5)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'rgba(82,86,99,0.5)' }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1, ...inputSx }}
              />

              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setResetDialogOpen(true)}
                  sx={{
                    textTransform: 'none',
                    color: GLASS.accent.orange,
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    p: 0,
                    minWidth: 0,
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                  }}
                >
                  Esqueceu a senha?
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                endIcon={!loading && <ArrowForwardIcon />}
                sx={{
                  py: 1.4,
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: GLASS.accent.orange,
                  boxShadow: `0 4px 16px ${alpha(GLASS.accent.orange, 0.28)}`,
                  letterSpacing: '-0.01em',
                  '&:hover': {
                    bgcolor: GLASS.accent.orangeDark,
                    boxShadow: `0 8px 24px ${alpha(GLASS.accent.orange, 0.35)}`,
                  },
                  '&:disabled': { bgcolor: 'rgba(82,86,99,0.15)', color: GLASS.text.muted, boxShadow: 'none' },
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                  Não tem uma conta?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      const planId = sessionStorage.getItem('redirectAfterLogin')?.split('plan=')[1];
                      navigate(planId ? `/signup?plan=${planId}` : '/signup');
                    }}
                    sx={{
                      textTransform: 'none',
                      color: GLASS.accent.orange,
                      fontWeight: 700,
                      p: 0,
                      minWidth: 0,
                      fontSize: '0.875rem',
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                    }}
                  >
                    Criar conta
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Reset Password Dialog ────────────────────────────────── */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleCloseResetDialog}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 1,
            bgcolor: '#fff',
            border: `1px solid rgba(82,86,99,0.12)`,
            boxShadow: '0 16px 48px rgba(10,15,45,0.15)',
            minWidth: 340,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 2.5 }}>
          <LockIcon sx={{ fontSize: 36, color: GLASS.accent.orange, mb: 1, display: 'block', mx: 'auto' }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: GLASS.text.heading, fontFamily: '"Cabinet Grotesk", sans-serif' }}>
            Redefinir senha
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1 }}>
          {!resetSuccess ? (
            <>
              <Typography variant="body2" sx={{ mb: 2.5, textAlign: 'center', color: GLASS.text.muted }}>
                Digite seu email para receber o link de redefinição.
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                id="resetEmail"
                label="Email"
                type="email"
                fullWidth
                variant="outlined"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                sx={inputSx}
              />
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body1" sx={{ mb: 1.5, color: GLASS.accent.orange, fontWeight: 600 }}>
                Email enviado!
              </Typography>
              <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleCloseResetDialog}
            sx={{ textTransform: 'none', color: GLASS.text.muted, borderRadius: '8px', fontWeight: 500 }}
          >
            {resetSuccess ? 'Fechar' : 'Cancelar'}
          </Button>
          {!resetSuccess && (
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading}
              variant="contained"
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                bgcolor: GLASS.accent.orange,
                boxShadow: 'none',
                '&:hover': { bgcolor: GLASS.accent.orangeDark, boxShadow: 'none' },
              }}
            >
              {resetLoading ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;

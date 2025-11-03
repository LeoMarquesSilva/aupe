import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  alpha
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import BRAND_COLORS from '../theme/brandColors';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Redirecionar se já estiver logado
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Limpar erros quando o usuário começar a digitar
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
      const { email, password } = formData;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('Login realizado com sucesso:', data.user?.email);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      
      // Mensagens de erro mais amigáveis
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (err.message.includes('Email not confirmed')) {
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
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 50%, ${BRAND_COLORS.softBlack} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decorativo */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: alpha(BRAND_COLORS.offWhite, 0.1),
          animation: 'float 6s ease-in-out infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: alpha(BRAND_COLORS.lightGray, 0.05),
          animation: 'float 8s ease-in-out infinite reverse'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: alpha(BRAND_COLORS.primary, 0.1),
          animation: 'float 10s ease-in-out infinite'
        }}
      />

      <Container component="main" maxWidth="sm">
        <Fade in timeout={800}>
          <Paper 
            elevation={24}
            sx={{ 
              p: 6,
              borderRadius: 4,
              background: `linear-gradient(145deg, ${alpha(BRAND_COLORS.offWhite, 0.98)}, ${alpha('#ffffff', 0.95)})`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(BRAND_COLORS.lightGray, 0.3)}`,
              boxShadow: `0 25px 50px -12px ${alpha(BRAND_COLORS.softBlack, 0.3)}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Accent decorativo no topo */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`
              }}
            />

            {/* Header com logo e título */}
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              {/* Logo da AUPE */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 3,
                    background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 15px 35px ${alpha(BRAND_COLORS.primary, 0.3)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 3,
                      borderRadius: 2,
                      background: `linear-gradient(45deg, ${alpha('#fff', 0.1)}, transparent)`,
                      pointerEvents: 'none'
                    }
                  }}
                >
                  <Box
                    component="img"
                    src="/LOGO-AUPE.jpg"
                    alt="AUPE Logo"
                    sx={{
                      width: '85%',
                      height: '85%',
                      objectFit: 'contain',
                      borderRadius: 2,
                      zIndex: 1
                    }}
                  />
                </Box>
              </Box>
              
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 800,
                  background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  letterSpacing: '-0.02em'
                }}
              >
                AUPE Manager
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 300,
                  color: BRAND_COLORS.greenBlack,
                  opacity: 0.8
                }}
              >
                Gerencie suas redes sociais com elegância
              </Typography>
            </Box>

            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: alpha(BRAND_COLORS.primary, 0.1),
                    border: `1px solid ${alpha(BRAND_COLORS.primary, 0.2)}`,
                    '& .MuiAlert-icon': {
                      fontSize: 24,
                      color: BRAND_COLORS.primary
                    },
                    '& .MuiAlert-message': {
                      color: BRAND_COLORS.softBlack
                    }
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
                      <EmailIcon sx={{ color: BRAND_COLORS.primary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: alpha(BRAND_COLORS.offWhite, 0.5),
                    '& fieldset': {
                      borderColor: alpha(BRAND_COLORS.neutralGray, 0.5),
                    },
                    '&:hover fieldset': {
                      borderColor: BRAND_COLORS.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: BRAND_COLORS.primary,
                      borderWidth: 2
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: BRAND_COLORS.greenBlack,
                    '&.Mui-focused': {
                      color: BRAND_COLORS.primary,
                    }
                  }
                }}
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
                      <LockIcon sx={{ color: BRAND_COLORS.primary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: BRAND_COLORS.primary }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: alpha(BRAND_COLORS.offWhite, 0.5),
                    '& fieldset': {
                      borderColor: alpha(BRAND_COLORS.neutralGray, 0.5),
                    },
                    '&:hover fieldset': {
                      borderColor: BRAND_COLORS.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: BRAND_COLORS.primary,
                      borderWidth: 2
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: BRAND_COLORS.greenBlack,
                    '&.Mui-focused': {
                      color: BRAND_COLORS.primary,
                    }
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ 
                  py: 2.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                  boxShadow: `0 8px 25px ${alpha(BRAND_COLORS.primary, 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${BRAND_COLORS.secondary}, ${BRAND_COLORS.primary})`,
                    boxShadow: `0 12px 35px ${alpha(BRAND_COLORS.primary, 0.4)}`,
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: BRAND_COLORS.neutralGray,
                    color: BRAND_COLORS.softBlack
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="text"
                  onClick={() => setResetDialogOpen(true)}
                  sx={{ 
                    textTransform: 'none',
                    color: BRAND_COLORS.primary,
                    fontWeight: 500,
                    '&:hover': {
                      background: alpha(BRAND_COLORS.primary, 0.1)
                    }
                  }}
                >
                  Esqueceu sua senha?
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Reset Password Dialog */}
        <Dialog 
          open={resetDialogOpen} 
          onClose={handleCloseResetDialog}
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
              background: BRAND_COLORS.offWhite
            }
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
            <LockIcon sx={{ fontSize: 40, color: BRAND_COLORS.primary, mb: 1 }} />
            <Typography variant="h6" component="div" sx={{ color: BRAND_COLORS.softBlack }}>
              Redefinir Senha
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pb: 2 }}>
            {!resetSuccess ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Digite seu email para receber um link de redefinição de senha.
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: BRAND_COLORS.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: BRAND_COLORS.primary,
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: BRAND_COLORS.primary,
                    }
                  }}
                />
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" sx={{ mb: 2, color: BRAND_COLORS.primary }}>
                  ✅ Email de redefinição enviado!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={handleCloseResetDialog}
              sx={{ 
                textTransform: 'none',
                color: BRAND_COLORS.greenBlack
              }}
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
                  background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${BRAND_COLORS.secondary}, ${BRAND_COLORS.primary})`,
                  }
                }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>

      {/* Animações CSS */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default Login;
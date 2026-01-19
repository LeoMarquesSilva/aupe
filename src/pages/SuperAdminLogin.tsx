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
  Fade,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { roleService } from '../services/roleService';

const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirecionar se já estiver logado como super_admin
  React.useEffect(() => {
    const checkSuperAdmin = async () => {
      if (user) {
        const isSuperAdmin = await roleService.isCurrentUserSuperAdmin();
        if (isSuperAdmin) {
          navigate('/super-admin');
        } else {
          // Se é usuário normal, redirecionar para dashboard
          navigate('/');
        }
      }
    };
    checkSuperAdmin();
  }, [user, navigate]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
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

      // Login no Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Verificar se o usuário é super_admin
      const profile = await roleService.getUserProfileById(data.user!.id);
      
      if (!profile || profile.role !== 'super_admin') {
        // Fazer logout se não for super_admin
        await supabase.auth.signOut();
        throw new Error('Acesso negado. Esta área é restrita a Super Administradores.');
      }

      console.log('✅ Super Admin logado com sucesso:', data.user?.email);
      navigate('/super-admin');
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (err.message.includes('Acesso negado')) {
        setError(err.message);
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.1,
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      <Container maxWidth="sm">
        <Fade in timeout={600}>
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 1
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  color: 'white',
                  mb: 2
                }}
              >
                <AdminIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Super Admin
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Área restrita para administradores globais
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
                  }
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="text"
                onClick={() => setResetDialogOpen(true)}
                sx={{
                  textTransform: 'none',
                  color: 'primary.main',
                  fontSize: '0.875rem'
                }}
              >
                Esqueceu sua senha?
              </Button>
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Apenas Super Administradores têm acesso a esta área
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleCloseResetDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Redefinir Senha</DialogTitle>
        <DialogContent>
          {resetSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Email de redefinição enviado! Verifique sua caixa de entrada.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Digite seu email para receber o link de redefinição de senha.
              </Typography>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                margin="normal"
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog}>
            {resetSuccess ? 'Fechar' : 'Cancelar'}
          </Button>
          {!resetSuccess && (
            <Button
              onClick={handleResetPassword}
              variant="contained"
              disabled={resetLoading || !resetEmail}
            >
              {resetLoading ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminLogin;

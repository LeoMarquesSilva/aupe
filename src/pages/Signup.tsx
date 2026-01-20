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
  Stepper,
  Step,
  StepLabel,
  Grid,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';
import { subscriptionService } from '../services/subscriptionService';
import { roleService } from '../services/roleService';
import BRAND_COLORS from '../theme/brandColors';

const steps = ['Informações da Organização', 'Dados de Acesso'];

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan'); // PlanId da URL

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data - Organização
  const [orgData, setOrgData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '', // CNPJ/CPF
  });

  // Form data - Usuário
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Verificar se já está logado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Se já estiver logado e tiver planId, ir direto para checkout
        if (planId) {
          navigate(`/checkout?plan=${planId}`);
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkUser();
  }, [navigate, planId]);

  const handleOrgChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrgData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError(null);
  };

  const handleUserChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError(null);
  };

  const validateOrgStep = (): boolean => {
    if (!orgData.name.trim()) {
      setError('Nome da organização é obrigatório.');
      return false;
    }
    if (!orgData.email.trim()) {
      setError('Email da organização é obrigatório.');
      return false;
    }
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orgData.email)) {
      setError('Email inválido.');
      return false;
    }
    return true;
  };

  const validateUserStep = (): boolean => {
    if (!userData.full_name.trim()) {
      setError('Nome completo é obrigatório.');
      return false;
    }
    if (!userData.email.trim()) {
      setError('Email é obrigatório.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      setError('Email inválido.');
      return false;
    }
    if (!userData.password) {
      setError('Senha é obrigatória.');
      return false;
    }
    if (userData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (userData.password !== userData.confirmPassword) {
      setError('As senhas não coincidem.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (validateOrgStep()) {
        setActiveStep(1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateUserStep()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Criar usuário PRIMEIRO (signUp faz login automático temporariamente)
      console.log('👤 Criando usuário...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
          },
        },
      });

      let finalAuthData = authData;

      if (authError) {
        // Se usuário já existe, tentar fazer login
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          console.log('⚠️ Usuário já existe, tentando fazer login...');
          
          // Tentar fazer login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
          });

          if (loginError) {
            throw new Error('Email já cadastrado. Use a opção "Fazer Login" ou recupere sua senha se esqueceu.');
          }

          if (!loginData.user) {
            throw new Error('Erro ao fazer login com conta existente.');
          }

          console.log('✅ Login realizado com conta existente:', loginData.user.id);
          
          // Verificar se já tem organização
          const profile = await roleService.getCurrentUserProfile();
          if (profile && (profile as any).organization_id) {
            // Já tem organização, redirecionar para checkout ou dashboard
            console.log('✅ Usuário já tem organização, redirecionando...');
            if (planId) {
              navigate(`/checkout?plan=${planId}`);
            } else {
              navigate('/dashboard');
            }
            return;
          }

          // Se chegou aqui, usuário existe mas não tem organização
          // Continuar fluxo para criar organização
          finalAuthData = loginData;
        } else {
          throw authError;
        }
      }

      if (!finalAuthData || !finalAuthData.user) {
        throw new Error('Usuário não foi criado ou autenticado');
      }

      console.log('✅ Usuário criado/autenticado:', finalAuthData.user.id);

      // 2. Aguardar um pouco para garantir que o usuário foi criado e autenticado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Criar organização e perfil em uma transação (usando RPC)
      console.log('📝 Criando organização e perfil...');
      let organization;
      try {
        // Usar RPC completa que cria organização e perfil em uma transação (bypass RLS)
        const { data: orgId, error: rpcError } = await supabase.rpc('create_organization_and_profile_on_signup', {
          p_user_id: finalAuthData.user.id,
          p_user_email: userData.email,
          p_user_full_name: userData.full_name,
          p_org_name: orgData.name,
          p_org_email: orgData.email,
          p_org_phone: orgData.phone || null,
          p_org_document: orgData.document || null,
          p_org_country: 'BR',
        });

        if (rpcError) {
          console.error('❌ Erro na RPC:', rpcError);
          throw new Error(`Erro ao criar organização e perfil: ${rpcError.message}`);
        }

        if (!orgId) {
          throw new Error('Organização não foi criada');
        }

        // Buscar organização criada
        const { data: orgDataResult, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (fetchError) {
          console.error('❌ Erro ao buscar organização:', fetchError);
          throw new Error('Organização criada mas não foi possível recuperá-la');
        }

        organization = orgDataResult;
        console.log('✅ Organização e perfil criados com sucesso:', organization.id);
      } catch (orgError: any) {
        console.error('❌ Erro ao criar organização:', orgError);
        throw new Error(orgError.message || 'Erro ao criar organização. Tente novamente ou entre em contato com o suporte.');
      }

      // 6. Redirecionar para checkout com planId
      if (planId) {
        navigate(`/checkout?plan=${planId}`);
      } else {
        // Se não tiver planId, ir para dashboard
        navigate('/dashboard');
      }

    } catch (err: any) {
      console.error('❌ Erro no cadastro:', err);
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(BRAND_COLORS.primary, 0.1)} 0%, ${alpha(BRAND_COLORS.secondary, 0.1)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha('#fff', 0.95)} 0%, ${alpha('#f5f5f5', 0.95)} 100%)`,
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: BRAND_COLORS.primary }}>
              Criar Conta
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Preencha os dados da sua organização e crie sua conta
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={activeStep === 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome da Organização *"
                    value={orgData.name}
                    onChange={handleOrgChange('name')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email da Organização *"
                    value={orgData.email}
                    onChange={handleOrgChange('email')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={orgData.phone}
                    onChange={handleOrgChange('phone')}
                    placeholder="(00) 00000-0000"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="CNPJ/CPF"
                    value={orgData.document}
                    onChange={handleOrgChange('document')}
                    placeholder="00.000.000/0000-00"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DescriptionIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome Completo *"
                    value={userData.full_name}
                    onChange={handleUserChange('full_name')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Seu Email *"
                    value={userData.email}
                    onChange={handleUserChange('email')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Senha *"
                    value={userData.password}
                    onChange={handleUserChange('password')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: BRAND_COLORS.primary }} />
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
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirmar Senha *"
                    value={userData.confirmPassword}
                    onChange={handleUserChange('confirmPassword')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: BRAND_COLORS.primary }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              {activeStep > 0 && (
                <Button onClick={handleBack} disabled={loading}>
                  Voltar
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              {activeStep === 0 ? (
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    bgcolor: BRAND_COLORS.primary,
                    '&:hover': { bgcolor: BRAND_COLORS.secondary },
                  }}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: BRAND_COLORS.primary,
                    '&:hover': { bgcolor: BRAND_COLORS.secondary },
                    minWidth: 120,
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
                </Button>
              )}
            </Box>
          </form>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Já tem uma conta?{' '}
              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/login')}
                sx={{ color: BRAND_COLORS.primary }}
              >
                Fazer Login
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Signup;

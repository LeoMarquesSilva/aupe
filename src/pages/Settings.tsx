import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Instagram as InstagramIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Article as ArticleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { subscriptionService, Subscription } from '../services/subscriptionService';
import { subscriptionLimitsService } from '../services/subscriptionLimitsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

interface UserSettings {
  notifications_email: boolean;
  notifications_push: boolean;
  auto_publish: boolean;
  dark_mode: boolean;
  language: string;
  timezone: string;
}

// TabPanel: usa Box para evitar div dentro de p (acessibilidade e DOM válido)
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  if (value !== index) return null;
  return (
    <Box
      component="section"
      role="tabpanel"
      sx={{
        py: 4,
        px: { xs: 1.5, sm: 2, md: 3 },
        width: '100%',
        maxWidth: '100%',
        overflow: 'visible',
        boxSizing: 'border-box'
      }}
      {...other}
    >
      {children}
    </Box>
  );
}

const Settings: React.FC = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  
  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: ''
  });
  
  // Settings data
  const [settings, setSettings] = useState<UserSettings>({
    notifications_email: true,
    notifications_push: false,
    auto_publish: false,
    dark_mode: false,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  });
  
  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Subscription data
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserSettings();
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    setLoadingSubscription(true);
    try {
      // Carregar limites (que já busca a subscription)
      const limits = await subscriptionLimitsService.getCurrentLimits();
      setSubscriptionLimits(limits);
      setSubscription(limits.subscription);
    } catch (error: any) {
      console.error('Erro ao carregar subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      // Para este exemplo, vamos usar os dados do user do Supabase Auth
      // Em um app real, você teria uma tabela 'profiles' separada
      const profileData: UserProfile = {
        id: user!.id,
        email: user!.email!,
        full_name: user!.user_metadata?.full_name || '',
        phone: user!.user_metadata?.phone || '',
        avatar_url: user!.user_metadata?.avatar_url || '',
        created_at: user!.created_at,
        updated_at: user!.updated_at
      };
      
      setProfile(profileData);
      setProfileForm({
        full_name: profileData.full_name || '',
        phone: profileData.phone || ''
      });
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      setError('Não foi possível carregar o perfil do usuário.');
    }
  };

  const loadUserSettings = async () => {
    try {
      // Para este exemplo, vamos usar localStorage
      // Em um app real, você salvaria no banco de dados
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileForm.full_name,
          phone: profileForm.phone
        }
      });
      
      if (error) throw error;
      
      setSuccess('Perfil atualizado com sucesso!');
      setEditingProfile(false);
      await loadUserProfile();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setError('Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Salvar no localStorage (em um app real, salvaria no banco)
      localStorage.setItem('user_settings', JSON.stringify(settings));
      setSuccess('Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError('Não foi possível salvar as configurações.');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setChangingPassword(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      setSuccess('Senha alterada com sucesso!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setError('Não foi possível alterar a senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETAR') {
      setError('Digite "DELETAR" para confirmar.');
      return;
    }
    
    try {
      // Em um app real, você faria uma chamada para uma função que:
      // 1. Deleta todos os dados do usuário
      // 2. Deleta a conta do Supabase Auth
      setError('Funcionalidade de exclusão de conta será implementada em breve.');
    } catch (err: any) {
      console.error('Erro ao deletar conta:', err);
      setError('Não foi possível deletar a conta.');
    }
  };

  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (!user || !profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={40} sx={{ color: 'primary.main' }} />
          <Typography variant="body2" color="text.secondary">Carregando configurações…</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <SettingsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            Configurações
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Gerencie seu perfil, assinatura e segurança da conta.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          borderRadius: 3,
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            minHeight: 56,
            '& .MuiTab-root': { fontWeight: 500, textTransform: 'none', fontSize: '0.95rem' },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Perfil" />
          <Tab icon={<CreditCardIcon />} iconPosition="start" label="Assinatura" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Segurança" />
        </Tabs>

        {/* Tab: Perfil */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={4} sx={{ px: { xs: 0, sm: 2 } }}>
            <Grid item xs={12} lg={8}>
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 3,
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, overflow: 'visible' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2, sm: 2.5 },
                      p: { xs: 2, sm: 2.5, md: 3 },
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      mb: 4,
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 64, sm: 80 },
                        height: { xs: 64, sm: 80 },
                        flexShrink: 0,
                        bgcolor: 'primary.main',
                        fontSize: { xs: '1.35rem', sm: '1.75rem' },
                        fontWeight: 600,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                      }}
                    >
                      {getUserInitials(profile.full_name || '', profile.email)}
                    </Avatar>
                    <Box sx={{ flex: '1 1 min(100%, 220px)', minWidth: 0, overflow: 'hidden' }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 0.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {profile.full_name || 'Nome não informado'}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1.5, wordBreak: 'break-all', overflowWrap: 'break-word' }}
                      >
                        {profile.email}
                      </Typography>
                      <Chip
                        label={`Membro desde ${new Date(profile.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: alpha(theme.palette.primary.main, 0.4),
                          color: 'text.secondary',
                          fontWeight: 500,
                          maxWidth: '100%',
                          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                        }}
                      />
                    </Box>
                  </Box>

                  {editingProfile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        label="Nome completo"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                        fullWidth
                        size="medium"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        label="Telefone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        fullWidth
                        size="medium"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Box>
                  ) : (
                    <List disablePadding sx={{ '& .MuiListItem-root': { py: 2, px: 0, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }, '& .MuiListItem-root:last-of-type': { borderBottom: 0 } }}>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 44, color: 'primary.main' }}>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Nome completo"
                          secondary={profile.full_name || 'Não informado'}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 44, color: 'primary.main' }}>
                          <EmailIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Email"
                          secondary={profile.email}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 44, color: 'primary.main' }}>
                          <PhoneIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary="Telefone"
                          secondary={profile.phone || 'Não informado'}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                        />
                      </ListItem>
                    </List>
                  )}
                </CardContent>
                <CardActions sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                  {editingProfile ? (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button startIcon={<SaveIcon />} onClick={handleSaveProfile} disabled={loading} variant="contained">
                        Salvar
                      </Button>
                      <Button startIcon={<CancelIcon />} onClick={() => setEditingProfile(false)} disabled={loading} variant="outlined">
                        Cancelar
                      </Button>
                    </Box>
                  ) : (
                    <Button startIcon={<EditIcon />} onClick={() => setEditingProfile(true)} variant="outlined">
                      Editar perfil
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Assinatura */}
        <TabPanel value={currentTab} index={1}>
          {loadingSubscription ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} sx={{ color: 'primary.main' }} />
            </Box>
          ) : subscription && subscriptionLimits ? (
            <Grid container spacing={4} sx={{ px: { xs: 0, sm: 2 } }}>
              <Grid item xs={12} lg={5}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <CreditCardIcon sx={{ color: 'primary.main', fontSize: 26 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Plano atual</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={subscription.plan?.name ? subscription.plan.name.charAt(0).toUpperCase() + subscription.plan.name.slice(1) : 'N/A'}
                        color="primary"
                        sx={{ fontSize: '1rem', fontWeight: 600, py: 1.5, px: 2, borderRadius: 2 }}
                      />
                    </Box>
                    <List disablePadding sx={{ '& .MuiListItem-root': { py: 1.5, px: 0 } }}>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color={subscription.status === 'active' ? 'success' : 'disabled'} />
                          </ListItemIcon>
                          <ListItemText
                            primary="Status"
                            secondary={
                              <Chip
                                label={subscription.status === 'active' ? 'Ativa' : subscription.status}
                                color={subscription.status === 'active' ? 'success' : 'default'}
                                size="small"
                              />
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>

                        {subscription.current_period_end && (
                          <ListItem>
                            <ListItemIcon>
                              <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Próxima Cobrança"
                              secondary={format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            />
                          </ListItem>
                        )}

                        {subscription.current_period_start && (
                          <ListItem>
                            <ListItemIcon>
                              <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Início do Período"
                              secondary={format(new Date(subscription.current_period_start), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            />
                          </ListItem>
                        )}

                        {subscription.stripe_subscription_id && (
                          <ListItem>
                            <ListItemIcon>
                              <CreditCardIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="ID da Assinatura"
                              secondary={
                                <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {subscription.stripe_subscription_id.substring(0, 20)}...
                                </Typography>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        )}
                      </List>
                  </CardContent>
                  <CardActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                    <Button variant="outlined" onClick={() => navigate('/')} startIcon={<TrendingUpIcon />}>
                      Ver planos
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} lg={7}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                      <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Limites e uso</Typography>
                    </Box>

                    {subscriptionLimits.error ? (
                      <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {subscriptionLimits.error}
                      </Alert>
                    ) : (
                      <Box>
                        <Box
                          sx={{
                            mb: 3,
                            p: 2.5,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>Contas Instagram</Typography>
                              <Typography variant="caption" color="text.secondary">Contas conectadas à sua organização</Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {subscriptionLimits.currentClients} / {subscriptionLimits.maxClients === 999999 ? '∞' : subscriptionLimits.maxClients}
                            </Typography>
                          </Box>
                          {subscriptionLimits.maxClients !== 999999 && (
                            <>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min((subscriptionLimits.currentClients / subscriptionLimits.maxClients) * 100, 100)}
                                color={subscriptionLimits.currentClients >= subscriptionLimits.maxClients ? 'error' : subscriptionLimits.currentClients >= subscriptionLimits.maxClients * 0.8 ? 'warning' : 'primary'}
                                sx={{ height: 8, borderRadius: 1, mb: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {((subscriptionLimits.currentClients / subscriptionLimits.maxClients) * 100).toFixed(1)}% utilizado
                              </Typography>
                            </>
                          )}
                          {subscriptionLimits.maxClients === 999999 && (
                            <Chip label="Ilimitado" color="success" size="small" sx={{ mt: 1, fontWeight: 500 }} />
                          )}
                        </Box>

                        <Box
                          sx={{
                            mb: 3,
                            p: 2.5,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>Posts este mês</Typography>
                              <Typography variant="caption" color="text.secondary">Posts agendados no período atual</Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {subscriptionLimits.currentPostsThisMonth.toLocaleString('pt-BR')} / {subscriptionLimits.maxPostsPerMonth === 999999 ? '∞' : subscriptionLimits.maxPostsPerMonth.toLocaleString('pt-BR')}
                            </Typography>
                          </Box>
                          {subscriptionLimits.maxPostsPerMonth !== 999999 && (
                            <>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min((subscriptionLimits.currentPostsThisMonth / subscriptionLimits.maxPostsPerMonth) * 100, 100)}
                                color={subscriptionLimits.currentPostsThisMonth >= subscriptionLimits.maxPostsPerMonth ? 'error' : subscriptionLimits.currentPostsThisMonth >= subscriptionLimits.maxPostsPerMonth * 0.8 ? 'warning' : 'primary'}
                                sx={{ height: 8, borderRadius: 1, mb: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {((subscriptionLimits.currentPostsThisMonth / subscriptionLimits.maxPostsPerMonth) * 100).toFixed(1)}% utilizado
                              </Typography>
                            </>
                          )}
                          {subscriptionLimits.maxPostsPerMonth === 999999 && (
                            <Chip label="Ilimitado" color="success" size="small" sx={{ mt: 1, fontWeight: 500 }} />
                          )}
                        </Box>

                        {subscription.plan && (
                          <Box
                            sx={{
                              mt: 3,
                              p: 2.5,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                              color: 'primary.contrastText',
                              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: 'inherit' }}>
                              Detalhes do plano
                            </Typography>
                            <List disablePadding sx={{ color: 'inherit', '& .MuiListItem-root': { py: 0.75, px: 0 } }}>
                              <ListItem>
                                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><InstagramIcon fontSize="small" /></ListItemIcon>
                                <ListItemText
                                  primary={`Até ${subscription.plan.max_clients === 999999 ? 'ilimitadas' : subscription.plan.max_clients} contas Instagram`}
                                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><ArticleIcon fontSize="small" /></ListItemIcon>
                                <ListItemText
                                  primary={`${subscription.plan.max_posts_per_month === 999999 ? 'Ilimitados' : subscription.plan.max_posts_per_month.toLocaleString('pt-BR')} posts por mês`}
                                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><PersonIcon fontSize="small" /></ListItemIcon>
                                <ListItemText
                                  primary={`Até ${subscription.plan.max_profiles || 'N/A'} usuários`}
                                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                />
                              </ListItem>
                            </List>
                          </Box>
                        )}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, bgcolor: alpha(theme.palette.grey[500], 0.02), gap: 1.5 }}>
                    <Button variant="contained" onClick={() => navigate('/')} startIcon={<TrendingUpIcon />}>
                      Fazer upgrade
                    </Button>
                    <Button variant="outlined" onClick={loadSubscription} startIcon={<RefreshIcon />}>
                      Atualizar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ px: { xs: 0, sm: 2 } }}>
              <Card
                elevation={0}
                sx={{
                  maxWidth: 480,
                  mx: 'auto',
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  textAlign: 'center'
                }}
              >
                <CardContent sx={{ py: 5, px: 4 }}>
                  <CreditCardIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.9 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Nenhuma assinatura ativa</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Para começar a usar o sistema, assine um plano.
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/')} startIcon={<TrendingUpIcon />} size="large" sx={{ borderRadius: 2 }}>
                    Ver planos disponíveis
                  </Button>
                </CardContent>
              </Card>
            </Box>
          )}
        </TabPanel>

        {/* Tab: Segurança */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={4} sx={{ px: { xs: 0, sm: 2 } }}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <SecurityIcon sx={{ color: 'primary.main', fontSize: 26 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Alterar senha</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Mantenha sua conta segura alterando a senha periodicamente.
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nova senha"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      fullWidth
                      size="medium"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label="Confirmar nova senha"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      fullWidth
                      size="medium"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Box>
                </CardContent>
                <CardActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                  <Button
                    startIcon={<SecurityIcon />}
                    onClick={handleChangePassword}
                    disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    variant="contained"
                  >
                    {changingPassword ? 'Alterando…' : 'Alterar senha'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  border: `2px solid ${alpha(theme.palette.error.main, 0.5)}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.error.main, 0.02),
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <DeleteIcon sx={{ color: 'error.main', fontSize: 26 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>Zona de perigo</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Excluir sua conta removerá permanentemente todos os seus dados (clientes, posts agendados e configurações).
                  </Typography>
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>Esta ação não pode ser desfeita.</Alert>
                </CardContent>
                <CardActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
                  <Button startIcon={<DeleteIcon />} onClick={() => setDeleteDialogOpen(true)} color="error" variant="outlined">
                    Excluir conta
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main', pb: 1 }}>
          Excluir conta permanentemente
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tem certeza? Todos os seus dados (clientes, posts, configurações) serão removidos. Esta ação não pode ser desfeita.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Digite <strong>DELETAR</strong> para confirmar:
          </Typography>
          <TextField
            fullWidth
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETAR"
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={deleteConfirmation !== 'DELETAR'}>
            Excluir conta
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
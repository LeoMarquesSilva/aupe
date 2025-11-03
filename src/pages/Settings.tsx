import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as ThemeIcon,
  Storage as StorageIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Instagram as InstagramIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

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

const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserSettings();
    }
  }, [user]);

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
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Typography>Carregando configurações...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Configurações
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Perfil do Usuário */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Perfil do Usuário</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mr: 2,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem'
                  }}
                >
                  {getUserInitials(profile.full_name || '', profile.email)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {profile.full_name || 'Nome não informado'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {profile.email}
                  </Typography>
                  <Chip 
                    label={`Membro desde ${new Date(profile.created_at).toLocaleDateString('pt-BR')}`}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              {editingProfile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Nome Completo"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    fullWidth
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <TextField
                    label="Telefone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    fullWidth
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Box>
              ) : (
                <List>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Nome Completo" 
                      secondary={profile.full_name || 'Não informado'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><EmailIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Email" 
                      secondary={profile.email} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PhoneIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Telefone" 
                      secondary={profile.phone || 'Não informado'} 
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
            <CardActions>
              {editingProfile ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                    variant="contained"
                  >
                    Salvar
                  </Button>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={() => setEditingProfile(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </Box>
              ) : (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setEditingProfile(true)}
                >
                  Editar Perfil
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>

        {/* Configurações de Notificação */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Notificações</Typography>
              </Box>

              <List>
                <ListItem>
                  <ListItemText 
                    primary="Notificações por Email" 
                    secondary="Receber atualizações por email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, notifications_email: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Notificações Push" 
                    secondary="Receber notificações no navegador"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications_push}
                      onChange={(e) => setSettings(prev => ({ ...prev, notifications_push: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Publicação Automática" 
                    secondary="Publicar posts automaticamente no horário agendado"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.auto_publish}
                      onChange={(e) => setSettings(prev => ({ ...prev, auto_publish: e.target.checked }))}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                variant="contained"
              >
                Salvar Configurações
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Segurança */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Segurança</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Altere sua senha para manter sua conta segura.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nova Senha"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Confirmar Nova Senha"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  fullWidth
                />
              </Box>
            </CardContent>
            <CardActions>
              <Button
                startIcon={<SecurityIcon />}
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                variant="contained"
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Zona de Perigo */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6" color="error.main">Zona de Perigo</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Excluir sua conta removerá permanentemente todos os seus dados, incluindo clientes, posts agendados e configurações.
              </Typography>

              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta ação não pode ser desfeita!
              </Alert>
            </CardContent>
            <CardActions>
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                color="error"
                variant="outlined"
              >
                Excluir Conta
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle color="error.main">
          Excluir Conta Permanentemente
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Tem certeza de que deseja excluir sua conta? Esta ação não pode ser desfeita.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Digite <strong>DELETAR</strong> para confirmar:
          </Typography>
          <TextField
            fullWidth
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETAR"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteConfirmation !== 'DELETAR'}
          >
            Excluir Conta
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
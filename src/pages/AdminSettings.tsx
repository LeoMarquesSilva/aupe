import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';

// Icons
import {
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Article as ArticleIcon,
  Storage as StorageIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Instagram as InstagramIcon,
  SupervisorAccount as SupervisorIcon,
  CloudSync as CloudSyncIcon,
  Security as SecurityIcon,
  Save as SaveIcon
} from '@mui/icons-material';

// Services e Types
import { supabase } from '../services/supabaseClient';
import { roleService, UserRole, UserProfile } from '../services/roleService';
import { useAuth } from '../contexts/AuthContext';

// Date formatting
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface SystemStats {
  totalUsers: number;
  totalClients: number;
  totalPosts: number;
  activeConnections: number;
  cacheSize: number;
  lastBackup: Date | null;
  adminCount: number;
  moderatorCount: number;
}

interface Client {
  id: string;
  name: string;
  instagram: string;
  user_id: string;
  access_token?: string;
  instagram_account_id?: string;
  created_at: string;
  user_email?: string;
}

interface Post {
  id: string;
  content: string;
  client_id: string;
  user_id: string;
  scheduled_date: string;
  status: string;
  created_at: string;
  client_name?: string;
  user_email?: string;
}

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

const AdminSettings: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalClients: 0,
    totalPosts: 0,
    activeConnections: 0,
    cacheSize: 0,
    lastBackup: null,
    adminCount: 0,
    moderatorCount: 0
  });

  // Estados para dados
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cacheData, setCacheData] = useState<any[]>([]);

  // Estados para diálogos
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'user' | 'client' | 'post' | 'cache' | null;
    item: any;
  }>({ open: false, type: null, item: null });

  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
    newRole: UserRole;
  }>({ open: false, user: null, newRole: 'user' });

  // Estados para criar/editar usuário
  const [userDialog, setUserDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    user: UserProfile | null;
  }>({ open: false, mode: 'create', user: null });

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'user'
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Estados para menus
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Carregar dados automaticamente quando o componente monta
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!mounted) return;
      
      console.log('✅ Carregando dados do admin...');
      await loadAllData();
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadSystemStats(),
      loadUsersData(),
      loadClientsData(),
      loadPostsData(),
      loadCacheData()
    ]);
  };

  const loadSystemStats = async () => {
    try {
      setLoading(true);
      
      // Obter organization_id do usuário atual para filtrar estatísticas
      const { data: { user } } = await supabase.auth.getUser();
      let organizationFilter = null;
      let isSuperAdmin = false;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          isSuperAdmin = profile.role === 'super_admin';
          // Se não for super_admin, filtrar por organization_id
          if (!isSuperAdmin && profile.organization_id) {
            organizationFilter = profile.organization_id;
          }
        }
      }
      
      // Primeiro, vamos descobrir qual tabela usar (profiles ou user_profiles)
      let profilesTable = 'profiles';
      
      // Testar se a tabela profiles existe
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      // Se profiles não existir, tentar user_profiles
      if (profilesError && profilesError.message.includes('does not exist')) {
        profilesTable = 'user_profiles';
        console.log('📋 Usando tabela user_profiles em vez de profiles');
      }
      
      // Buscar estatísticas do sistema (filtradas por organização se necessário)
      const usersQuery = organizationFilter 
        ? supabase.from(profilesTable).select('id', { count: 'exact', head: true }).eq('organization_id', organizationFilter)
        : supabase.from(profilesTable).select('id', { count: 'exact', head: true });
      
      const clientsQuery = organizationFilter
        ? supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationFilter)
        : supabase.from('clients').select('id', { count: 'exact', head: true });
      
      const postsQuery = organizationFilter
        ? supabase.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationFilter)
        : supabase.from('scheduled_posts').select('id', { count: 'exact', head: true });

      const [usersCount, clientsCount, postsCount] = await Promise.all([
        usersQuery,
        clientsQuery,
        postsQuery
      ]);

      // Tentar buscar cache (pode não existir)
      let cacheCount = { count: 0 };
      try {
        const cacheResult = await supabase
          .from('instagram_profile_cache')
          .select('id', { count: 'exact', head: true });
        cacheCount = cacheResult;
      } catch (error) {
        console.log('⚠️ Tabela de cache não encontrada, usando 0');
      }

      // Contar conexões ativas do Instagram
      const { data: activeConnections } = await supabase
        .from('clients')
        .select('id')
        .not('access_token', 'is', null);

      // Contar usuários por role
      const { data: roleStats } = await supabase
        .from(profilesTable)
        .select('role');

      const adminCount = roleStats?.filter(u => u.role === 'admin').length || 0;
      const moderatorCount = roleStats?.filter(u => u.role === 'moderator').length || 0;

      setStats({
        totalUsers: usersCount.count || 0,
        totalClients: clientsCount.count || 0,
        totalPosts: postsCount.count || 0,
        activeConnections: activeConnections?.length || 0,
        cacheSize: cacheCount.count || 0,
        lastBackup: new Date(),
        adminCount,
        moderatorCount
      });
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsersData = async () => {
    try {
      
      const usersWithRoles = await roleService.getAllUsersWithRoles();
      
      console.log('📊 Usuários carregados:', usersWithRoles.length);
      console.log('👥 Lista de usuários:', usersWithRoles.map(u => ({ email: u.email, role: u.role })));
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
    }
  };

  const loadClientsData = async () => {
    try {
      // Obter organization_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Erro ao buscar perfil do usuário:', profileError);
        return;
      }

      // Se for super_admin, pode ver todos os clients
      let clientsQuery = supabase
        .from('clients')
        .select('*');

      if (profile.role !== 'super_admin') {
        if (!profile.organization_id) {
          console.warn('⚠️ Usuário não possui organization_id');
          setClients([]);
          return;
        }
        clientsQuery = clientsQuery.eq('organization_id', profile.organization_id);
      }

      const { data: clientsData, error: clientsError } = await clientsQuery
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Depois, buscar emails dos usuários separadamente
      if (clientsData && clientsData.length > 0) {
        const userIds = [...new Set(clientsData.map(client => client.user_id))];
        
        // Tentar profiles primeiro, depois user_profiles
        let usersData = null;
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);
          
          if (error && error.message.includes('does not exist')) {
            // Tentar user_profiles
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('id, email')
              .in('id', userIds);
            
            if (userError) throw userError;
            usersData = userData;
          } else if (error) {
            throw error;
          } else {
            usersData = data;
          }
        } catch (error) {
          console.error('❌ Erro ao buscar emails dos usuários:', error);
          usersData = [];
        }

        // Combinar dados
        const clientsWithUserEmail = clientsData.map(client => {
          const userProfile = usersData?.find(u => u.id === client.user_id);
          return {
            ...client,
            user_email: userProfile?.email || 'Email não encontrado'
          };
        });
        
        setClients(clientsWithUserEmail);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      setClients([]);
    }
  };

  const loadPostsData = async () => {
    try {
      // Obter organization_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Erro ao buscar perfil do usuário:', profileError);
        return;
      }

      // Se for super_admin, pode ver todos os posts
      let postsQuery = supabase
        .from('scheduled_posts')
        .select('*');

      if (profile.role !== 'super_admin') {
        if (!profile.organization_id) {
          console.warn('⚠️ Usuário não possui organization_id');
          setPosts([]);
          return;
        }
        postsQuery = postsQuery.eq('organization_id', profile.organization_id);
      }

      // Primeiro, carregar posts sem joins
      const { data: postsData, error: postsError } = await postsQuery
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Buscar dados de clientes e usuários separadamente
        const clientIds = [...new Set(postsData.map(post => post.client_id).filter(Boolean))];
        const userIds = [...new Set(postsData.map(post => post.user_id).filter(Boolean))];

        // Buscar clientes
        let clientsData = [];
        if (clientIds.length > 0) {
          const { data, error } = await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds);
          
          if (!error) clientsData = data || [];
        }

        // Buscar usuários (tentar profiles primeiro, depois user_profiles)
        let usersData = [];
        if (userIds.length > 0) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, email')
              .in('id', userIds);
            
            if (error && error.message.includes('does not exist')) {
              const { data: userData, error: userError } = await supabase
                .from('user_profiles')
                .select('id, email')
                .in('id', userIds);
              
              if (!userError) usersData = userData || [];
            } else if (!error) {
              usersData = data || [];
            }
          } catch (error) {
            console.error('❌ Erro ao buscar usuários para posts:', error);
          }
        }

        // Combinar dados
        const postsWithDetails = postsData.map(post => {
          const client = clientsData.find(c => c.id === post.client_id);
          const user = usersData.find(u => u.id === post.user_id);
          
          return {
            ...post,
            client_name: client?.name || 'Cliente não encontrado',
            user_email: user?.email || 'Usuário não encontrado'
          };
        });
        
        setPosts(postsWithDetails);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar posts:', error);
      setPosts([]);
    }
  };

  const loadCacheData = async () => {
    try {
      // Tentar carregar dados de cache (pode não existir)
      const { data, error } = await supabase
        .from('instagram_cache_status')
        .select('*')
        .order('last_full_sync', { ascending: false });

      if (error) {
        console.log('⚠️ Tabela de cache não encontrada:', error.message);
        setCacheData([]);
        return;
      }

      if (data && data.length > 0) {
        // Buscar dados de clientes separadamente
        const clientIds = [...new Set(data.map(cache => cache.client_id).filter(Boolean))];
        
        let clientsData = [];
        if (clientIds.length > 0) {
          const { data: clientsResult, error: clientsError } = await supabase
            .from('clients')
            .select('id, name, instagram')
            .in('id', clientIds);
          
          if (!clientsError) clientsData = clientsResult || [];
        }

        // Combinar dados
        const cacheWithClients = data.map(cache => {
          const client = clientsData.find(c => c.id === cache.client_id);
          return {
            ...cache,
            clients: client ? { name: client.name, instagram: client.instagram } : null
          };
        });
        
        setCacheData(cacheWithClients);
      } else {
        setCacheData([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de cache:', error);
      setCacheData([]);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any, type: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem({ ...item, type });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleDelete = (type: 'user' | 'client' | 'post' | 'cache', item: any) => {
    setDeleteDialog({ open: true, type, item });
    handleMenuClose();
  };

  const handleRoleChange = (user: UserProfile) => {
    setRoleDialog({ open: true, user, newRole: user.role });
    handleMenuClose();
  };

  const handleCreateUser = () => {
    setUserForm({
      email: '',
      password: '',
      full_name: '',
      role: 'user'
    });
    setFormErrors({});
    setUserDialog({ open: true, mode: 'create', user: null });
  };

  const handleEditUser = (user: UserProfile) => {
    setUserForm({
      email: user.email,
      password: '', // Não mostrar senha atual
      full_name: user.full_name || '',
      role: user.role
    });
    setFormErrors({});
    setUserDialog({ open: true, mode: 'edit', user });
    handleMenuClose();
  };

  const validateUserForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Validar email
    if (!userForm.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = 'Email inválido';
    }

    // Validar senha (apenas para criação ou se foi preenchida na edição)
    if (userDialog.mode === 'create' || userForm.password.trim()) {
      if (!userForm.password.trim()) {
        errors.password = 'Senha é obrigatória';
      } else if (userForm.password.length < 6) {
        errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
    }

    // Validar nome
    if (!userForm.full_name.trim()) {
      errors.full_name = 'Nome é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateUserForm()) return;

    try {
      setLoading(true);

      if (userDialog.mode === 'create') {
        const success = await roleService.createUserWithRole({
          email: userForm.email,
          password: userForm.password,
          full_name: userForm.full_name,
          role: userForm.role
        });

        if (!success) {
          throw new Error('Falha ao criar usuário');
        }

        console.log('✅ Usuário criado com sucesso:', userForm.email);
      } else {
        if (!userDialog.user) return;

        const success = await roleService.updateUserProfile(userDialog.user.id, {
          full_name: userForm.full_name,
          role: userForm.role,
          email: userForm.email !== userDialog.user.email ? userForm.email : undefined
        });

        if (!success) {
          throw new Error('Falha ao atualizar usuário');
        }

        console.log('✅ Usuário atualizado com sucesso:', userForm.email);
      }

      // Fechar dialog
      setUserDialog({ open: false, mode: 'create', user: null });
      
      // FORÇAR atualização da lista
      setTimeout(async () => {
        await loadUsersData();
        await loadSystemStats();
      }, 1000);

    } catch (error) {
      console.error('❌ Erro ao salvar usuário:', error);
      setFormErrors({ 
        general: error instanceof Error ? error.message : 'Erro ao salvar usuário. Verifique os dados e tente novamente.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleDialog.user) return;

    try {
      setLoading(true);
      const success = await roleService.updateUserRole(roleDialog.user.id, roleDialog.newRole);
      
      if (success) {
        await loadUsersData();
        await loadSystemStats();
        setRoleDialog({ open: false, user: null, newRole: 'user' });
      } else {
        console.error('❌ Falha ao atualizar role');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar role:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item || !deleteDialog.type) return;

    try {
      setLoading(true);
      
      switch (deleteDialog.type) {
        case 'user':
          // USAR NOSSA FUNÇÃO DE DELETAR USUÁRIO
          console.log('🔄 Deletando usuário:', deleteDialog.item.email);
          await roleService.deleteUser(deleteDialog.item.id);
          await loadUsersData();
          await loadSystemStats();
          console.log('✅ Usuário deletado com sucesso');
          break;
          
        case 'client':
          await supabase
            .from('clients')
            .delete()
            .eq('id', deleteDialog.item.id);
          await loadClientsData();
          break;
          
        case 'post':
          await supabase
            .from('scheduled_posts')
            .delete()
            .eq('id', deleteDialog.item.id);
          await loadPostsData();
          break;
          
        case 'cache':
          await supabase
            .from('instagram_cache_status')
            .delete()
            .eq('id', deleteDialog.item.id);
          await loadCacheData();
          break;
      }
      
      await loadSystemStats();
    } catch (error) {
      console.error('❌ Erro ao excluir item:', error);
      alert(`Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, type: null, item: null });
    }
  };

  const clearCache = async () => {
    try {
      setLoading(true);
      
      // Tentar limpar várias tabelas de cache (algumas podem não existir)
      const cacheTablesToClear = [
        'instagram_profile_cache',
        'instagram_posts_cache', 
        'instagram_cache_status'
      ];

      for (const table of cacheTablesToClear) {
        try {
          await supabase.from(table).delete().neq('id', '');
          console.log(`✅ Cache limpo: ${table}`);
        } catch (error) {
          console.log(`⚠️ Tabela ${table} não encontrada ou erro ao limpar:`, error);
        }
      }
      
      await loadCacheData();
      await loadSystemStats();
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadAllData();
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'moderator': return <SupervisorIcon />;
      default: return <PeopleIcon />;
    }
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box
        className="grain-overlay premium-header-bg"
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 4,
          p: { xs: 2, sm: 2.5 },
          borderRadius: GLASS.radius.card,
          border: `1px solid rgba(255, 255, 255, 0.18)`,
          gap: 1.5,
        }}
      >
        <AdminIcon sx={{ fontSize: 32, color: '#fff' }} />
        <Typography variant="h4" component="h1" className="premium-header-title" sx={{ flexGrow: 1 }}>
          Painel de Administração
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshData}
          disabled={loading}
          sx={{
            borderColor: 'rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: GLASS.radius.button,
            bgcolor: 'rgba(10, 15, 45, 0.22)',
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(10, 15, 45, 0.35)' },
          }}
        >
          {loading ? <CircularProgress size={16} /> : 'Atualizar'}
        </Button>
      </Box>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { icon: <PeopleIcon sx={{ fontSize: 40, color: GLASS.accent.orange, mb: 1 }} />, value: stats.totalUsers, label: 'Usuários' },
          { icon: <BusinessIcon sx={{ fontSize: 40, color: GLASS.accent.orangeLight, mb: 1 }} />, value: stats.totalClients, label: 'Clientes' },
          { icon: <ArticleIcon sx={{ fontSize: 40, color: GLASS.accent.blue, mb: 1 }} />, value: stats.totalPosts, label: 'Posts' },
          { icon: <InstagramIcon sx={{ fontSize: 40, color: GLASS.accent.orangeDark, mb: 1 }} />, value: stats.activeConnections, label: 'Conexões Ativas' },
          { icon: <AdminIcon sx={{ fontSize: 40, color: GLASS.accent.orange, mb: 1 }} />, value: stats.adminCount, label: 'Admins' },
          { icon: <StorageIcon sx={{ fontSize: 40, color: GLASS.text.muted, mb: 1 }} />, value: stats.cacheSize, label: 'Cache Items' },
        ].map((item, idx) => (
          <Grid item xs={12} sm={6} md={2} key={idx}>
            <Card elevation={0} sx={{ border: `1px solid ${GLASS.border.outer}`, borderRadius: GLASS.radius.card, background: GLASS.surface.bg, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                {item.icon}
                <Typography variant="h4" component="div" sx={{ color: GLASS.text.heading }}>
                  {item.value}
                </Typography>
                <Typography sx={{ color: GLASS.text.muted }}>
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper elevation={0} sx={{ width: '100%', border: `1px solid ${GLASS.border.outer}`, borderRadius: GLASS.radius.card, background: GLASS.surface.bg, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`, overflow: 'hidden' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${GLASS.border.outer}`, '& .Mui-selected': { color: `${GLASS.accent.orange} !important` }, '& .MuiTabs-indicator': { backgroundColor: GLASS.accent.orange } }}
        >
          <Tab icon={<PeopleIcon />} label="Usuários & Roles" />
          <Tab icon={<BusinessIcon />} label="Clientes" />
          <Tab icon={<ArticleIcon />} label="Posts" />
          <Tab icon={<StorageIcon />} label="Cache" />
          <Tab icon={<AnalyticsIcon />} label="Logs" />
          <Tab icon={<SettingsIcon />} label="Sistema" />
        </Tabs>

        {/* Painel de Usuários e Roles */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" icon={<ShieldIcon />} sx={{ flexGrow: 1, mr: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Gerenciamento de Usuários e Permissões
              </Typography>
              <Typography variant="body2">
                Gerencie roles dos usuários: <strong>Admin</strong> (acesso total), 
                <strong>Moderator</strong> (acesso limitado), <strong>User</strong> (acesso básico).
              </Typography>
            </Alert>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleCreateUser}
              sx={{ minWidth: 'auto', whiteSpace: 'nowrap', bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark }, borderRadius: GLASS.radius.button }}
            >
              Novo Usuário
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Atualizado em</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>{userProfile.email}</TableCell>
                    <TableCell>{userProfile.full_name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={getRoleIcon(userProfile.role)}
                        label={userProfile.role.toUpperCase()}
                        color={getRoleColor(userProfile.role)}
                        variant={userProfile.role === 'user' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(userProfile.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(userProfile.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, userProfile, 'user')}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Painel de Clientes */}
        <TabPanel value={currentTab} index={1}>
          <Alert severity="info" icon={<BusinessIcon />} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Clientes do Sistema
            </Typography>
            <Typography variant="body2">
              Visualize todos os clientes cadastrados no sistema e suas conexões com o Instagram.
            </Typography>
          </Alert>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Instagram</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Status Conexão</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <InstagramIcon sx={{ mr: 1, color: '#E4405F' }} />
                        @{client.instagram}
                      </Box>
                    </TableCell>
                    <TableCell>{client.user_email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={client.access_token ? 'Conectado' : 'Desconectado'}
                        color={client.access_token ? 'success' : 'default'}
                        icon={client.access_token ? <CheckCircleIcon /> : <ErrorIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(client.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, client, 'client')}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Painel de Posts */}
        <TabPanel value={currentTab} index={2}>
          <Alert severity="info" icon={<ArticleIcon />} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Posts Agendados
            </Typography>
            <Typography variant="body2">
              Visualize todos os posts agendados no sistema (limitado aos últimos 100).
            </Typography>
          </Alert>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Conteúdo</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Data Agendada</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {post.content || 'Sem conteúdo'}
                      </Typography>
                    </TableCell>
                    <TableCell>{post.client_name}</TableCell>
                    <TableCell>{post.user_email}</TableCell>
                    <TableCell>
                      {format(new Date(post.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={post.status}
                        color={
                          (post.status === 'published' || post.status === 'posted') ? 'success' :
                          post.status === 'scheduled' ? 'info' :
                          post.status === 'failed' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, post, 'post')}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Painel de Cache */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" icon={<StorageIcon />} sx={{ flexGrow: 1, mr: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Cache do Instagram
              </Typography>
              <Typography variant="body2">
                Gerencie o cache de dados do Instagram. Limpe quando necessário para forçar atualização.
              </Typography>
            </Alert>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DeleteIcon />}
              onClick={clearCache}
              disabled={loading}
            >
              Limpar Cache
            </Button>
          </Box>

          {cacheData.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Instagram</TableCell>
                    <TableCell>Última Sincronização</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cacheData.map((cache) => (
                    <TableRow key={cache.id}>
                      <TableCell>{cache.clients?.name || 'Cliente não encontrado'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <InstagramIcon sx={{ mr: 1, color: '#E4405F' }} />
                          @{cache.clients?.instagram || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {cache.last_full_sync 
                          ? format(new Date(cache.last_full_sync), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : 'Nunca'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={cache.is_syncing ? 'Sincronizando' : 'Inativo'}
                          color={cache.is_syncing ? 'info' : 'default'}
                          icon={cache.is_syncing ? <CloudSyncIcon /> : <CheckCircleIcon />}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, cache, 'cache')}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              Nenhum dado de cache encontrado.
            </Alert>
          )}
        </TabPanel>

        {/* Painel de Logs */}
        <TabPanel value={currentTab} index={4}>
          <Alert severity="info" icon={<AnalyticsIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              Logs do Sistema
            </Typography>
            <Typography variant="body2">
              Funcionalidade em desenvolvimento. Aqui serão exibidos logs de auditoria e atividades do sistema.
            </Typography>
          </Alert>
        </TabPanel>

        {/* Painel de Sistema */}
        <TabPanel value={currentTab} index={5}>
          <Alert severity="info" icon={<SettingsIcon />} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Configurações do Sistema
            </Typography>
            <Typography variant="body2">
              Configurações gerais e manutenção do sistema.
            </Typography>
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: `1px solid ${GLASS.border.outer}`, borderRadius: GLASS.radius.card, background: GLASS.surface.bgStrong, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', color: GLASS.accent.orange }} />
                    Segurança
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Row Level Security (RLS)"
                        secondary="Ativo em todas as tabelas"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Autenticação Supabase"
                        secondary="JWT tokens seguros"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Controle de Roles"
                        secondary={`${stats.adminCount} admins, ${stats.moderatorCount} moderators`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: `1px solid ${GLASS.border.outer}`, borderRadius: GLASS.radius.card, background: GLASS.surface.bgStrong, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle', color: GLASS.accent.orange }} />
                    Banco de Dados
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Total de Registros"
                        secondary={`${stats.totalUsers + stats.totalClients + stats.totalPosts} registros`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Cache Size"
                        secondary={`${stats.cacheSize} itens em cache`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Último Backup"
                        secondary={stats.lastBackup ? format(stats.lastBackup, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Nunca'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Menu de Contexto */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem?.type === 'user' && [
          <MenuItem key="edit" onClick={() => handleEditUser(selectedItem)}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>,
          <MenuItem key="role" onClick={() => handleRoleChange(selectedItem)}>
            <ListItemIcon><ShieldIcon /></ListItemIcon>
            <ListItemText>Alterar Role</ListItemText>
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem key="delete" onClick={() => handleDelete('user', selectedItem)} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        ]}
        
        {selectedItem?.type === 'client' && [
          <MenuItem key="delete" onClick={() => handleDelete('client', selectedItem)} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>Excluir Cliente</ListItemText>
          </MenuItem>
        ]}
        
        {selectedItem?.type === 'post' && [
          <MenuItem key="delete" onClick={() => handleDelete('post', selectedItem)} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>Excluir Post</ListItemText>
          </MenuItem>
        ]}
        
        {selectedItem?.type === 'cache' && [
          <MenuItem key="delete" onClick={() => handleDelete('cache', selectedItem)} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>Limpar Cache</ListItemText>
          </MenuItem>
        ]}
      </Menu>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: null, item: null })}
        PaperProps={{ sx: { borderRadius: GLASS.radius.card, background: GLASS.surface.bgStrong, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
          </Typography>
          {deleteDialog.item && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Item:</strong> {
                deleteDialog.type === 'user' ? deleteDialog.item.email :
                deleteDialog.type === 'client' ? deleteDialog.item.name :
                deleteDialog.type === 'post' ? `Post de ${deleteDialog.item.client_name}` :
                deleteDialog.type === 'cache' ? `Cache de ${deleteDialog.item.clients?.name}` :
                'Item selecionado'
              }
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: null, item: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={16} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Alteração de Role */}
      <Dialog
        open={roleDialog.open}
        onClose={() => setRoleDialog({ open: false, user: null, newRole: 'user' })}
        PaperProps={{ sx: { borderRadius: GLASS.radius.card, background: GLASS.surface.bgStrong, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShieldIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
            Alterar Role do Usuário
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Alterar role de: <strong>{roleDialog.user?.email}</strong>
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nova Role</InputLabel>
            <Select
              value={roleDialog.newRole}
              label="Nova Role"
              onChange={(e) => setRoleDialog(prev => ({ ...prev, newRole: e.target.value as UserRole }))}
            >
              <MenuItem value="user">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  User - Acesso básico
                </Box>
              </MenuItem>
              <MenuItem value="moderator">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SupervisorIcon sx={{ mr: 1 }} />
                  Moderator - Acesso intermediário
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminIcon sx={{ mr: 1 }} />
                  Admin - Acesso total
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ open: false, user: null, newRole: 'user' })}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmRoleChange} 
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark }, borderRadius: GLASS.radius.button }}
          >
            {loading ? <CircularProgress size={16} /> : 'Alterar Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Criar/Editar Usuário */}
      <Dialog
        open={userDialog.open}
        onClose={() => setUserDialog({ open: false, mode: 'create', user: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: GLASS.radius.card, background: GLASS.surface.bgStrong, backdropFilter: `blur(${GLASS.surface.blur})`, boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}` } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonAddIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
            {userDialog.mode === 'create' ? 'Criar Novo Usuário' : 'Editar Usuário'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {formErrors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.general}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
            error={!!formErrors.email}
            helperText={formErrors.email}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            fullWidth
            label={userDialog.mode === 'create' ? 'Senha' : 'Nova Senha (deixe vazio para manter)'}
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
            error={!!formErrors.password}
            helperText={formErrors.password}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Nome Completo"
            value={userForm.full_name}
            onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
            error={!!formErrors.full_name}
            helperText={formErrors.full_name}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              label="Role"
              onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
            >
              <MenuItem value="user">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  User - Acesso básico
                </Box>
              </MenuItem>
              <MenuItem value="moderator">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SupervisorIcon sx={{ mr: 1 }} />
                  Moderator - Acesso intermediário
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminIcon sx={{ mr: 1 }} />
                  Admin - Acesso total
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialog({ open: false, mode: 'create', user: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveUser} 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
            sx={{ bgcolor: GLASS.accent.orange, '&:hover': { bgcolor: GLASS.accent.orangeDark }, borderRadius: GLASS.radius.button }}
          >
            {loading ? <CircularProgress size={16} /> : 
             userDialog.mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSettings;
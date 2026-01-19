import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Divider,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  CreditCard as CreditCardIcon,
  WorkspacePremium as PlanIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Services
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscriptionService, 
  Organization, 
  Subscription, 
  SubscriptionPlan,
  SubscriptionUsage 
} from '../services/subscriptionService';

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeSubscriptions: 0,
    availablePlans: 0
  });

  // Data states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Dialog states - Organizations
  const [orgDialog, setOrgDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    organization: Organization | null;
  }>({ open: false, mode: 'create', organization: null });

  const [orgForm, setOrgForm] = useState<Partial<Organization>>({
    name: '',
    email: '',
    phone: '',
    document: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'BR',
    active: true
  });

  // Dialog states - Subscriptions
  const [subDialog, setSubDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    subscription: Subscription | null;
  }>({ open: false, mode: 'create', subscription: null });

  const [subForm, setSubForm] = useState<Partial<Subscription>>({
    organization_id: '',
    plan_id: '',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Dialog states - Plans
  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    plan: SubscriptionPlan | null;
  }>({ open: false, mode: 'create', plan: null });

  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({
    name: '',
    amount: 0,
    currency: 'brl',
    interval: 'month',
    max_profiles: 1,
    max_clients: 1,
    max_posts_per_month: 10,
    active: true,
    features: {}
  });

  // Menu anchor
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'organization' | 'subscription' | 'plan' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsData, orgsData, subsData, plansData] = await Promise.all([
        subscriptionService.getGlobalStats(),
        subscriptionService.getAllOrganizations(),
        subscriptionService.getAllSubscriptions(),
        subscriptionService.getAllPlans()
      ]);

      // Buscar uso para cada subscription
      const subsWithUsage = await Promise.all(
        subsData.map(async (sub) => {
          const usage = await subscriptionService.getUsageByOrganization(sub.organization_id);
          return { ...sub, usage: usage || undefined };
        })
      );

      setStats(statsData);
      setOrganizations(orgsData);
      setSubscriptions(subsWithUsage);
      setPlans(plansData);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Organization handlers
  const handleCreateOrg = () => {
    setOrgForm({
      name: '',
      email: '',
      phone: '',
      document: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'BR',
      active: true
    });
    setOrgDialog({ open: true, mode: 'create', organization: null });
  };

  const handleEditOrg = (org: Organization) => {
    setOrgForm(org);
    setOrgDialog({ open: true, mode: 'edit', organization: org });
  };

  const handleSaveOrg = async () => {
    setLoading(true);
    try {
      if (orgDialog.mode === 'create') {
        await subscriptionService.createOrganization(orgForm);
      } else if (orgDialog.organization) {
        await subscriptionService.updateOrganization(orgDialog.organization.id, orgForm);
      }
      await loadAllData();
      setOrgDialog({ open: false, mode: 'create', organization: null });
    } catch (error: any) {
      console.error('❌ Erro ao salvar organização:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setDeleteDialog({
      open: true,
      type: 'organization',
      id: orgId,
      name: org?.name || 'esta organização'
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    setLoading(true);
    try {
      switch (deleteDialog.type) {
        case 'organization':
          await subscriptionService.deleteOrganization(deleteDialog.id);
          break;
        case 'subscription':
          await subscriptionService.deleteSubscription(deleteDialog.id);
          break;
        case 'plan':
          await subscriptionService.deletePlan(deleteDialog.id);
          break;
      }
      await loadAllData();
      setDeleteDialog({ open: false, type: null, id: null, name: '' });
    } catch (error: any) {
      console.error('❌ Erro ao deletar:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Subscription handlers
  const handleCreateSub = () => {
    setSubForm({
      organization_id: '',
      plan_id: '',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    setSubDialog({ open: true, mode: 'create', subscription: null });
  };

  const handleEditSub = (sub: Subscription) => {
    // Filtrar apenas campos editáveis (remover organization e plan que são JOINs)
    const editableFields: Partial<Subscription> = {
      organization_id: sub.organization_id,
      plan_id: sub.plan_id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      trial_start: sub.trial_start,
      trial_end: sub.trial_end,
      stripe_subscription_id: sub.stripe_subscription_id,
      stripe_customer_id: sub.stripe_customer_id
    };
    setSubForm(editableFields);
    setSubDialog({ open: true, mode: 'edit', subscription: sub });
  };

  const handleSaveSub = async () => {
    setLoading(true);
    try {
      // Filtrar apenas campos editáveis (remover campos undefined e JOINs)
      const cleanForm: Partial<Subscription> = {
        organization_id: subForm.organization_id,
        plan_id: subForm.plan_id,
        status: subForm.status,
        current_period_start: subForm.current_period_start,
        current_period_end: subForm.current_period_end,
        cancel_at_period_end: subForm.cancel_at_period_end,
        canceled_at: subForm.canceled_at || null,
        trial_start: subForm.trial_start || null,
        trial_end: subForm.trial_end || null,
        stripe_subscription_id: subForm.stripe_subscription_id || null,
        stripe_customer_id: subForm.stripe_customer_id || null
      };

      // Remover campos undefined
      Object.keys(cleanForm).forEach(key => {
        if (cleanForm[key as keyof Subscription] === undefined) {
          delete cleanForm[key as keyof Subscription];
        }
      });

      if (subDialog.mode === 'create') {
        await subscriptionService.createSubscription(cleanForm);
      } else if (subDialog.subscription) {
        await subscriptionService.updateSubscription(subDialog.subscription.id, cleanForm);
      }
      await loadAllData();
      setSubDialog({ open: false, mode: 'create', subscription: null });
    } catch (error: any) {
      console.error('❌ Erro ao salvar subscription:', error);
      alert(`Erro: ${error.message || 'Erro ao salvar subscription'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSub = (subId: string) => {
    const sub = subscriptions.find(s => s.id === subId);
    const orgName = (sub?.organization as any)?.name || 'esta subscription';
    setDeleteDialog({
      open: true,
      type: 'subscription',
      id: subId,
      name: orgName
    });
  };

  // Plan handlers
  const handleCreatePlan = () => {
    setPlanForm({
      name: '',
      amount: 0,
      currency: 'brl',
      interval: 'month',
      max_profiles: 1,
      max_clients: 1,
      max_posts_per_month: 10,
      active: true,
      features: {}
    });
    setPlanDialog({ open: true, mode: 'create', plan: null });
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setPlanForm(plan);
    setPlanDialog({ open: true, mode: 'edit', plan });
  };

  const handleSavePlan = async () => {
    setLoading(true);
    try {
      if (planDialog.mode === 'create') {
        await subscriptionService.createPlan(planForm);
      } else if (planDialog.plan) {
        await subscriptionService.updatePlan(planDialog.plan.id, planForm);
      }
      await loadAllData();
      setPlanDialog({ open: false, mode: 'create', plan: null });
    } catch (error: any) {
      console.error('❌ Erro ao salvar plano:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setDeleteDialog({
      open: true,
      type: 'plan',
      id: planId,
      name: plan?.name || 'este plano'
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/super-admin/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'canceled': return 'default';
      case 'past_due': return 'warning';
      case 'trialing': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Super Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerenciamento global do sistema INSYT
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadAllData}
            disabled={loading}
            variant="outlined"
          >
            Atualizar
          </Button>
          <Button
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            variant="outlined"
            color="error"
          >
            Sair
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalOrganizations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Organizações
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.activeSubscriptions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subscriptions Ativas
                  </Typography>
                </Box>
                <CreditCardIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.availablePlans}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Planos Disponíveis
                  </Typography>
                </Box>
                <PlanIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<BusinessIcon />} label="Organizações" />
          <Tab icon={<CreditCardIcon />} label="Subscriptions" />
          <Tab icon={<PlanIcon />} label="Planos" />
        </Tabs>

        {/* Tab 1: Organizations */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" sx={{ flexGrow: 1, mr: 2 }}>
              Gerencie todas as organizações do sistema
            </Alert>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOrg}
            >
              Nova Organização
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>{org.name}</TableCell>
                    <TableCell>{org.email || '-'}</TableCell>
                    <TableCell>{org.document || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={org.active ? 'Ativa' : 'Inativa'}
                        color={org.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(org.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditOrg(org)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOrg(org.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Subscriptions */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" sx={{ flexGrow: 1, mr: 2 }}>
              Gerencie subscriptions de todas as organizações
            </Alert>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateSub}
            >
              Nova Subscription
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Organização</TableCell>
                  <TableCell>Plano</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uso / Limites</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((sub) => {
                  const plan = sub.plan as SubscriptionPlan | undefined;
                  const usage = sub.usage;
                  const maxProfiles = plan?.max_profiles || 0;
                  const maxClients = plan?.max_clients || 0;
                  const maxPosts = plan?.max_posts_per_month || 0;
                  const profilesUsed = usage?.profiles_count || 0;
                  const clientsUsed = usage?.clients_count || 0;
                  const postsUsed = usage?.posts_count || 0;
                  
                  const profilesPercent = maxProfiles > 0 ? (profilesUsed / maxProfiles) * 100 : 0;
                  const clientsPercent = maxClients > 0 ? (clientsUsed / maxClients) * 100 : 0;
                  const postsPercent = maxPosts > 0 ? (postsUsed / maxPosts) * 100 : 0;

                  const isExpired = new Date(sub.current_period_end) < new Date();
                  const daysUntilExpiry = Math.ceil((new Date(sub.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {(sub.organization as any)?.name || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(sub.plan as any)?.name || '-'}
                          color="primary"
                          size="small"
                          variant="outlined"
                          sx={{
                            '& .MuiChip-label': {
                              color: 'rgba(255, 255, 255, 1)'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status}
                          color={getStatusColor(sub.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ minWidth: 250 }}>
                          {/* Profiles */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Profiles:
                              </Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {profilesUsed} / {maxProfiles}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(profilesPercent, 100)}
                              color={profilesPercent >= 90 ? 'error' : profilesPercent >= 70 ? 'warning' : 'primary'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>

                          {/* Clients */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Clients:
                              </Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {clientsUsed} / {maxClients}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(clientsPercent, 100)}
                              color={clientsPercent >= 90 ? 'error' : clientsPercent >= 70 ? 'warning' : 'primary'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>

                          {/* Posts */}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Posts/mês:
                              </Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {postsUsed} / {maxPosts}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(postsPercent, 100)}
                              color={postsPercent >= 90 ? 'error' : postsPercent >= 70 ? 'warning' : 'primary'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={isExpired ? 'error.main' : daysUntilExpiry <= 7 ? 'warning.main' : 'text.primary'}
                          >
                            {format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isExpired 
                              ? 'Vencida' 
                              : daysUntilExpiry === 0 
                                ? 'Vence hoje' 
                                : daysUntilExpiry === 1 
                                  ? 'Vence amanhã'
                                  : `${daysUntilExpiry} dias restantes`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditSub(sub)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSub(sub.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 3: Plans */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Alert severity="info" sx={{ flexGrow: 1, mr: 2 }}>
              Gerencie planos de assinatura disponíveis
            </Alert>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePlan}
            >
              Novo Plano
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Preço</TableCell>
                  <TableCell>Profiles</TableCell>
                  <TableCell>Clients</TableCell>
                  <TableCell>Posts/mês</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>
                      R$ {(plan.amount / 100).toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell>{plan.max_profiles}</TableCell>
                    <TableCell>{plan.max_clients}</TableCell>
                    <TableCell>{plan.max_posts_per_month}</TableCell>
                    <TableCell>
                      <Chip
                        label={plan.active ? 'Ativo' : 'Inativo'}
                        color={plan.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditPlan(plan)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePlan(plan.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Dialog: Organization */}
      <Dialog open={orgDialog.open} onClose={() => setOrgDialog({ open: false, mode: 'create', organization: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {orgDialog.mode === 'create' ? 'Nova Organização' : 'Editar Organização'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={orgForm.email}
            onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Telefone"
            value={orgForm.phone}
            onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="CNPJ/CPF"
            value={orgForm.document}
            onChange={(e) => setOrgForm({ ...orgForm, document: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Endereço"
            value={orgForm.address}
            onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
            margin="normal"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Cidade"
                value={orgForm.city}
                onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Estado"
                value={orgForm.state}
                onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                margin="normal"
              />
            </Grid>
          </Grid>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={orgForm.active ? 'active' : 'inactive'}
              label="Status"
              onChange={(e) => setOrgForm({ ...orgForm, active: e.target.value === 'active' })}
            >
              <MenuItem value="active">Ativa</MenuItem>
              <MenuItem value="inactive">Inativa</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialog({ open: false, mode: 'create', organization: null })}>
            Cancelar
          </Button>
          <Button onClick={handleSaveOrg} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Subscription */}
      <Dialog open={subDialog.open} onClose={() => setSubDialog({ open: false, mode: 'create', subscription: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {subDialog.mode === 'create' ? 'Nova Subscription' : 'Editar Subscription'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Organização</InputLabel>
            <Select
              value={subForm.organization_id}
              label="Organização"
              onChange={(e) => setSubForm({ ...subForm, organization_id: e.target.value })}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Plano</InputLabel>
            <Select
              value={subForm.plan_id}
              label="Plano"
              onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}
            >
              {plans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name} - R$ {(plan.amount / 100).toFixed(2).replace('.', ',')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Status</InputLabel>
            <Select
              value={subForm.status}
              label="Status"
              onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
            >
              <MenuItem value="active">Ativa</MenuItem>
              <MenuItem value="canceled">Cancelada</MenuItem>
              <MenuItem value="past_due">Vencida</MenuItem>
              <MenuItem value="trialing">Teste</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Início do Período"
            type="datetime-local"
            value={subForm.current_period_start ? new Date(subForm.current_period_start).toISOString().slice(0, 16) : ''}
            onChange={(e) => setSubForm({ ...subForm, current_period_start: new Date(e.target.value).toISOString() })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Fim do Período"
            type="datetime-local"
            value={subForm.current_period_end ? new Date(subForm.current_period_end).toISOString().slice(0, 16) : ''}
            onChange={(e) => setSubForm({ ...subForm, current_period_end: new Date(e.target.value).toISOString() })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubDialog({ open: false, mode: 'create', subscription: null })}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSub} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Plan */}
      <Dialog open={planDialog.open} onClose={() => setPlanDialog({ open: false, mode: 'create', plan: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {planDialog.mode === 'create' ? 'Novo Plano' : 'Editar Plano'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome"
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Preço (em centavos)"
            type="number"
            value={planForm.amount}
            onChange={(e) => setPlanForm({ ...planForm, amount: parseInt(e.target.value) })}
            margin="normal"
            required
            helperText="Ex: 4900 = R$ 49,00"
          />
          <TextField
            fullWidth
            label="Stripe Price ID"
            value={planForm.stripe_price_id || ''}
            onChange={(e) => setPlanForm({ ...planForm, stripe_price_id: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Máximo de Profiles"
            type="number"
            value={planForm.max_profiles}
            onChange={(e) => setPlanForm({ ...planForm, max_profiles: parseInt(e.target.value) })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Máximo de Clients"
            type="number"
            value={planForm.max_clients}
            onChange={(e) => setPlanForm({ ...planForm, max_clients: parseInt(e.target.value) })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Máximo de Posts por Mês"
            type="number"
            value={planForm.max_posts_per_month}
            onChange={(e) => setPlanForm({ ...planForm, max_posts_per_month: parseInt(e.target.value) })}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Intervalo</InputLabel>
            <Select
              value={planForm.interval}
              label="Intervalo"
              onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })}
            >
              <MenuItem value="month">Mensal</MenuItem>
              <MenuItem value="year">Anual</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={planForm.active ? 'active' : 'inactive'}
              label="Status"
              onChange={(e) => setPlanForm({ ...planForm, active: e.target.value === 'active' })}
            >
              <MenuItem value="active">Ativo</MenuItem>
              <MenuItem value="inactive">Inativo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialog({ open: false, mode: 'create', plan: null })}>
            Cancelar
          </Button>
          <Button onClick={handleSavePlan} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: null, id: null, name: '' })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar <strong>{deleteDialog.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: null, id: null, name: '' })}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Deletar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SuperAdminDashboard;

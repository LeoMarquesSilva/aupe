// Super Admin — Liberações manuais por organização.
// Permite:
//   • Escolher uma organização cadastrada.
//   • Ver (ou criar) a subscription ativa, trocar o plano e estender a vigência.
//   • Conceder / atualizar quantidade / revogar add-ons manualmente (cortesia),
//     sem passar pelo Stripe (útil para clientes internos, parceiros, testes).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddCircle as AddCircleIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { addonService, Addon, ActiveAddonItem } from '../../services/addonService';
import {
  subscriptionService,
  Organization,
  Subscription,
  SubscriptionPlan,
} from '../../services/subscriptionService';
import { GLASS } from '../../theme/glassTokens';

const formatBRL = (cents: number): string =>
  `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

interface LiberationsTabProps {
  organizations: Organization[];
  plans: SubscriptionPlan[];
  onAnyChange?: () => void;
}

const LiberationsTab: React.FC<LiberationsTabProps> = ({
  organizations,
  plans,
  onAnyChange,
}) => {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [addonItems, setAddonItems] = useState<ActiveAddonItem[]>([]);
  const [catalog, setCatalog] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [subForm, setSubForm] = useState<{
    plan_id: string;
    status: string;
    current_period_end: string;
  }>({ plan_id: '', status: 'active', current_period_end: '' });

  const [grantForm, setGrantForm] = useState<{ addonId: string; qty: number }>({
    addonId: '',
    qty: 1,
  });

  const loadCatalog = useCallback(async () => {
    try {
      const data = await addonService.getAllAddons();
      setCatalog(data.filter((a) => a.active));
    } catch (e: any) {
      console.error('[LiberationsTab] catálogo de add-ons:', e);
    }
  }, []);

  const loadForOrg = useCallback(async (org: Organization | null) => {
    if (!org) {
      setSubscription(null);
      setAddonItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const sub = await subscriptionService.getSubscriptionByOrganization(org.id);
      setSubscription(sub);

      if (sub) {
        setSubForm({
          plan_id: sub.plan_id,
          status: sub.status,
          current_period_end: toDateInput(sub.current_period_end),
        });
        const items = await addonService.getAllAddonItems(sub.id);
        setAddonItems(items);
      } else {
        setSubForm({ plan_id: '', status: 'active', current_period_end: '' });
        setAddonItems([]);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados da organização');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadForOrg(selectedOrg);
  }, [selectedOrg, loadForOrg]);

  const planById = useMemo(() => {
    const m = new Map<string, SubscriptionPlan>();
    plans.forEach((p) => m.set(p.id, p));
    return m;
  }, [plans]);

  const currentPlan = subscription ? planById.get(subscription.plan_id) : null;

  const availableAddonsForGrant = useMemo(() => {
    const currentPlanCode = currentPlan?.plan_code || null;
    return catalog.filter(
      (a) => !a.scope_plan_code || a.scope_plan_code === currentPlanCode,
    );
  }, [catalog, currentPlan]);

  const handleCreateSubscription = async () => {
    if (!selectedOrg || !subForm.plan_id) return;
    setSavingSub(true);
    setError(null);
    setInfo(null);
    try {
      const now = new Date();
      const end = subForm.current_period_end
        ? new Date(subForm.current_period_end)
        : addDays(now, 30);
      const created = await subscriptionService.createSubscription({
        organization_id: selectedOrg.id,
        plan_id: subForm.plan_id,
        status: (subForm.status as any) || 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
      });
      setSubscription(created);
      setInfo('Subscription criada com sucesso (liberação manual).');
      onAnyChange?.();
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar subscription');
    } finally {
      setSavingSub(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!subscription) return;
    setSavingSub(true);
    setError(null);
    setInfo(null);
    try {
      await subscriptionService.updateSubscription(subscription.id, {
        plan_id: subForm.plan_id,
        status: subForm.status as any,
        current_period_end: subForm.current_period_end
          ? new Date(subForm.current_period_end).toISOString()
          : subscription.current_period_end,
      });
      setInfo('Subscription atualizada.');
      onAnyChange?.();
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar subscription');
    } finally {
      setSavingSub(false);
    }
  };

  const extendDays = async (days: number) => {
    if (!subscription) return;
    const base = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : new Date();
    const newEnd = addDays(base, days);
    setSubForm((s) => ({ ...s, current_period_end: toDateInput(newEnd.toISOString()) }));
    try {
      await subscriptionService.updateSubscription(subscription.id, {
        current_period_end: newEnd.toISOString(),
        status: 'active',
      });
      setInfo(`Vigência estendida em ${days} dias.`);
      onAnyChange?.();
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao estender vigência');
    }
  };

  const handleGrant = async () => {
    if (!subscription || !grantForm.addonId) return;
    try {
      await addonService.adminGrantAddon(
        subscription.id,
        grantForm.addonId,
        Math.max(1, Number(grantForm.qty) || 1),
      );
      setInfo('Add-on liberado com sucesso.');
      setGrantForm({ addonId: '', qty: 1 });
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao liberar add-on');
    }
  };

  const handleUpdateQty = async (item: ActiveAddonItem, delta: number) => {
    try {
      await addonService.adminUpdateAddonItem(item.id, item.quantity + delta);
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar quantidade');
    }
  };

  const handleRevoke = async (item: ActiveAddonItem) => {
    if (!window.confirm(`Revogar ${item.addon?.name || 'add-on'}?`)) return;
    try {
      await addonService.adminRevokeAddonItem(item.id);
      setInfo('Add-on revogado.');
      await loadForOrg(selectedOrg);
    } catch (e: any) {
      setError(e.message || 'Erro ao revogar add-on');
    }
  };

  const activeItems = addonItems.filter((i) => i.status === 'active');
  const historyItems = addonItems.filter((i) => i.status !== 'active');

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Liberações manuais (cortesia / clientes internos / suporte).
        Operações aqui <strong>não</strong> passam pelo Stripe — são aplicadas diretamente na
        subscription e nos add-ons da organização. Use para estender vigência, liberar
        features ou ajustar limites sem cobrar.
      </Alert>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          border: `1px solid ${GLASS.border.outer}`,
          borderRadius: GLASS.radius.card,
          background: GLASS.surface.bg,
          backdropFilter: `blur(${GLASS.surface.blur})`,
        }}
      >
        <Autocomplete
          options={organizations}
          getOptionLabel={(o) => `${o.name}${o.email ? ` · ${o.email}` : ''}`}
          value={selectedOrg}
          onChange={(_, v) => setSelectedOrg(v)}
          renderInput={(params) => (
            <TextField {...params} label="Organização" placeholder="Busque por nome ou e-mail" />
          )}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      {!selectedOrg ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Selecione uma organização para começar.
        </Typography>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* BLOCO: Subscription */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              border: `1px solid ${GLASS.border.outer}`,
              borderRadius: GLASS.radius.card,
              background: GLASS.surface.bg,
              backdropFilter: `blur(${GLASS.surface.blur})`,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: GLASS.text.heading }}>
              Assinatura da organização
            </Typography>

            {!subscription ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Esta organização não tem uma subscription ativa. Você pode liberar uma
                  manualmente escolhendo um plano abaixo.
                </Alert>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Plano</InputLabel>
                      <Select
                        value={subForm.plan_id}
                        label="Plano"
                        onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}
                      >
                        {plans.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} — {formatBRL(p.amount)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Vigência até"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={subForm.current_period_end}
                      onChange={(e) =>
                        setSubForm({ ...subForm, current_period_end: e.target.value })
                      }
                      helperText="Padrão: hoje + 30 dias"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={!subForm.plan_id || savingSub}
                      onClick={handleCreateSubscription}
                      sx={{
                        bgcolor: GLASS.accent.orange,
                        '&:hover': { bgcolor: GLASS.accent.orangeDark },
                        borderRadius: GLASS.radius.button,
                        height: 56,
                      }}
                    >
                      {savingSub ? <CircularProgress size={22} /> : 'Liberar subscription'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Plano</InputLabel>
                      <Select
                        value={subForm.plan_id}
                        label="Plano"
                        onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}
                      >
                        {plans.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} — {formatBRL(p.amount)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={subForm.status}
                        label="Status"
                        onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                      >
                        <MenuItem value="active">Ativa</MenuItem>
                        <MenuItem value="trialing">Trial</MenuItem>
                        <MenuItem value="past_due">Vencida</MenuItem>
                        <MenuItem value="canceled">Cancelada</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Vigência até"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={subForm.current_period_end}
                      onChange={(e) =>
                        setSubForm({ ...subForm, current_period_end: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSubscription}
                      disabled={savingSub}
                      sx={{
                        bgcolor: GLASS.accent.orange,
                        '&:hover': { bgcolor: GLASS.accent.orangeDark },
                        borderRadius: GLASS.radius.button,
                        height: 56,
                      }}
                    >
                      {savingSub ? <CircularProgress size={22} /> : 'Salvar alterações'}
                    </Button>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ alignSelf: 'center', mr: 1 }}>
                    Atalhos de vigência:
                  </Typography>
                  {[7, 15, 30, 60, 90].map((d) => (
                    <Button
                      key={d}
                      size="small"
                      variant="outlined"
                      onClick={() => extendDays(d)}
                      sx={{
                        borderColor: GLASS.accent.orange,
                        color: GLASS.accent.orange,
                        borderRadius: GLASS.radius.button,
                      }}
                    >
                      +{d} dias
                    </Button>
                  ))}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Stripe sub: ${subscription.stripe_subscription_id || 'manual'}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Stripe customer: ${subscription.stripe_customer_id || 'manual'}`}
                    size="small"
                    variant="outlined"
                  />
                  {currentPlan?.plan_code && (
                    <Chip
                      label={`plan_code: ${currentPlan.plan_code}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* BLOCO: Add-ons */}
          {subscription && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                border: `1px solid ${GLASS.border.outer}`,
                borderRadius: GLASS.radius.card,
                background: GLASS.surface.bg,
                backdropFilter: `blur(${GLASS.surface.blur})`,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, color: GLASS.text.heading }}>
                Add-ons liberados
              </Typography>

              <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={7}>
                  <FormControl fullWidth>
                    <InputLabel>Add-on</InputLabel>
                    <Select
                      value={grantForm.addonId}
                      label="Add-on"
                      onChange={(e) => setGrantForm({ ...grantForm, addonId: e.target.value })}
                    >
                      {availableAddonsForGrant.length === 0 && (
                        <MenuItem value="" disabled>
                          Nenhum add-on disponível para o plano atual
                        </MenuItem>
                      )}
                      {availableAddonsForGrant.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              label={a.type === 'feature' ? 'Feature' : 'Conta extra'}
                              color={a.type === 'feature' ? 'secondary' : 'primary'}
                              variant="outlined"
                            />
                            <span>{a.name}</span>
                            <Typography variant="caption" color="text.secondary">
                              · {formatBRL(a.amount)}/mês
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={grantForm.qty}
                    onChange={(e) =>
                      setGrantForm({ ...grantForm, qty: parseInt(e.target.value) || 1 })
                    }
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    disabled={!grantForm.addonId}
                    onClick={handleGrant}
                    sx={{
                      bgcolor: GLASS.accent.orange,
                      '&:hover': { bgcolor: GLASS.accent.orangeDark },
                      borderRadius: GLASS.radius.button,
                      height: 56,
                    }}
                  >
                    Liberar add-on
                  </Button>
                </Grid>
              </Grid>

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Add-on</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Qtd</TableCell>
                      <TableCell>Origem</TableCell>
                      <TableCell>Valor mensal</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Nenhum add-on ativo.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeItems.map((i) => {
                        const isManual = (i.stripe_subscription_item_id || '').startsWith('manual:');
                        const addon = i.addon;
                        return (
                          <TableRow key={i.id}>
                            <TableCell>
                              <Stack>
                                <Typography variant="body2">{addon?.name || '—'}</Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontFamily: 'monospace' }}
                                >
                                  {addon?.code}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={addon?.type === 'feature' ? 'Feature' : 'Conta extra'}
                                color={addon?.type === 'feature' ? 'secondary' : 'primary'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconButton
                                  size="small"
                                  disabled={i.quantity <= 1}
                                  onClick={() => handleUpdateQty(i, -1)}
                                >
                                  −
                                </IconButton>
                                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>
                                  {i.quantity}
                                </Typography>
                                <IconButton size="small" onClick={() => handleUpdateQty(i, +1)}>
                                  +
                                </IconButton>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={isManual ? 'Cortesia' : 'Stripe'}
                                color={isManual ? 'warning' : 'info'}
                                variant={isManual ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                            <TableCell>
                              {addon ? formatBRL(addon.amount * i.quantity) : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Revogar">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRevoke(i)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {historyItems.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: GLASS.text.muted }}>
                    Histórico (revogados / cancelados)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Add-on</TableCell>
                          <TableCell>Qtd</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Atualizado em</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyItems.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell>{i.addon?.name || '—'}</TableCell>
                            <TableCell>{i.quantity}</TableCell>
                            <TableCell>
                              <Chip size="small" label={i.status} />
                            </TableCell>
                            <TableCell>
                              {(i as any).updated_at
                                ? new Date((i as any).updated_at).toLocaleString('pt-BR')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default LiberationsTab;

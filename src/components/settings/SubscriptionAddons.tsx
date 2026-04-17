// SubscriptionAddons - UI para gerenciar add-ons em cima de uma subscription ativa
// INSYT - Instagram Scheduler

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import BoltIcon from '@mui/icons-material/Bolt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link as RouterLink } from 'react-router-dom';
import { GLASS } from '../../theme/glassTokens';
import { Subscription } from '../../services/subscriptionService';
import {
  Addon,
  ActiveAddonItem,
  addonService,
} from '../../services/addonService';
import { formatBRL } from '../../config/stripeProducts';
import { planIncludesApprovalFlow } from '../../config/planPresentation';

interface Props {
  subscription: Subscription | null;
  onUpdated?: () => void;
}

const premiumCardSx = {
  background: GLASS.surface.bg,
  backdropFilter: `blur(${GLASS.surface.blur})`,
  border: `1px solid ${GLASS.border.outer}`,
  borderRadius: GLASS.radius.card,
  boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
};

const SubscriptionAddons: React.FC<Props> = ({ subscription, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<Addon[]>([]);
  const [active, setActive] = useState<ActiveAddonItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quantidade "em edição" de Conta Adicional (mostra delta em relação ao que está ativo)
  const [extraAccountQty, setExtraAccountQty] = useState<number>(0);
  // Estado desejado do Fluxo de Aprovação (toggle)
  const [fluxoAprovacaoEnabled, setFluxoAprovacaoEnabled] = useState<boolean>(false);

  const planCode: string | null = (subscription?.plan as any)?.plan_code || null;
  const isLegacy = !planCode || planCode === 'LEGACY';
  const subscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const canManage = Boolean(
    subscription && subscriptionActive && !isLegacy && subscription.stripe_subscription_id,
  );
  // Fluxo de Aprovação já está incluso nos planos pagos (BASIC+); só é add-on
  // opcional no STARTER. Esta flag controla a renderização do card de Fluxo.
  const isFluxoIncludedInPlan = planIncludesApprovalFlow(planCode);

  const load = useCallback(async () => {
    if (!subscription) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [avail, act] = await Promise.all([
        addonService.getAvailableAddons(planCode),
        addonService.getActiveAddons(subscription.id),
      ]);
      setAvailable(avail);
      setActive(act);

      // Hidratar estado inicial
      const extraActive = act.find((a) => a.addon.type === 'extra_account');
      setExtraAccountQty(extraActive?.quantity ?? 0);
      const fluxoActive = act.find((a) => a.addon.feature_flag === 'fluxo_aprovacao');
      setFluxoAprovacaoEnabled(Boolean(fluxoActive));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao carregar add-ons');
    } finally {
      setLoading(false);
    }
  }, [subscription, planCode]);

  useEffect(() => {
    load();
  }, [load]);

  const extraAccountAddon = useMemo(
    () => available.find((a) => a.type === 'extra_account' && a.scope_plan_code === planCode),
    [available, planCode],
  );
  const fluxoAddon = useMemo(
    () => available.find((a) => a.feature_flag === 'fluxo_aprovacao'),
    [available],
  );

  const activeExtraQty = useMemo(() => {
    const ea = active.find((a) => a.addon.type === 'extra_account');
    return ea?.quantity ?? 0;
  }, [active]);

  const fluxoCurrentlyActive = useMemo(
    () => Boolean(active.find((a) => a.addon.feature_flag === 'fluxo_aprovacao')),
    [active],
  );

  const hasChanges =
    extraAccountQty !== activeExtraQty ||
    (!isFluxoIncludedInPlan && fluxoAprovacaoEnabled !== fluxoCurrentlyActive);

  const extraSubtotal = (extraAccountAddon?.amount || 0) * extraAccountQty;
  const fluxoSubtotal = fluxoAprovacaoEnabled ? fluxoAddon?.amount || 0 : 0;

  const handleSave = async () => {
    if (!subscription || !canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Sincronizar Conta Adicional: se quantidade mudou, fazer update/remove
      if (extraAccountAddon && extraAccountQty !== activeExtraQty) {
        if (extraAccountQty === 0) {
          await addonService.removeAddon(subscription.id, extraAccountAddon.stripe_price_id);
        } else if (activeExtraQty === 0) {
          await addonService.addAddons(subscription.id, [
            { priceId: extraAccountAddon.stripe_price_id, quantity: extraAccountQty },
          ]);
        } else {
          await addonService.updateAddon(
            subscription.id,
            extraAccountAddon.stripe_price_id,
            extraAccountQty,
          );
        }
      }

      // Sincronizar Fluxo de Aprovação (toggle)
      if (fluxoAddon && fluxoAprovacaoEnabled !== fluxoCurrentlyActive) {
        if (fluxoAprovacaoEnabled) {
          await addonService.addAddons(subscription.id, [
            { priceId: fluxoAddon.stripe_price_id, quantity: 1 },
          ]);
        } else {
          await addonService.removeAddon(subscription.id, fluxoAddon.stripe_price_id);
        }
      }

      setSuccess('Add-ons atualizados. A próxima fatura já reflete a mudança (com pro-rata).');
      await load();
      onUpdated?.();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao atualizar add-ons');
    } finally {
      setSaving(false);
    }
  };

  if (!subscription) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Você precisa ter uma assinatura ativa para contratar add-ons.
      </Alert>
    );
  }

  if (isLegacy) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Seu plano é legado e não suporta contratação automática de add-ons pelo painel.
        Entre em contato com o time comercial para ajustar seu contrato.
      </Alert>
    );
  }

  if (!subscription.stripe_subscription_id) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Sua assinatura não está vinculada ao Stripe. Entre em contato com o suporte.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress sx={{ color: GLASS.accent.orange }} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      {/* Conta Adicional */}
      <Card elevation={0} sx={premiumCardSx}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <AccountCircleIcon sx={{ color: GLASS.accent.orange }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Conta Adicional
            </Typography>
            {planCode && <Chip size="small" label={planCode} />}
          </Stack>
          <Typography variant="body2" sx={{ color: GLASS.text.muted, mb: 2 }}>
            Cada conta adicional permite gerenciar mais um perfil Instagram. O valor varia por tier do plano.
          </Typography>

          {extraAccountAddon ? (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => setExtraAccountQty((v) => Math.max(0, v - 1))}
                    disabled={saving}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0, max: 99, style: { textAlign: 'center', width: 64 } }}
                    value={extraAccountQty}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n >= 0) setExtraAccountQty(Math.min(99, n));
                    }}
                    disabled={saving}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setExtraAccountQty((v) => Math.min(99, v + 1))}
                    disabled={saving}
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </Stack>

                <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                  {formatBRL(extraAccountAddon.amount)} por conta
                </Typography>

                <Box sx={{ flex: 1 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: GLASS.accent.orange }}>
                  Subtotal: {formatBRL(extraSubtotal)}
                  <Typography component="span" variant="caption" sx={{ color: GLASS.text.muted, ml: 0.5 }}>
                    /mês
                  </Typography>
                </Typography>
              </Stack>
              {activeExtraQty > 0 && (
                <Typography variant="caption" sx={{ color: GLASS.text.muted, mt: 1, display: 'block' }}>
                  Atualmente ativo: {activeExtraQty} conta(s).
                </Typography>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Conta Adicional não disponível para seu plano.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fluxo de Aprovação */}
      <Card elevation={0} sx={premiumCardSx}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <BoltIcon sx={{ color: GLASS.accent.orange }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Fluxo de Aprovação
            </Typography>
            {isFluxoIncludedInPlan ? (
              <Chip
                size="small"
                icon={<CheckCircleIcon />}
                label={`Incluso no plano ${planCode}`}
                sx={{
                  background: 'rgba(16,185,129,0.12)',
                  color: GLASS.status.connected.color,
                  border: `1px solid ${GLASS.status.connected.color}`,
                  fontWeight: 700,
                  '& .MuiChip-icon': { color: GLASS.status.connected.color },
                }}
              />
            ) : (
              fluxoCurrentlyActive && <Chip size="small" color="success" label="Ativo" />
            )}
          </Stack>
          <Typography variant="body2" sx={{ color: GLASS.text.muted, mb: 2 }}>
            Ative links de aprovação para seus clientes, quadro Kanban de revisões e solicitações de ajustes.
          </Typography>

          {isFluxoIncludedInPlan ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              spacing={2}
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(16,185,129,0.06)',
                border: `1px dashed ${GLASS.status.connected.color}`,
              }}
            >
              <CheckCircleIcon sx={{ color: GLASS.status.connected.color }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Ativo sem custo adicional
                </Typography>
                <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                  O Fluxo de Aprovação já está incluído no preço do plano {planCode}. Sem cobrança extra.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/approvals"
                variant="outlined"
                size="small"
                sx={{
                  textTransform: 'none',
                  borderColor: GLASS.status.connected.color,
                  color: GLASS.status.connected.color,
                  fontWeight: 700,
                  '&:hover': {
                    background: GLASS.status.connected.color,
                    color: '#fff',
                    borderColor: GLASS.status.connected.color,
                  },
                }}
              >
                Ir para Aprovações
              </Button>
            </Stack>
          ) : fluxoAddon ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
              <Switch
                checked={fluxoAprovacaoEnabled}
                onChange={(e) => setFluxoAprovacaoEnabled(e.target.checked)}
                disabled={saving}
              />
              <Typography variant="body2" sx={{ color: GLASS.text.muted }}>
                {formatBRL(fluxoAddon.amount)}/mês (valor fixo)
              </Typography>

              <Box sx={{ flex: 1 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: GLASS.accent.orange }}>
                Subtotal: {formatBRL(fluxoSubtotal)}
                <Typography component="span" variant="caption" sx={{ color: GLASS.text.muted, ml: 0.5 }}>
                  /mês
                </Typography>
              </Typography>
            </Stack>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Fluxo de Aprovação não está disponível no momento.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de add-ons ativos */}
      {active.length > 0 && (
        <Card elevation={0} sx={premiumCardSx}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Add-ons ativos nesta assinatura
            </Typography>
            <Stack divider={<Divider flexItem />} spacing={1.5}>
              {active.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ py: 0.5 }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {item.addon.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: GLASS.text.muted }}>
                      Quantidade: {item.quantity} • {formatBRL(item.addon.amount * item.quantity)}/mês
                    </Typography>
                  </Box>
                  <Tooltip title="Remover add-on">
                    <span>
                      <IconButton
                        onClick={async () => {
                          try {
                            setSaving(true);
                            await addonService.removeAddon(subscription.id, item.addon.stripe_price_id);
                            await load();
                            setSuccess('Add-on removido.');
                            onUpdated?.();
                          } catch (err: any) {
                            setError(err?.message || 'Erro ao remover add-on');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* CTA de salvar */}
      <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
        <Button
          variant="outlined"
          onClick={load}
          disabled={saving}
          sx={{
            textTransform: 'none',
            color: GLASS.text.muted,
            borderColor: GLASS.border.outer,
          }}
        >
          Descartar mudanças
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
          disabled={!hasChanges || saving || !canManage}
          onClick={handleSave}
          sx={{
            background: `linear-gradient(135deg, ${GLASS.accent.orange} 0%, ${GLASS.accent.orangeDark} 100%)`,
            color: '#fff',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: GLASS.radius.button,
            '&.Mui-disabled': { opacity: 0.6, color: '#fff' },
          }}
        >
          {saving ? 'Atualizando…' : 'Atualizar assinatura'}
        </Button>
      </Stack>
    </Stack>
  );
};

export default SubscriptionAddons;

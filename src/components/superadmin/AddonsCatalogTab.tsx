// Super Admin — Catálogo de Add-ons
// Lista todos os add-ons (Conta Adicional por plano + Fluxo de Aprovação)
// e permite editar metadados do catálogo (amount, stripe_price_id, stripe_product_id,
// feature_flag, active). NÃO altera o Stripe — é apenas o espelho local da oferta.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { addonService, Addon } from '../../services/addonService';
import { GLASS } from '../../theme/glassTokens';

const formatBRL = (cents: number): string =>
  `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

const AddonsCatalogTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<{ open: boolean; addon: Addon | null }>({
    open: false,
    addon: null,
  });
  const [form, setForm] = useState<Partial<Addon>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await addonService.getAllAddons();
      setAddons(data);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar catálogo de add-ons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (addon: Addon) => {
    setForm({ ...addon });
    setDialog({ open: true, addon });
  };

  const close = () => setDialog({ open: false, addon: null });

  const save = async () => {
    if (!dialog.addon) return;
    setSaving(true);
    try {
      await addonService.updateCatalogAddon(dialog.addon.id, {
        name: form.name,
        amount: Number(form.amount) || 0,
        stripe_price_id: form.stripe_price_id,
        stripe_product_id: form.stripe_product_id,
        feature_flag: form.feature_flag || null,
        scope_plan_code: form.scope_plan_code || null,
        active: !!form.active,
      });
      await load();
      close();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Alert severity="info" sx={{ flexGrow: 1, minWidth: 300 }}>
          Catálogo de add-ons (Conta Adicional por plano e Fluxo de Aprovação).
          Edição aqui não altera o Stripe — apenas o espelho local usado pela UI/checkout.
        </Alert>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={loading}
          variant="outlined"
          sx={{
            borderColor: GLASS.accent.orange,
            color: GLASS.accent.orange,
            borderRadius: GLASS.radius.button,
          }}
        >
          Atualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Escopo</TableCell>
              <TableCell>Preço</TableCell>
              <TableCell>Stripe Price ID</TableCell>
              <TableCell>Stripe Product ID</TableCell>
              <TableCell>Feature flag</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : addons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Nenhum add-on cadastrado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              addons.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {a.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={a.type === 'feature' ? 'Feature' : 'Conta extra'}
                      color={a.type === 'feature' ? 'secondary' : 'primary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{a.scope_plan_code || '—'}</TableCell>
                  <TableCell>{formatBRL(a.amount)}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {a.stripe_price_id || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {a.stripe_product_id || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{a.feature_flag || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={a.active ? 'Ativo' : 'Inativo'}
                      color={a.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(a)}
                      sx={{ color: GLASS.accent.orange }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialog.open}
        onClose={close}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            background: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blur})`,
          },
        }}
      >
        <DialogTitle>Editar add-on · {dialog.addon?.code}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Preço (em centavos)"
            type="number"
            value={form.amount ?? 0}
            onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
            margin="normal"
            helperText={`Equivale a ${formatBRL(Number(form.amount) || 0)}`}
          />
          <TextField
            fullWidth
            label="Stripe Price ID"
            value={form.stripe_price_id || ''}
            onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
            margin="normal"
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <TextField
            fullWidth
            label="Stripe Product ID"
            value={form.stripe_product_id || ''}
            onChange={(e) => setForm({ ...form, stripe_product_id: e.target.value })}
            margin="normal"
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Escopo (plano alvo)</InputLabel>
            <Select
              value={form.scope_plan_code || ''}
              label="Escopo (plano alvo)"
              onChange={(e) => setForm({ ...form, scope_plan_code: (e.target.value as string) || null })}
            >
              <MenuItem value="">Universal (sem escopo)</MenuItem>
              <MenuItem value="STARTER">STARTER</MenuItem>
              <MenuItem value="BASIC">BASIC</MenuItem>
              <MenuItem value="PRO">PRO</MenuItem>
              <MenuItem value="BUSINESS">BUSINESS</MenuItem>
              <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Feature flag (opcional)"
            value={form.feature_flag || ''}
            onChange={(e) => setForm({ ...form, feature_flag: e.target.value })}
            margin="normal"
            helperText="Ex: fluxo_aprovacao — consumido por useFeatureFlag() e FeatureGate"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Ativo no catálogo:
            </Typography>
            <Switch
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancelar</Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={saving}
            sx={{
              bgcolor: GLASS.accent.orange,
              '&:hover': { bgcolor: GLASS.accent.orangeDark },
              borderRadius: GLASS.radius.button,
            }}
          >
            {saving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddonsCatalogTab;

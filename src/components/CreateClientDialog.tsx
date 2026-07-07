import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { clientService } from '../services/supabaseClient';
import { subscriptionLimitsService } from '../services/subscriptionLimitsService';
import { clientLogoService } from '../services/clientLogoService';
import { Client } from '../types';
import { deriveInternalInstagramSlug } from '../utils/clientDisplay';
import ClientLogoField from './ClientLogoField';
import ClientLimitContactDialog from './ClientLimitContactDialog';
import { GLASS } from '../theme/glassTokens';

interface CreateClientDialogProps {
  open: boolean;
  onClose: () => void;
  onClientCreated: (client: Client) => void;
  /** Quando true, não abre OAuth após criar (fluxo só aprovação). */
  approvalOnly?: boolean;
}

const CreateClientDialog: React.FC<CreateClientDialogProps> = ({
  open,
  onClose,
  onClientCreated,
  approvalOnly = true,
}) => {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ current: 0, max: 0 });

  useEffect(() => {
    if (open) {
      setName('');
      setLogoFile(null);
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nome do cliente é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const limitCheck = await subscriptionLimitsService.canCreateClient();
      if (!limitCheck.allowed) {
        if (limitCheck.contactRequired && limitCheck.limits) {
          setLimitInfo({
            current: limitCheck.limits.currentClients,
            max: limitCheck.limits.maxClients,
          });
          setLimitDialogOpen(true);
        } else {
          setError(limitCheck.message || 'Não é possível adicionar mais clientes.');
        }
        return;
      }

      const newClient = await clientService.addClient({
        name: trimmed,
        instagram: deriveInternalInstagramSlug(trimmed),
      });

      let result = newClient;
      if (logoFile) {
        const logoUrl = await clientLogoService.uploadClientLogo(newClient.id, logoFile);
        result = { ...newClient, logoUrl };
      }

      onClientCreated(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cliente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: GLASS.radius.card,
            bgcolor: GLASS.surface.bgStrong,
            backdropFilter: `blur(${GLASS.surface.blurStrong})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
            border: `1px solid ${GLASS.border.outer}`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            <Typography variant="h6">Novo cliente</Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {approvalOnly
              ? 'Cadastre a marca ou cliente pelo nome. A conexão com o Instagram é opcional e não é necessária para enviar links de aprovação.'
              : 'Informe o nome do cliente. Você poderá conectar o Instagram depois.'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <ClientLogoField
              name={name}
              file={logoFile}
              onFileChange={setLogoFile}
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Nome do cliente / marca"
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="Ex.: Loja Bella, Clínica Sorriso..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleCreate();
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={loading} startIcon={<CancelIcon />}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{
              bgcolor: GLASS.accent.orange,
              borderRadius: GLASS.radius.button,
              '&:hover': { bgcolor: GLASS.accent.orangeDark },
            }}
          >
            {loading ? 'Criando...' : 'Criar cliente'}
          </Button>
        </DialogActions>
      </Dialog>

      <ClientLimitContactDialog
        open={limitDialogOpen}
        onClose={() => setLimitDialogOpen(false)}
        currentClients={limitInfo.current}
        maxClients={limitInfo.max}
      />
    </>
  );
};

export default CreateClientDialog;

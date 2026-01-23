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
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Client } from '../types';
import { clientService } from '../services/supabaseClient';

interface EditClientDialogProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onClientUpdated: (updatedClient: Client) => void;
}

const EditClientDialog: React.FC<EditClientDialogProps> = ({
  open,
  client,
  onClose,
  onClientUpdated
}) => {
  const [name, setName] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do cliente quando o modal abrir
  useEffect(() => {
    if (client && open) {
      setName(client.name || '');
      setInstagram(client.instagram || '');
      setLogoUrl(client.logoUrl || '');
      setError(null);
    }
  }, [client, open]);

  const handleSave = async () => {
    if (!client) return;

    // Validação
    if (!name.trim() || !instagram.trim()) {
      setError('Nome e usuário do Instagram são obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedClient: Client = {
        ...client,
        name: name.trim(),
        instagram: instagram.trim(),
        logoUrl: logoUrl.trim() || undefined
      };

      const savedClient = await clientService.updateClient(updatedClient);
      onClientUpdated(savedClient);
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar cliente:', err);
      setError(err?.message || 'Erro ao atualizar cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon />
          <Typography variant="h6">Editar Cliente</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Nome do Cliente"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Usuário do Instagram"
            variant="outlined"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            required
            disabled={loading}
            InputProps={{
              startAdornment: <InputAdornment position="start">@</InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            label="URL do Logo"
            variant="outlined"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={loading}
            placeholder="https://exemplo.com/logo.png"
            helperText="Opcional: URL para o logo do cliente"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          startIcon={<CancelIcon />}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditClientDialog;

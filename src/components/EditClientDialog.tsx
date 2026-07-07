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
import { clientLogoService } from '../services/clientLogoService';
import ClientLogoField from './ClientLogoField';
import {
  deriveInternalInstagramSlug,
  getClientInstagramDisplay,
  isClientInstagramConnected,
  isPlaceholderInstagramHandle,
} from '../utils/clientDisplay';
import { GLASS } from '../theme/glassTokens';

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do cliente quando o modal abrir
  useEffect(() => {
    if (client && open) {
      setName(client.name || '');
      const connected = isClientInstagramConnected(client);
      const ig = client.instagram || '';
      setInstagram(
        connected || !isPlaceholderInstagramHandle(ig, client.name, connected)
          ? ig.replace(/^@+/, '')
          : ''
      );
      setLogoUrl(client.logoUrl || '');
      setLogoFile(null);
      setRemoveLogo(false);
      setError(null);
    }
  }, [client, open]);

  const isConnected = client ? isClientInstagramConnected(client) : false;

  const handleSave = async () => {
    if (!client) return;

    if (!name.trim()) {
      setError('Nome do cliente é obrigatório');
      return;
    }

    if (isConnected && !instagram.trim()) {
      setError('Usuário do Instagram é obrigatório para clientes conectados');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trimmedName = name.trim();
      const trimmedInstagram = instagram.trim().replace(/^@+/, '');
      const updatedClient: Client = {
        ...client,
        name: trimmedName,
        instagram: trimmedInstagram || deriveInternalInstagramSlug(trimmedName),
        logoUrl: removeLogo ? undefined : logoUrl.trim() || undefined,
      };

      let savedClient = await clientService.updateClient(updatedClient);

      if (removeLogo && client.logoUrl) {
        await clientLogoService.clearClientLogo(client.id, client.logoUrl);
        savedClient = { ...savedClient, logoUrl: undefined };
      } else if (logoFile) {
        const newLogoUrl = await clientLogoService.uploadClientLogo(
          client.id,
          logoFile,
          client.logoUrl
        );
        savedClient = { ...savedClient, logoUrl: newLogoUrl };
      }

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
      PaperProps={{
        sx: {
          borderRadius: GLASS.radius.card,
          bgcolor: GLASS.surface.bgStrong,
          backdropFilter: `blur(${GLASS.surface.blurStrong})`,
          WebkitBackdropFilter: `blur(${GLASS.surface.blurStrong})`,
          border: `1px solid ${GLASS.border.outer}`,
          boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
        }
      }}
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
          <ClientLogoField
            name={name}
            previewUrl={removeLogo ? null : logoUrl}
            file={logoFile}
            onFileChange={(file) => {
              setLogoFile(file);
              if (file) {
                setRemoveLogo(false);
              } else if (logoUrl) {
                setRemoveLogo(true);
              }
            }}
            disabled={loading}
          />

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
            required={isConnected}
            disabled={loading}
            placeholder={isConnected ? undefined : 'Opcional — conecte depois se precisar publicar'}
            helperText={
              isConnected
                ? 'Cliente conectado ao Instagram'
                : 'Opcional no fluxo só de aprovação. O nome acima é o que aparece nos links enviados ao cliente.'
            }
            InputProps={{
              startAdornment: <InputAdornment position="start">@</InputAdornment>,
            }}
          />

          {client && getClientInstagramDisplay(client) && (
            <Typography variant="caption" color="text.secondary">
              Exibição atual: {getClientInstagramDisplay(client)}
            </Typography>
          )}
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
          sx={{
            bgcolor: GLASS.accent.orange,
            borderRadius: GLASS.radius.button,
            '&:hover': { bgcolor: GLASS.accent.orangeDark },
          }}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditClientDialog;

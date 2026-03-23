import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  InputLabel,
  Select,
  FormControl,
  MenuItem,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import {
  createInternalApprovalLink,
  type CreateInternalApprovalLinkResult,
} from '../services/approvalService';

interface InternalApprovalLinkDialogProps {
  open: boolean;
  onClose: () => void;
  postIds: string[];
  onCreated?: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
];

const InternalApprovalLinkDialog: React.FC<InternalApprovalLinkDialogProps> = ({
  open,
  onClose,
  postIds,
  onCreated,
}) => {
  const [label, setLabel] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInternalApprovalLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createInternalApprovalLink(postIds, expiresInDays, label || undefined);
      setResult(res);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar link.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  };

  const handleOpenLink = () => {
    if (!result?.url) return;
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    setResult(null);
    setLabel('');
    setExpiresInDays(7);
    setError(null);
    setCopied(false);
    onClose();
  };

  const showResult = result !== null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {showResult ? 'Link para o gestor criado' : 'Gerar link para o gestor'}
      </DialogTitle>
      <DialogContent>
        {!showResult ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              O gestor abrirá o link <strong>sem precisar fazer login</strong>, verá os conteúdos e poderá{' '}
              <strong>aprovar</strong> ou <strong>solicitar ajustes</strong> (pré-aprovação interna).
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {postIds.length} postagem(ns) neste link.
            </Typography>
            <TextField
              label="Rótulo (opcional)"
              placeholder="Ex.: Revisão março"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              size="small"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Validade do link</InputLabel>
              <Select
                value={expiresInDays}
                label="Validade do link"
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.days} value={opt.days}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Envie o link ao gestor por um canal seguro (WhatsApp, e-mail interno).
            </Typography>
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5 }}>
                {error}
              </Alert>
            )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                wordBreak: 'break-all',
              }}
            >
              <Typography variant="body2" component="span" sx={{ flex: 1 }}>
                {result!.url}
              </Typography>
              <IconButton size="small" onClick={handleCopy} title="Copiar link">
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                Link copiado!
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={handleOpenLink}>
                Abrir link
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!showResult ? (
          <>
            <Button onClick={handleClose} disabled={creating}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || postIds.length === 0}
              startIcon={creating ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {creating ? 'Criando...' : 'Criar e gerar link'}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={handleClose}>
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InternalApprovalLinkDialog;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  getShareLinkUrl,
  ClientShareLink,
  CreateShareLinkResult
} from '../services/shareLinkService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

const EXPIRY_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
];

const ShareLinkDialog: React.FC<ShareLinkDialogProps> = ({
  open,
  onClose,
  clientId,
  clientName
}) => {
  const theme = useTheme();
  const [links, setLinks] = useState<ClientShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<CreateShareLinkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');

  const loadLinks = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listShareLinks(clientId);
      setLinks(list);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar links.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && clientId) {
      loadLinks();
      setCreatedLink(null);
      setError(null);
      setLinkLabel('');
    }
  }, [open, clientId]);

  const handleCreate = async (days: number) => {
    setCreating(true);
    setError(null);
    setCreatedLink(null);
    const labelToUse = linkLabel.trim() || undefined;
    try {
      const result = await createShareLink(clientId, days, labelToUse);
      setCreatedLink(result);
      setLinkLabel('');
      await loadLinks();
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar link.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await revokeShareLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      if (createdLink?.id === linkId) setCreatedLink(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao revogar link.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon color="primary" />
        Compartilhar dashboard com o cliente{clientName ? `: ${clientName}` : ''}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Crie um link temporário para enviar ao cliente. Ele poderá visualizar os dados do Instagram sem precisar fazer login.
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Novo link
        </Typography>
        <TextField
          label="Rótulo (opcional)"
          placeholder="Ex: Enviado para Maria, Relatório janeiro..."
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 100 }}
          helperText="Identifique o link para encontrar depois na lista"
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {EXPIRY_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              variant="outlined"
              size="small"
              disabled={creating}
              onClick={() => handleCreate(opt.days)}
              startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {opt.label}
            </Button>
          ))}
        </Box>

        {createdLink && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              mb: 2
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Link criado (válido até {format(new Date(createdLink.expiresAt), 'dd/MM/yyyy', { locale: ptBR })})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={createdLink.url}
                inputProps={{ readOnly: true }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
              />
              <IconButton
                color="primary"
                onClick={() => handleCopy(createdLink.url)}
                title="Copiar link"
              >
                <CopyIcon />
              </IconButton>
            </Box>
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5 }}>
                Link copiado!
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Links ativos
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : links.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum link ativo. Crie um acima.
          </Typography>
        ) : (
          <List dense disablePadding>
            {links.map((link) => (
              <ListItem
                key={link.id}
                sx={{
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  mb: 0.5
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2">
                        Expira em {format(new Date(link.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </Typography>
                      {link.label && (
                        <Typography variant="caption" color="text.secondary">
                          • {link.label}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        • {link.accessCount} {link.accessCount === 1 ? 'visualização' : 'visualizações'}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}
                    >
                      {getShareLinkUrl(link.token)}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(getShareLinkUrl(link.token))}
                    title="Copiar"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRevoke(link.id)}
                    title="Revogar link"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareLinkDialog;

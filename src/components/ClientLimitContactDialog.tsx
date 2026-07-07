import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { ContactSupport as ContactIcon, Close as CloseIcon } from '@mui/icons-material';
import { ENTERPRISE_CONTACT_URL } from '../config/stripeProducts';
import { GLASS } from '../theme/glassTokens';

interface ClientLimitContactDialogProps {
  open: boolean;
  onClose: () => void;
  currentClients: number;
  maxClients: number;
}

const ClientLimitContactDialog: React.FC<ClientLimitContactDialogProps> = ({
  open,
  onClose,
  currentClients,
  maxClients,
}) => {
  const handleContact = () => {
    window.open(ENTERPRISE_CONTACT_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContactIcon color="warning" />
          <Typography variant="h6" component="span">
            Limite de clientes atingido
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body1" sx={{ mb: 1.5 }}>
          Seu plano permite até <strong>{maxClients} clientes</strong> e você já está usando{' '}
          <strong>{currentClients}</strong>.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Para adicionar mais clientes, entre em contato conosco. A liberação é feita manualmente
          pela nossa equipe após confirmação do seu contrato.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Fechar
        </Button>
        <Button
          variant="contained"
          onClick={handleContact}
          startIcon={<ContactIcon />}
          sx={{
            bgcolor: GLASS.accent.orange,
            borderRadius: GLASS.radius.button,
            '&:hover': { bgcolor: GLASS.accent.orangeDark },
          }}
        >
          Entrar em contato
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientLimitContactDialog;

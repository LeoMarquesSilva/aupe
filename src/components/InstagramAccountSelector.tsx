import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  People as PeopleIcon,
  PhotoLibrary as MediaIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import { AvailableInstagramAccount, getAvailableInstagramAccounts, connectSpecificInstagramAccount } from '../services/instagramAuthService';

interface InstagramAccountSelectorProps {
  open: boolean;
  onClose: () => void;
  onAccountSelected: (authData: any) => void;
  authCode: string;
}

const InstagramAccountSelector: React.FC<InstagramAccountSelectorProps> = ({
  open,
  onClose,
  onAccountSelected,
  authCode
}) => {
  const [accounts, setAccounts] = useState<AvailableInstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Carregar contas disponíveis quando o diálogo abrir
  useEffect(() => {
    if (open && authCode) {
      loadAvailableAccounts();
    }
  }, [open, authCode]);

  const loadAvailableAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Carregando contas do Instagram disponíveis...');
      const availableAccounts = await getAvailableInstagramAccounts(authCode);
      
      setAccounts(availableAccounts);
      console.log(`${availableAccounts.length} contas encontradas`);
      
    } catch (err: any) {
      console.error('Erro ao carregar contas:', err);
      setError(err.message || 'Erro ao carregar contas do Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (account: AvailableInstagramAccount) => {
    try {
      setConnecting(true);
      setSelectedAccountId(account.instagramAccountId);
      setError(null);
      
      console.log(`Conectando conta: @${account.username}`);
      const authData = await connectSpecificInstagramAccount(account);
      
      console.log('Conta conectada com sucesso!');
      onAccountSelected(authData);
      onClose();
      
    } catch (err: any) {
      console.error('Erro ao conectar conta:', err);
      setError(err.message || 'Erro ao conectar conta do Instagram');
    } finally {
      setConnecting(false);
      setSelectedAccountId(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
          Escolher Conta do Instagram
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Selecione qual conta do Instagram você deseja conectar a este cliente
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Carregando suas contas do Instagram...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : accounts.length === 0 ? (
          <Alert severity="warning">
            Nenhuma conta do Instagram foi encontrada. Certifique-se de que você tem contas do Instagram Business vinculadas às suas páginas do Facebook.
          </Alert>
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              {accounts.length} conta{accounts.length > 1 ? 's' : ''} encontrada{accounts.length > 1 ? 's' : ''}:
            </Typography>
            
            <List sx={{ p: 0 }}>
              {accounts.map((account, index) => (
                <React.Fragment key={account.instagramAccountId}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      mb: 2,
                      border: selectedAccountId === account.instagramAccountId ? 2 : 0,
                      borderColor: 'primary.main',
                      borderRadius: 2
                    }}
                  >
                    <ListItem sx={{ p: 0 }}>
                      <ListItemButton
                        onClick={() => handleAccountSelect(account)}
                        disabled={connecting}
                        sx={{ 
                          p: 2,
                          borderRadius: 2,
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            src={account.profilePicture} 
                            alt={account.username}
                            sx={{ width: 60, height: 60 }}
                          >
                            <InstagramIcon />
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          sx={{ ml: 2 }}
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="h6" sx={{ mr: 1 }}>
                                @{account.username}
                              </Typography>
                              {connecting && selectedAccountId === account.instagramAccountId && (
                                <CircularProgress size={16} sx={{ ml: 1 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <FacebookIcon sx={{ fontSize: 16, mr: 0.5, color: '#1877F2' }} />
                                <Typography variant="body2" color="text.secondary">
                                  {account.pageName}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {account.followersCount !== undefined && (
                                  <Chip
                                    icon={<PeopleIcon />}
                                    label={`${formatNumber(account.followersCount)} seguidores`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                )}
                                
                                {account.mediaCount !== undefined && (
                                  <Chip
                                    icon={<MediaIcon />}
                                    label={`${formatNumber(account.mediaCount)} posts`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </Paper>
                </React.Fragment>
              ))}
            </List>
            
            {connecting && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Conectando conta selecionada...
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={connecting}>
          Cancelar
        </Button>
        {error && (
          <Button 
            onClick={loadAvailableAccounts}
            disabled={loading || connecting}
            variant="outlined"
          >
            Tentar Novamente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InstagramAccountSelector;
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
  useTheme
} from '@mui/material';
import {
  Instagram as InstagramIcon,
  People as PeopleIcon,
  PhotoLibrary as MediaIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import {
  AvailableInstagramAccount,
  getAvailableInstagramAccounts,
  connectSpecificInstagramAccount,
  getInstagramOAuthDebugSnapshot,
} from '../services/instagramAuthService';
import { devLog, logClientError } from '../utils/clientLogger';
import { GLASS } from '../theme/glassTokens';

interface InstagramAccountSelectorProps {
  open: boolean;
  onClose: () => void;
  onAccountSelected: (authData: any) => void;
  authCode: string;
  clientId?: string;
}

const InstagramAccountSelector: React.FC<InstagramAccountSelectorProps> = ({
  open,
  onClose,
  onAccountSelected,
  authCode,
  clientId,
}) => {
  const _theme = useTheme();
  const [accounts, setAccounts] = useState<AvailableInstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hasSelectedAccount, setHasSelectedAccount] = useState(false); // Novo estado

  const normalizeAuthErrorMessage = (rawMessage: string): string => {
    if (!rawMessage) return 'Erro ao carregar contas do Instagram';
    // Mensagem antiga vista em bundles antigos: guia para causa raiz real.
    if (rawMessage.includes('REACT_APP_FACEBOOK_APP_SECRET')) {
      return (
        'Fluxo OAuth recebeu erro de configuração de secret. No fluxo atual, o correto é configurar ' +
        'FACEBOOK_APP_ID + FACEBOOK_APP_SECRET no servidor (.env/Vercel) e usar /api/facebook-oauth-token. ' +
        'Se esta mensagem continuar igual à antiga, faça hard refresh (Ctrl+F5) para limpar bundle em cache.'
      );
    }
    if (rawMessage.toLowerCase().includes('authorization code has been used')) {
      return (
        'O Facebook informou que o código OAuth já foi usado. Isso pode acontecer por dupla execução em modo dev. ' +
        'Já aplicamos deduplicação automática; feche esta janela e clique em "Conectar Instagram" novamente.'
      );
    }
    return rawMessage;
  };

  // Carregar contas disponíveis quando o diálogo abrir
  useEffect(() => {
    if (open && authCode && !hasSelectedAccount) {
      loadAvailableAccounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authCode, hasSelectedAccount]);

  const loadAvailableAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      devLog('Carregando contas do Instagram disponíveis...', { clientId });
      const availableAccounts = await getAvailableInstagramAccounts(authCode, clientId);
      
      setAccounts(availableAccounts);
      devLog(`${availableAccounts.length} contas encontradas`);
      
    } catch (err: any) {
      const snapshot = getInstagramOAuthDebugSnapshot();
      logClientError('Erro ao carregar contas', err);
      devLog('OAuth debug snapshot (apenas verbose)', {
        oauthDebug: snapshot,
        oauthDebugTagOnWindow:
          typeof window !== 'undefined'
            ? (window as unknown as { __IG_AUTH_DEBUG_TAG__?: string }).__IG_AUTH_DEBUG_TAG__
            : undefined,
      });
      setError(normalizeAuthErrorMessage(err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (account: AvailableInstagramAccount) => {
    // Evitar seleções múltiplas
    if (connecting || hasSelectedAccount) {
      devLog('⏳ Já processando uma conta, ignorando nova seleção');
      return;
    }

    try {
      setConnecting(true);
      setSelectedAccountId(account.instagramAccountId);
      setError(null);
      setHasSelectedAccount(true); // Marcar como selecionado
      
      devLog(`Conectando conta: @${account.username}`);
      const authData = await connectSpecificInstagramAccount(account);
      
      devLog('Conta conectada com sucesso!');
      
      // Chamar callback de sucesso
      onAccountSelected(authData);
      
      // NÃO chamar onClose() aqui - deixar o componente pai gerenciar
      
    } catch (err: any) {
      logClientError('Erro ao conectar conta', err);
      setError(err.message || 'Erro ao conectar conta do Instagram');
      setHasSelectedAccount(false); // Reset em caso de erro
    } finally {
      setConnecting(false);
      setSelectedAccountId(null);
    }
  };

  const handleClose = () => {
    // Só permitir fechar se não estiver processando uma conta
    if (connecting || hasSelectedAccount) {
      devLog('⏳ Não é possível fechar - processando conta');
      return;
    }
    
    onClose();
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
      onClose={handleClose}
      maxWidth="md"
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
      // Evitar fechar com ESC ou clique fora durante processamento
      disableEscapeKeyDown={connecting || hasSelectedAccount}
      onBackdropClick={connecting || hasSelectedAccount ? undefined : handleClose}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InstagramIcon sx={{ mr: 1, color: GLASS.accent.orange }} />
          Escolher Conta do Instagram
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Login via Facebook: escolha a Página com Instagram Business vinculado para salvar neste cliente.
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Carregando suas contas do Instagram...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }} component="div">
            <Typography component="div" variant="body2">
              {error}
            </Typography>
          </Alert>
        ) : accounts.length === 0 ? (
          <Alert severity="warning" component="div">
            <Typography component="div" variant="body2">
              Não foi possível obter contas. Verifique: Página do Facebook + Instagram Business vinculado, escopos do app e URI de redirecionamento em Facebook Login.
            </Typography>
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
                    elevation={0} 
                    sx={{ 
                      mb: 2,
                      border: selectedAccountId === account.instagramAccountId
                        ? `2px solid ${GLASS.accent.orange}`
                        : `1px solid ${GLASS.border.outer}`,
                      borderRadius: GLASS.radius.inner,
                      opacity: hasSelectedAccount && selectedAccountId !== account.instagramAccountId ? 0.5 : 1,
                      bgcolor: GLASS.surface.bg,
                      backdropFilter: `blur(${GLASS.surface.blur})`,
                      WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
                      boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
                    }}
                  >
                    <ListItem sx={{ p: 0 }}>
                      <ListItemButton
                        onClick={() => handleAccountSelect(account)}
                        disabled={connecting || hasSelectedAccount}
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
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 0.5 }}>
                              {account.profileName ? (
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {account.profileName}
                                </Typography>
                              ) : null}
                              <Typography variant="h6" sx={{ mr: 1 }}>
                                @{account.username}
                              </Typography>
                              {connecting && selectedAccountId === account.instagramAccountId && (
                                <CircularProgress size={16} sx={{ ml: 1 }} />
                              )}
                              {hasSelectedAccount && selectedAccountId === account.instagramAccountId && (
                                <Chip 
                                  label="Selecionada" 
                                  color="success" 
                                  size="small" 
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <FacebookIcon sx={{ fontSize: 16, mr: 0.5, color: '#1877F2' }} />
                                <Typography component="span" variant="body2" color="text.secondary">
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
              <Alert severity="info" sx={{ mt: 2 }} component="div">
                <Typography component="div" variant="subtitle2" sx={{ mb: 1 }}>
                  Conectando conta selecionada...
                </Typography>
                <Typography component="div" variant="body2">
                  Por favor, aguarde enquanto processamos sua seleção.
                </Typography>
              </Alert>
            )}

            {hasSelectedAccount && !connecting && (
              <Alert severity="success" sx={{ mt: 2 }} component="div">
                <Typography component="div" variant="subtitle2" sx={{ mb: 1 }}>
                  Conta conectada
                </Typography>
                <Typography component="div" variant="body2">
                  Esta janela será fechada automaticamente...
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={connecting || hasSelectedAccount}
        >
          Cancelar
        </Button>
        {error && (
          <Button 
            onClick={loadAvailableAccounts}
            disabled={loading || connecting || hasSelectedAccount}
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
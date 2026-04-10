import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  SearchOutlined as SearchIcon,
  Instagram as InstagramIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PostAdd as PostAddIcon,
  VideoCall as ReelsIcon,
  Collections as CarouselIcon,
  Image as StoryIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { clientService, postService } from '../services/supabaseClient';
import { Client } from '../types';
import EditClientDialog from '../components/EditClientDialog';
import ConnectInstagram from '../components/ConnectInstagram';
import ClienteCardPremium from '../components/ClienteCardPremium';
import { imageUrlService } from '../services/imageUrlService';
import { getAuthorizationUrl, InstagramAuthData } from '../services/instagramAuthService';
import { subscriptionLimitsService } from '../services/subscriptionLimitsService';
import { motion } from 'framer-motion';
import { GLASS } from '../theme/glassTokens';
import { appShellContainerSx } from '../theme/appShellLayout';

const ClientDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<'all' | 'connected' | 'disconnected' | 'active' | 'inactive'>('all');
  const [creatingClient, setCreatingClient] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [connectInstagramOpen, setConnectInstagramOpen] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [contentMenuAnchor, setContentMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<Client | null>(null);
  const [clientStats, setClientStats] = useState<Record<string, { 
    scheduled: number, 
    posted: number, 
    draft: number 
  }>>({});
  
  // Função para buscar clientes
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const clientsData = await clientService.getClients();
      setClients(clientsData);
      
      // Buscar estatísticas para cada cliente
      const statsPromises = clientsData.map(async (client) => {
        try {
          const posts = await postService.getScheduledPostsByClient(client.id);
          
          // ✅ MAPEAMENTO CORRETO DOS STATUS
          const stats = {
            // Agendados = apenas pending (posts que ainda não foram enviados)
            scheduled: posts.filter(p => p.status === 'pending').length,
            
            // Publicados = posted/published (compatibilidade com dados legados)
            posted: posts.filter(p => p.status === 'posted' || p.status === 'published').length,
            
            // Falhados = failed + cancelled
            draft: posts.filter(p => 
              p.status === 'failed' || 
              p.status === 'cancelled'
            ).length
          };
          
          return { clientId: client.id, stats };
        } catch (err) {
          return { 
            clientId: client.id, 
            stats: { scheduled: 0, posted: 0, draft: 0 } 
          };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, { scheduled: number, posted: number, draft: number }> = {};
      
      statsResults.forEach(result => {
        statsMap[result.clientId] = result.stats;
      });
      
      setClientStats(statsMap);
    } catch (err) {
      setError('Não foi possível carregar os clientes. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchClients();
  }, []);

  const isInstagramConnected = useCallback((client: Client): boolean => {
    return !!(client.instagramAccountId && client.accessToken && client.username);
  }, []);
  
  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const clientName = (client.name || '').toLowerCase();
      const instagram = (client.instagram || '').toLowerCase();
      const matchesSearch = !term || clientName.includes(term) || instagram.includes(term);
      const connected = isInstagramConnected(client);
      const isActive = client.isActive !== false;
      const matchesFilter =
        clientFilter === 'all' ||
        (clientFilter === 'connected' && connected) ||
        (clientFilter === 'disconnected' && !connected) ||
        (clientFilter === 'active' && isActive) ||
        (clientFilter === 'inactive' && !isActive);
      return matchesSearch && matchesFilter;
    });
  }, [clients, searchTerm, clientFilter, isInstagramConnected]);

  const summary = useMemo(() => {
    const connected = clients.filter((client) => isInstagramConnected(client)).length;
    const active = clients.filter((client) => client.isActive !== false).length;
    return {
      total: clients.length,
      connected,
      disconnected: Math.max(0, clients.length - connected),
      active,
      inactive: Math.max(0, clients.length - active),
    };
  }, [clients, isInstagramConnected]);
  
  const handleNewClientViaOAuth = async () => {
    if (creatingClient) return;
    setCreatingClient(true);
    setError(null);

    try {
      const limitCheck = await subscriptionLimitsService.canCreateClient();
      if (!limitCheck.allowed) {
        setError(limitCheck.message || 'Limite de contas atingido. Faça upgrade do plano.');
        return;
      }

      const placeholder = `novo_${Date.now()}`;
      const newClient = await clientService.addClient({
        name: placeholder,
        instagram: placeholder,
      });

      setClients(prev => [...prev, newClient]);
      setClientStats(prev => ({ ...prev, [newClient.id]: { scheduled: 0, posted: 0, draft: 0 } }));

      localStorage.setItem('current_client_id', newClient.id);
      localStorage.removeItem('instagram_auth_temp_data');
      localStorage.removeItem('instagram_auth_error');
      localStorage.removeItem('instagram_auth_success');

      const authUrl = getAuthorizationUrl(newClient.id);
      const w = 600, h = 700;
      const left = window.innerWidth / 2 - w / 2;
      const top = window.innerHeight / 2 - h / 2;

      const popup = window.open(authUrl, 'instagram-auth', `width=${w},height=${h},top=${top},left=${left}`);
      if (!popup) {
        setError('Popup bloqueado. Habilite popups e tente novamente.');
        return;
      }

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
          window.removeEventListener('message', onMessage);
          void (async () => {
            try {
              const cid = (event.data.clientId as string) || newClient.id;
              const raw = event.data.data as Record<string, unknown>;
              const authData: InstagramAuthData = {
                instagramAccountId: String(raw.instagramAccountId || ''),
                accessToken: String(raw.accessToken || ''),
                username: String(raw.username || ''),
                profilePicture: String(raw.profilePicture || ''),
                tokenExpiry:
                  typeof raw.tokenExpiry === 'string'
                    ? new Date(raw.tokenExpiry)
                    : raw.tokenExpiry instanceof Date
                      ? raw.tokenExpiry
                      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                pageId: (raw.pageId as string) ?? null,
                pageName: (raw.pageName as string) ?? null,
                issuedAt: typeof raw.issuedAt === 'string' ? raw.issuedAt : undefined,
                profileName: typeof raw.profileName === 'string' ? raw.profileName : undefined,
              };
              await clientService.saveInstagramAuth(cid, authData);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Erro ao salvar Instagram';
              setError(msg);
            } finally {
              fetchClients();
            }
          })();
        }
      };
      window.addEventListener('message', onMessage);

      const poll = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(poll);
          window.removeEventListener('message', onMessage);
          void (async () => {
            const authSuccess = localStorage.getItem('instagram_auth_success');
            const savedData = localStorage.getItem('instagram_auth_temp_data');
            if (authSuccess && savedData) {
              try {
                const raw = JSON.parse(savedData) as Record<string, unknown>;
                const authData: InstagramAuthData = {
                  instagramAccountId: String(raw.instagramAccountId || ''),
                  accessToken: String(raw.accessToken || ''),
                  username: String(raw.username || ''),
                  profilePicture: String(raw.profilePicture || ''),
                  tokenExpiry:
                    typeof raw.tokenExpiry === 'string'
                      ? new Date(raw.tokenExpiry)
                      : raw.tokenExpiry instanceof Date
                        ? raw.tokenExpiry
                        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                  pageId: (raw.pageId as string) ?? null,
                  pageName: (raw.pageName as string) ?? null,
                  issuedAt: typeof raw.issuedAt === 'string' ? raw.issuedAt : undefined,
                  profileName: typeof raw.profileName === 'string' ? raw.profileName : undefined,
                };
                await clientService.saveInstagramAuth(newClient.id, authData);
              } catch {
                /* já tratado em postMessage ou usuário cancelou */
              } finally {
                localStorage.removeItem('instagram_auth_temp_data');
                localStorage.removeItem('instagram_auth_success');
              }
            }
            fetchClients();
          })();
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cliente.');
    } finally {
      setCreatingClient(false);
    }
  };

  // Função para lidar com a atualização de um cliente
  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      )
    );
    setSelectedClient(null);
  };

  // Função para lidar com a atualização da conexão do Instagram
  const handleInstagramConnectionUpdate = (clientId: string, instagramData: InstagramAuthData | null) => {
    setClients(prevClients => 
      prevClients.map(client => {
        if (client.id === clientId && instagramData) {
          return {
            ...client,
            name: instagramData.clientName ?? client.name,
            instagram: instagramData.username || client.instagram,
            instagramAccountId: instagramData.instagramAccountId,
            accessToken: instagramData.accessToken,
            username: instagramData.username,
            profilePicture: instagramData.profilePicture,
            tokenExpiry: instagramData.tokenExpiry,
            pageId: instagramData.pageId,
            pageName: instagramData.pageName,
            instagramLongLivedIssuedAt: instagramData.issuedAt,
          };
        }
        return client;
      })
    );
    // Recarregar estatísticas após conexão
    fetchClients();
  };
  
  const handleToggleClientActive = async (client: Client) => {
    const currentlyActive = client.isActive !== false;
    const next = !currentlyActive;
    setError(null);
    try {
      const updated = await clientService.updateClient({ id: client.id, isActive: next });
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, ...updated } : c)));
    } catch {
      setError('Não foi possível atualizar o status do cliente. Tente novamente.');
    }
  };

  // Função para lidar com a exclusão de um cliente
  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    
    try {
      await clientService.deleteClient(selectedClient.id);
      
      // Atualizar a lista de clientes
      setClients(prevClients => 
        prevClients.filter(client => client.id !== selectedClient.id)
      );
      
      // Atualizar estatísticas
      const newStats = { ...clientStats };
      delete newStats[selectedClient.id];
      setClientStats(newStats);
      
      setDeleteConfirmOpen(false);
      setSelectedClient(null);
    } catch (err) {
      setError('Erro ao excluir cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para navegar para o calendário do cliente
  const handleViewCalendar = (client: Client) => {
    navigate(`/client/${client.id}`);
  };
  
  // Função para criar novo post para o cliente
  const handleCreatePost = (client: Client) => {
    navigate(`/create-post?clientId=${client.id}`);
  };
  
  // Função para criar novo story para o cliente
  const handleCreateStory = (client: Client) => {
    navigate(`/create-story?clientId=${client.id}`);
  };

  const openContentMenu = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    event.stopPropagation();
    setMenuClient(client);
    setContentMenuAnchor(event.currentTarget);
  };

  const openActionsMenu = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    event.stopPropagation();
    setMenuClient(client);
    setActionsMenuAnchor(event.currentTarget);
  };

  const closeMenus = () => {
    setContentMenuAnchor(null);
    setActionsMenuAnchor(null);
    setMenuClient(null);
  };

  // Função para obter a imagem do avatar
  const getAvatarImage = (client: Client) => {
    // Priorizar a foto do perfil do Instagram
    if (client.profilePicture) {
      return imageUrlService.getPublicUrl(client.profilePicture);
    }
    // Fallback para o logo do cliente
    if (client.logoUrl) {
      return imageUrlService.getPublicUrl(client.logoUrl);
    }
    return undefined;
  };
  
  return (
    <Container maxWidth={false} disableGutters sx={{ ...appShellContainerSx, py: { xs: 2, md: 3.5 } }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Box
          className="grain-overlay premium-header-bg"
          sx={{
            p: { xs: 2, md: 2.75 },
            borderRadius: GLASS.radius.card,
            border: `1px solid rgba(255, 255, 255, 0.18)`,
            boxShadow: '0 16px 38px -24px rgba(10, 15, 45, 0.8)',
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                className="premium-header-title"
                sx={{
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.35rem', md: '1.6rem' },
                  mb: 0.5,
                }}
              >
                Dashboard de clientes
              </Typography>
              <Typography variant="body2" className="premium-header-subtitle">
                Gerencie contas conectadas, status de operação e criação de conteúdo em um fluxo único.
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={handleNewClientViaOAuth}
              disabled={creatingClient}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.2,
                py: 1.1,
                border: 'none',
                borderRadius: GLASS.radius.button,
                bgcolor: GLASS.accent.orange,
                color: '#fff',
                cursor: creatingClient ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                fontWeight: 650,
                fontFamily: 'inherit',
                minWidth: 150,
                justifyContent: 'center',
                boxShadow: `0 2px 10px -2px ${GLASS.status.connected.glow}`,
                opacity: creatingClient ? 0.7 : 1,
                transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
                '&:hover': {
                  bgcolor: GLASS.accent.orangeDark,
                  boxShadow: `0 6px 20px -4px ${GLASS.status.connected.glow}`,
                },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: `0 0 0 3px rgba(247, 66, 17, 0.3)`,
                },
              }}
            >
              {creatingClient ? (
                <CircularProgress size={18} sx={{ color: '#fff' }} />
              ) : (
                <PersonAddIcon sx={{ fontSize: 18 }} />
              )}
              {creatingClient ? 'Criando...' : 'Novo cliente'}
            </Box>
          </Box>

          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
              gap: 1.25,
            }}
          >
            <TextField
              placeholder="Buscar por nome ou @instagram..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.92)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.16)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '14px',
                  color: '#fff',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.28)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.46)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: GLASS.accent.orange,
                    boxShadow: `0 0 0 3px rgba(247, 66, 17, 0.12)`,
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.82)',
                    opacity: 1,
                  },
                },
              }}
            />
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                p: 0.4,
                borderRadius: '14px',
                bgcolor: GLASS.shell.filterBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${GLASS.border.subtle}`,
                gap: 0.4,
                overflowX: 'auto',
              }}
            >
              {[
                { value: 'all', label: `Todos (${summary.total})` },
                { value: 'connected', label: `Conectados (${summary.connected})` },
                { value: 'active', label: `Ativos (${summary.active})` },
                { value: 'inactive', label: `Inativos (${summary.inactive})` },
              ].map((item) => (
                <Button
                  key={item.value}
                  size="small"
                  disableElevation
                  onClick={() => setClientFilter(item.value as typeof clientFilter)}
                  sx={{
                    whiteSpace: 'nowrap',
                    px: 1.2,
                    py: 0.5,
                    minWidth: 'auto',
                    fontSize: '0.72rem',
                    fontWeight: clientFilter === item.value ? 650 : 450,
                    borderRadius: '10px',
                    textTransform: 'none',
                    border: 'none',
                    color: clientFilter === item.value ? GLASS.shell.filterActiveColor : GLASS.text.muted,
                    bgcolor: clientFilter === item.value ? GLASS.shell.filterActiveBg : 'transparent',
                    transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
                    '&:hover': {
                      bgcolor: clientFilter === item.value
                        ? '#131940'
                        : GLASS.sidebar.bgHover,
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {loading && !clients.length && (
        <Box
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: GLASS.radius.card,
            border: `1px solid ${GLASS.border.outer}`,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}
        >
          <CircularProgress size={34} sx={{ color: GLASS.accent.orange }} />
          <Typography variant="body2" sx={{ mt: 1.25, color: GLASS.text.muted }}>
            Carregando clientes...
          </Typography>
        </Box>
      )}

      {error && (
        <Box
          sx={{
            p: 2.25,
            mb: 2.5,
            borderRadius: GLASS.radius.inner,
            border: '1px solid rgba(239, 68, 68, 0.25)',
            bgcolor: 'rgba(239, 68, 68, 0.05)',
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: GLASS.shadow.cardInset,
          }}
        >
          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 500 }}>
            {error}
          </Typography>
          <Box
            component="button"
            onClick={fetchClients}
            sx={{
              mt: 1.5,
              px: 2,
              py: 0.8,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: GLASS.radius.buttonSm,
              bgcolor: 'rgba(239, 68, 68, 0.08)',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: `all ${GLASS.motion.duration.fast} ${GLASS.motion.easing}`,
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.12)',
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)',
              },
            }}
          >
            Tentar novamente
          </Box>
        </Box>
      )}

      {!loading && !error && filteredClients.length === 0 && (
        <Box
          sx={{
            p: { xs: 3, md: 4.5 },
            textAlign: 'center',
            borderRadius: GLASS.radius.card,
            border: `1px dashed ${GLASS.border.outer}`,
            bgcolor: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            WebkitBackdropFilter: `blur(${GLASS.surface.blur})`,
            boxShadow: GLASS.shadow.cardInset,
          }}
        >
          <PersonAddIcon sx={{ fontSize: 54, color: GLASS.text.muted, mb: 1.25, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: GLASS.text.heading }}>
            Nenhum cliente encontrado
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: GLASS.text.muted }}>
            {searchTerm || clientFilter !== 'all'
              ? 'Ajuste sua busca ou filtros para encontrar clientes.'
              : 'Comece conectando seu primeiro cliente para destravar o fluxo de conteúdo.'}
          </Typography>
          <Box
            component="button"
            onClick={handleNewClientViaOAuth}
            disabled={creatingClient}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2.5,
              py: 1.1,
              border: 'none',
              borderRadius: GLASS.radius.button,
              bgcolor: GLASS.accent.orange,
              color: '#fff',
              cursor: creatingClient ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 650,
              fontFamily: 'inherit',
              opacity: creatingClient ? 0.7 : 1,
              boxShadow: `0 2px 10px -2px ${GLASS.status.connected.glow}`,
              transition: `all ${GLASS.motion.duration.normal} ${GLASS.motion.easing}`,
              '&:hover': {
                bgcolor: GLASS.accent.orangeDark,
                boxShadow: `0 6px 20px -4px ${GLASS.status.connected.glow}`,
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(247, 66, 17, 0.3)',
              },
            }}
          >
            {creatingClient ? (
              <CircularProgress size={18} sx={{ color: '#fff' }} />
            ) : (
              <PersonAddIcon sx={{ fontSize: 18 }} />
            )}
            {creatingClient ? 'Criando...' : 'Adicionar cliente'}
          </Box>
        </Box>
      )}

      {!loading && !error && filteredClients.length > 0 && (
        <Grid container spacing={2.5}>
          {filteredClients.map((client, index) => {
            const connected = isInstagramConnected(client);
            return (
              <Grid item xs={12} sm={6} lg={4} key={client.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.25) }}
                  style={{ height: '100%' }}
                >
                  <ClienteCardPremium
                    logo={getAvatarImage(client)}
                    name={client.name}
                    handle={client.instagram || 'sem-instagram'}
                    agendados={clientStats[client.id]?.scheduled || 0}
                    publicados={clientStats[client.id]?.posted || 0}
                    status={connected ? 'Conectado' : 'Desconectado'}
                    onOpen={() => handleViewCalendar(client)}
                    onViewScheduled={() => navigate(`/calendar/${client.id}`)}
                    onViewDashboard={() => navigate(`/client/${client.id}`)}
                    onContentMenu={(e) => openContentMenu(e, client)}
                    onMoreActions={(e) => openActionsMenu(e, client)}
                  />
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Menu
        anchorEl={contentMenuAnchor}
        open={Boolean(contentMenuAnchor)}
        onClose={closeMenus}
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}
      >
        <MenuItem
          onClick={() => {
            if (menuClient) handleCreatePost(menuClient);
            closeMenus();
          }}
        >
          <ListItemIcon><PostAddIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Criar post</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) handleCreateStory(menuClient);
            closeMenus();
          }}
        >
          <ListItemIcon><StoryIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Criar story</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) navigate(`/create-reels?clientId=${menuClient.id}`);
            closeMenus();
          }}
        >
          <ListItemIcon><ReelsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Criar reel</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) handleCreatePost(menuClient);
            closeMenus();
          }}
        >
          <ListItemIcon><CarouselIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Criar carrossel</ListItemText>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={closeMenus}
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}
      >
        <MenuItem
          onClick={() => {
            if (menuClient) {
              setSelectedClient(menuClient);
              setEditDialogOpen(true);
            }
            closeMenus();
          }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar cliente</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) {
              setSelectedClient(menuClient);
              setConnectInstagramOpen(true);
            }
            closeMenus();
          }}
        >
          <ListItemIcon><InstagramIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Conectar Instagram</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) void handleToggleClientActive(menuClient);
            closeMenus();
          }}
        >
          <ListItemIcon>
            {(menuClient?.isActive !== false) ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {(menuClient?.isActive !== false) ? 'Inativar cliente' : 'Ativar cliente'}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuClient) {
              setSelectedClient(menuClient);
              setDeleteConfirmOpen(true);
            }
            closeMenus();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Excluir cliente</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Modal de edição de cliente */}
      <EditClientDialog
        open={editDialogOpen}
        client={selectedClient}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedClient(null);
        }}
        onClientUpdated={handleUpdateClient}
      />

      {/* Modal de conexão com Instagram */}
      <Dialog
        open={connectInstagramOpen}
        onClose={() => {
          setConnectInstagramOpen(false);
          setSelectedClient(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InstagramIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6">
              {selectedClient ? `Conectar Instagram - ${selectedClient.name}` : 'Conectar Instagram'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedClient && (
            <ConnectInstagram 
              client={selectedClient}
              onConnectionUpdate={handleInstagramConnectionUpdate}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConnectInstagramOpen(false);
            setSelectedClient(null);
          }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o cliente "{selectedClient?.name}"?
            Esta ação não pode ser desfeita e todos os posts agendados serão removidos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteClient} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClientDashboard;
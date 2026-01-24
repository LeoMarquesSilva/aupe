import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea,
  CardActions,
  IconButton, 
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Add as AddIcon,
  SearchOutlined as SearchIcon,
  Instagram as InstagramIcon,
  CalendarMonth as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PostAdd as PostAddIcon,
  VideoCall as ReelsIcon,
  Collections as CarouselIcon,
  Image as StoryIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { clientService, postService } from '../services/supabaseClient';
import { Client } from '../types';
import ClientManager from '../components/ClientManager';
import EditClientDialog from '../components/EditClientDialog';
import ConnectInstagram from '../components/ConnectInstagram';
import SmartImage from '../components/SmartImage';
import { imageUrlService } from '../services/imageUrlService';
import { InstagramAuthData } from '../services/instagramAuthService';

const ClientDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [clientDialogOpen, setClientDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [connectInstagramOpen, setConnectInstagramOpen] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientActionMenuOpen, setClientActionMenuOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
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
            
            // Publicados = published (posts publicados com sucesso pelo N8N)
            posted: posts.filter(p => p.status === 'published').length,
            
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
  
  // Filtrar clientes com base na pesquisa
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.instagram.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Função para lidar com a adição de um novo cliente
  const handleAddClient = (client: Client) => {
    setClients(prevClients => [...prevClients, client]);
    setClientDialogOpen(false);
    setSelectedClient(null);
    // Atualizar estatísticas
    setClientStats(prev => ({
      ...prev,
      [client.id]: { scheduled: 0, posted: 0, draft: 0 }
    }));
  };

  // Função para lidar com a atualização de um cliente
  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      )
    );
    setClientDialogOpen(false);
    setSelectedClient(null);
  };

  // Função para lidar com a atualização da conexão do Instagram
  const handleInstagramConnectionUpdate = (clientId: string, instagramData: InstagramAuthData | null) => {
    setClients(prevClients => 
      prevClients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            instagramAccountId: instagramData?.instagramAccountId,
            accessToken: instagramData?.accessToken,
            username: instagramData?.username,
            profilePicture: instagramData?.profilePicture,
            tokenExpiry: instagramData?.tokenExpiry,
            pageId: instagramData?.pageId,
            pageName: instagramData?.pageName
          };
        }
        return client;
      })
    );
    // Recarregar estatísticas após conexão
    fetchClients();
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

  // Função para verificar se o Instagram está conectado
  const isInstagramConnected = useCallback((client: Client): boolean => {
    return !!(
      client.instagramAccountId && 
      client.accessToken && 
      client.username
    );
  }, []);

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Cabeçalho da página */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexDirection: isTablet ? 'column' : 'row',
        gap: 2,
        mb: 4 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <InstagramIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          Gerenciamento de Clientes
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          width: isTablet ? '100%' : 'auto',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <TextField
            placeholder="Buscar clientes..."
            variant="outlined"
            size="small"
            fullWidth={isMobile}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setClientDialogOpen(true)}
          >
            Novo Cliente
          </Button>
        </Box>
      </Box>
      
      {/* Estado de carregamento */}
      {loading && !clients.length && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Estado de erro */}
      {error && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
          <Typography variant="body1">{error}</Typography>
          <Button 
            variant="contained" 
            color="error"
            startIcon={<AddIcon />}
            onClick={fetchClients}
            sx={{ mt: 2 }}
          >
            Tentar Novamente
          </Button>
        </Paper>
      )}
      
      {/* Lista de clientes vazia */}
      {!loading && !error && filteredClients.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <PersonAddIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          
          <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
            Nenhum cliente encontrado
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm 
              ? 'Nenhum cliente corresponde à sua pesquisa.' 
              : 'Comece adicionando seu primeiro cliente.'}
          </Typography>
          
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={() => setClientDialogOpen(true)}
            size="large"
          >
            Adicionar Cliente
          </Button>
        </Paper>
      )}
      
      {/* Grid de clientes */}
      {!loading && !error && filteredClients.length > 0 && (
        <Grid container spacing={3}>
          {filteredClients.map(client => (
            <Grid item xs={12} sm={6} md={4} key={client.id}>
              <Card 
                elevation={1}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s ease-in-out',
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    elevation: 4,
                    boxShadow: theme.shadows[4],
                    borderColor: 'primary.light',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardActionArea 
                onClick={() => handleViewCalendar(client)}
                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <Box sx={{ 
                    pt: 3,
                    pb: 1.5,
                    px: 2,
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    bgcolor: 'background.paper'
                  }}>
                    <Box sx={{ 
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: 70,
                          height: 70,
                        }}
                      >
                        <SmartImage
                          src={getAvatarImage(client)}
                          clientId={client.id}
                          alt={client.name}
                          width={70}
                          height={70}
                          borderRadius="50%"
                          fallbackText={client.name.charAt(0)}
                          sx={{
                            border: '2px solid',
                            borderColor: 'divider',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                            objectFit: 'cover',
                            bgcolor: 'grey.100'
                          }}
                        />
                        {client.profilePicture && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              bgcolor: '#E1306C',
                              borderRadius: '50%',
                              p: 0.4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid white',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
                            }}
                          >
                            <InstagramIcon sx={{ fontSize: 14, color: 'white' }} />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, pb: 1.5, pt: 1.5, px: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography 
                        variant="subtitle1" 
                        align="center" 
                        noWrap 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: 'text.primary'
                        }}
                      >
                        {client.name}
                      </Typography>
                      
                      <Chip
                        icon={<InstagramIcon sx={{ fontSize: 12 }} />}
                        label={isInstagramConnected(client) ? 'Conectado' : 'Desconectado'}
                        size="small"
                        color={isInstagramConnected(client) ? 'success' : 'default'}
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          '& .MuiChip-icon': {
                            fontSize: 12
                          }
                        }}
                      />
                    </Box>
                    
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      align="center"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 1.5,
                        gap: 0.5,
                        fontSize: '0.75rem'
                      }}
                    >
                      <InstagramIcon sx={{ fontSize: 14, color: '#E1306C' }} />
                      @{client.instagram}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {/* Estatísticas melhoradas */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-around',
                      alignItems: 'center',
                      mt: 1.5,
                      gap: 1
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.25
                        }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          <Typography 
                            variant="h6" 
                            color="primary" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              lineHeight: 1
                            }}
                          >
                            {clientStats[client.id]?.scheduled || 0}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          Agendados
                        </Typography>
                      </Box>
                      
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.25
                        }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography 
                            variant="h6" 
                            color="success.main" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              lineHeight: 1
                            }}
                          >
                            {clientStats[client.id]?.posted || 0}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          Publicados
                        </Typography>
                      </Box>
                      
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.25
                        }}>
                          <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          <Typography 
                            variant="h6" 
                            color="error.main" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              lineHeight: 1
                            }}
                          >
                            {clientStats[client.id]?.draft || 0}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          Falhados
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'space-between', px: 1.5, py: 1 }}>
                  <Box>
                    <Tooltip title="Editar cliente">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={isInstagramConnected(client) ? "Instagram conectado" : "Conectar Instagram"}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                          setConnectInstagramOpen(true);
                        }}
                        sx={{ 
                          color: isInstagramConnected(client) ? '#4caf50' : '#E1306C',
                          '&:hover': { bgcolor: isInstagramConnected(client) ? 'rgba(76, 175, 80, 0.1)' : 'rgba(225, 48, 108, 0.1)' }
                        }}
                      >
                        <InstagramIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Excluir cliente">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Tooltip title="Criar Post">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatePost(client);
                        }}
                        sx={{ 
                          color: '#E1306C',
                          '&:hover': { bgcolor: 'rgba(225, 48, 108, 0.1)' }
                        }}
                      >
                        <PostAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Criar Story">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateStory(client);
                        }}
                        sx={{ 
                          color: '#FCAF45',
                          '&:hover': { bgcolor: 'rgba(252, 175, 69, 0.1)' }
                        }}
                      >
                        <StoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Criar Reel">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/create-reels?clientId=${client.id}`);
                        }}
                        sx={{ 
                          color: '#F56040',
                          '&:hover': { bgcolor: 'rgba(245, 96, 64, 0.1)' }
                        }}
                      >
                        <ReelsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Criar Carrossel">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatePost(client);
                        }}
                        sx={{ 
                          color: '#833AB4',
                          '&:hover': { bgcolor: 'rgba(131, 58, 180, 0.1)' }
                        }}
                      >
                        <CarouselIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Ver calendário">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCalendar(client);
                        }}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.05)' }
                        }}
                      >
                        <CalendarIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Diálogo para gerenciar clientes */}
      <Dialog
        open={clientDialogOpen}
        onClose={() => {
          setClientDialogOpen(false);
          setSelectedClient(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonAddIcon sx={{ mr: 1 }} />
            Adicionar Novo Cliente
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ClientManager 
            clients={clients} 
            onAddClient={handleAddClient} 
            onSelectClient={() => {}} 
            addOnly={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setClientDialogOpen(false);
            setSelectedClient(null);
          }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

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
            <InstagramIcon sx={{ color: '#E1306C' }} />
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
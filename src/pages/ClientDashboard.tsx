import React, { useState, useEffect } from 'react';
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
  Avatar, 
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
  Search as SearchIcon,
  Instagram as InstagramIcon,
  CalendarMonth as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PostAdd as PostAddIcon,
  VideoCall as ReelsIcon,
  Collections as CarouselIcon,
  Image as StoryIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { clientService, postService } from '../services/supabaseClient';
import { Client } from '../types';
import ClientManager from '../components/ClientManager';

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
          
          const stats = {
            scheduled: posts.filter(p => p.status === 'scheduled').length,
            posted: posts.filter(p => p.status === 'posted').length,
            draft: posts.filter(p => p.status === 'draft').length
          };
          
          return { clientId: client.id, stats };
        } catch (err) {
          console.error(`Erro ao buscar posts do cliente ${client.id}:`, err);
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
      console.error('Erro ao carregar clientes:', err);
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
    // Atualizar estatísticas
    setClientStats(prev => ({
      ...prev,
      [client.id]: { scheduled: 0, posted: 0, draft: 0 }
    }));
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
      console.error('Erro ao excluir cliente:', err);
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

  // Função para obter a imagem do avatar
  const getAvatarImage = (client: Client) => {
    // Priorizar a foto do perfil do Instagram
    if (client.profilePicture) {
      return client.profilePicture;
    }
    // Fallback para o logo do cliente
    return client.logoUrl;
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
                elevation={2}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardActionArea 
                onClick={() => handleViewCalendar(client)}
                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <Box sx={{ 
                    height: 120, 
                    bgcolor: 'primary.light', 
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    <Avatar 
                      src={getAvatarImage(client)} 
                      alt={client.name}
                      sx={{ 
                        width: 80, 
                        height: 80,
                        border: client.profilePicture ? '3px solid #e0e0e0ff' : '4px solid white',
                        boxShadow: 2
                      }}
                    >
                      {client.name.charAt(0)}
                    </Avatar>
                    {client.profilePicture && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          bgcolor: '#000000ff',
                          borderRadius: '50%',
                          p: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <InstagramIcon sx={{ fontSize: 16, color: 'white' }} />
                      </Box>
                    )}
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                    <Typography variant="h6" align="center" noWrap sx={{ mb: 1 }}>
                      {client.name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      align="center"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 3
                      }}
                    >
                      <InstagramIcon sx={{ fontSize: 16, mr: 0.5, color: '#E1306C' }} />
                      @{client.instagram}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Cards de estatísticas com melhor espaçamento */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: 2,
                      mt: 2 
                    }}>
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          borderRadius: 1.5,
                          border: '1px solid rgba(25, 118, 210, 0.12)'
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          color="primary" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            mb: 0.5
                          }}
                        >
                          {clientStats[client.id]?.scheduled || 0}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          Agendados
                        </Typography>
                      </Paper>
                      
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          bgcolor: 'rgba(46, 125, 50, 0.08)',
                          borderRadius: 1.5,
                          border: '1px solid rgba(46, 125, 50, 0.12)'
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          color="success.main" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            mb: 0.5
                          }}
                        >
                          {clientStats[client.id]?.posted || 0}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          Publicados
                        </Typography>
                      </Paper>
                      
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          bgcolor: 'rgba(117, 117, 117, 0.08)',
                          borderRadius: 1.5,
                          border: '1px solid rgba(117, 117, 117, 0.12)'
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          color="text.secondary" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            mb: 0.5
                          }}
                        >
                          {clientStats[client.id]?.draft || 0}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          Rascunhos
                        </Typography>
                      </Paper>
                    </Box>
                  </CardContent>
                </CardActionArea>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                  <Box>
                    <Tooltip title="Editar cliente">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                          setClientDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
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
                  
                  <Box>
                    <Tooltip title="Criar post">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatePost(client);
                        }}
                      >
                        <PostAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Criar story">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateStory(client);
                        }}
                      >
                        <StoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Ver calendário">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCalendar(client);
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
            {selectedClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <ClientManager 
            clients={clients} 
            onAddClient={handleAddClient} 
            onSelectClient={() => {}} 
            selectedClientId={selectedClient?.id || ""}
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
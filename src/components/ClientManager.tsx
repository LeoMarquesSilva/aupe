import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Typography, 
  Divider, 
  Paper,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Instagram as InstagramIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { clientService } from '../services/supabaseClient';
import { Client } from '../types';
import ConnectInstagram from './ConnectInstagram';
import { InstagramAuthData } from '../services/instagramAuthService';

interface ClientManagerProps {
  clients: Client[];
  // Props opcionais para compatibilidade com diferentes usos
  onAddClient?: (client: Client) => void;
  onSelectClient?: (clientId: string) => void;
  selectedClientId?: string;
  // Novas props para o StoryCalendar
  onClientAdded?: (newClient: Omit<Client, 'id'>) => Promise<void>;
  onClientUpdated?: (updatedClient: Client) => void;
  onClientDeleted?: (clientId: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ 
  clients, 
  onAddClient,
  onSelectClient,
  selectedClientId,
  onClientAdded,
  onClientUpdated,
  onClientDeleted
}) => {
  const [name, setName] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [appId, setAppId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<number>(0);

  const handleAddClient = async () => {
    if (!name || !instagram) {
      setError('Nome e usuário do Instagram são obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientData = {
        name,
        instagram,
        logoUrl,
        appId,
        accessToken,
        userId
      };

      // Se temos onClientAdded (usado no StoryCalendar), usar ela
      if (onClientAdded) {
        await onClientAdded(clientData);
      } else {
        // Caso contrário, criar o cliente e notificar via onAddClient
        const newClient = await clientService.addClient(clientData);
        if (onAddClient) {
          onAddClient(newClient);
        }
      }

      // Limpar formulário
      setName('');
      setInstagram('');
      setLogoUrl('');
      setAppId('');
      setAccessToken('');
      setUserId('');

    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      setError('Erro ao adicionar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editingClient.name || !editingClient.instagram) {
      setError('Nome e usuário do Instagram são obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedClient = await clientService.updateClient(editingClient);
      
      // Notificar o componente pai sobre a atualização
      if (onClientUpdated) {
        onClientUpdated(updatedClient);
      }
      
      setEditingClient(null);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      setError('Erro ao atualizar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await clientService.deleteClient(clientToDelete.id);
      
      // Notificar o componente pai sobre a exclusão
      if (onClientDeleted) {
        onClientDeleted(clientToDelete.id);
      }
      
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setError('Erro ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    if (onSelectClient) {
      onSelectClient(client.id);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
  };

  const handleConfirmDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleConnectionUpdate = (clientId: string, instagramData: InstagramAuthData | null) => {
    // Atualizar cliente com dados do Instagram
    if (instagramData) {
      const clientToUpdate = clients.find(c => c.id === clientId);
      if (clientToUpdate) {
        const updatedClient: Client = {
          ...clientToUpdate,
          instagramAccountId: instagramData.instagramAccountId,
          accessToken: instagramData.accessToken,
          username: instagramData.username,
          profilePicture: instagramData.profilePicture,
          tokenExpiry: instagramData.tokenExpiry,
          pageId: instagramData.pageId,
          pageName: instagramData.pageName
        };
        
        clientService.updateClient(updatedClient)
          .then((updated) => {
            console.log('Cliente atualizado com dados do Instagram');
            // Notificar o componente pai sobre a atualização
            if (onClientUpdated) {
              onClientUpdated(updated);
            }
          })
          .catch(err => {
            console.error('Erro ao atualizar cliente com dados do Instagram:', err);
          });
      }
    }
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

  // Filtrar clientes com base na pesquisa
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.instagram.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 0 }}>
      <Tabs 
        value={currentTab} 
        onChange={(_, newValue) => setCurrentTab(newValue)}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: '#f9f9f9'
        }}
      >
        <Tab label="Lista de Clientes" />
        <Tab label="Adicionar Cliente" />
      </Tabs>

      {currentTab === 0 && (
        <Box sx={{ p: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {filteredClients.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 4
            }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Nenhum cliente encontrado
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => setCurrentTab(1)}
              >
                Adicionar Cliente
              </Button>
            </Box>
          ) : (
            <List sx={{ 
              maxHeight: 'calc(100vh - 300px)', 
              overflow: 'auto',
              '& .MuiListItem-root': {
                borderRadius: 1,
                mb: 1,
                border: '1px solid rgba(0,0,0,0.08)',
                bgcolor: 'background.paper'
              }
            }}>
              {filteredClients.map((client) => (
                <Paper 
                  key={client.id} 
                  elevation={0}
                  sx={{ 
                    mb: 2, 
                    borderRadius: 2,
                    border: client.id === selectedClientId ? '2px solid #E1306C' : '1px solid rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}
                >
                  {editingClient && editingClient.id === client.id ? (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                        Editar Cliente
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                          <TextField
                            fullWidth
                            label="Nome"
                            variant="outlined"
                            value={editingClient.name}
                            onChange={(e) => setEditingClient({...editingClient, name: e.target.value})}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                          <TextField
                            fullWidth
                            label="Instagram"
                            variant="outlined"
                            value={editingClient.instagram}
                            onChange={(e) => setEditingClient({...editingClient, instagram: e.target.value})}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">@</InputAdornment>,
                            }}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ flex: '1 1 100%' }}>
                          <TextField
                            fullWidth
                            label="URL do Logo"
                            variant="outlined"
                            value={editingClient.logoUrl || ''}
                            onChange={(e) => setEditingClient({...editingClient, logoUrl: e.target.value})}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button 
                          startIcon={<CancelIcon />}
                          onClick={handleCancelEdit}
                          sx={{ mr: 1 }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          variant="contained"
                          color="primary"
                          startIcon={<SaveIcon />}
                          onClick={handleUpdateClient}
                          disabled={loading}
                        >
                          {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 2
                      }}>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: onSelectClient ? 'pointer' : 'default',
                            flexGrow: 1
                          }}
                          onClick={() => onSelectClient && handleSelectClient(client)}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={getAvatarImage(client)} 
                              alt={client.name}
                              sx={{ 
                                width: 56, 
                                height: 56,
                                border: client.profilePicture ? '2px solid #E1306C' : 'none'
                              }}
                            >
                              {client.name.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" variant="subtitle1" sx={{ fontWeight: 500 }}>
                                  {client.name}
                                </Typography>
                                {client.profilePicture && (
                                  <InstagramIcon sx={{ fontSize: 16, color: '#E1306C' }} />
                                )}
                              </Box>
                            } 
                            secondary={
                              <Typography component="span" variant="body2">
                                @{client.instagram}
                              </Typography>
                            }
                          />
                        </Box>
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditClient(client)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleConfirmDelete(client)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Divider />
                      
                      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                          <InstagramIcon fontSize="small" sx={{ mr: 1, color: '#E1306C' }} />
                          Conexão com Instagram
                        </Typography>
                        
                        <ConnectInstagram 
                          client={client}
                          onConnectionUpdate={handleConnectionUpdate}
                        />
                      </Box>
                    </>
                  )}
                </Paper>
              ))}
            </List>
          )}
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Adicionar Novo Cliente
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Nome do Cliente"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Box>
            
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Usuário do Instagram"
                variant="outlined"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">@</InputAdornment>,
                }}
              />
            </Box>
            
            <Box sx={{ flex: '1 1 100%' }}>
              <TextField
                fullWidth
                label="URL do Logo"
                variant="outlined"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
                helperText="Opcional: URL para o logo do cliente"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton>
                        <PhotoCameraIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClient}
                disabled={loading || !name || !instagram}
              >
                {loading ? <CircularProgress size={24} /> : 'Adicionar Cliente'}
              </Button>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Após adicionar o cliente, você poderá conectar a conta do Instagram na aba "Lista de Clientes".
          </Typography>
        </Box>
      )}

      {/* Diálogo de confirmação para exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
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
    </Box>
  );
};

export default ClientManager;
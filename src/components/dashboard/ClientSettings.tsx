import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Instagram as InstagramIcon
} from '@mui/icons-material';
import { Client } from '../../types';

interface ClientSettingsProps {
  client: Client;
  hasInstagramAuth: boolean;
  onEditClient: () => void;
  onConnectInstagram: () => void;
  onDisconnectInstagram: () => void;
}

const ClientSettings: React.FC<ClientSettingsProps> = ({
  client,
  hasInstagramAuth,
  onEditClient,
  onConnectInstagram,
  onDisconnectInstagram
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Informações do Cliente</Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Nome:</Typography>
            <Typography variant="body1">{client.name}</Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Instagram:</Typography>
            <Typography variant="body1">@{client.instagram}</Typography>
          </Box>
          
          {client.username && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Nome de usuário:</Typography>
              <Typography variant="body1">{client.username}</Typography>
            </Box>
          )}
          
          <Button 
            variant="contained" 
            startIcon={<EditIcon />}
            onClick={onEditClient}
            sx={{ mt: 1, color: '#ffffff' }}
          >
            Editar Informações
          </Button>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Conexão com Instagram</Typography>
          
          {hasInstagramAuth ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Esta conta está conectada ao Instagram.
              </Alert>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>ID da conta:</Typography>
                <Typography variant="body1">{client.instagramAccountId}</Typography>
              </Box>
              
              {client.tokenExpiry && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Validade do token:</Typography>
                  <Typography variant="body1">{new Date(client.tokenExpiry).toLocaleDateString()}</Typography>
                </Box>
              )}
              
              <Button 
                variant="outlined" 
                color="error"
                onClick={onDisconnectInstagram}
                sx={{ mt: 1 }}
              >
                Desconectar
              </Button>
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta conta não está conectada ao Instagram.
              </Alert>
              
              <Button 
                variant="contained" 
                startIcon={<InstagramIcon />}
                onClick={onConnectInstagram}
                sx={{ mt: 1, color: '#ffffff' }}
              >
                Conectar ao Instagram
              </Button>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ClientSettings;
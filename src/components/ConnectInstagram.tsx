import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper,
  Avatar,
  Chip,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Instagram as InstagramIcon,
  Refresh as RefreshIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { getAuthorizationUrl, InstagramAuthData, verifyToken } from '../services/instagramAuthService';
import { Client } from '../types';

interface ConnectInstagramProps {
  client: Client;
  onConnectionUpdate: (clientId: string, instagramData: InstagramAuthData | null) => void;
}

const ConnectInstagram: React.FC<ConnectInstagramProps> = ({ client, onConnectionUpdate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [instagramData, setInstagramData] = useState<InstagramAuthData | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Verificar se já existe uma conexão salva para este cliente
  useEffect(() => {
    const savedData = localStorage.getItem(`instagram_connection_${client.id}`);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as InstagramAuthData;
        setInstagramData(parsedData);
        setConnected(true);
        
        // Verificar se o token ainda é válido
        verifyTokenValidity(parsedData.accessToken);
      } catch (err) {
        console.error('Erro ao carregar dados de conexão salvos:', err);
        localStorage.removeItem(`instagram_connection_${client.id}`);
      }
    }
  }, [client.id]);

  // Função para verificar se o token ainda é válido
  const verifyTokenValidity = async (token: string) => {
    setVerifying(true);
    try {
      const isValid = await verifyToken(token);
      if (!isValid) {
        setError('O token de acesso expirou. Por favor, reconecte sua conta.');
        setConnected(false);
        localStorage.removeItem(`instagram_connection_${client.id}`);
        setInstagramData(null);
        onConnectionUpdate(client.id, null);
      }
    } catch (err) {
      console.error('Erro ao verificar token:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Função para iniciar o processo de conexão
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Gerar URL de autorização através da API
      const response = await fetch(getAuthorizationUrl());
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error('Não foi possível gerar URL de autorização');
      }
      
      // Abrir popup para autenticação
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const popup = window.open(
        data.authUrl,
        'instagram-auth',
        `width=${width},height=${height},top=${top},left=${left}`
      );
      
      // Monitorar quando o popup fechar
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          handlePopupClosed();
        }
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erro ao iniciar processo de conexão');
      console.error('Erro ao conectar Instagram:', err);
    }
  };

  // Função chamada quando o popup é fechado
  const handlePopupClosed = async () => {
    try {
      // Verificar se temos os dados no localStorage (serão salvos pelo callback)
      const savedData = localStorage.getItem(`instagram_auth_temp_data`);
      
      if (savedData) {
        const authData = JSON.parse(savedData) as InstagramAuthData;
        
        // Salvar dados específicos para este cliente
        localStorage.setItem(`instagram_connection_${client.id}`, savedData);
        
        // Limpar dados temporários
        localStorage.removeItem('instagram_auth_temp_data');
        
        // Atualizar estado
        setInstagramData(authData);
        setConnected(true);
        
        // Notificar componente pai
        onConnectionUpdate(client.id, authData);
      } else {
        // Verificar se houve erro
        const errorData = localStorage.getItem('instagram_auth_error');
        if (errorData) {
          setError(errorData);
          localStorage.removeItem('instagram_auth_error');
        } else {
          setError('A conexão foi cancelada ou falhou');
        }
      }
    } catch (err) {
      console.error('Erro ao processar dados de autenticação:', err);
      setError('Erro ao processar dados de autenticação');
    } finally {
      setLoading(false);
    }
  };

  // Função para desconectar a conta
  const handleDisconnect = () => {
    localStorage.removeItem(`instagram_connection_${client.id}`);
    setConnected(false);
    setInstagramData(null);
    onConnectionUpdate(client.id, null);
  };

  // Renderizar botão de conexão ou informações da conta conectada
  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {!connected ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<InstagramIcon />}
          onClick={handleConnect}
          disabled={loading}
          sx={{ 
            bgcolor: '#E1306C',
            '&:hover': {
              bgcolor: '#C13584'
            },
            borderRadius: 2,
            px: 3,
            py: 1.2
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Conectando...
            </>
          ) : (
            'Conectar Instagram'
          )}
        </Button>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'rgba(0,0,0,0.02)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              src={instagramData?.profilePicture} 
              sx={{ width: 48, height: 48, mr: 2 }}
            >
              <InstagramIcon />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mr: 1 }}>
                  @{instagramData?.username}
                </Typography>
                <Chip 
                  icon={<CheckCircleIcon sx={{ fontSize: '0.8rem !important' }} />}
                  label="Conectado" 
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Conectado via {instagramData?.pageName}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Tooltip title="Verificar conexão">
              <IconButton 
                size="small" 
                onClick={() => verifyTokenValidity(instagramData?.accessToken || '')}
                disabled={verifying}
                sx={{ mr: 1 }}
              >
                {verifying ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Desconectar">
              <IconButton 
                size="small" 
                onClick={handleDisconnect}
                color="error"
              >
                <LinkOffIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ConnectInstagram;
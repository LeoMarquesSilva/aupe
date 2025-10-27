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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Instagram as InstagramIcon,
  Refresh as RefreshIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { getAuthorizationUrl, InstagramAuthData } from '../services/instagramAuthService';
import { Client } from '../types';
import axios from 'axios';

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
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [showTokenInfo, setShowTokenInfo] = useState<boolean>(false);

  // Constantes para autenticação
  const META_APP_ID = '1087259016929287';
  const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';

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
    setError(null);
    
    try {
      // Verificar token usando o endpoint debug_token
      const response = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: token,
          access_token: `${META_APP_ID}|${META_APP_SECRET}`
        }
      });
      
      const tokenData = response.data.data;
      console.log('Dados do token:', tokenData);
      
      // Salvar informações do token para exibição
      setTokenInfo(tokenData);
      
      if (!tokenData.is_valid) {
        setError('O token de acesso não é mais válido. Por favor, reconecte sua conta.');
        setConnected(false);
        localStorage.removeItem(`instagram_connection_${client.id}`);
        setInstagramData(null);
        onConnectionUpdate(client.id, null);
        return;
      }
      
      // Verificar se o token é do tipo esperado (PAGE)
      if (tokenData.type !== 'PAGE') {
        console.warn('O token não é do tipo PAGE, pode expirar:', tokenData.type);
      }
      
      // Verificar se o token tem data de expiração
      if (tokenData.expires_at) {
        const expiryDate = new Date(tokenData.expires_at * 1000);
        const now = new Date();
        
        // Se o token expira em menos de 7 dias, mostrar aviso
        if (expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
          setError(`O token expirará em ${Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} dias. Recomendamos reconectar sua conta.`);
        }
      }
      
      // Testar o token fazendo uma chamada simples
      try {
        const testResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramData?.instagramAccountId}`, {
          params: {
            access_token: token,
            fields: 'username'
          }
        });
        console.log('Teste do token bem-sucedido:', testResponse.data);
      } catch (testError) {
        console.error('Erro ao testar token:', testError);
        setError('O token parece ser válido, mas falhou em um teste prático. Recomendamos reconectar sua conta.');
      }
    } catch (err: any) {
      console.error('Erro ao verificar token:', err);
      setError('Não foi possível verificar o token. Por favor, reconecte sua conta.');
      setConnected(false);
      localStorage.removeItem(`instagram_connection_${client.id}`);
      setInstagramData(null);
      onConnectionUpdate(client.id, null);
    } finally {
      setVerifying(false);
    }
  };

  // Função para iniciar o processo de conexão
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Obter a URL de autorização diretamente
      const authUrl = getAuthorizationUrl();
      
      // Abrir popup para autenticação
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
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
            <Tooltip title="Informações do token">
              <IconButton 
                size="small" 
                onClick={() => setShowTokenInfo(true)}
                sx={{ mr: 1 }}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
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
      
      {/* Dialog para mostrar informações do token */}
      <Dialog open={showTokenInfo} onClose={() => setShowTokenInfo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Informações do Token</DialogTitle>
        <DialogContent>
          {tokenInfo ? (
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Válido: {tokenInfo.is_valid ? 'Sim' : 'Não'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Tipo: {tokenInfo.type}</Typography>
              
              {tokenInfo.expires_at ? (
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Expira em: {new Date(tokenInfo.expires_at * 1000).toLocaleString()}
                </Typography>
              ) : (
                <Typography variant="subtitle2" sx={{ mt: 1, color: 'success.main' }}>
                  Não expira automaticamente
                </Typography>
              )}
              
              <Typography variant="subtitle2" sx={{ mt: 1 }}>App ID: {tokenInfo.app_id}</Typography>
              
              {tokenInfo.scopes && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Permissões:</Typography>
                  <Box sx={{ mt: 0.5, pl: 2 }}>
                    {tokenInfo.scopes.map((scope: string) => (
                      <Typography key={scope} variant="body2" sx={{ fontSize: '0.8rem' }}>
                        • {scope}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Tokens de página do Facebook não expiram automaticamente a menos que as permissões sejam revogadas.
                Se você estiver enfrentando problemas com a expiração do token, tente reconectar sua conta.
              </Alert>
            </Box>
          ) : (
            <Typography>Nenhuma informação disponível</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTokenInfo(false)}>Fechar</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              setShowTokenInfo(false);
              handleConnect();
            }}
          >
            Reconectar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConnectInstagram;
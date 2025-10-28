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
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Constantes para autenticação
  const META_APP_ID = '1087259016929287';
  const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';

  // Função para adicionar logs de debug
  const addDebug = (message: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    setDebugLog(prev => [...prev, logMessage]);
  };

  // Verificar se já existe uma conexão salva para este cliente
  useEffect(() => {
    const savedData = localStorage.getItem(`instagram_connection_${client.id}`);
    if (savedData) {
      try {
        addDebug(`Carregando dados salvos para o cliente ${client.id}`);
        const parsedData = JSON.parse(savedData) as InstagramAuthData;
        
        // Garantir que a data de expiração seja um objeto Date
        if (typeof parsedData.tokenExpiry === 'string') {
          parsedData.tokenExpiry = new Date(parsedData.tokenExpiry);
        }
        
        addDebug(`Dados carregados: @${parsedData.username}, ID: ${parsedData.instagramAccountId}`);
        setInstagramData(parsedData);
        setConnected(true);
        
        // Verificar se o token ainda é válido
        verifyTokenValidity(parsedData.accessToken);
      } catch (err) {
        console.error('Erro ao carregar dados de conexão salvos:', err);
        addDebug(`Erro ao carregar dados salvos: ${err}`);
        localStorage.removeItem(`instagram_connection_${client.id}`);
      }
    } else {
      addDebug(`Nenhum dado salvo encontrado para o cliente ${client.id}`);
    }
  }, [client.id]);

  // Função para verificar se o token ainda é válido
  const verifyTokenValidity = async (token: string) => {
    setVerifying(true);
    setError(null);
    
    try {
      addDebug('Iniciando verificação do token...');
      
      // Verificar token diretamente com a API do Facebook
      addDebug('Chamando API debug_token do Facebook...');
      const response = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: token,
          access_token: `${META_APP_ID}|${META_APP_SECRET}`
        }
      });
      
      const tokenData = response.data.data;
      addDebug(`Token válido: ${tokenData.is_valid}, Tipo: ${tokenData.type}`);
      
      // Salvar informações do token para exibição
      setTokenInfo(tokenData);
      
      if (!tokenData.is_valid) {
        addDebug('Token inválido, solicitando reconexão');
        setError('O token de acesso não é mais válido. Por favor, reconecte sua conta.');
        setConnected(false);
        localStorage.removeItem(`instagram_connection_${client.id}`);
        setInstagramData(null);
        onConnectionUpdate(client.id, null);
        return;
      }
      
      // Verificar se o token é do tipo esperado (PAGE)
      if (tokenData.type !== 'PAGE') {
        addDebug(`Aviso: Token não é do tipo PAGE, é do tipo ${tokenData.type}`);
      }
      
      // Verificar se o token tem data de expiração
      if (tokenData.expires_at) {
        const expiryDate = new Date(tokenData.expires_at * 1000);
        addDebug(`Token expira em: ${expiryDate.toLocaleString()}`);
        
        const now = new Date();
        
        // Se o token expira em menos de 7 dias, mostrar aviso
        if (expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
          setError(`O token expirará em ${Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} dias. Recomendamos reconectar sua conta.`);
        }
      } else {
        addDebug('Token não tem data de expiração (não expira automaticamente)');
      }
      
      // Testar o token fazendo uma chamada simples
      if (instagramData?.instagramAccountId) {
        try {
          addDebug(`Testando token com chamada para a conta ${instagramData.instagramAccountId}...`);
          const testResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramData.instagramAccountId}`, {
            params: {
              access_token: token,
              fields: 'username'
            }
          });
          addDebug(`Teste bem-sucedido: @${testResponse.data.username}`);
        } catch (testError: any) {
          addDebug(`Erro no teste prático: ${testError.message}`);
          console.error('Erro ao testar token:', testError);
          
          // Tentar uma abordagem diferente - buscar as páginas do Facebook
          try {
            addDebug('Tentando abordagem alternativa: buscar páginas do Facebook...');
            const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
              params: {
                access_token: token,
                fields: 'instagram_business_account,name,id'
              }
            });
            
            const pages = pagesResponse.data.data || [];
            addDebug(`Páginas encontradas: ${pages.length}`);
            
            // Encontrar a página com a conta do Instagram
            const pageWithInstagram = pages.find((page: any) => 
              page.instagram_business_account && 
              page.instagram_business_account.id === instagramData.instagramAccountId
            );
            
            if (pageWithInstagram) {
              addDebug(`Página encontrada: ${pageWithInstagram.name}`);
              // Atualizar o token se necessário
              if (pageWithInstagram.access_token !== token) {
                addDebug('Atualizando token com o novo token da página');
                
                // Atualizar os dados salvos
                const updatedData = {
                  ...instagramData,
                  accessToken: pageWithInstagram.access_token
                };
                
                localStorage.setItem(`instagram_connection_${client.id}`, JSON.stringify(updatedData));
                setInstagramData(updatedData);
                onConnectionUpdate(client.id, updatedData);
                
                addDebug('Token atualizado com sucesso');
              }
            } else {
              throw new Error('Página com Instagram não encontrada');
            }
          } catch (alternativeError: any) {
            addDebug(`Abordagem alternativa falhou: ${alternativeError.message}`);
            setError('O token parece ser válido, mas falhou em um teste prático. Recomendamos reconectar sua conta.');
          }
        }
      } else {
        addDebug('ID da conta do Instagram não disponível, não é possível fazer o teste prático');
        setError('Dados da conta do Instagram incompletos. Recomendamos reconectar sua conta.');
      }
    } catch (err: any) {
      console.error('Erro ao verificar token:', err);
      addDebug(`Erro na verificação do token: ${err.message}`);
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
    setDebugLog([]);
    addDebug('Iniciando processo de conexão...');
    
    try {
      // Obter a URL de autorização diretamente
      const authUrl = getAuthorizationUrl();
      addDebug(`URL de autorização gerada: ${authUrl.substring(0, 50)}...`);
      
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
      
      if (!popup) {
        throw new Error('Não foi possível abrir a janela de autenticação. Verifique se os popups estão permitidos.');
      }
      
      addDebug('Janela de autenticação aberta');
      
      // Monitorar quando o popup fechar
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          addDebug('Janela de autenticação fechada');
          handlePopupClosed();
        }
      }, 500);
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err.message || 'Erro ao iniciar processo de conexão';
      setError(errorMessage);
      addDebug(`Erro: ${errorMessage}`);
      console.error('Erro ao conectar Instagram:', err);
    }
  };

  // Função chamada quando o popup é fechado
  const handlePopupClosed = async () => {
    try {
      addDebug('Processando resultado da autenticação...');
      
      // Verificar se temos os dados no localStorage (serão salvos pelo callback)
      const savedData = localStorage.getItem(`instagram_auth_temp_data`);
      
      if (savedData) {
        addDebug('Dados temporários de autenticação encontrados');
        const authData = JSON.parse(savedData) as InstagramAuthData;
        
        // Garantir que a data de expiração seja um objeto Date
        if (typeof authData.tokenExpiry === 'string') {
          authData.tokenExpiry = new Date(authData.tokenExpiry);
        }
        
        addDebug(`Dados obtidos: @${authData.username}, ID: ${authData.instagramAccountId}`);
        
        // Salvar dados específicos para este cliente
        localStorage.setItem(`instagram_connection_${client.id}`, savedData);
        addDebug(`Dados salvos para o cliente ${client.id}`);
        
        // Limpar dados temporários
        localStorage.removeItem('instagram_auth_temp_data');
        
        // Atualizar estado
        setInstagramData(authData);
        setConnected(true);
        
        // Notificar componente pai
        onConnectionUpdate(client.id, authData);
        addDebug('Componente pai notificado sobre a conexão');
      } else {
        // Verificar se houve erro
        const errorData = localStorage.getItem('instagram_auth_error');
        if (errorData) {
          addDebug(`Erro encontrado: ${errorData}`);
          setError(errorData);
          localStorage.removeItem('instagram_auth_error');
        } else {
          addDebug('Nenhum dado ou erro encontrado, conexão cancelada ou falhou');
          setError('A conexão foi cancelada ou falhou');
        }
      }
    } catch (err: any) {
      console.error('Erro ao processar dados de autenticação:', err);
      addDebug(`Erro ao processar dados: ${err.message}`);
      setError('Erro ao processar dados de autenticação');
    } finally {
      setLoading(false);
    }
  };

  // Função para desconectar a conta
  const handleDisconnect = () => {
    addDebug('Desconectando conta...');
    localStorage.removeItem(`instagram_connection_${client.id}`);
    setConnected(false);
    setInstagramData(null);
    onConnectionUpdate(client.id, null);
    addDebug('Conta desconectada');
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
      
      {/* Botão para ativar/desativar modo de debug */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          variant="text" 
          color="inherit" 
          onClick={() => setDebugMode(!debugMode)}
          sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
        >
          {debugMode ? 'Ocultar logs' : 'Mostrar logs'}
        </Button>
      </Box>
      
      {/* Logs de debug */}
      {debugMode && debugLog.length > 0 && (
        <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Logs de debug:</Typography>
          <Box 
            sx={{ 
              mt: 1, 
              maxHeight: 200, 
              overflowY: 'auto', 
              fontFamily: 'monospace', 
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {debugLog.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </Box>
        </Box>
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
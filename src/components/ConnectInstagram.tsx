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
import { clientService } from '../services/supabaseClient';
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
  const [debugMode, setDebugMode] = useState<boolean>(true); // Modo debug ativado por padrão
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

  // Verificar se o cliente já tem dados de autenticação do Instagram
  useEffect(() => {
    const checkInstagramAuth = async () => {
      try {
        addDebug(`Verificando dados de autenticação para o cliente ${client.id}`);
        
        // Verificar se o cliente já tem dados de autenticação do Instagram
        if (
          client.instagramAccountId && 
          client.accessToken && 
          client.username
        ) {
          addDebug(`Cliente tem dados de autenticação: @${client.username}, ID: ${client.instagramAccountId}`);
          
          // Criar objeto com os dados de autenticação
          const authData: InstagramAuthData = {
            instagramAccountId: client.instagramAccountId,
            accessToken: client.accessToken,
            username: client.username,
            profilePicture: client.profilePicture || '',
            tokenExpiry: client.tokenExpiry || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 anos se não tiver data
            pageId: client.pageId || '',
            pageName: client.pageName || ''
          };
          
          setInstagramData(authData);
          setConnected(true);
          
          // Verificar se o token ainda é válido
          verifyTokenValidity(authData.accessToken);
        } else {
          addDebug('Cliente não tem dados de autenticação do Instagram');
        }
      } catch (err: any) {
        console.error('Erro ao verificar autenticação do Instagram:', err);
        addDebug(`Erro ao verificar autenticação: ${err.message}`);
      }
    };
    
    checkInstagramAuth();
  }, [client]);

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
        
        // Remover dados de autenticação do Supabase
        await clientService.removeInstagramAuth(client.id);
        
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
      
      // Buscar páginas do Facebook para obter o ID da conta do Instagram
      try {
        addDebug('Buscando páginas do Facebook para obter dados atualizados...');
        const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
          params: {
            access_token: token,
            fields: 'instagram_business_account,name,id,access_token'
          }
        });
        
        const pages = pagesResponse.data.data || [];
        addDebug(`Páginas encontradas: ${pages.length}`);
        
        if (pages.length === 0) {
          throw new Error('Nenhuma página do Facebook encontrada');
        }
        
        // Encontrar a primeira página com uma conta do Instagram vinculada
        const pageWithInstagram = pages.find((page: any) => page.instagram_business_account);
        
        if (!pageWithInstagram) {
          throw new Error('Nenhuma página com conta do Instagram vinculada encontrada');
        }
        
        addDebug(`Página encontrada: ${pageWithInstagram.name}`);
        addDebug(`ID da conta do Instagram: ${pageWithInstagram.instagram_business_account.id}`);
        
        // Buscar dados da conta do Instagram
        const instagramAccountId = pageWithInstagram.instagram_business_account.id;
        const instagramResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
          params: {
            access_token: pageWithInstagram.access_token,
            fields: 'username,profile_picture_url'
          }
        });
        
        const instagramData = instagramResponse.data;
        addDebug(`Dados da conta obtidos: @${instagramData.username}`);
        
        // Atualizar os dados salvos
        const updatedData: InstagramAuthData = {
          instagramAccountId,
          accessToken: pageWithInstagram.access_token,
          username: instagramData.username,
          profilePicture: instagramData.profile_picture_url,
          tokenExpiry: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 anos
          pageId: pageWithInstagram.id,
          pageName: pageWithInstagram.name
        };
        
        addDebug('Atualizando dados no Supabase com informações mais recentes');
        
        // Salvar dados no Supabase
        await clientService.saveInstagramAuth(client.id, updatedData);
        
        setInstagramData(updatedData);
        onConnectionUpdate(client.id, updatedData);
        
        addDebug('Dados atualizados com sucesso no Supabase');
      } catch (fetchError: any) {
        addDebug(`Erro ao buscar dados atualizados: ${fetchError.message}`);
        
        // Se não conseguirmos atualizar os dados, mas o token é válido,
        // não desconectamos a conta, apenas mostramos um aviso
        if (instagramData) {
          setError('Não foi possível atualizar os dados da conta. Recomendamos reconectar sua conta.');
        } else {
          setError('Não foi possível obter os dados da conta. Por favor, reconecte sua conta.');
          setConnected(false);
        }
      }
    } catch (err: any) {
      console.error('Erro ao verificar token:', err);
      addDebug(`Erro na verificação do token: ${err.message}`);
      setError('Não foi possível verificar o token. Por favor, reconecte sua conta.');
      setConnected(false);
      
      // Remover dados de autenticação do Supabase
      await clientService.removeInstagramAuth(client.id);
      
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
      // Limpar dados temporários que possam existir
      localStorage.removeItem('instagram_auth_temp_data');
      localStorage.removeItem('instagram_auth_error');
      
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
        
        addDebug(`Dados brutos: ${JSON.stringify(authData)}`);
        
        // Garantir que todos os campos necessários existam
        if (!authData.instagramAccountId) {
          addDebug('ERRO: ID da conta do Instagram não encontrado nos dados temporários');
          throw new Error('Dados da conta do Instagram incompletos');
        }
        
        // Garantir que a data de expiração seja um objeto Date
        if (typeof authData.tokenExpiry === 'string') {
          authData.tokenExpiry = new Date(authData.tokenExpiry);
        }
        
        addDebug(`Dados obtidos: @${authData.username}, ID: ${authData.instagramAccountId}`);
        
        // Salvar dados no Supabase
        addDebug('Salvando dados no Supabase...');
        await clientService.saveInstagramAuth(client.id, authData);
        addDebug('Dados salvos no Supabase com sucesso');
        
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
  const handleDisconnect = async () => {
    addDebug('Desconectando conta...');
    
    try {
      // Remover dados de autenticação do Supabase
      await clientService.removeInstagramAuth(client.id);
      addDebug('Dados de autenticação removidos do Supabase');
      
      setConnected(false);
      setInstagramData(null);
      onConnectionUpdate(client.id, null);
      addDebug('Conta desconectada com sucesso');
    } catch (err: any) {
      console.error('Erro ao desconectar conta:', err);
      addDebug(`Erro ao desconectar conta: ${err.message}`);
      setError('Erro ao desconectar conta. Por favor, tente novamente.');
    }
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
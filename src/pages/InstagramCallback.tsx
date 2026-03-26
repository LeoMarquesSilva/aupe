import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InstagramAccountSelector from '../components/InstagramAccountSelector';
import { clientService } from '../services/supabaseClient';

const getClientIdFromCallback = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  // Instagram deve retornar o `state` enviado na autorização; `client_id` é fallback legado.
  const rawClientId = urlParams.get('state') || urlParams.get('client_id');
  if (!rawClientId) return null;

  const clientId = rawClientId.trim();
  if (!clientId) return null;
  return clientId;
};

const InstagramCallback: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obter o código da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        console.log('🔍 Processando callback do Instagram:', { 
          hasCode: !!code, 
          error, 
          errorDescription 
        });
        
        if (error) {
          let errorMessage = 'Autorização negada ou cancelada pelo usuário.';
          
          if (error === 'access_denied') {
            errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para continuar.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }
          
          throw new Error(errorMessage);
        }
        
        if (!code) {
          throw new Error('Código de autorização não encontrado na URL. Por favor, tente novamente.');
        }

        const callbackClientId = getClientIdFromCallback();
        if (!callbackClientId) {
          throw new Error('ID do cliente não encontrado no callback. Feche e inicie a conexão novamente pelo cliente correto.');
        }
        
        console.log('✅ Código de autorização recebido, iniciando seletor de contas');
        
        // Ir direto para o seletor de contas
        setAuthCode(code);
        setShowAccountSelector(true);
        
      } catch (err) {
        console.error('❌ Erro no callback do Instagram:', err);
        const errorMessage = (err as Error).message || 'Erro desconhecido durante a autenticação';
        setError(errorMessage);
        
        // Salvar mensagem de erro no localStorage
        localStorage.setItem('instagram_auth_error', errorMessage);
        
        // Fechar a janela de popup após um breve atraso
        setTimeout(() => {
          closeWindow();
        }, 5000);
      } finally {
        setLoading(false);
      }
    };
    
    processCallback();
  }, [navigate]);

  const closeWindow = () => {
    try {
      // Tentar fechar a janela popup
      if (window.opener && window.opener !== window) {
        window.close();
      } else {
        // Se não for uma popup, redirecionar para a página principal
        window.location.href = window.location.origin;
      }
    } catch (e) {
      console.log('Não foi possível fechar a janela automaticamente');
      // Fallback: redirecionar para a página principal
      window.location.href = window.location.origin;
    }
  };

  const handleAccountSelected = async (instagramData: any) => {
    console.log('✅ Conta selecionada:', instagramData);
    
    // Marcar como processando para evitar conflitos
    setIsProcessing(true);
    setSelectedUsername(instagramData.username);
    
    try {
      // Salvar dados no localStorage (para compatibilidade)
      localStorage.setItem('instagram_auth_temp_data', JSON.stringify(instagramData));
      localStorage.setItem('instagram_auth_success', 'true');
      
      // Salvar no Supabase usando a função existente
      await saveInstagramDataToSupabase(instagramData);
      
      setSuccess(true);
      setShowAccountSelector(false);
      
      console.log('🎉 Dados salvos com sucesso! Fechando janela em 3 segundos...');
      
      // Fechar a janela de popup após um breve atraso
      setTimeout(() => {
        closeWindow();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      setError(`Conta conectada, mas houve erro ao salvar os dados: ${(error as Error).message}`);
      setIsProcessing(false);
    }
  };

   const saveInstagramDataToSupabase = async (instagramData: any) => {
    try {
      console.log('💾 Salvando dados no Supabase usando clientService...');
      
      const clientId = getClientIdFromCallback();
      console.log('🔍 ClientId do callback:', { clientId });
      
      if (!clientId) {
        throw new Error('ID do cliente não encontrado no callback. Feche e conecte novamente pelo cliente desejado.');
      }
      
      console.log('✅ Cliente ID encontrado:', clientId);
      
      // Usar a função existente do clientService para salvar os dados
      const updatedClient = await clientService.saveInstagramAuth(clientId, instagramData);
      
      console.log('✅ Dados salvos no Supabase com sucesso:', updatedClient);
      
      // Notificar a janela pai sobre o sucesso
      if (window.opener) {
        window.opener.postMessage({
          type: 'INSTAGRAM_AUTH_SUCCESS',
          data: instagramData,
          clientId: clientId,
          updatedClient: updatedClient
        }, window.location.origin);
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      const message = (error as Error).message || 'Falha ao salvar autenticação';
      const isOrgMismatch =
        message.includes('não pertence à sua organização') ||
        message.includes('organização atual');
      const userMessage = isOrgMismatch
        ? 'Não foi possível salvar: este cliente está em outra organização. Abra o cliente correto ou peça ao admin para transferi-lo para sua organização.'
        : message;

      // Só manter fallback local quando não for erro de autorização multi-tenant.
      if (!isOrgMismatch) {
        console.log('📝 Dados mantidos no localStorage como fallback');
      }
      
      // Notificar a janela pai sobre o erro
      if (window.opener) {
        window.opener.postMessage({
          type: 'INSTAGRAM_AUTH_ERROR',
          error: userMessage,
          data: instagramData,
          clientId: getClientIdFromCallback() || 'unknown'
        }, window.location.origin);
      }
      
      throw new Error(userMessage);
    }
  };
  
  const handleSelectorClose = () => {
    // Só processar o cancelamento se não estiver processando uma seleção
    if (isProcessing) {
      console.log('⏳ Ignorando fechamento - conta sendo processada');
      return;
    }
    
    console.log('❌ Seleção de conta cancelada pelo usuário');
    setShowAccountSelector(false);
    setError('Seleção de conta cancelada pelo usuário.');
    
    localStorage.setItem('instagram_auth_error', 'Seleção cancelada pelo usuário');
    
    // Fechar a janela de popup após um breve atraso
    setTimeout(() => {
      closeWindow();
    }, 3000);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setIsProcessing(false);
    
    // Reprocessar o callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      setAuthCode(code);
      setShowAccountSelector(true);
      setLoading(false);
    } else {
      setError('Código de autorização não encontrado. Por favor, feche esta janela e tente novamente.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeWindow();
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        p: 3,
        textAlign: 'center',
        bgcolor: 'background.default'
      }}
    >
      {loading && (
        <>
          <CircularProgress size={60} sx={{ mb: 3, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Processando autenticação do Instagram...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Por favor, aguarde enquanto carregamos suas contas.
          </Typography>
        </>
      )}
      
      {error && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Erro na Autenticação
            </Typography>
            {error}
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button 
              variant="contained" 
              onClick={handleRetry}
              sx={{ 
                bgcolor: theme.palette.primary.main, 
                '&:hover': { bgcolor: theme.palette.primary.dark } 
              }}
            >
              Tentar Novamente
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleClose}
            >
              Fechar
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Esta janela será fechada automaticamente em alguns segundos...
          </Typography>
        </Box>
      )}
      
      {success && (
        <Box sx={{ maxWidth: 500, width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              🎉 Sucesso!
            </Typography>
            Conta <strong>@{selectedUsername}</strong> conectada e salva com sucesso!
          </Alert>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Finalizando e fechando janela...
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Esta janela será fechada automaticamente em 3 segundos
          </Typography>
        </Box>
      )}

      {/* Seletor de contas do Instagram */}
      {authCode && (
        <InstagramAccountSelector
          open={showAccountSelector}
          onClose={handleSelectorClose}
          onAccountSelected={handleAccountSelected}
          authCode={authCode}
        />
      )}
    </Box>
  );
};

export default InstagramCallback;
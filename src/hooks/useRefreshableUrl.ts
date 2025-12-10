import { useState, useEffect, useCallback } from 'react';
import { urlRefreshService } from '../services/urlRefreshService';

interface UseRefreshableUrlOptions {
  clientId: string;
  url: string | undefined;
  autoRefresh?: boolean;
}

export const useRefreshableUrl = ({ 
  clientId, 
  url, 
  autoRefresh = true // ✅ ALTERADO: autoRefresh ativado por padrão
}: UseRefreshableUrlOptions) => {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(url);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [errorCount, setErrorCount] = useState(0); // ✅ NOVO: contador de erros

  // Função para fazer refresh manual (melhorada)
  const refreshUrl = useCallback(async () => {
    if (!clientId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      console.log(`🔄 Iniciando refresh manual da URL para cliente ${clientId}`);
      const newUrl = await urlRefreshService.forceRefreshUrl(clientId);
      
      if (newUrl) {
        console.log(`✅ Nova URL obtida:`, newUrl);
        setCurrentUrl(newUrl);
        setLastRefresh(new Date());
        setErrorCount(0); // Resetar contador de erros após sucesso
        return newUrl;
      } else {
        console.warn(`⚠️ Não foi possível obter nova URL para cliente ${clientId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao fazer refresh da URL:', error);
      setErrorCount(prev => prev + 1);
    } finally {
      setIsRefreshing(false);
    }
    return null;
  }, [clientId, isRefreshing]);

  // ✅ NOVO: Função para notificar erro de carregamento
  const notifyLoadError = useCallback(() => {
    if (!clientId || !autoRefresh) return;
    
    // Se tiver muitos erros consecutivos, esperar um pouco
    if (errorCount > 3) {
      console.warn(`⚠️ Muitos erros consecutivos (${errorCount}), aguardando próximo ciclo automático`);
      return;
    }
    
    console.log(`⚠️ Erro de carregamento notificado para URL ${url}, tentando refresh...`);
    refreshUrl();
  }, [clientId, autoRefresh, errorCount, refreshUrl, url]);

  // Verificar cache periodicamente se autoRefresh estiver ativo
  useEffect(() => {
    if (!autoRefresh || !clientId || !url) return;

    const checkCache = () => {
      const cachedUrl = urlRefreshService.getFromCache(clientId);
      const isExpired = urlRefreshService.isExpired(clientId);
      
      if (cachedUrl && cachedUrl !== currentUrl) {
        console.log(`🔄 URL atualizada no cache: ${cachedUrl}`);
        setCurrentUrl(cachedUrl);
      }
      
      // ✅ NOVO: Se URL estiver expirada, tentar refresh automático
      if (isExpired && autoRefresh) {
        console.log(`⏰ URL expirada detectada para cliente ${clientId}, iniciando refresh...`);
        refreshUrl();
      }
    };

    // Verificar imediatamente
    checkCache();

    // ✅ MELHORADO: Verificar a cada 2 minutos (era 5)
    const interval = setInterval(checkCache, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clientId, url, currentUrl, autoRefresh, refreshUrl]);

  return {
    url: currentUrl,
    isRefreshing,
    lastRefresh,
    refreshUrl,
    notifyLoadError // ✅ NOVO: Expor função para componentes
  };
};
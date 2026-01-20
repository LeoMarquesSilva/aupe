import { instagramService } from './instagramService';

class UrlRefreshService {
  private cache: Map<string, { url: string; timestamp: number; lastRefresh?: number }> = new Map();
  private readonly CACHE_DURATION = 12 * 60 * 60 * 1000; // ✅ Reduzir para 12 horas em ms
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 4 * 60 * 60 * 1000; // ✅ Verificar a cada 4 horas

  constructor() {
    this.startAutoRefresh();
  }

  // ✅ Iniciar refresh com verificação mais frequente (4h)
  private startAutoRefresh() {
    // Executar imediatamente 
    this.checkAndRefreshExpired();
    
    // Configurar intervalo mais frequente (4h)
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshExpired();
    }, this.CHECK_INTERVAL);
  }

  // ✅ Verificação e refresh aprimorados
  private async checkAndRefreshExpired() {
    const now = Date.now();
    const expiredClients: string[] = [];
    
    // Encontrar clientes com URLs expiradas
    this.cache.forEach((data, clientId) => {
      const isExpired = (now - data.timestamp) > this.CACHE_DURATION;
      const lastRefresh = data.lastRefresh || 0;
      // Verificar mais frequentemente (4h entre tentativas)
      const shouldRefresh = isExpired && (now - lastRefresh) > this.CHECK_INTERVAL;
      
      if (shouldRefresh) {
        expiredClients.push(clientId);
      }
    });
    
    if (expiredClients.length > 0) {
      // Fazer refresh de todos os perfis
      const result = await instagramService.refreshAllClientProfiles();
      
      // Atualizar timestamps no cache
      expiredClients.forEach(clientId => {
        const data = this.cache.get(clientId);
        if (data) {
          data.lastRefresh = now;
          this.cache.set(clientId, data);
        }
      });
      
      // Refresh automático concluído silenciosamente
    }
  }

  // ✅ Método melhorado para adicionar ao cache
  addToCache(clientId: string, url: string) {
    if (!clientId || !url) return;
    
    const now = Date.now();
    const existingData = this.cache.get(clientId);
    
    // Se já existe no cache e URL é diferente, atualizar
    if (existingData && existingData.url !== url) {
      console.log('📝 URL atualizada no cache para cliente', clientId);
    } else if (!existingData) {
      console.log('📝 Nova URL adicionada ao cache para cliente', clientId);
    }
    
    this.cache.set(clientId, { 
      url, 
      timestamp: now,
      lastRefresh: existingData?.lastRefresh || now 
    });
  }

  getFromCache(clientId: string): string | null {
    const data = this.cache.get(clientId);
    return data?.url || null;
  }

  // ✅ Método melhorado para verificar expiração
  isExpired(clientId: string): boolean {
    const data = this.cache.get(clientId);
    if (!data) return false;
    
    const now = Date.now();
    return (now - data.timestamp) > this.CACHE_DURATION;
  }

  // ✅ Função manual aprimorada para forçar refresh
  async forceRefreshUrl(clientId: string): Promise<string | null> {
    console.log('🔄 Forçando refresh da URL para cliente', clientId);
    
    try {
      const { clientService } = await import('./supabaseClient');
      const client = await clientService.getClientById(clientId);
      
      if (!client?.instagramAccountId) {
        console.warn('⚠️ Cliente não tem Instagram Account ID');
        return null;
      }

      const profile = await instagramService.getInstagramProfile(client.instagramAccountId, client.accessToken);
      
      if (profile?.profile_picture_url) {
        // ✅ USAR A NOVA FUNÇÃO SEM RESTRIÇÃO DE USER_ID
        await clientService.updateClientProfilePicture(
          clientId, 
          profile.profile_picture_url,
          profile.username
        );

        // Atualizar cache
        this.addToCache(clientId, profile.profile_picture_url);
        
        console.log('✅ URL atualizada com sucesso para cliente', clientId);
        return profile.profile_picture_url;
      }
    } catch (error) {
      console.error('❌ Erro ao fazer refresh da URL:', error);
    }
    
    return null;
  }

  // ✅ Novo método para forçar refresh de todos os clientes
  async forceRefreshAllClients(): Promise<{success: number, failed: number}> {
    console.log('🔄 Iniciando refresh manual de todos os clientes...');
    return instagramService.refreshAllClientProfiles();
  }

  getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    this.cache.forEach((data) => {
      if ((now - data.timestamp) > this.CACHE_DURATION) {
        expired++;
      } else {
        active++;
      }
    });
    
    return {
      total: this.cache.size,
      active,
      expired
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache limpo');
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export const urlRefreshService = new UrlRefreshService();
import { supabase } from './supabaseClient';
import { instagramMetricsService, InstagramPost, InstagramProfile, DashboardSummary } from './instagramMetricsService';

export interface CacheStatus {
  clientId: string;
  lastFullSync: Date;
  postsCount: number;
  syncStatus: 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface CachedData {
  profile: InstagramProfile | null;
  posts: InstagramPost[];
  cacheStatus: CacheStatus;
  isStale: boolean;
}

class InstagramCacheService {
  private readonly CACHE_DURATION_HOURS = 24; // Cache válido por 24 horas
  private readonly MIN_CACHE_DURATION_MINUTES = 30; // Mínimo de 30 minutos entre atualizações

  /**
   * Verifica se o cache está válido (não expirado)
   */
  private isCacheValid(lastUpdated: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return diffHours < this.CACHE_DURATION_HOURS;
  }

  /**
   * Verifica se é muito cedo para uma nova sincronização
   */
  private isTooEarlyToSync(lastUpdated: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diffMinutes < this.MIN_CACHE_DURATION_MINUTES;
  }

  /**
   * Busca o status do cache para um cliente
   */
  async getCacheStatus(clientId: string): Promise<CacheStatus | null> {
    try {
      const { data, error } = await supabase
        .from('instagram_cache_status')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (!data) return null;

      return {
        clientId: data.client_id,
        lastFullSync: new Date(data.last_full_sync || data.updated_at),
        postsCount: data.posts_count || 0,
        syncStatus: data.sync_status,
        errorMessage: data.error_message
      };
    } catch (error) {
      console.error('Erro ao buscar status do cache:', error);
      return null;
    }
  }

  /**
   * Busca dados do perfil em cache
   */
  async getCachedProfile(clientId: string): Promise<InstagramProfile | null> {
    try {
      const { data, error } = await supabase
        .from('instagram_profile_cache')
        .select('profile_data, last_updated')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      // Verificar se o cache ainda é válido
      const lastUpdated = new Date(data.last_updated);
      if (!this.isCacheValid(lastUpdated)) {
        console.log('Cache do perfil expirado para cliente:', clientId);
        return null;
      }

      return data.profile_data as InstagramProfile;
    } catch (error) {
      console.error('Erro ao buscar perfil em cache:', error);
      return null;
    }
  }

  /**
   * Busca posts em cache
   */
  async getCachedPosts(clientId: string): Promise<InstagramPost[]> {
    try {
      const { data, error } = await supabase
        .from('instagram_posts_cache')
        .select('post_data, last_updated')
        .eq('client_id', clientId)
        .order('last_updated', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) return [];

      // Verificar se o cache ainda é válido (usando o primeiro post como referência)
      const lastUpdated = new Date(data[0].last_updated);
      if (!this.isCacheValid(lastUpdated)) {
        console.log('Cache dos posts expirado para cliente:', clientId);
        return [];
      }

      return data.map(item => item.post_data as InstagramPost);
    } catch (error) {
      console.error('Erro ao buscar posts em cache:', error);
      return [];
    }
  }

  /**
   * Salva dados do perfil no cache
   */
  async saveProfile(clientId: string, profile: InstagramProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from('instagram_profile_cache')
        .upsert({
          client_id: clientId,
          profile_data: profile,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;
      console.log('✅ Perfil salvo no cache');
    } catch (error) {
      console.error('Erro ao salvar perfil no cache:', error);
      throw error;
    }
  }

  /**
   * Salva posts no cache
   */
  async savePosts(clientId: string, posts: InstagramPost[]): Promise<void> {
    try {
      // Primeiro, limpar posts antigos deste cliente
      const { error: deleteError } = await supabase
        .from('instagram_posts_cache')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) {
        console.warn('Aviso ao limpar posts antigos:', deleteError);
      }

      // Inserir novos posts
      if (posts.length > 0) {
        const postsToInsert = posts.map(post => ({
          client_id: clientId,
          post_id: post.id,
          post_data: post,
          last_updated: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('instagram_posts_cache')
          .insert(postsToInsert);

        if (error) throw error;
        console.log(`✅ ${posts.length} posts salvos no cache`);
      }
    } catch (error) {
      console.error('Erro ao salvar posts no cache:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status do cache no banco - CORRIGIDO PARA EVITAR CONSTRAINT ÚNICA
   */
  private async updateCacheStatus(
    clientId: string, 
    status: 'in_progress' | 'completed' | 'failed',
    postsCount?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        sync_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.last_full_sync = new Date().toISOString();
        if (postsCount !== undefined) {
          updateData.posts_count = postsCount;
        }
        updateData.error_message = null; // Limpar erro anterior
      } else if (status === 'failed' && errorMessage) {
        updateData.error_message = errorMessage;
      }

      // ✅ USAR UPSERT PARA EVITAR CONSTRAINT ÚNICA
      const { error } = await supabase
        .from('instagram_cache_status')
        .upsert({
          client_id: clientId,
          ...updateData,
          created_at: new Date().toISOString() // Só será usado se for INSERT
        }, {
          onConflict: 'client_id'
        });

      if (error) {
        console.error('Erro ao fazer UPSERT do status do cache:', error);
        throw error;
      }

      console.log(`✅ Status do cache atualizado: ${status}`);
    } catch (error) {
      console.error('Erro ao atualizar status do cache:', error);
      throw error;
    }
  }

  /**
   * Limpa dados duplicados do cache (método de manutenção)
   */
  async cleanupDuplicates(clientId: string): Promise<void> {
    try {
      console.log('🧹 Limpando dados duplicados para cliente:', clientId);

      // Limpar duplicatas na tabela de status
      const { data: statusRecords } = await supabase
        .from('instagram_cache_status')
        .select('id, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (statusRecords && statusRecords.length > 1) {
        // Manter apenas o mais recente
        const toDelete = statusRecords.slice(1);
        const idsToDelete = toDelete.map(record => record.id);
        
        await supabase
          .from('instagram_cache_status')
          .delete()
          .in('id', idsToDelete);
          
        console.log(`🗑️ Removidos ${toDelete.length} registros duplicados de status`);
      }

      console.log('✅ Limpeza de duplicatas concluída');
    } catch (error) {
      console.error('Erro na limpeza de duplicatas:', error);
    }
  }

  /**
   * Busca dados completos (cache + status)
   */
  async getCachedData(clientId: string): Promise<CachedData> {
    const [profile, posts, cacheStatus] = await Promise.all([
      this.getCachedProfile(clientId),
      this.getCachedPosts(clientId),
      this.getCacheStatus(clientId)
    ]);

    const defaultStatus: CacheStatus = {
      clientId,
      lastFullSync: new Date(0), // Data muito antiga
      postsCount: 0,
      syncStatus: 'completed'
    };

    const status = cacheStatus || defaultStatus;
    const isStale = !this.isCacheValid(status.lastFullSync);

    return {
      profile,
      posts,
      cacheStatus: status,
      isStale
    };
  }

  /**
   * Força uma nova sincronização, ignorando o cache
   */
  async forceSync(clientId: string): Promise<{
    posts: InstagramPost[];
    profile: InstagramProfile | null;
    cacheStatus: CacheStatus;
  }> {
    console.log('Iniciando sincronização forçada para cliente:', clientId);
    
    try {
      // Primeiro, tentar limpar duplicatas se houver erro de constraint
      await this.cleanupDuplicates(clientId);
      
      // Atualizar status para "em progresso"
      await this.updateCacheStatus(clientId, 'in_progress');

      // Buscar dados frescos da API
      const [postsResponse, profileResponse] = await Promise.all([
        instagramMetricsService.getClientPosts(clientId, 50),
        instagramMetricsService.getClientProfile(clientId)
      ]);

      if (!postsResponse.success) {
        throw new Error(postsResponse.message || 'Erro ao buscar posts');
      }

      const posts = postsResponse.data || [];
      const profile = profileResponse.success ? profileResponse.data || null : null;

      // Salvar no cache
      if (posts.length > 0) {
        await this.savePosts(clientId, posts);
      }
      
      if (profile) {
        await this.saveProfile(clientId, profile);
      }

      // Atualizar status para "concluído"
      await this.updateCacheStatus(clientId, 'completed', posts.length);

      // Buscar status atualizado
      const cacheStatus = await this.getCacheStatus(clientId) || {
        clientId,
        lastFullSync: new Date(),
        postsCount: posts.length,
        syncStatus: 'completed' as const
      };

      console.log(`✅ Sincronização forçada concluída: ${posts.length} posts`);

      return {
        posts,
        profile,
        cacheStatus
      };

    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      
      // Tentar atualizar status para "failed", mas não falhar se não conseguir
      try {
        await this.updateCacheStatus(clientId, 'failed', undefined, error.message);
      } catch (statusError) {
        console.error('Erro ao atualizar status de falha:', statusError);
      }

      // Re-throw o erro original
      throw error;
    }
  }

  /**
   * Sincronização inteligente - só atualiza se necessário
   */
  async smartSync(clientId: string): Promise<CachedData> {
    const cachedData = await this.getCachedData(clientId);

    // Se o cache é válido e não está stale, retornar dados em cache
    if (!cachedData.isStale && cachedData.posts.length > 0) {
      console.log('Usando dados em cache (válidos)');
      return cachedData;
    }

    // Se já está sincronizando, retornar dados em cache
    if (cachedData.cacheStatus.syncStatus === 'in_progress') {
      console.log('Sincronização já em andamento, usando cache');
      return cachedData;
    }

    // Se foi sincronizado muito recentemente, não sincronizar novamente
    if (this.isTooEarlyToSync(cachedData.cacheStatus.lastFullSync)) {
      console.log('Sincronização muito recente, usando cache');
      return cachedData;
    }

    // Caso contrário, fazer sincronização completa
    console.log('Cache stale ou inexistente, fazendo nova sincronização');
    try {
      const syncResult = await this.forceSync(clientId);
      return {
        profile: syncResult.profile,
        posts: syncResult.posts,
        cacheStatus: syncResult.cacheStatus,
        isStale: false
      };
    } catch (error) {
      console.error('Erro na sincronização inteligente, usando dados em cache:', error);
      return cachedData; // Retornar dados em cache mesmo com erro
    }
  }

  /**
   * Gera resumo do dashboard usando dados em cache
   */
  async getDashboardSummaryFromCache(clientId: string): Promise<DashboardSummary> {
    try {
      const cachedData = await this.getCachedData(clientId);
      
      if (cachedData.posts.length === 0) {
        // Se não há posts em cache, tentar sincronizar
        const syncData = await this.smartSync(clientId);
        return instagramMetricsService.generateDashboardSummaryFromPosts(syncData.posts);
      }

      return instagramMetricsService.generateDashboardSummaryFromPosts(cachedData.posts);
    } catch (error) {
      console.error('Erro ao gerar resumo do dashboard do cache:', error);
      // Retornar dados vazios em caso de erro
      return instagramMetricsService.generateDashboardSummaryFromPosts([]);
    }
  }

  /**
   * Busca dados com cache inteligente (método principal)
   */
  async getDataWithCache(clientId: string, forceRefresh: boolean = false): Promise<{
    posts: InstagramPost[];
    profile: InstagramProfile | null;
    summary: DashboardSummary;
    cacheStatus: CacheStatus;
    isFromCache: boolean;
  }> {
    try {
      let result;
      let isFromCache = true;

      if (forceRefresh) {
        console.log('🔄 Forçando atualização dos dados...');
        result = await this.forceSync(clientId);
        isFromCache = false;
      } else {
        console.log('🧠 Usando sincronização inteligente...');
        const cachedData = await this.smartSync(clientId);
        result = {
          posts: cachedData.posts,
          profile: cachedData.profile,
          cacheStatus: cachedData.cacheStatus
        };
        isFromCache = !cachedData.isStale;
      }

      // Gerar resumo usando os posts obtidos
      const summary = instagramMetricsService.generateDashboardSummaryFromPosts(result.posts);

      console.log(`📊 Dados obtidos: ${result.posts.length} posts, fonte: ${isFromCache ? 'cache' : 'API'}`);

      return {
        posts: result.posts,
        profile: result.profile,
        summary,
        cacheStatus: result.cacheStatus,
        isFromCache
      };
    } catch (error) {
      console.error('Erro ao buscar dados com cache:', error);
      
      // Em caso de erro, tentar retornar dados em cache
      const cachedData = await this.getCachedData(clientId);
      const summary = instagramMetricsService.generateDashboardSummaryFromPosts(cachedData.posts);
      
      return {
        posts: cachedData.posts,
        profile: cachedData.profile,
        summary,
        cacheStatus: cachedData.cacheStatus,
        isFromCache: true
      };
    }
  }

  /**
   * Limpa o cache de um cliente
   */
  async clearCache(clientId: string): Promise<void> {
    try {
      await Promise.all([
        supabase.from('instagram_profile_cache').delete().eq('client_id', clientId),
        supabase.from('instagram_posts_cache').delete().eq('client_id', clientId),
        supabase.from('instagram_cache_status').delete().eq('client_id', clientId)
      ]);

      console.log('Cache limpo para cliente:', clientId);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      throw error;
    }
  }

  /**
   * Limpa cache expirado de todos os clientes
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - this.CACHE_DURATION_HOURS);

      await Promise.all([
        supabase
          .from('instagram_profile_cache')
          .delete()
          .lt('last_updated', expiredDate.toISOString()),
        supabase
          .from('instagram_posts_cache')
          .delete()
          .lt('last_updated', expiredDate.toISOString())
      ]);

      console.log('Cache expirado limpo');
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getCacheStats(): Promise<{
    totalClients: number;
    totalPosts: number;
    totalProfiles: number;
    lastCleanup: Date | null;
  }> {
    try {
      const [postsCount, profilesCount, clientsWithStatus] = await Promise.all([
        supabase.from('instagram_posts_cache').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_profile_cache').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_cache_status').select('client_id', { count: 'exact', head: true })
      ]);

      return {
        totalClients: clientsWithStatus.count || 0,
        totalPosts: postsCount.count || 0,
        totalProfiles: profilesCount.count || 0,
        lastCleanup: null // Pode implementar um log de limpeza depois
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do cache:', error);
      return {
        totalClients: 0,
        totalPosts: 0,
        totalProfiles: 0,
        lastCleanup: null
      };
    }
  }

  /**
   * Verifica se um cliente tem dados em cache
   */
  async hasCache(clientId: string): Promise<boolean> {
    try {
      const [posts, profile] = await Promise.all([
        this.getCachedPosts(clientId),
        this.getCachedProfile(clientId)
      ]);

      return posts.length > 0 || profile !== null;
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return false;
    }
  }

  /**
   * Atualiza apenas o perfil (útil para dados que mudam menos)
   */
  async updateProfileOnly(clientId: string): Promise<InstagramProfile | null> {
    try {
      const profileResponse = await instagramMetricsService.getClientProfile(clientId);
      
      if (profileResponse.success && profileResponse.data) {
        await this.saveProfile(clientId, profileResponse.data);
        return profileResponse.data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao atualizar apenas perfil:', error);
      return null;
    }
  }
}

export const instagramCacheService = new InstagramCacheService();
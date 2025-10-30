import { supabase } from './supabaseClient';

// Interfaces permanecem as mesmas...
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface InstagramInsights {
  reach?: number;
  impressions?: number;
  saved?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  video_views?: number;
  total_interactions?: number;
  engagement?: number;
  carousel_album_reach?: number;
  carousel_album_impressions?: number;
  carousel_album_engagement?: number;
  carousel_album_saved?: number;
  carousel_album_video_views?: number;
}

export interface InstagramPost {
  impressions: any;
  reach: any;
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: 'REELS' | 'FEED' | 'STORY';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  owner: string;
  shortcode: string;
  is_comment_enabled: boolean;
  engagement_rate?: number;
  insights?: InstagramInsights;
}

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  website?: string;
  account_type?: string;
}

export interface PostsFilter {
  startDate?: Date;
  endDate?: Date;
  mediaType?: 'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  sortBy?: 'date' | 'engagement' | 'reach' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardSummary {
  total_reach: number;
  total_impressions: number;
  total_engagement: number;
  engagement_rate: number;
  total_posts: number;
  avg_engagement_per_post: number;
  save_rate: number;
  share_rate: number;
  impressions_per_reach: number;
}

export interface MediaTypeAnalysis {
  [key: string]: {
    count: number;
    avg_engagement: number;
    avg_reach: number;
    avg_impressions: number;
    engagement_rate: number;
  };
}

export interface EngagementBreakdown {
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  total: number;
}

export interface TimelineData {
  date: string;
  reach: number;
  impressions: number;
  engagement: number;
  posts: number;
  engagement_rate: number;
}

export interface TopPost {
  id: string;
  type: string;
  reach: number;
  impressions: number;
  engagement: number;
  engagement_rate: number;
  thumbnail_url: string;
  permalink: string;
  caption: string;
  timestamp: string;
}

export interface ConversionFunnel {
  impressions: number;
  reach: number;
  engagement: number;
  saves: number;
  shares: number;
}

export interface BestPostingTimes {
  days: Array<{
    day: string;
    avgEngagement: number;
    postCount: number;
  }>;
  hours: Array<{
    hour: number;
    avgEngagement: number;
    postCount: number;
  }>;
}

export interface CompleteDashboardData {
  summary: DashboardSummary;
  by_media_type: MediaTypeAnalysis;
  engagement_breakdown: EngagementBreakdown;
  timeline: TimelineData[];
  top_posts: TopPost[];
  conversion_funnel: ConversionFunnel;
  best_posting_times: BestPostingTimes;
}

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month';
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  sortBy?: 'engagement' | 'reach' | 'impressions' | 'engagement_rate';
  limit?: number;
}

class InstagramMetricsService {
  private baseUrl = 'https://graph.facebook.com/v23.0';
  get: any;

  /**
   * Buscar insights de um post específico - OTIMIZADO E CORRIGIDO
   */
  private async getPostInsights(postId: string, accessToken: string, mediaType: string, mediaProductType?: string): Promise<InstagramInsights | null> {
    try {
      console.log(`🔍 Buscando insights para post ${postId} (${mediaType}${mediaProductType ? ` - ${mediaProductType}` : ''})`);
      
      // ✅ MÉTRICAS CORRIGIDAS - SEM 'plays' que foi descontinuado
      let metricsStrategies: string[][] = [];
      
      if (mediaProductType === 'REELS') {
        // Para Reels - SEM 'plays' que foi descontinuado
        metricsStrategies = [
          ['reach', 'likes', 'comments', 'saved', 'shares'],
          ['reach', 'total_interactions'],
          ['reach', 'likes', 'comments'],
          ['reach']
        ];
      } else if (mediaType === 'VIDEO') {
        // Para vídeos normais - SEM 'plays'
        metricsStrategies = [
          ['reach', 'video_views', 'likes', 'comments', 'saved'],
          ['reach', 'likes', 'comments', 'saved'],
          ['reach', 'video_views'],
          ['reach']
        ];
      } else if (mediaType === 'CAROUSEL_ALBUM') {
        // Para carrosséis
        metricsStrategies = [
          ['reach', 'likes', 'comments', 'saved'],
          ['reach', 'likes', 'comments'],
          ['reach']
        ];
      } else { // IMAGE
        // Para imagens - como no N8N
        metricsStrategies = [
          ['reach', 'saved', 'likes', 'comments'],
          ['reach', 'likes', 'comments'],
          ['reach']
        ];
      }

      // Tentar cada estratégia - OTIMIZADO
      for (let i = 0; i < metricsStrategies.length; i++) {
        const metrics = metricsStrategies[i];
        
        try {
          const url = `${this.baseUrl}/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`;
          console.log(`📊 Tentativa ${i + 1}/${metricsStrategies.length}: ${metrics.join(', ')}`);
          
          const response = await fetch(url);
          
          if (response.ok) {
            const insightsData = await response.json();
            const insights: InstagramInsights = {};
            let hasData = false;

            if (insightsData.data && Array.isArray(insightsData.data)) {
              insightsData.data.forEach((metric: any) => {
                if (metric.values && metric.values.length > 0) {
                  const value = metric.values[0].value;
                  console.log(`📈 ${metric.name} = ${value}`);
                  hasData = true;
                  
                  switch (metric.name) {
                    case 'reach':
                      insights.reach = value;
                      break;
                    case 'saved':
                      insights.saved = value;
                      break;
                    case 'likes':
                      insights.likes = value;
                      break;
                    case 'comments':
                      insights.comments = value;
                      break;
                    case 'shares':
                      insights.shares = value;
                      break;
                    case 'video_views':
                      insights.video_views = value;
                      break;
                    case 'total_interactions':
                      insights.total_interactions = value;
                      break;
                  }
                }
              });
            }

            if (hasData) {
              console.log(`✅ Insights obtidos: ${Object.keys(insights).length} métricas`);
              return insights;
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`❌ Erro ${response.status}: ${errorData.error?.message?.substring(0, 100) || 'Erro desconhecido'}`);
          }
        } catch (strategyError) {
          console.log(`❌ Erro na tentativa ${i + 1}:`, strategyError);
          continue;
        }
      }

      console.log(`⚠️ Nenhum insight disponível para post ${postId}`);
      return null;
    } catch (error) {
      console.error(`❌ Erro geral ao buscar insights do post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Gera resumo do dashboard a partir de posts já carregados (para uso com cache)
   */
  generateDashboardSummaryFromPosts(posts: InstagramPost[]): DashboardSummary {
    if (posts.length === 0) {
      return {
        total_reach: 0,
        total_impressions: 0,
        total_engagement: 0,
        engagement_rate: 0,
        total_posts: 0,
        avg_engagement_per_post: 0,
        save_rate: 0,
        share_rate: 0,
        impressions_per_reach: 0
      };
    }

    const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    const totalReach = posts.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
    const totalImpressions = posts.reduce((sum, post) => sum + (post.insights?.impressions || 0), 0);
    const totalSaved = posts.reduce((sum, post) => sum + (post.insights?.saved || 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.insights?.shares || 0), 0);
    
    // Engajamento total usando dados calculados
    const totalEngagement = posts.reduce((sum, post) => {
      return sum + (post.insights?.engagement || 0);
    }, 0);

    // Calcular taxas
    const engagementRate = totalReach > 0 ? 
      Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;
      
    const avgEngagementPerPost = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;
    const saveRate = totalReach > 0 ? Number(((totalSaved / totalReach) * 100).toFixed(2)) : 0;
    const shareRate = totalReach > 0 ? Number(((totalShares / totalReach) * 100).toFixed(2)) : 0;
    const impressionsPerReach = totalReach > 0 ? Number((totalImpressions / totalReach).toFixed(2)) : 0;

    return {
      total_reach: totalReach,
      total_impressions: totalImpressions,
      total_engagement: totalEngagement,
      engagement_rate: engagementRate,
      total_posts: posts.length,
      avg_engagement_per_post: avgEngagementPerPost,
      save_rate: saveRate,
      share_rate: shareRate,
      impressions_per_reach: impressionsPerReach
    };
  }

  /**
   * Estimar reach baseado em dados disponíveis - OTIMIZADO
   */
  private estimateReach(post: any, insights: InstagramInsights | null, followerCount?: number): number {
    // Se temos reach real, usar ele
    if (insights?.reach && insights.reach > 0) {
      return insights.reach;
    }

    // Estratégia de estimativa baseada em likes
    const likes = post.like_count || 0;
    if (likes > 0) {
      // Taxa de engajamento típica é 1-3%, então reach seria likes / 0.02 (2%)
      const estimatedReach = Math.round(likes / 0.02);
      
      // Limitar estimativa baseada no número de seguidores se disponível
      if (followerCount && estimatedReach > followerCount * 1.5) {
        return Math.round(followerCount * 0.3); // 30% dos seguidores como estimativa conservadora
      }
      
      return estimatedReach;
    }

    // Se não temos nada, retornar 0
    return 0;
  }

  /**
   * Buscar posts do cliente com insights - SUPER OTIMIZADO (ÚNICA IMPLEMENTAÇÃO)
   */
  async getClientPosts(clientId: string, limit: number = 25): Promise<ApiResponse<InstagramPost[]>> {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error || !client?.instagram_account_id || !client?.access_token) {
        return {
          success: false,
          message: 'Cliente não encontrado ou sem dados do Instagram configurados',
          data: []
        };
      }

      console.log(`🚀 Buscando ${limit} posts para cliente ${clientId}`);

      // ✅ BUSCAR PERFIL PRIMEIRO (uma única vez)
      let followerCount: number | undefined;
      try {
        const profileResponse = await fetch(
          `${this.baseUrl}/${client.instagram_account_id}?fields=followers_count&access_token=${client.access_token}`
        );
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          followerCount = profileData.followers_count;
          console.log(`👥 Seguidores: ${followerCount}`);
        }
      } catch (profileError) {
        console.log('⚠️ Não foi possível obter número de seguidores');
      }

      // ✅ BUSCAR POSTS
      const response = await fetch(
        `${this.baseUrl}/${client.instagram_account_id}/media?fields=id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count,thumbnail_url,owner,shortcode,is_comment_enabled&limit=${limit}&access_token=${client.access_token}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `Erro na API do Instagram: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`,
          data: []
        };
      }

      const postsData = await response.json();
      const posts = postsData.data || [];

      if (posts.length === 0) {
        return {
          success: true,
          message: 'Nenhum post encontrado para este cliente',
          data: []
        };
      }

      console.log(`📊 Processando ${posts.length} posts...`);

      // ✅ PROCESSAMENTO OTIMIZADO COM BATCH
      const postsWithInsights = [];
      const batchSize = 5; // Processar 5 posts por vez
      
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        console.log(`📦 Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(posts.length/batchSize)} (${batch.length} posts)`);
        
        // Processar lote em paralelo
        const batchPromises = batch.map(async (post: any, batchIndex: number) => {
          const postIndex = i + batchIndex + 1;
          console.log(`📝 Post ${postIndex}/${posts.length}: ${post.id}`);
          
          // Buscar insights
          const insights = await this.getPostInsights(
            post.id, 
            client.access_token, 
            post.media_type,
            post.media_product_type
          );
          
          // Calcular engajamento total
          const likes = insights?.likes || post.like_count || 0;
          const comments = insights?.comments || post.comments_count || 0;
          const saved = insights?.saved || 0;
          const shares = insights?.shares || 0;
          
          // Engajamento total
          const totalEngagement = likes + comments + saved + shares;
          const finalEngagement = insights?.total_interactions || totalEngagement;
          
          // Reach: usar real quando disponível, senão estimar
          const reach = insights?.reach || this.estimateReach(post, insights, followerCount);
          
          return {
            ...post,
            owner: post.owner || client.username || 'client_account',
            shortcode: post.shortcode || post.id.substring(0, 11),
            is_comment_enabled: post.is_comment_enabled !== false,
            like_count: likes,
            comments_count: comments,
            insights: {
              ...insights,
              reach: reach,
              engagement: finalEngagement
            },
            engagement_rate: reach > 0 ? 
              Number(((finalEngagement / reach) * 100).toFixed(2)) : 0
          };
        });
        
        // Aguardar o lote atual
        const batchResults = await Promise.all(batchPromises);
        postsWithInsights.push(...batchResults);
        
        // ✅ DELAY REDUZIDO - apenas entre lotes
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Apenas 100ms entre lotes
        }
      }

      const totalReach = postsWithInsights.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
      console.log(`✅ Processamento concluído! Reach total: ${totalReach.toLocaleString()}`);

      return {
        success: true,
        data: postsWithInsights
      };
    } catch (error) {
      console.error('❌ Erro ao buscar posts do cliente:', error);
      return {
        success: false,
        message: 'Erro de conexão ao buscar posts do Instagram',
        data: []
      };
    }
  }

  /**
   * Buscar perfil do cliente - ATUALIZADO PARA V23.0
   */
  async getClientProfile(clientId: string): Promise<ApiResponse<InstagramProfile>> {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error || !client?.instagram_account_id || !client?.access_token) {
        return {
          success: false,
          message: 'Cliente não encontrado ou sem dados do Instagram configurados'
        };
      }

      const response = await fetch(
        `${this.baseUrl}/${client.instagram_account_id}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website,account_type&access_token=${client.access_token}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `Erro na API do Instagram: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
        };
      }

      const profileData = await response.json();
      return {
        success: true,
        data: profileData
      };
    } catch (error) {
      console.error('Erro ao buscar perfil do cliente:', error);
      return {
        success: false,
        message: 'Erro de conexão ao buscar perfil do Instagram'
      };
    }
  }

  /**
   * Método para testar e debugar insights de um post específico
   */
  async debugPostInsights(clientId: string, postId: string): Promise<ApiResponse<any>> {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error || !client?.access_token) {
        return {
          success: false,
          message: 'Cliente não encontrado ou sem token de acesso'
        };
      }

      console.log(`🔍 DEBUG: Testando insights para post ${postId}`);

      // Buscar dados básicos do post
      const postResponse = await fetch(
        `${this.baseUrl}/${postId}?fields=id,media_type,media_product_type,like_count,comments_count&access_token=${client.access_token}`
      );

      if (!postResponse.ok) {
        return {
          success: false,
          message: `Erro ao buscar dados do post: ${postResponse.status}`
        };
      }

      const postData = await postResponse.json();
      
      // Tentar buscar insights
      const insights = await this.getPostInsights(
        postId, 
        client.access_token, 
        postData.media_type,
        postData.media_product_type
      );

      return {
        success: true,
        data: {
          post: postData,
          insights: insights,
          estimated_reach: this.estimateReach(postData, insights)
        }
      };
    } catch (error) {
      console.error('❌ Erro no debug:', error);
      return {
        success: false,
        message: 'Erro interno no debug'
      };
    }
  }

  /**
   * Gerar resumo do dashboard
   */
  async generateDashboardSummary(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<DashboardSummary>> {
    try {
      const postsResponse = await this.getClientPosts(clientId, 100);
      
      if (!postsResponse.success) {
        return {
          success: false,
          message: postsResponse.message || 'Erro ao buscar posts para gerar resumo'
        };
      }

      const posts = postsResponse.data || [];
      
      if (posts.length === 0) {
        return {
          success: true,
          data: {
            total_reach: 0,
            total_impressions: 0,
            total_engagement: 0,
            engagement_rate: 0,
            total_posts: 0,
            avg_engagement_per_post: 0,
            save_rate: 0,
            share_rate: 0,
            impressions_per_reach: 0
          }
        };
      }

      // Filtrar posts por data
      const filteredPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate >= startDate && postDate <= endDate;
      });

      const totalPosts = filteredPosts.length;
      
      // Calcular métricas usando dados disponíveis
      const totalReach = filteredPosts.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
      const totalImpressions = filteredPosts.reduce((sum, post) => sum + (post.insights?.impressions || 0), 0);
      
      // Engajamento: usar insights calculados
      const totalEngagement = filteredPosts.reduce((sum, post) => {
        return sum + (post.insights?.engagement || 0);
      }, 0);

      const totalSaved = filteredPosts.reduce((sum, post) => sum + (post.insights?.saved || 0), 0);
      const totalShares = filteredPosts.reduce((sum, post) => sum + (post.insights?.shares || 0), 0);

      // Calcular taxas
      const engagementRate = totalReach > 0 ? 
        Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;
        
      const avgEngagementPerPost = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
      const saveRate = totalReach > 0 ? Number(((totalSaved / totalReach) * 100).toFixed(2)) : 0;
      const shareRate = totalReach > 0 ? Number(((totalShares / totalReach) * 100).toFixed(2)) : 0;
      const impressionsPerReach = totalReach > 0 ? Number((totalImpressions / totalReach).toFixed(2)) : 0;

      const summary: DashboardSummary = {
        total_reach: totalReach,
        total_impressions: totalImpressions,
        total_engagement: totalEngagement,
        engagement_rate: engagementRate,
        total_posts: totalPosts,
        avg_engagement_per_post: avgEngagementPerPost,
        save_rate: saveRate,
        share_rate: shareRate,
        impressions_per_reach: impressionsPerReach
      };

      console.log(`📊 Dashboard Summary gerado - Reach total: ${totalReach}, Posts: ${totalPosts}`);

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('Erro ao gerar resumo do dashboard:', error);
      return {
        success: false,
        message: 'Erro interno ao gerar resumo do dashboard'
      };
    }
  }

  /**
   * Gera dados completos do dashboard
   */
  async generateCompleteDashboard(
    clientId: string, 
    filters?: DashboardFilters
  ): Promise<ApiResponse<CompleteDashboardData>> {
    try {
      const postsResponse = await this.getClientPosts(clientId, filters?.limit || 100);
      
      if (!postsResponse.success) {
        return {
          success: false,
          message: postsResponse.message || 'Erro ao buscar posts para dashboard'
        };
      }

      const posts = postsResponse.data || [];

      if (posts.length === 0) {
        return {
          success: true,
          data: this.getEmptyDashboardData()
        };
      }

      // Filtrar posts se necessário
      let filteredPosts = posts;
      if (filters?.startDate && filters?.endDate) {
        filteredPosts = posts.filter(post => {
          const postDate = new Date(post.timestamp);
          return postDate >= filters.startDate! && postDate <= filters.endDate!;
        });
      }

      // Calcular métricas
      const totalPosts = filteredPosts.length;
      const totalReach = filteredPosts.reduce((sum, post) => sum + (post.insights?.reach || 0), 0);
      const totalImpressions = filteredPosts.reduce((sum, post) => sum + (post.insights?.impressions || 0), 0);
      const totalSaved = filteredPosts.reduce((sum, post) => sum + (post.insights?.saved || 0), 0);
      const totalShares = filteredPosts.reduce((sum, post) => sum + (post.insights?.shares || 0), 0);
      
      // Engajamento usando dados calculados
      const totalEngagement = filteredPosts.reduce((sum, post) => {
        return sum + (post.insights?.engagement || 0);
      }, 0);

      const totalLikes = filteredPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
      const totalComments = filteredPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

      // Summary
      const summary: DashboardSummary = {
        total_reach: totalReach,
        total_impressions: totalImpressions,
        total_engagement: totalEngagement,
        engagement_rate: totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0,
        total_posts: totalPosts,
        avg_engagement_per_post: totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0,
        save_rate: totalReach > 0 ? Number(((totalSaved / totalReach) * 100).toFixed(2)) : 0,
        share_rate: totalReach > 0 ? Number(((totalShares / totalReach) * 100).toFixed(2)) : 0,
        impressions_per_reach: totalReach > 0 ? Number((totalImpressions / totalReach).toFixed(2)) : 0
      };

      // Análise por tipo de mídia
      const by_media_type = this.analyzeByMediaType(filteredPosts);

      // Breakdown de engajamento
      const engagement_breakdown: EngagementBreakdown = {
        likes: totalLikes,
        comments: totalComments,
        saved: totalSaved,
        shares: totalShares,
        total: totalEngagement
      };

      // Timeline
      const timeline = this.generateTimelineData(filteredPosts, 30);

      // Top posts
      const top_posts = this.getTopPosts(filteredPosts, 5);

      // Funil de conversão
      const conversion_funnel: ConversionFunnel = {
        impressions: totalImpressions,
        reach: totalReach,
        engagement: totalEngagement,
        saves: totalSaved,
        shares: totalShares
      };

      // Melhores horários
      const best_posting_times = this.analyzeBestPostingTimes(filteredPosts);

      console.log(`📊 Dashboard completo gerado - Reach total: ${totalReach}, Posts: ${totalPosts}`);

      return {
        success: true,
        data: {
          summary,
          by_media_type,
          engagement_breakdown,
          timeline,
          top_posts,
          conversion_funnel,
          best_posting_times
        }
      };
    } catch (error) {
      console.error('Erro ao gerar dashboard completo:', error);
      return {
        success: false,
        message: 'Erro interno ao gerar dashboard completo'
      };
    }
  }

  /**
   * Obtém posts do cliente com insights
   */
  async getClientPostsWithInsights(
    clientId: string, 
    filters?: DashboardFilters
  ): Promise<ApiResponse<InstagramPost[]>> {
    return await this.getClientPosts(clientId, filters?.limit || 50);
  }

  /**
   * Calcula métricas específicas por tipo de mídia
   */
  async getMediaTypePerformance(
    clientId: string,
    filters?: DashboardFilters
  ): Promise<ApiResponse<MediaTypeAnalysis>> {
    try {
      const postsResponse = await this.get
      ClientPostsWithInsights(clientId, filters);
      
      if (!postsResponse.success || !postsResponse.data) {
        return {
          success: false,
          message: postsResponse.message || 'Erro ao buscar posts para análise de mídia'
        };
      }

      const analysis = this.analyzeByMediaType(postsResponse.data);
      
      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('Erro ao analisar performance por tipo de mídia:', error);
      return {
        success: false,
        message: 'Erro interno ao analisar performance por tipo de mídia'
      };
    }
  }

  /**
   * Obtém insights de horários ideais para postagem
   */
  async getBestPostingTimes(
    clientId: string,
    filters?: DashboardFilters
  ): Promise<ApiResponse<BestPostingTimes>> {
    try {
      const postsResponse = await this.getClientPostsWithInsights(clientId, filters);
      
      if (!postsResponse.success || !postsResponse.data) {
        return {
          success: false,
          message: postsResponse.message || 'Erro ao buscar posts para análise de horários'
        };
      }

      const bestTimes = this.analyzeBestPostingTimes(postsResponse.data);
      
      return {
        success: true,
        data: bestTimes
      };
    } catch (error) {
      console.error('Erro ao analisar melhores horários:', error);
      return {
        success: false,
        message: 'Erro interno ao analisar melhores horários'
      };
    }
  }

  /**
   * Analisa performance por tipo de mídia - PÚBLICO
   */
  public analyzeByMediaType(posts: InstagramPost[]): MediaTypeAnalysis {
    const analysis: MediaTypeAnalysis = {};

    posts.forEach(post => {
      let mediaType = post.media_product_type === 'REELS' ? 'reels' : 
                     post.media_type === 'CAROUSEL_ALBUM' ? 'carousel' :
                     post.media_type === 'VIDEO' ? 'video' : 'feed';

      if (!analysis[mediaType]) {
        analysis[mediaType] = {
          count: 0,
          avg_engagement: 0,
          avg_reach: 0,
          avg_impressions: 0,
          engagement_rate: 0
        };
      }

      // Engajamento usando dados calculados
      const engagement = post.insights?.engagement || 0;
      const reach = post.insights?.reach || 0;
      const impressions = post.insights?.impressions || 0;

      analysis[mediaType].count++;
      analysis[mediaType].avg_engagement += engagement;
      analysis[mediaType].avg_reach += reach;
      analysis[mediaType].avg_impressions += impressions;
    });

    // Calcular médias
    Object.keys(analysis).forEach(type => {
      const data = analysis[type];
      if (data.count > 0) {
        data.avg_engagement = Math.round(data.avg_engagement / data.count);
        data.avg_reach = Math.round(data.avg_reach / data.count);
        data.avg_impressions = Math.round(data.avg_impressions / data.count);
        data.engagement_rate = data.avg_reach > 0 ? 
          Number(((data.avg_engagement / data.avg_reach) * 100).toFixed(2)) : 0;
      }
    });

    return analysis;
  }

  /**
   * Analisa melhores horários para postagem - PÚBLICO
   */
  public analyzeBestPostingTimes(posts: InstagramPost[]): BestPostingTimes {
    const dayAnalysis: { [key: string]: { engagement: number; count: number } } = {};
    const hourAnalysis: { [key: number]: { engagement: number; count: number } } = {};

    posts.forEach(post => {
      const date = new Date(post.timestamp);
      const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      const hour = date.getHours();
      
      // Engajamento usando dados calculados
      const engagement = post.insights?.engagement || 0;

      // Análise por dia da semana
      if (!dayAnalysis[dayOfWeek]) {
        dayAnalysis[dayOfWeek] = { engagement: 0, count: 0 };
      }
      dayAnalysis[dayOfWeek].engagement += engagement;
      dayAnalysis[dayOfWeek].count++;

      // Análise por hora
      if (!hourAnalysis[hour]) {
        hourAnalysis[hour] = { engagement: 0, count: 0 };
      }
      hourAnalysis[hour].engagement += engagement;
      hourAnalysis[hour].count++;
    });

    const days = Object.entries(dayAnalysis).map(([day, data]) => ({
      day,
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
      postCount: data.count
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    const hours = Object.entries(hourAnalysis).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
      postCount: data.count
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    return { days, hours };
  }

  /**
   * Gerar dados da timeline - PÚBLICO
   */
  public generateTimelineData(posts: InstagramPost[], days: number = 30): TimelineData[] {
    const timeline: TimelineData[] = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate.toISOString().split('T')[0] === dateStr;
      });
      
      // Engajamento usando dados calculados
      const engagement = dayPosts.reduce((sum, post) => {
        return sum + (post.insights?.engagement || 0);
      }, 0);
      
      const reach = dayPosts.reduce((sum, post) => 
        sum + (post.insights?.reach || 0), 0
      );
      
      const impressions = dayPosts.reduce((sum, post) => 
        sum + (post.insights?.impressions || 0), 0
      );
      
      timeline.push({
        date: dateStr,
        posts: dayPosts.length,
        engagement,
        reach,
        impressions,
        engagement_rate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0
      });
    }
    
    return timeline;
  }

  /**
   * Obter top posts - PÚBLICO
   */
  public getTopPosts(posts: InstagramPost[], limit: number = 5): TopPost[] {
    return posts
      .map(post => {
        // Engajamento usando dados calculados
        const engagement = post.insights?.engagement || 0;
        const reach = post.insights?.reach || 0;
        const impressions = post.insights?.impressions || 0;

        return {
          id: post.id,
          type: post.media_product_type === 'REELS' ? 'Reels' : 
                post.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' :
                post.media_type === 'VIDEO' ? 'Vídeo' : 'Feed',
          reach,
          impressions,
          engagement,
          engagement_rate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0,
          thumbnail_url: post.thumbnail_url || post.media_url,
          permalink: post.permalink,
          caption: post.caption || '',
          timestamp: post.timestamp
        };
      })
      .sort((a, b) => b.reach - a.reach) // Ordenar por reach primeiro
      .slice(0, limit);
  }

  /**
   * Obter breakdown de engajamento - PÚBLICO
   */
  public getEngagementBreakdown(posts: InstagramPost[]): EngagementBreakdown {
    return posts.reduce((breakdown, post) => {
      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;
      const saved = post.insights?.saved || 0;
      const shares = post.insights?.shares || 0;
      
      return {
        likes: breakdown.likes + likes,
        comments: breakdown.comments + comments,
        saved: breakdown.saved + saved,
        shares: breakdown.shares + shares,
        total: breakdown.total + likes + comments + saved + shares
      };
    }, { likes: 0, comments: 0, saved: 0, shares: 0, total: 0 });
  }

  /**
   * Retorna dados vazios para casos sem dados
   */
  private getEmptyDashboardData(): CompleteDashboardData {
    return {
      summary: {
        total_reach: 0,
        total_impressions: 0,
        total_engagement: 0,
        engagement_rate: 0,
        total_posts: 0,
        avg_engagement_per_post: 0,
        save_rate: 0,
        share_rate: 0,
        impressions_per_reach: 0
      },
      by_media_type: {},
      engagement_breakdown: {
        likes: 0,
        comments: 0,
        saved: 0,
        shares: 0,
        total: 0
      },
      timeline: [],
      top_posts: [],
      conversion_funnel: {
        impressions: 0,
        reach: 0,
        engagement: 0,
        saves: 0,
        shares: 0
      },
      best_posting_times: {
        days: [],
        hours: []
      }
    };
  }

  /**
   * Métodos utilitários para cálculos de métricas
   */
  
  // Taxa de Engajamento = (Engajamento / Alcance) × 100
  calculateEngagementRate(engagement: number, reach: number): number {
    return reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;
  }

  // Taxa de Salvamento = (Salvamentos / Alcance) × 100
  calculateSaveRate(saves: number, reach: number): number {
    return reach > 0 ? Number(((saves / reach) * 100).toFixed(2)) : 0;
  }

  // Taxa de Compartilhamento = (Compartilhamentos / Alcance) × 100
  calculateShareRate(shares: number, reach: number): number {
    return reach > 0 ? Number(((shares / reach) * 100).toFixed(2)) : 0;
  }

  // Impressões por Alcance = Impressões / Alcance
  calculateImpressionsPerReach(impressions: number, reach: number): number {
    return reach > 0 ? Number((impressions / reach).toFixed(2)) : 0;
  }

  // Engajamento Médio por Post = Total Engajamento / Número de Posts
  calculateAvgEngagementPerPost(totalEngagement: number, totalPosts: number): number {
    return totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
  }

  /**
   * Estimar tempo de leitura de um texto
   */
  estimateReadingTime(text: string): number {
    if (!text) return 0;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Extrair hashtags de um texto
   */
  extractHashtags(text: string): string[] {
    if (!text) return [];
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extrair menções de um texto
   */
  extractMentions(text: string): string[] {
    if (!text) return [];
    const mentionRegex = /@[\w\u00C0-\u017F.]+/g;
    return text.match(mentionRegex) || [];
  }

  /**
   * Analisar tipos de mídia - MÉTODO ALTERNATIVO PÚBLICO
   */
  public analyzeMediaTypes(posts: InstagramPost[]): MediaTypeAnalysis {
    const analysis: MediaTypeAnalysis = {
      images: { count: 0, avg_engagement: 0, avg_reach: 0, avg_impressions: 0, engagement_rate: 0 },
      videos: { count: 0, avg_engagement: 0, avg_reach: 0, avg_impressions: 0, engagement_rate: 0 },
      carousels: { count: 0, avg_engagement: 0, avg_reach: 0, avg_impressions: 0, engagement_rate: 0 }
    };

    let imageTotals = { engagement: 0, reach: 0, impressions: 0 };
    let videoTotals = { engagement: 0, reach: 0, impressions: 0 };
    let carouselTotals = { engagement: 0, reach: 0, impressions: 0 };

    posts.forEach(post => {
      // Engajamento usando dados calculados
      const engagement = post.insights?.engagement || 0;
      const reach = post.insights?.reach || 0;
      const impressions = post.insights?.impressions || 0;
      
      switch (post.media_type) {
        case 'IMAGE':
          analysis.images.count++;
          imageTotals.engagement += engagement;
          imageTotals.reach += reach;
          imageTotals.impressions += impressions;
          break;
        case 'VIDEO':
          analysis.videos.count++;
          videoTotals.engagement += engagement;
          videoTotals.reach += reach;
          videoTotals.impressions += impressions;
          break;
        case 'CAROUSEL_ALBUM':
          analysis.carousels.count++;
          carouselTotals.engagement += engagement;
          carouselTotals.reach += reach;
          carouselTotals.impressions += impressions;
          break;
      }
    });

    // Calcular médias
    if (analysis.images.count > 0) {
      analysis.images.avg_engagement = Math.round(imageTotals.engagement / analysis.images.count);
      analysis.images.avg_reach = Math.round(imageTotals.reach / analysis.images.count);
      analysis.images.avg_impressions = Math.round(imageTotals.impressions / analysis.images.count);
      analysis.images.engagement_rate = this.calculateEngagementRate(analysis.images.avg_engagement, analysis.images.avg_reach);
    }

    if (analysis.videos.count > 0) {
      analysis.videos.avg_engagement = Math.round(videoTotals.engagement / analysis.videos.count);
      analysis.videos.avg_reach = Math.round(videoTotals.reach / analysis.videos.count);
      analysis.videos.avg_impressions = Math.round(videoTotals.impressions / analysis.videos.count);
      analysis.videos.engagement_rate = this.calculateEngagementRate(analysis.videos.avg_engagement, analysis.videos.avg_reach);
    }

    if (analysis.carousels.count > 0) {
      analysis.carousels.avg_engagement = Math.round(carouselTotals.engagement / analysis.carousels.count);
      analysis.carousels.avg_reach = Math.round(carouselTotals.reach / analysis.carousels.count);
      analysis.carousels.avg_impressions = Math.round(carouselTotals.impressions / analysis.carousels.count);
      analysis.carousels.engagement_rate = this.calculateEngagementRate(analysis.carousels.avg_engagement, analysis.carousels.avg_reach);
    }

    return analysis;
  }

  /**
   * Métodos de compatibilidade (retornam dados sem ApiResponse para compatibilidade)
   */
  
  async getClientProfileCompat(clientId: string): Promise<InstagramProfile | null> {
    const response = await this.getClientProfile(clientId);
    return response.success ? response.data || null : null;
  }

  async getClientPostsCompat(clientId: string, limit: number = 25): Promise<InstagramPost[]> {
    const response = await this.getClientPosts(clientId, limit);
    return response.success ? response.data || [] : [];
  }

  async generateDashboardSummaryCompat(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DashboardSummary> {
    const response = await this.generateDashboardSummary(clientId, startDate, endDate);
    return response.success ? response.data! : {
      total_reach: 0,
      total_impressions: 0,
      total_engagement: 0,
      engagement_rate: 0,
      total_posts: 0,
      avg_engagement_per_post: 0,
      save_rate: 0,
      share_rate: 0,
      impressions_per_reach: 0
    };
  }

  async generateCompleteDashboardCompat(
    clientId: string, 
    filters?: DashboardFilters
  ): Promise<CompleteDashboardData> {
    const response = await this.generateCompleteDashboard(clientId, filters);
    return response.success ? response.data! : this.getEmptyDashboardData();
  }
}

export const instagramMetricsService = new InstagramMetricsService();

function ClientPostsWithInsights(clientId: string, filters: DashboardFilters) {
  throw new Error('Function not implemented.');
}

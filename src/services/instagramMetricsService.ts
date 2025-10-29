import { supabase } from '../services/supabaseClient';

export interface InstagramPost {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  owner: string;
  shortcode: string;
  is_comment_enabled: boolean;
  media_product_type: string;
}

export interface InstagramProfile {
  id: string;
  ig_id: string;
  username: string;
  biography: string;
  website: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  name: string;
}

class InstagramMetricsService {
  /**
   * Busca o perfil do Instagram do cliente
   */
  async getClientProfile(clientId: string): Promise<InstagramProfile | null> {
    try {
      // Buscar o cliente para obter o token de acesso e o ID da conta do Instagram
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Cliente não encontrado:', clientError);
        return null;
      }

      // Verificar se o cliente tem os dados necessários (usando os nomes corretos do banco)
      if (!client.access_token || !client.instagram_account_id) {
        console.error('Cliente não autenticado com o Instagram. Dados disponíveis:', {
          hasAccessToken: !!client.access_token,
          hasInstagramAccountId: !!client.instagram_account_id,
          clientData: client
        });
        return null;
      }

      console.log('Fazendo chamada para API do Instagram com:', {
        accountId: client.instagram_account_id,
        hasToken: !!client.access_token
      });

      // Fazer a chamada para a API do Facebook Graph usando o formato do n8n
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${client.instagram_account_id}?fields=id,ig_id,username,biography,website,profile_picture_url,followers_count,follows_count,media_count,name`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${client.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API do Instagram:', errorData);
        throw new Error(`Erro na API do Instagram: ${errorData.error?.message || 'Desconhecido'}`);
      }

      const data = await response.json();
      console.log('Dados do perfil recebidos:', data);
      return data as InstagramProfile;
    } catch (error) {
      console.error('Erro ao buscar perfil do Instagram:', error);
      return null;
    }
  }

  /**
   * Busca os posts do Instagram do cliente
   */
  async getClientPosts(clientId: string): Promise<InstagramPost[]> {
    try {
      // Buscar o cliente para obter o token de acesso e o ID da conta do Instagram
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Cliente não encontrado:', clientError);
        return [];
      }

      // Verificar se o cliente tem os dados necessários (usando os nomes corretos do banco)
      if (!client.access_token || !client.instagram_account_id) {
        console.error('Cliente não autenticado com o Instagram. Dados disponíveis:', {
          hasAccessToken: !!client.access_token,
          hasInstagramAccountId: !!client.instagram_account_id,
          clientData: client
        });
        return [];
      }

      console.log('Fazendo chamada para API do Instagram para buscar posts com:', {
        accountId: client.instagram_account_id,
        hasToken: !!client.access_token
      });

      // Fazer a chamada para a API do Facebook Graph para buscar os posts usando o formato do n8n
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${client.instagram_account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,owner,shortcode,is_comment_enabled,media_product_type`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${client.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API do Instagram:', errorData);
        throw new Error(`Erro na API do Instagram: ${errorData.error?.message || 'Desconhecido'}`);
      }

      const data = await response.json();
      console.log('Dados dos posts recebidos:', data);
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar posts do Instagram:', error);
      
      // Em caso de erro, retornamos um array vazio
      return [];
    }
  }

  /**
   * Busca as métricas de um post específico do Instagram
   */
  async getPostInsights(clientId: string, postId: string): Promise<any> {
    try {
      // Buscar o cliente para obter o token de acesso
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Cliente não encontrado:', clientError);
        return null;
      }

      // Verificar se o cliente tem os dados necessários (usando os nomes corretos do banco)
      if (!client.access_token) {
        console.error('Cliente não autenticado com o Instagram. Dados disponíveis:', {
          hasAccessToken: !!client.access_token,
          clientData: client
        });
        return null;
      }

      // Fazer a chamada para a API do Facebook Graph para buscar as métricas do post usando o formato do n8n
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${postId}/insights?metric=engagement,impressions,reach`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${client.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API do Instagram:', errorData);
        throw new Error(`Erro na API do Instagram: ${errorData.error?.message || 'Desconhecido'}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar métricas do post:', error);
      return null;
    }
  }

  /**
   * Calcula métricas agregadas com base nos posts do cliente
   */
  calculateAggregatedMetrics(posts: InstagramPost[]) {
    // Total de curtidas e comentários
    const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    
    // Taxa de engajamento (likes + comentários / número de posts)
    const engagementRate = posts.length > 0 
      ? (totalLikes + totalComments) / posts.length 
      : 0;
    
    // Contagem por tipo de mídia
    const postsByType: Record<string, number> = {};
    posts.forEach(post => {
      postsByType[post.media_type] = (postsByType[post.media_type] || 0) + 1;
    });
    
    // Post com maior engajamento
    let mostEngagedPost = posts.length > 0 ? posts[0] : null;
    posts.forEach(post => {
      if (mostEngagedPost && ((post.like_count || 0) + (post.comments_count || 0)) > 
          ((mostEngagedPost.like_count || 0) + (mostEngagedPost.comments_count || 0))) {
        mostEngagedPost = post;
      }
    });
    
    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      engagementRate,
      postsByType,
      mostEngagedPost
    };
  }
}

export const instagramMetricsService = new InstagramMetricsService();
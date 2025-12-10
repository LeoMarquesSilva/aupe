export interface InstagramProfile {
  id: string;
  ig_id: string;
  username: string;
  biography?: string;
  website?: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  name: string;
}

class InstagramService {
  private readonly baseURL = 'https://graph.facebook.com/v23.0';

  /**
   * Busca perfil do Instagram usando o token específico do cliente
   */
  async getInstagramProfile(instagramAccountId: string, accessToken?: string): Promise<InstagramProfile | null> {
    try {
      console.log('🔄 Buscando perfil do Instagram para:', instagramAccountId);
      
      // Se não foi passado um token, buscar o token do cliente no banco
      if (!accessToken) {
        const { supabase } = await import('./supabaseClient');
        const { data: client } = await supabase
          .from('clients')
          .select('access_token')
          .eq('instagram_account_id', instagramAccountId)
          .single();
        
        if (!client?.access_token) {
          console.error('❌ Token de acesso não encontrado para a conta:', instagramAccountId);
          return null;
        }
        
        accessToken = client.access_token;
      }
      
      const url = `${this.baseURL}/${instagramAccountId}?fields=id,ig_id,username,biography,website,profile_picture_url,followers_count,follows_count,media_count,name&access_token=${accessToken}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na API do Instagram:', response.status, errorText);
        
        // Se o erro for de token inválido, logar mais informações
        if (response.status === 400) {
          console.error('🔑 Token pode estar expirado para a conta:', instagramAccountId);
        }
        
        return null;
      }

      const data = await response.json();
      console.log('✅ Perfil do Instagram obtido:', data.username);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil do Instagram:', error);
      return null;
    }
  }

  /**
   * ✅ CORRIGIDO: Atualiza as fotos de perfil usando a nova função sem restrição de user_id
   */
  async refreshAllClientProfiles(): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log('🔄 Iniciando refresh de todos os perfis de clientes...');
    
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    try {
      const { supabase, clientService } = await import('./supabaseClient');
      
      // Buscar todos os clientes que têm dados do Instagram
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, instagram_account_id, access_token, profile_picture, instagram_username')
        .not('instagram_account_id', 'is', null)
        .not('access_token', 'is', null);

      if (error) {
        console.error('❌ Erro ao buscar clientes:', error);
        result.errors.push(`Erro ao buscar clientes: ${error.message}`);
        return result;
      }

      if (!clients || clients.length === 0) {
        console.log('ℹ️ Nenhum cliente encontrado com dados do Instagram');
        return result;
      }

      console.log(`📋 Encontrados ${clients.length} clientes para atualizar`);
      
      for (const client of clients) {
        try {
          console.log(`🔄 Atualizando cliente: ${client.name} (@${client.instagram_username})`);
          
          // Usar o token específico do cliente
          const profile = await this.getInstagramProfile(client.instagram_account_id, client.access_token);
          
          if (profile?.profile_picture_url) {
            // Verificar se a foto mudou
            if (profile.profile_picture_url !== client.profile_picture) {
              // ✅ USAR A NOVA FUNÇÃO SEM RESTRIÇÃO DE USER_ID
              await clientService.updateClientProfilePicture(
                client.id, 
                profile.profile_picture_url, 
                profile.username
              );

              result.success++;
              console.log(`✅ Cliente ${client.name} atualizado com nova URL`);
            } else {
              result.success++;
              console.log(`ℹ️ Foto de perfil do cliente ${client.name} não mudou`);
            }
          } else {
            result.failed++;
            result.errors.push(`Não foi possível obter dados do perfil para ${client.name}`);
            console.warn(`⚠️ Não foi possível obter URL para cliente ${client.name}`);
          }
          
          // Pausa entre requisições para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          result.failed++;
          const errorMsg = `Erro ao processar cliente ${client.name}: ${error.message || error}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }
      
      console.log(`🎉 Refresh concluído: ${result.success} sucessos, ${result.failed} falhas`);
      
    } catch (error: any) {
      console.error('❌ Erro geral no refresh de perfis:', error);
      result.errors.push(`Erro geral: ${error.message || error}`);
    }

    return result;
  }

  /**
   * Valida se um token de acesso ainda é válido
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/me?access_token=${accessToken}`
      );
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return false;
    }
  }
}

export const instagramService = new InstagramService();
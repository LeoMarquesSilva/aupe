import axios from 'axios';
import { supabase } from 'services/supabaseClient';

/**
 * Corrige dados de autenticação Instagram: tenta Facebook Page + IG (legado),
 * depois token Instagram Login (Graph com token do cliente).
 */
export async function fixInstagramConnection(clientId: string) {
  try {
    console.log(`Iniciando correção da conexão do Instagram para o cliente ${clientId}...`);

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      throw new Error(`Não foi possível buscar o cliente: ${fetchError.message}`);
    }

    if (!client.access_token) {
      throw new Error('Cliente não possui token de acesso');
    }

    const token = client.access_token as string;

    // 1) Legado: Page com Instagram
    try {
      const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: {
          access_token: token,
          fields: 'instagram_business_account,name,id,access_token',
        },
      });

      const pages = pagesResponse.data.data || [];
      const pageWithInstagram = pages.find((page: { instagram_business_account?: { id: string } }) => page.instagram_business_account);

      if (pageWithInstagram?.instagram_business_account) {
        const instagramAccountId = pageWithInstagram.instagram_business_account.id;
        const instagramResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
          params: {
            access_token: pageWithInstagram.access_token,
            fields: 'username,profile_picture_url',
          },
        });
        const instagramData = instagramResponse.data;

        const updateData = {
          instagram_account_id: instagramAccountId,
          access_token: pageWithInstagram.access_token,
          instagram_username: instagramData.username,
          profile_picture: instagramData.profile_picture_url,
          page_id: pageWithInstagram.id,
          page_name: pageWithInstagram.name,
        };

        const { data: updatedClient, error: updateError } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', clientId)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        return { success: true, message: 'Conexão corrigida (Facebook Page)', data: updatedClient };
      }
    } catch (e) {
      console.warn('Fluxo Facebook Page não aplicável:', e);
    }

    // 2) Instagram Login: perfil com o próprio token
    let igId = client.instagram_account_id as string | null;
    let username = '';
    let profilePicture = '';

    if (igId) {
      try {
        const prof = await axios.get(`https://graph.facebook.com/v21.0/${igId}`, {
          params: {
            access_token: token,
            fields: 'username,profile_picture_url',
          },
        });
        username = prof.data.username || '';
        profilePicture = prof.data.profile_picture_url || '';
      } catch {
        const me = await axios.get('https://graph.instagram.com/v21.0/me', {
          params: {
            access_token: token,
            fields: 'id,username,profile_picture_url',
          },
        });
        if (me.data?.id) igId = String(me.data.id);
        username = me.data?.username || '';
        profilePicture = me.data?.profile_picture_url || '';
      }
    } else {
      const me = await axios.get('https://graph.instagram.com/v21.0/me', {
        params: {
          access_token: token,
          fields: 'id,username,profile_picture_url',
        },
      });
      if (me.data?.id) igId = String(me.data.id);
      username = me.data?.username || '';
      profilePicture = me.data?.profile_picture_url || '';
    }

    if (!igId) {
      throw new Error('Não foi possível resolver o ID da conta Instagram com este token');
    }

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        instagram_account_id: igId,
        access_token: token,
        instagram_username: username || client.instagram_username,
        profile_picture: profilePicture || client.profile_picture,
      })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return {
      success: true,
      message: 'Conexão com Instagram atualizada (token Instagram)',
      data: updatedClient,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro ao corrigir conexão do Instagram:', error);
    return {
      success: false,
      message: `Falha ao corrigir a conexão com Instagram: ${message}`,
      error: message,
    };
  }
}

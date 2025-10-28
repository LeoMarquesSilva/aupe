import axios from 'axios';
import { supabase } from 'services/supabaseClient';

/**
 * Função para corrigir os dados de autenticação do Instagram para um cliente específico
 * Usa o access_token existente para buscar os dados faltantes e atualizá-los no Supabase
 */
export async function fixInstagramConnection(clientId: string) {
  try {
    console.log(`Iniciando correção da conexão do Instagram para o cliente ${clientId}...`);
    
    // 1. Buscar o cliente no Supabase para obter o access_token
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (fetchError) {
      console.error('Erro ao buscar cliente:', fetchError);
      throw new Error(`Não foi possível buscar o cliente: ${fetchError.message}`);
    }
    
    if (!client.access_token) {
      throw new Error('Cliente não possui token de acesso');
    }
    
    console.log(`Cliente encontrado: ${client.name}, token de acesso presente`);
    
    // 2. Usar o token para buscar as páginas do Facebook vinculadas
    console.log('Buscando páginas do Facebook...');
    const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: client.access_token,
        fields: 'instagram_business_account,name,id,access_token'
      }
    });
    
    const pages = pagesResponse.data.data || [];
    console.log(`Páginas encontradas: ${pages.length}`);
    
    if (pages.length === 0) {
      throw new Error('Nenhuma página do Facebook encontrada');
    }
    
    // 3. Encontrar a primeira página com uma conta do Instagram vinculada
    const pageWithInstagram = pages.find((page: any) => page.instagram_business_account);
    
    if (!pageWithInstagram) {
      throw new Error('Nenhuma página com conta do Instagram vinculada encontrada');
    }
    
    console.log(`Página encontrada: ${pageWithInstagram.name}`);
    console.log(`ID da conta do Instagram: ${pageWithInstagram.instagram_business_account.id}`);
    
    // 4. Buscar dados da conta do Instagram
    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const instagramResponse = await axios.get(`https://graph.facebook.com/v21.0/${instagramAccountId}`, {
      params: {
        access_token: pageWithInstagram.access_token,
        fields: 'username,profile_picture_url'
      }
    });
    
    const instagramData = instagramResponse.data;
    console.log(`Dados da conta obtidos: @${instagramData.username}`);
    
    // 5. Verificar a validade do token
    const META_APP_ID = '1087259016929287';
    const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
    
    const debugTokenResponse = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: pageWithInstagram.access_token,
        access_token: `${META_APP_ID}|${META_APP_SECRET}`
      }
    });
    
    const tokenData = debugTokenResponse.data.data;
    const tokenExpiry = tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null;
    
    // 6. Preparar os dados para atualização
    const updateData = {
      instagram_account_id: instagramAccountId,
      access_token: pageWithInstagram.access_token, // Usar o token da página, que é mais apropriado
      instagram_username: instagramData.username,
      profile_picture: instagramData.profile_picture_url,
      token_expiry: tokenExpiry,
      page_id: pageWithInstagram.id,
      page_name: pageWithInstagram.name
    };
    
    console.log('Dados para atualização:', updateData);
    
    // 7. Atualizar o cliente no Supabase
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Erro ao atualizar cliente:', updateError);
      throw new Error(`Não foi possível atualizar o cliente: ${updateError.message}`);
    }
    
    console.log('Cliente atualizado com sucesso:', updatedClient);
    
    return {
      success: true,
      message: 'Conexão com Instagram corrigida com sucesso',
      data: updatedClient
    };
  } catch (error: any) {
    console.error('Erro ao corrigir conexão do Instagram:', error);
    return {
      success: false,
      message: `Falha ao corrigir a conexão com Instagram: ${error.message}`,
      error: error.message
    };
  }
}
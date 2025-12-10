import { createClient } from '@supabase/supabase-js';
import { Client, ScheduledPost, PostStatus } from '../types';
import { InstagramAuthData } from '../services/instagramAuthService';
import { fixInstagramConnection } from 'services/instagramFixService';

// Usar variáveis de ambiente para as credenciais do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão definidas!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Interface para perfil de usuário
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Mapeamento específico para corrigir erros de ortografia ou discrepâncias
const columnMapping: Record<string, string> = {
  'accessToken': 'access_token',
  'logoUrl': 'logo_url',
  'userId': 'user_id',
  'appId': 'app_id',
  'clientId': 'client_id',
  'scheduledDate': 'scheduled_date',
  'instagramAccountId': 'instagram_account_id',
  'profilePicture': 'profile_picture',
  'tokenExpiry': 'token_expiry',
  'pageId': 'page_id',
  'pageName': 'page_name',
  'username': 'instagram_username',
  'fullName': 'full_name',
  'avatarUrl': 'avatar_url',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'postType': 'post_type',
  'n8nJobId': 'n8n_job_id',
  'instagramPostId': 'instagram_post_id',
  'errorMessage': 'error_message',
  'postedAt': 'posted_at',
  'retryCount': 'retry_count',
  'lastRetryAt': 'last_retry_at',
  'n8nResponse': 'n8n_response',
  'shareToFeed': 'share_to_feed',
  'coverImage': 'cover_image'
};

// Função para converter camelCase para snake_case com mapeamento específico
const convertToDbFormat = (obj: Record<string, any>) => {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Usar o mapeamento específico se existir, caso contrário usar a conversão padrão
      const dbKey = columnMapping[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // Converter datas para formato ISO string para armazenamento no banco
      if (obj[key] instanceof Date) {
        result[dbKey] = obj[key].toISOString();
      } else {
        result[dbKey] = obj[key];
      }
    }
  }
  
  return result;
};

// Função para converter snake_case para camelCase com mapeamento específico
const convertFromDbFormat = (obj: Record<string, any>) => {
  const result: Record<string, any> = {};
  const reverseMapping: Record<string, string> = {};
  
  // Criar mapeamento reverso
  for (const key in columnMapping) {
    reverseMapping[columnMapping[key]] = key;
  }
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Usar o mapeamento reverso se existir, caso contrário usar a conversão padrão
      const jsKey = reverseMapping[key] || key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Converter strings de data para objetos Date
      if ((key === 'token_expiry' || key === 'created_at' || key === 'updated_at' || key === 'posted_at' || key === 'last_retry_at') && obj[key]) {
        try {
          result[jsKey] = new Date(obj[key]);
        } catch (e) {
          console.error('Erro ao converter data:', e);
          result[jsKey] = obj[key];
        }
      } else {
        result[jsKey] = obj[key];
      }
    }
  }
  
  return result;
};

// Função auxiliar para obter o usuário atual
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Erro ao obter usuário atual:', error);
    throw new Error('Usuário não autenticado');
  }
  return user;
};

// Serviços para gerenciar perfis de usuário
export const userProfileService = {
  // Buscar perfil do usuário atual
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }
  },

  // Atualizar perfil do usuário atual
  async updateCurrentUserProfile(updates: Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>): Promise<UserProfile> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        throw new Error(`Não foi possível atualizar o perfil: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }
};

// Serviços para gerenciar clientes
export const clientService = {
  // Buscar todos os clientes (AGORA TODOS OS USUÁRIOS VEEM TODOS OS CLIENTES)
  async getClients(): Promise<Client[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        // ✅ REMOVIDO: .eq('user_id', user.id) - AGORA TODOS VEEM TODOS
        .order('name');
      
      if (error) {
        console.error('Erro ao buscar clientes:', error);
        throw new Error('Não foi possível buscar os clientes');
      }
      
      // Converter cada cliente manualmente para garantir que funcione
      return (data || []).map(client => {
        // Verificar se o cliente tem app_id mas não tem instagram_account_id
        if (client.app_id && !client.instagram_account_id) {
          console.log(`Cliente ${client.id} tem app_id mas não tem instagram_account_id. Usando app_id como instagram_account_id.`);
          client.instagram_account_id = client.app_id;
        }
        
        // CONVERSÃO MANUAL IGUAL À saveInstagramAuth
        const convertedClient: Client = {
          id: client.id,
          name: client.name,
          instagram: client.instagram,
          logoUrl: client.logo_url,
          accessToken: client.access_token,
          userId: client.user_id,
          appId: client.app_id,
          // *** CONVERSÃO MANUAL DOS CAMPOS CRÍTICOS DO INSTAGRAM ***
          instagramAccountId: client.instagram_account_id,
          username: client.instagram_username,
          profilePicture: client.profile_picture,
          tokenExpiry: client.token_expiry ? new Date(client.token_expiry) : undefined,
          pageId: client.page_id,
          pageName: client.page_name
        };
        
        return convertedClient;
      });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  },

   async getClientById(clientId: string): Promise<Client | null> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        // ✅ TODOS PODEM VER TODOS OS CLIENTES (sem filtro por user_id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Cliente não encontrado
          console.warn('Cliente não encontrado:', clientId);
          return null;
        }
        console.error('Erro ao buscar cliente por ID:', error);
        throw new Error('Não foi possível buscar o cliente');
      }
      
      // CONVERSÃO MANUAL IGUAL À getClients
      const convertedClient: Client = {
        id: data.id,
        name: data.name,
        instagram: data.instagram,
        logoUrl: data.logo_url,
        accessToken: data.access_token,
        userId: data.user_id,
        appId: data.app_id,
        instagramAccountId: data.instagram_account_id,
        username: data.instagram_username,
        profilePicture: data.profile_picture,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : undefined,
        pageId: data.page_id,
        pageName: data.page_name
      };
      
      return convertedClient;
    } catch (error) {
      console.error('Erro ao buscar cliente por ID:', error);
      throw error;
    }
  },
  
  // Adicionar um novo cliente
  async addClient(client: Omit<Client, 'id'>): Promise<Client> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Remover campos vazios para evitar problemas de validação
      const filteredClient = Object.fromEntries(
        Object.entries(client).filter(([_, value]) => value !== '')
      );
      
      // Adicionar user_id
      filteredClient.userId = user.id;
      
      // Converter camelCase para snake_case com mapeamento específico
      const clientData = convertToDbFormat(filteredClient);
      
      console.log('Tentando adicionar cliente com dados:', clientData);
      
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();
      
      if (error) {
        console.error('Erro detalhado ao adicionar cliente:', error);
        throw new Error(`Não foi possível adicionar o cliente: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Nenhum dado retornado após inserção');
      }
      
      // CONVERSÃO MANUAL IGUAL À getClients
      const convertedClient: Client = {
        id: data.id,
        name: data.name,
        instagram: data.instagram,
        logoUrl: data.logo_url,
        accessToken: data.access_token,
        userId: data.user_id,
        appId: data.app_id,
        instagramAccountId: data.instagram_account_id,
        username: data.instagram_username,
        profilePicture: data.profile_picture,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : undefined,
        pageId: data.page_id,
        pageName: data.page_name
      };
      
      return convertedClient;
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
      throw err;
    }
  },

    // ✅ NOVA FUNÇÃO: Atualizar apenas foto de perfil (SEM restrição de user_id)
  async updateClientProfilePicture(clientId: string, profilePicture: string, username?: string): Promise<void> {
    try {
      console.log(`🔄 Atualizando foto de perfil do cliente ${clientId}`);
      
      const updateData: any = {
        profile_picture: profilePicture,
        updated_at: new Date().toISOString()
      };
      
      // Incluir username se fornecido
      if (username) {
        updateData.instagram_username = username;
      }
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
        // ✅ SEM .eq('user_id', user.id) - permite atualizar qualquer cliente
      
      if (error) {
        console.error('❌ Erro ao atualizar foto de perfil:', error);
        throw new Error(`Não foi possível atualizar a foto de perfil: ${error.message}`);
      }
      
      console.log(`✅ Foto de perfil do cliente ${clientId} atualizada com sucesso`);
    } catch (err) {
      console.error('❌ Erro ao atualizar foto de perfil:', err);
      throw err;
    }
  },
  
  // Atualizar um cliente existente (MANTER PROTEÇÃO PARA UPDATES)
  async updateClient(client: Partial<Client> & { id: string }): Promise<Client> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Remover campos vazios E campos do Instagram para não sobrescrever
      const filteredClient = Object.fromEntries(
        Object.entries(client).filter(([key, value]) => {
          // Sempre manter o ID
          if (key === 'id') return true;
          
          // Pular campos do Instagram para não sobrescrever
          if (['instagramAccountId', 'username', 'profilePicture', 'tokenExpiry', 'pageId', 'pageName'].includes(key)) {
            return false; // Não incluir estes campos no update
          }
          
          // Manter outros campos que não são vazios
          return value !== '' && value !== null && value !== undefined;
        })
      );
      
      // Converter camelCase para snake_case com mapeamento específico
      const clientData = convertToDbFormat(filteredClient);
      
      console.log('Atualizando cliente com dados (SEM campos do Instagram):', clientData);
      
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO PARA UPDATES - só o dono pode editar
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw new Error(`Não foi possível atualizar o cliente: ${error.message}`);
      }
      
      // CONVERSÃO MANUAL IGUAL À getClients
      const convertedClient: Client = {
        id: data.id,
        name: data.name,
        instagram: data.instagram,
        logoUrl: data.logo_url,
        accessToken: data.access_token,
        userId: data.user_id,
        appId: data.app_id,
        instagramAccountId: data.instagram_account_id,
        username: data.instagram_username,
        profilePicture: data.profile_picture,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : undefined,
        pageId: data.page_id,
        pageName: data.page_name
      };
      
      return convertedClient;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw err;
    }
  },
  
  // Excluir um cliente (MANTER PROTEÇÃO PARA DELETES)
  async deleteClient(clientId: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id); // ✅ MANTER PROTEÇÃO PARA DELETES - só o dono pode excluir
      
      if (error) {
        console.error('Erro ao excluir cliente:', error);
        throw new Error(`Não foi possível excluir o cliente: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      throw error;
    }
  },
  
  // Salvar dados de autenticação do Instagram para um cliente (MANTER PROTEÇÃO)
  async saveInstagramAuth(clientId: string, authData: InstagramAuthData): Promise<Client> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('=== SALVANDO DADOS DO INSTAGRAM ===');
      console.log('Cliente ID:', clientId);
      console.log('Dados recebidos:', authData);
      
      // Preparar dados para update - usando EXATAMENTE os nomes das colunas do banco
      const updateData = {
        instagram_account_id: authData.instagramAccountId,
        access_token: authData.accessToken,
        instagram_username: authData.username,
        profile_picture: authData.profilePicture,
        token_expiry: authData.tokenExpiry instanceof Date ? authData.tokenExpiry.toISOString() : authData.tokenExpiry,
        page_id: authData.pageId,
        page_name: authData.pageName
      };
      
      console.log('Dados que serão salvos no banco:', updateData);
      
      // Fazer o update diretamente
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO - só o dono pode conectar Instagram
        .select('*')
        .single();
      
      if (error) {
        console.error('ERRO no Supabase:', error);
        throw new Error(`Erro do Supabase: ${error.message}`);
      }
      
      console.log('Dados salvos com sucesso no banco:', data);
      
      // Conversão manual para garantir que funcione
      const convertedClient: Client = {
        id: data.id,
        name: data.name,
        instagram: data.instagram,
        logoUrl: data.logo_url,
        accessToken: data.access_token,
        userId: data.user_id,
        appId: data.app_id,
        // Conversão manual dos campos críticos do Instagram
        instagramAccountId: data.instagram_account_id,
        username: data.instagram_username,
        profilePicture: data.profile_picture,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : undefined,
        pageId: data.page_id,
        pageName: data.page_name
      };
      
      console.log('Cliente convertido manualmente:', convertedClient);
      console.log('=== DADOS SALVOS E CONVERTIDOS COM SUCESSO ===');
      
      return convertedClient;
      
    } catch (err: any) {
      console.error('ERRO FATAL ao salvar dados do Instagram:', err);
      throw err;
    }
  },
  
  // Verificar se o token do Instagram ainda é válido
  async verifyInstagramToken(accessToken: string): Promise<boolean> {
    try {
      // Verificar o token usando a API do Facebook
      const META_APP_ID = '1087259016929287';
      const META_APP_SECRET = '8a664b53de209acea8e0efb5d554e873';
      
      // Fazer uma chamada para a API do Facebook para verificar o token
      const response = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao verificar token:', data);
        return false;
      }
      
      return data.data?.is_valid || false;
    } catch (err) {
      console.error('Erro ao verificar token do Instagram:', err);
      return false;
    }
  },
  
  // Remover dados de autenticação do Instagram para um cliente (MANTER PROTEÇÃO)
  async removeInstagramAuth(clientId: string): Promise<Client> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Removendo dados de autenticação do Instagram para o cliente:', clientId);
      
      // Usar o convertToDbFormat para garantir que os campos sejam mapeados corretamente
      const updateData = convertToDbFormat({
        id: clientId,
        instagramAccountId: null,
        accessToken: null,
        username: null,
        profilePicture: null,
        tokenExpiry: null,
        pageId: null,
        pageName: null
      });
      
      // Atualizar diretamente no banco de dados usando os campos mapeados corretamente
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO - só o dono pode desconectar
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao remover dados de autenticação:', error);
        throw new Error(`Não foi possível remover os dados de autenticação: ${error.message}`);
      }
      
      // CONVERSÃO MANUAL IGUAL À getClients
      const convertedClient: Client = {
        id: data.id,
        name: data.name,
        instagram: data.instagram,
        logoUrl: data.logo_url,
        accessToken: data.access_token,
        userId: data.user_id,
        appId: data.app_id,
        instagramAccountId: data.instagram_account_id,
        username: data.instagram_username,
        profilePicture: data.profile_picture,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : undefined,
        pageId: data.page_id,
        pageName: data.page_name
      };
      
      return convertedClient;
    } catch (err) {
      console.error('Erro ao remover dados de autenticação do Instagram:', err);
      throw err;
    }
  },
  
  // Corrigir dados de autenticação do Instagram para clientes existentes
  async fixInstagramAuthData(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Corrigindo dados de autenticação do Instagram para clientes existentes...');
      
      // Buscar todos os clientes do usuário que têm app_id mas não têm instagram_account_id
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .is('instagram_account_id', null)
        .not('app_id', 'is', null);
      
      if (error) {
        console.error('Erro ao buscar clientes:', error);
        throw new Error('Não foi possível buscar os clientes');
      }
      
      console.log(`Encontrados ${data?.length || 0} clientes para corrigir`);
      
      // Para cada cliente, copiar app_id para instagram_account_id
      for (const client of data || []) {
        console.log(`Corrigindo cliente ${client.id}: copiando app_id (${client.app_id}) para instagram_account_id`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ instagram_account_id: client.app_id })
          .eq('id', client.id)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error(`Erro ao corrigir cliente ${client.id}:`, updateError);
        } else {
          console.log(`Cliente ${client.id} corrigido com sucesso`);
        }
      }
      
      console.log('Correção concluída');
    } catch (err) {
      console.error('Erro ao corrigir dados de autenticação:', err);
      throw err;
    }
  }
};

// Serviços para gerenciar posts
export const postService = {
  // ===== MÉTODOS EXISTENTES (CORRIGIDOS) =====
  
  // Salvar um post agendado (método antigo - manter para compatibilidade)
  async saveScheduledPost_OLD(post: any): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Adicionar user_id ao post
      post.userId = user.id;
      
      // Converter camelCase para snake_case com mapeamento específico
      const postData = convertToDbFormat(post);
      
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert([postData])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao salvar post agendado:', error);
        throw new Error('Não foi possível salvar o post agendado');
      }
      
      // Converter snake_case para camelCase com mapeamento específico
      return convertFromDbFormat(data);
    } catch (error) {
      console.error('Erro ao salvar post agendado:', error);
      throw error;
    }
  },

  // Buscar posts agendados por cliente (AGORA TODOS VEEM TODOS)
  async getScheduledPostsByClient(clientId: string): Promise<any[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('client_id', clientId)
        // ✅ REMOVIDO: .eq('user_id', user.id) - AGORA TODOS VEEM TODOS
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar posts agendados:', error);
        throw new Error('Não foi possível buscar os posts agendados');
      }
      
      // Converter snake_case para camelCase com mapeamento específico
      return (data || []).map(post => convertFromDbFormat(post));
    } catch (error) {
      console.error('Erro ao buscar posts agendados:', error);
      throw error;
    }
  },
  
  // Buscar todos os posts agendados (AGORA TODOS VEEM TODOS)
  async getAllScheduledPosts(): Promise<any[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          clients (*)
        `)
        // ✅ REMOVIDO: .eq('user_id', user.id) - AGORA TODOS VEEM TODOS
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar todos os posts agendados:', error);
        throw new Error('Não foi possível buscar os posts agendados');
      }
      
      // Converter snake_case para camelCase com mapeamento específico (incluindo os dados do cliente)
      return (data || []).map(post => {
        const result = convertFromDbFormat(post);
        if (post.clients) {
          result.clients = convertFromDbFormat(post.clients);
        }
        return result;
      });
    } catch (error) {
      console.error('Erro ao buscar todos os posts agendados:', error);
      throw error;
    }
  },

  // Atualizar um post agendado (MANTER PROTEÇÃO PARA UPDATES)
  async updateScheduledPost(postId: string, updates: any): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Converter camelCase para snake_case com mapeamento específico
      const postData = convertToDbFormat(updates);
      
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(postData)
        .eq('id', postId)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO - só o dono pode editar
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar post agendado:', error);
        throw new Error('Não foi possível atualizar o post agendado');
      }
      
      // Converter snake_case para camelCase com mapeamento específico
      return convertFromDbFormat(data);
    } catch (error) {
      console.error('Erro ao atualizar post agendado:', error);
      throw error;
    }
  },

  // Excluir um post agendado (MANTER PROTEÇÃO PARA DELETES)
  async deleteScheduledPost(postId: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // ✅ MANTER PROTEÇÃO - só o dono pode excluir
      
      if (error) {
        console.error('Erro ao excluir post agendado:', error);
        throw new Error('Não foi possível excluir o post agendado');
      }
    } catch (error) {
      console.error('Erro ao excluir post agendado:', error);
      throw error;
    }
  },

  // ===== NOVOS MÉTODOS PARA O SISTEMA DE AGENDAMENTO (CORRIGIDOS) =====
  
  // Método atualizado para salvar post com novos campos
  async saveScheduledPost(post: Partial<ScheduledPost>): Promise<ScheduledPost> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // ✅ CORRIGIDO: Incluir todos os campos necessários para Reels
      const postData = {
        clientId: post.clientId,
        userId: user.id,
        caption: post.caption,
        images: post.images,
        scheduledDate: post.scheduledDate,
        postType: post.postType || 'post',
        immediate: post.immediate || false,
        status: post.status || 'pending',
        retryCount: post.retryCount || 0,
        // ✅ NOVOS CAMPOS para Reels
        video: post.video,
        shareToFeed: post.shareToFeed,
        coverImage: post.coverImage
      };

      // Remover campos undefined/null
      const filteredPostData = Object.fromEntries(
        Object.entries(postData).filter(([_, value]) => value !== undefined && value !== null)
      );

      // Converter camelCase para snake_case
      const dbData = convertToDbFormat(filteredPostData);

      console.log('Salvando post no Supabase (com campos de Reels):', dbData);

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar post agendado:', error);
        throw new Error(`Não foi possível salvar o post: ${error.message}`);
      }

      console.log('Post salvo com sucesso:', data);

      // Converter de volta para camelCase
      return convertFromDbFormat(data) as ScheduledPost;
    } catch (error) {
      console.error('Erro ao salvar post agendado:', error);
      throw error;
    }
  },

  // Método para atualizar status do post (MANTER PROTEÇÃO)
  async updatePostStatus(
    postId: string, 
    status: PostStatus, 
    additionalData?: Partial<ScheduledPost>
  ): Promise<ScheduledPost> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // ✅ CORRIGIDO: Remover updatedAt
      const updateData = {
        status,
        ...additionalData
      };

      // Se o status é 'posted', definir postedAt
      if (status === 'posted' && !updateData.postedAt) {
        updateData.postedAt = new Date().toISOString();
      }

      // Se é uma tentativa de retry, incrementar contador
      if (status === 'sent_to_n8n' && additionalData?.retryCount) {
        updateData.lastRetryAt = new Date().toISOString();
      }

      const dbData = convertToDbFormat(updateData);

      console.log(`Atualizando post ${postId} para status ${status}:`, dbData);

      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(dbData)
        .eq('id', postId)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO - só o dono pode atualizar status
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar status do post:', error);
        throw new Error(`Não foi possível atualizar o post: ${error.message}`);
      }

      console.log('Status do post atualizado:', data);
      return convertFromDbFormat(data) as ScheduledPost;
    } catch (error) {
      console.error('Erro ao atualizar status do post:', error);
      throw error;
    }
  },

  // Método para buscar posts por status (AGORA TODOS VEEM TODOS)
  async getPostsByStatus(status: PostStatus): Promise<ScheduledPost[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          clients (*)
        `)
        // ✅ REMOVIDO: .eq('user_id', user.id) - AGORA TODOS VEEM TODOS
        .eq('status', status)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar posts por status:', error);
        throw new Error('Não foi possível buscar os posts');
      }

      return (data || []).map(post => {
        const result = convertFromDbFormat(post) as ScheduledPost;
        if (post.clients) {
          result.clients = convertFromDbFormat(post.clients) as Client;
        }
        return result;
      });
    } catch (error) {
      console.error('Erro ao buscar posts por status:', error);
      throw error;
    }
  },

  // Método para reprocessar posts falhados (MANTER PROTEÇÃO)
  async retryFailedPost(postId: string): Promise<ScheduledPost> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar o post atual
      const { data: currentPost, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', user.id) // ✅ MANTER PROTEÇÃO - só o dono pode reprocessar
        .single();

      if (fetchError || !currentPost) {
        throw new Error('Post não encontrado');
      }

      // Incrementar contador de retry
      const retryCount = (currentPost.retry_count || 0) + 1;

      // Atualizar para pending novamente
      return await this.updatePostStatus(postId, 'pending', {
        retryCount,
        errorMessage: null, // Limpar erro anterior
        lastRetryAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao reprocessar post:', error);
      throw error;
    }
  },

  // Método para buscar posts com relacionamento de cliente (AGORA TODOS VEEM TODOS)
  async getScheduledPostsWithClient(): Promise<ScheduledPost[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          clients (*)
        `)
        // ✅ REMOVIDO: .eq('user_id', user.id) - AGORA TODOS VEEM TODOS
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar posts com cliente:', error);
        throw new Error('Não foi possível buscar os posts');
      }

      return (data || []).map(post => {
        const result = convertFromDbFormat(post) as ScheduledPost;
        if (post.clients) {
          result.clients = convertFromDbFormat(post.clients) as Client;
        }
        return result;
      });
    } catch (error) {
      console.error('Erro ao buscar posts com cliente:', error);
      throw error;
    }
  }
};

// Serviços de autenticação
export const authService = {
  // Login com email e senha
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }

    return data;
  },

  // Registro com email e senha
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error('Erro ao criar conta:', error);
      throw error;
    }

    return data;
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  },

  // Resetar senha
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Erro ao resetar senha:', error);
      throw error;
    }
  },

  // Atualizar senha
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  },

  // Obter usuário atual
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }

    return user;
  },

  // Obter sessão atual
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Erro ao obter sessão atual:', error);
      return null;
    }

    return session;
  },

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Serviço para migração de dados
export const migrationService = {
  // Migrar clientes existentes para associá-los ao usuário atual
  async migrateExistingClientsToCurrentUser(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Migrando clientes existentes para o usuário atual...');

      // Buscar clientes que não têm user_id definido
      const { data: clientsWithoutUser, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .is('user_id', null);

      if (fetchError) {
        console.error('Erro ao buscar clientes sem usuário:', fetchError);
        throw new Error('Não foi possível buscar clientes para migração');
      }

      if (!clientsWithoutUser || clientsWithoutUser.length === 0) {
        console.log('Nenhum cliente encontrado para migração');
        return;
      }

      console.log(`Encontrados ${clientsWithoutUser.length} clientes para migrar`);

      // Atualizar cada cliente para associá-lo ao usuário atual
      for (const client of clientsWithoutUser) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: user.id })
          .eq('id', client.id);

        if (updateError) {
          console.error(`Erro ao migrar cliente ${client.id}:`, updateError);
        } else {
          console.log(`Cliente ${client.name} (${client.id}) migrado com sucesso`);
        }
      }

      console.log('Migração de clientes concluída');
    } catch (error) {
      console.error('Erro durante migração de clientes:', error);
      throw error;
    }
  },

  // Migrar posts existentes para associá-los ao usuário atual
  async migrateExistingPostsToCurrentUser(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Migrando posts existentes para o usuário atual...');

      // Buscar posts que não têm user_id definido
      const { data: postsWithoutUser, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .is('user_id', null);

      if (fetchError) {
        console.error('Erro ao buscar posts sem usuário:', fetchError);
        throw new Error('Não foi possível buscar posts para migração');
      }

      if (!postsWithoutUser || postsWithoutUser.length === 0) {
        console.log('Nenhum post encontrado para migração');
        return;
      }

      console.log(`Encontrados ${postsWithoutUser.length} posts para migrar`);

      // Atualizar cada post para associá-lo ao usuário atual
      for (const post of postsWithoutUser) {
        const { error: updateError } = await supabase
          .from('scheduled_posts')
          .update({ user_id: user.id })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Erro ao migrar post ${post.id}:`, updateError);
        } else {
          console.log(`Post ${post.id} migrado com sucesso`);
        }
      }

      console.log('Migração de posts concluída');
    } catch (error) {
      console.error('Erro durante migração de posts:', error);
      throw error;
    }
  }
};
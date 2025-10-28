import { createClient } from '@supabase/supabase-js';
import { Client } from '../types';
import { InstagramAuthData } from '../services/instagramAuthService';

// Usar variáveis de ambiente para as credenciais do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão definidas!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeamento específico para corrigir erros de ortografia ou discrepâncias
const columnMapping: Record<string, string> = {
  'accessToken': 'access_token', // Corrigido: acess_token -> access_token
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
  'username': 'instagram_username'
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
      if (key === 'token_expiry' && obj[key]) {
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

// Serviços para gerenciar clientes
export const clientService = {
  // Buscar todos os clientes
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar clientes:', error);
      throw new Error('Não foi possível buscar os clientes');
    }
    
    // Converter snake_case para camelCase
    return (data || []).map(client => convertFromDbFormat(client) as Client);
  },
  
  // Adicionar um novo cliente
  async addClient(client: Omit<Client, 'id'>): Promise<Client> {
    try {
      // Remover campos vazios para evitar problemas de validação
      const filteredClient = Object.fromEntries(
        Object.entries(client).filter(([_, value]) => value !== '')
      );
      
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
      
      // Converter snake_case para camelCase com mapeamento específico
      return convertFromDbFormat(data) as Client;
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
      throw new Error('Não foi possível adicionar o cliente');
    }
  },
  
  // Atualizar um cliente existente
  async updateClient(client: Client): Promise<Client> {
    try {
      // Remover campos vazios para evitar problemas de validação
      const filteredClient = Object.fromEntries(
        Object.entries(client).filter(([key, value]) => key === 'id' || value !== '')
      );
      
      // Converter camelCase para snake_case com mapeamento específico
      const clientData = convertToDbFormat(filteredClient);
      
      console.log('Atualizando cliente com dados:', clientData);
      
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw new Error(`Não foi possível atualizar o cliente: ${error.message}`);
      }
      
      // Converter snake_case para camelCase com mapeamento específico
      return convertFromDbFormat(data) as Client;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw new Error('Não foi possível atualizar o cliente');
    }
  },
  
  // Excluir um cliente
  async deleteClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);
    
    if (error) {
      console.error('Erro ao excluir cliente:', error);
      throw new Error(`Não foi possível excluir o cliente: ${error.message}`);
    }
  },
  
  // Salvar dados de autenticação do Instagram para um cliente
  async saveInstagramAuth(clientId: string, authData: InstagramAuthData): Promise<Client> {
    try {
      console.log('Salvando dados de autenticação do Instagram para o cliente:', clientId);
      
      // Preparar os dados para atualização
      const updateData = {
        id: clientId,
        instagramAccountId: authData.instagramAccountId,
        accessToken: authData.accessToken,
        username: authData.username,
        profilePicture: authData.profilePicture,
        tokenExpiry: authData.tokenExpiry,
        pageId: authData.pageId,
        pageName: authData.pageName
      };
      
      // Atualizar o cliente com os dados de autenticação do Instagram
      return await this.updateClient(updateData as Client);
    } catch (err) {
      console.error('Erro ao salvar dados de autenticação do Instagram:', err);
      throw new Error('Não foi possível salvar os dados de autenticação do Instagram');
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
  
  // Remover dados de autenticação do Instagram para um cliente
  async removeInstagramAuth(clientId: string): Promise<Client> {
    try {
      console.log('Removendo dados de autenticação do Instagram para o cliente:', clientId);
      
      // Preparar os dados para atualização (remover campos relacionados ao Instagram)
      const updateData = {
        id: clientId,
        instagramAccountId: null,
        accessToken: null,
        username: null,
        profilePicture: null,
        tokenExpiry: null,
        pageId: null,
        pageName: null
      };
      
      // Atualizar o cliente removendo os dados de autenticação do Instagram
      return await this.updateClient(updateData as unknown as Client);
    } catch (err) {
      console.error('Erro ao remover dados de autenticação do Instagram:', err);
      throw new Error('Não foi possível remover os dados de autenticação do Instagram');
    }
  }
};

// Serviços para gerenciar posts
export const postService = {
  // Salvar um post agendado
  async saveScheduledPost(post: any): Promise<any> {
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
  },
  
  // Buscar posts agendados por cliente
  async getScheduledPostsByClient(clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('client_id', clientId) // Usando snake_case para a coluna
      .order('scheduled_date', { ascending: true }); // Usando snake_case para a coluna
    
    if (error) {
      console.error('Erro ao buscar posts agendados:', error);
      throw new Error('Não foi possível buscar os posts agendados');
    }
    
    // Converter snake_case para camelCase com mapeamento específico
    return (data || []).map(post => convertFromDbFormat(post));
  },
  
  // Buscar todos os posts agendados
  async getAllScheduledPosts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        clients (*)
      `)
      .order('scheduled_date', { ascending: true }); // Usando snake_case para a coluna
    
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
  }
};
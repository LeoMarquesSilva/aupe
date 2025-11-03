import { supabase } from './supabaseClient';

export type UserRole = 'user' | 'admin' | 'moderator';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

interface UpdateUserData {
  full_name?: string;
  role?: UserRole;
  email?: string;
}

class RoleService {
  // Cache para evitar múltiplas consultas
  private roleCache = new Map<string, { role: UserRole; timestamp: number }>();
  private cacheTimeout = 30000; // 30 segundos

  // Verificar se o usuário atual é admin
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verificar cache primeiro
      const cached = this.roleCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.role === 'admin';
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao verificar role:', error);
        return false;
      }

      const role = (profile?.role as UserRole) || 'user';
      
      // Atualizar cache
      this.roleCache.set(user.id, { role, timestamp: Date.now() });
      
      return role === 'admin';
    } catch (error) {
      console.error('❌ Erro ao verificar admin:', error);
      return false;
    }
  }

  // Obter role do usuário atual
  async getCurrentUserRole(): Promise<UserRole> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'user';

      // Verificar cache primeiro
      const cached = this.roleCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.role;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao obter role:', error);
        return 'user';
      }

      const role = (profile?.role as UserRole) || 'user';
      
      // Atualizar cache
      this.roleCache.set(user.id, { role, timestamp: Date.now() });
      
      return role;
    } catch (error) {
      console.error('❌ Erro ao obter role:', error);
      return 'user';
    }
  }

  // Limpar cache (útil após mudanças de role)
  clearCache(userId?: string): void {
    if (userId) {
      this.roleCache.delete(userId);
    } else {
      this.roleCache.clear();
    }
  }

  // Obter perfil completo do usuário atual
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao obter perfil:', error);
        return null;
      }

      return profile as UserProfile;
    } catch (error) {
      console.error('❌ Erro ao obter perfil:', error);
      return null;
    }
  }

  // Atualizar role de um usuário (apenas admins)
  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Apenas administradores podem alterar roles');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao atualizar role:', error);
        return false;
      }

      // Limpar cache do usuário alterado
      this.clearCache(userId);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar role:', error);
      return false;
    }
  }

  // Listar todos os usuários com suas roles (apenas admins)
  async getAllUsersWithRoles(): Promise<UserProfile[]> {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Apenas administradores podem listar usuários');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar usuários:', error);
        return [];
      }

      return data as UserProfile[];
    } catch (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return [];
    }
  }

  // Verificar se um usuário específico é admin
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erro ao verificar role do usuário:', error);
        return false;
      }

      return profile?.role === 'admin';
    } catch (error) {
      console.error('❌ Erro ao verificar role do usuário:', error);
      return false;
    }
  }

  /**
   * Cria um novo usuário com role específica - USANDO RPC
   */
  async createUserWithRole(userData: CreateUserData): Promise<boolean> {
    try {
      // Verificar se o usuário atual é admin
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Apenas administradores podem criar usuários');
      }

      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no Auth:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado no Auth');
      }

      // 2. Usar função RPC para criar perfil (evita problemas de RLS)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('admin_create_profile', {
          user_id: authData.user.id,
          user_email: userData.email,
          user_full_name: userData.full_name,
          user_role: userData.role
        });

      if (rpcError) {
        console.error('❌ Erro ao criar perfil via RPC:', rpcError);
        throw rpcError;
      }

      if (!rpcResult) {
        throw new Error('Falha ao criar perfil via RPC');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return false;
    }
  }

  /**
   * Atualiza dados do perfil de um usuário
   */
  async updateUserProfile(userId: string, updateData: UpdateUserData): Promise<boolean> {
    try {
      // Verificar se o usuário atual é admin ou está editando seu próprio perfil
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = await this.isCurrentUserAdmin();
      const isOwnProfile = user?.id === userId;

      if (!isAdmin && !isOwnProfile) {
        throw new Error('Você não tem permissão para editar este perfil');
      }

      // Se não é admin, não pode alterar role
      if (!isAdmin && updateData.role) {
        delete updateData.role;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        throw error;
      }

      // Limpar cache do usuário alterado
      this.clearCache(userId);

      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      return false;
    }
  }
}

export const roleService = new RoleService();
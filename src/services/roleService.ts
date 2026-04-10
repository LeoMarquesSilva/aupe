import { supabase } from './supabaseClient';

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

class RoleService {
  /**
   * Verificar se o usuário atual é admin usando RPC
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Usar RPC para evitar recursão
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      
      if (error) {
        console.error('❌ Erro ao verificar admin via RPC:', error);
        // Fallback: tentar buscar diretamente
        const profile = await this.getUserProfileById(user.id);
        return profile?.role === 'admin';
      }

      return data === true;
    } catch (error) {
      console.error('❌ Erro ao verificar se usuário é admin:', error);
      return false;
    }
  }

  /**
   * Buscar perfil por ID (método público)
   */
  async getUserProfileById(userId: string): Promise<UserProfile | null> {
    try {
      // Tentar profiles primeiro
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.message.includes('does not exist')) {
        // Tentar user_profiles
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        return userError ? null : userProfile;
      }

      return error ? null : profile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obter perfil do usuário (sem recursão)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return await this.getUserProfileById(userId);
  }

  /**
   * Obter perfil do usuário atual
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      return await this.getUserProfile(user.id);
    } catch (error) {
      console.error('❌ Erro ao obter perfil do usuário atual:', error);
      return null;
    }
  }

  /**
   * Listar todos os usuários com seus roles (da organização do usuário)
   */
  async getAllUsersWithRoles(): Promise<UserProfile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Obter organization_id do perfil do usuário atual
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !currentProfile) {
        console.error('❌ Erro ao buscar perfil do usuário:', profileError);
        return [];
      }

      // Se for super_admin, pode ver todos os profiles
      if (currentProfile.role === 'super_admin') {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Erro ao buscar usuários:', error);
          return [];
        }

        return profiles || [];
      }

      // Caso contrário, filtrar por organization_id
      if (!currentProfile.organization_id) {
        console.warn('⚠️ Usuário não possui organization_id');
        return [];
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', currentProfile.organization_id) // ✅ FILTRAR POR ORGANIZAÇÃO
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        return [];
      }

      return profiles || [];
    } catch (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return [];
    }
  }

  /**
   * Atualizar role do usuário
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      console.log(`🔄 Atualizando role do usuário ${userId} para ${newRole}`);

      // Tentar profiles primeiro
      let { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Se profiles não existir, tentar user_profiles
      if (error && error.message.includes('does not exist')) {
        const result = await supabase
          .from('user_profiles')
          .update({ 
            role: newRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao atualizar role:', error);
        return false;
      }

      console.log('✅ Role atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar role do usuário:', error);
      return false;
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateUserProfile(userId: string, updates: {
    full_name?: string;
    role?: UserRole;
    email?: string;
  }): Promise<boolean> {
    try {
      console.log(`🔄 Atualizando perfil do usuário ${userId}:`, updates);

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Tentar profiles primeiro
      let { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      // Se profiles não existir, tentar user_profiles
      if (error && error.message.includes('does not exist')) {
        const result = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId);
        
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        return false;
      }

      console.log('✅ Perfil atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil do usuário:', error);
      return false;
    }
  }

  /**
   * Salvar sessão atual antes de criar usuário - CORRIGIDO
   */
  private async saveCurrentSession(): Promise<{ session: any; user: any } | null> {
    try {
      // Buscar sessão e usuário separadamente
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      return { session, user };
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error);
      return null;
    }
  }

  /**
   * Restaurar sessão salva
   */
  private async restoreSession(savedSession: { session: any; user: any }): Promise<void> {
    try {
      if (savedSession.session) {
        await supabase.auth.setSession(savedSession.session);
        console.log('✅ Sessão restaurada com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar sessão:', error);
    }
  }

  /**
   * Criar usuário com role específica - VERSÃO COM RESTAURAÇÃO DE SESSÃO
   */
  async createUserWithRole(userData: CreateUserData): Promise<boolean> {
    let savedSession: { session: any; user: any } | null = null;
    
    try {
      console.log('🔄 Criando usuário (com restauração de sessão):', userData.email);

      // 1. Salvar sessão atual e buscar organization_id do admin
      savedSession = await this.saveCurrentSession();
      console.log('💾 Sessão atual salva');

      let adminOrgId: string | null = null;
      if (savedSession?.user) {
        const adminProfile = await this.getUserProfileById(savedSession.user.id);
        adminOrgId = adminProfile?.organization_id || null;
        console.log('🏢 Organization ID do admin:', adminOrgId);
      }

      // 2. Criar usuário usando signUp (vai fazer login automático temporariamente)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined
        }
      });

      if (authError) {
        console.error('❌ Erro no Auth SignUp:', authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado no auth');
      }

      console.log('✅ Usuário criado no auth:', authData.user.id);

      // 3. Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Criar perfil via RPC (agora com organization_id)
      const { error } = await supabase.rpc('create_user_profile', {
        user_id: authData.user.id,
        user_email: userData.email,
        user_full_name: userData.full_name,
        user_role: userData.role,
        user_organization_id: adminOrgId
      });

      if (error) {
        console.error('❌ Erro ao criar perfil via RPC:', error);
        const success = await this.createProfileManually(authData.user.id, userData, adminOrgId);
        if (!success) {
          throw new Error('Falha ao criar perfil do usuário');
        }
      }

      console.log('✅ Perfil criado com sucesso (org:', adminOrgId, ')');

      // 5. IMPORTANTE: Restaurar sessão original ANTES de retornar
      if (savedSession) {
        await this.restoreSession(savedSession);
        console.log('🔄 Sessão original restaurada');
      }

      console.log('✅ Usuário criado com sucesso (sessão restaurada):', userData.email);
      return true;

    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      
      if (savedSession) {
        try {
          await this.restoreSession(savedSession);
          console.log('🔄 Sessão restaurada após erro');
        } catch (restoreError) {
          console.error('❌ Erro ao restaurar sessão após erro:', restoreError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Criar perfil manualmente (fallback)
   */
  private async createProfileManually(userId: string, userData: CreateUserData, organizationId?: string | null): Promise<boolean> {
    try {
      console.log('🔄 Criando perfil manualmente para:', userData.email);

      const profileData: Record<string, any> = {
        id: userId,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (organizationId) {
        profileData.organization_id = organizationId;
      }

      // Tentar profiles primeiro
      let { error } = await supabase
        .from('profiles')
        .insert([profileData]);

      // Se profiles não existir, tentar user_profiles
      if (error && error.message.includes('does not exist')) {
        const result = await supabase
          .from('user_profiles')
          .insert([profileData]);
        
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao criar perfil manualmente:', error);
        return false;
      }

      console.log('✅ Perfil criado manualmente com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar perfil manualmente:', error);
      return false;
    }
  }

  /**
   * Deletar usuário completamente
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Deletando usuário:', userId);

      // Usar a função RPC para deletar
      const { error } = await supabase.rpc('delete_user_simple', {
        user_id: userId
      });

      if (error) {
        console.error('❌ Erro ao deletar usuário:', error);
        throw new Error(`Erro ao deletar usuário: ${error.message}`);
      }

      console.log('✅ Usuário deletado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário tem permissão para uma ação
   */
  async hasPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return false;

      const roleHierarchy: Record<UserRole, number> = {
        'user': 1,
        'moderator': 2,
        'admin': 3,
        'super_admin': 4
      };

      return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
    } catch (error) {
      console.error('❌ Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário atual tem permissão
   */
  async currentUserHasPermission(requiredRole: UserRole): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      return await this.hasPermission(user.id, requiredRole);
    } catch (error) {
      console.error('❌ Erro ao verificar permissão do usuário atual:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário atual é super admin
   */
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const profile = await this.getUserProfileById(user.id);
      return profile?.role === 'super_admin';
    } catch (error) {
      console.error('❌ Erro ao verificar se usuário é super admin:', error);
      return false;
    }
  }
}

export const roleService = new RoleService();
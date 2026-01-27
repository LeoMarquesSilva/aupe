import { supabase } from './supabaseClient';

// Types
export interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripe_price_id: string | null;
  amount: number; // em centavos
  currency: string;
  interval: string; // 'month' ou 'year'
  max_profiles: number;
  max_clients: number;
  max_posts_per_month: number;
  features: any; // JSONB
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string; // 'active', 'canceled', 'past_due', etc
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  organization?: Organization;
  plan?: SubscriptionPlan;
  usage?: SubscriptionUsage; // Uso atual da subscription
}

export interface SubscriptionUsage {
  id: string;
  organization_id: string;
  subscription_id: string;
  period_start: string;
  period_end: string;
  profiles_count: number;
  clients_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

class SubscriptionService {
  // Organizations
  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar organizações:', error);
      throw error;
    }

    return data || [];
  }

  async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar organização:', error);
      throw error;
    }

    return data;
  }

  async createOrganization(org: Partial<Organization>): Promise<Organization> {
    // Tentar criar via RPC primeiro (para signup sem autenticação completa)
    try {
      const { data: orgId, error: rpcError } = await supabase.rpc('create_organization_on_signup', {
        p_name: org.name,
        p_email: org.email || null,
        p_phone: org.phone || null,
        p_document: org.document || null,
        p_country: org.country || 'BR',
      });

      if (!rpcError && orgId) {
        // Buscar organização criada
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        return data;
      }
    } catch (rpcErr) {
      console.log('⚠️ RPC não disponível ou falhou, tentando método direto:', rpcErr);
    }

    // Fallback: método direto (requer autenticação)
    const { data, error } = await supabase
      .from('organizations')
      .insert([org])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar organização:', error);
      throw error;
    }

    return data;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar organização:', error);
      throw error;
    }

    return data;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar organização:', error);
      throw error;
    }

    return true;
  }

  // Subscription Plans
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('amount', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      throw error;
    }

    return data || [];
  }

  async getPlan(id: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar plano:', error);
      throw error;
    }

    return data;
  }

  async createPlan(plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([plan])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar plano:', error);
      throw error;
    }

    return data;
  }

  async updatePlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar plano:', error);
      throw error;
    }

    return data;
  }

  async deletePlan(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar plano:', error);
      throw error;
    }

    return true;
  }

  // Subscriptions
  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        organization:organizations(*),
        plan:subscription_plans(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar subscriptions:', error);
      throw error;
    }

    return data || [];
  }

  // Get all subscriptions with usage
  async getAllSubscriptionsWithUsage(): Promise<(Subscription & { usage?: SubscriptionUsage })[]> {
    const subscriptions = await this.getAllSubscriptions();
    
    // Buscar uso para cada subscription
    const subscriptionsWithUsage = await Promise.all(
      subscriptions.map(async (sub) => {
        const usage = await this.getUsageByOrganization(sub.organization_id);
        return { ...sub, usage: usage || undefined };
      })
    );

    return subscriptionsWithUsage;
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        organization:organizations(*),
        plan:subscription_plans(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar subscription:', error);
      throw error;
    }

    return data;
  }

  async getSubscriptionByOrganization(organizationId: string): Promise<Subscription | null> {
    try {
      // Buscar subscriptions ativas (pode haver múltiplas, pegar a mais recente)
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao buscar subscription (com join):', error);
        
        // Fallback: tentar sem join se o join falhar
        const { data: subscriptionsWithoutJoin, error: errorWithoutJoin } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (errorWithoutJoin) {
          console.error('❌ Erro ao buscar subscription (sem join):', errorWithoutJoin);
          // Se for PGRST116 (no rows), retornar null (não é erro)
          if (errorWithoutJoin.code === 'PGRST116') {
            return null;
          }
          throw errorWithoutJoin;
        }

        if (subscriptionsWithoutJoin && subscriptionsWithoutJoin.length > 0) {
          const subscription = subscriptionsWithoutJoin[0];
          
          // Buscar plano separadamente
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', subscription.plan_id)
            .single();

          return {
            ...subscription,
            plan: planData || undefined
          } as Subscription;
        }

        return null;
      }

      // Retornar a primeira subscription (mais recente)
      return subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
    } catch (error: any) {
      console.error('❌ Erro ao buscar subscription:', error);
      // Se for erro de "no rows", retornar null (não é erro crítico)
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return null;
      }
      throw error;
    }
  }

  async createSubscription(sub: Partial<Subscription>): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([sub])
      .select(`
        *,
        organization:organizations(*),
        plan:subscription_plans(*)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao criar subscription:', error);
      throw error;
    }

    return data;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(*),
        plan:subscription_plans(*)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar subscription:', error);
      throw error;
    }

    return data;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar subscription:', error);
      throw error;
    }

    return true;
  }

  // Subscription Usage
  async getUsageByOrganization(organizationId: string): Promise<SubscriptionUsage | null> {
    const { data, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar uso:', error);
      throw error;
    }

    return data || null;
  }

  // Stats
  async getGlobalStats() {
    const [orgs, subs, plans] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscription_plans').select('id', { count: 'exact', head: true }).eq('active', true)
    ]);

    return {
      totalOrganizations: orgs.count || 0,
      activeSubscriptions: subs.count || 0,
      availablePlans: plans.count || 0
    };
  }
}

export const subscriptionService = new SubscriptionService();

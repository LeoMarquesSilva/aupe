// Addon Service - Gerenciamento de add-ons de subscription
// INSYT - Instagram Scheduler

import { supabase } from './supabaseClient';
import type { AddonType, PlanCode } from '../config/stripeProducts';

export interface Addon {
  id: string;
  code: string;
  name: string;
  type: AddonType;
  scope_plan_code: string | null;
  stripe_product_id: string;
  stripe_price_id: string;
  amount: number;
  currency: string;
  interval: string;
  feature_flag: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveAddonItem {
  id: string;
  subscription_id: string;
  addon_id: string;
  stripe_subscription_item_id: string;
  quantity: number;
  status: string;
  addon: Addon;
}

export interface AddonOperation {
  priceId: string;
  quantity?: number;
}

class AddonService {
  /**
   * Catálogo de add-ons disponíveis para um plano
   * - Conta Adicional do plano específico
   * - Features universais (scope_plan_code IS NULL)
   */
  async getAvailableAddons(planCode: PlanCode | string | null | undefined): Promise<Addon[]> {
    const { data, error } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('active', true)
      .or(`scope_plan_code.is.null,scope_plan_code.eq.${planCode || ''}`)
      .order('type', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar add-ons disponíveis:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Add-ons ativos de uma subscription
   */
  async getActiveAddons(subscriptionId: string): Promise<ActiveAddonItem[]> {
    const { data, error } = await supabase
      .from('subscription_addon_items')
      .select('*, addon:subscription_addons(*)')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Erro ao buscar add-ons ativos:', error);
      throw error;
    }
    return (data || []) as ActiveAddonItem[];
  }

  /**
   * Verifica se uma feature flag está ativa para a organização do usuário logado
   */
  async hasMyFeatureAddon(featureFlag: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_my_feature_addon', {
      p_feature_flag: featureFlag,
    });
    if (error) {
      console.warn('[addonService] has_my_feature_addon error:', error.message);
      return false;
    }
    return Boolean(data);
  }

  /**
   * Verifica a feature flag para uma organização específica
   */
  async hasFeatureAddon(organizationId: string, featureFlag: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_feature_addon', {
      p_organization_id: organizationId,
      p_feature_flag: featureFlag,
    });
    if (error) {
      console.warn('[addonService] has_feature_addon error:', error.message);
      return false;
    }
    return Boolean(data);
  }

  /**
   * Adicionar add-ons em uma subscription existente.
   * Quantidade de items com o mesmo priceId é SOMADA à atual no Stripe.
   */
  async addAddons(subscriptionId: string, items: AddonOperation[]): Promise<void> {
    const { data, error } = await supabase.functions.invoke('stripe-manage-addons', {
      body: { subscriptionId, add: items },
    });
    if (error) {
      console.error('❌ Erro ao adicionar add-ons:', error);
      throw new Error(error.message || 'Erro ao adicionar add-ons');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
  }

  /**
   * Atualizar quantidade exata de um add-on (quantity=0 remove).
   */
  async updateAddon(subscriptionId: string, priceId: string, quantity: number): Promise<void> {
    const { data, error } = await supabase.functions.invoke('stripe-manage-addons', {
      body: {
        subscriptionId,
        update: [{ priceId, quantity }],
      },
    });
    if (error) {
      console.error('❌ Erro ao atualizar add-on:', error);
      throw new Error(error.message || 'Erro ao atualizar add-on');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
  }

  /**
   * Remover add-on pelo priceId
   */
  async removeAddon(subscriptionId: string, priceId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('stripe-manage-addons', {
      body: { subscriptionId, remove: [priceId] },
    });
    if (error) {
      console.error('❌ Erro ao remover add-on:', error);
      throw new Error(error.message || 'Erro ao remover add-on');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
  }

  // ===================================================================
  // SUPER-ADMIN ONLY — operações diretas no banco (bypass Stripe)
  // Uso: cortesias, clientes internos, correção manual.
  // ===================================================================

  /**
   * Catálogo completo de add-ons (inclusive inativos). Somente super_admin.
   */
  async getAllAddons(): Promise<Addon[]> {
    const { data, error } = await supabase
      .from('subscription_addons')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('❌ Erro ao buscar catálogo de add-ons:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Atualiza metadados do catálogo (amount, stripe_price_id, active, etc.).
   * NÃO altera Stripe — só o banco local. Use apenas para sincronizar IDs ou
   * ativar/desativar a oferta internamente.
   */
  async updateCatalogAddon(id: string, patch: Partial<Addon>): Promise<Addon> {
    const { data, error } = await supabase
      .from('subscription_addons')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('❌ Erro ao atualizar add-on (catálogo):', error);
      throw error;
    }
    return data as Addon;
  }

  /**
   * Concede (liberação manual) um add-on para uma subscription SEM passar por
   * Stripe. Cria ou reativa um registro em subscription_addon_items.
   * - Se já existe ativo com o mesmo addon_id, apenas soma quantity.
   * - Caso contrário, insere novo com stripe_subscription_item_id = 'manual:<uuid>'.
   */
  async adminGrantAddon(
    subscriptionId: string,
    addonId: string,
    quantity: number = 1,
  ): Promise<ActiveAddonItem> {
    const { data: existing, error: fetchErr } = await supabase
      .from('subscription_addon_items')
      .select('*, addon:subscription_addons(*)')
      .eq('subscription_id', subscriptionId)
      .eq('addon_id', addonId)
      .maybeSingle();
    if (fetchErr) {
      console.error('❌ Erro ao buscar add-on existente:', fetchErr);
      throw fetchErr;
    }

    if (existing) {
      const newQty = (existing.status === 'active' ? existing.quantity : 0) + quantity;
      const { data, error } = await supabase
        .from('subscription_addon_items')
        .update({
          quantity: newQty,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*, addon:subscription_addons(*)')
        .single();
      if (error) {
        console.error('❌ Erro ao atualizar grant de add-on:', error);
        throw error;
      }
      return data as ActiveAddonItem;
    }

    const manualId = `manual:${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from('subscription_addon_items')
      .insert([
        {
          subscription_id: subscriptionId,
          addon_id: addonId,
          stripe_subscription_item_id: manualId,
          quantity,
          status: 'active',
        },
      ])
      .select('*, addon:subscription_addons(*)')
      .single();
    if (error) {
      console.error('❌ Erro ao inserir grant de add-on:', error);
      throw error;
    }
    return data as ActiveAddonItem;
  }

  /**
   * Atualiza a quantidade de um add-on concedido manualmente.
   * quantity=0 marca como canceled.
   */
  async adminUpdateAddonItem(itemId: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('subscription_addon_items')
      .update({
        quantity: Math.max(0, quantity),
        status: quantity <= 0 ? 'canceled' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    if (error) {
      console.error('❌ Erro ao atualizar add-on item:', error);
      throw error;
    }
  }

  /**
   * Revoga (soft delete) um add-on concedido. Marca status='canceled'.
   */
  async adminRevokeAddonItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_addon_items')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) {
      console.error('❌ Erro ao revogar add-on item:', error);
      throw error;
    }
  }

  /**
   * Retorna TODOS os add-on items (ativos ou não) de uma subscription, com join do catálogo.
   */
  async getAllAddonItems(subscriptionId: string): Promise<ActiveAddonItem[]> {
    const { data, error } = await supabase
      .from('subscription_addon_items')
      .select('*, addon:subscription_addons(*)')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('❌ Erro ao buscar add-on items:', error);
      throw error;
    }
    return (data || []) as ActiveAddonItem[];
  }
}

export const addonService = new AddonService();

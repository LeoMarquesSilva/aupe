import { supabase } from './supabaseClient';

export type OrganizationProductMode = 'full' | 'approval_only';

let cachedMode: OrganizationProductMode | null = null;
let cacheTs = 0;
const CACHE_MS = 60_000;

export const organizationProductModeService = {
  async getCurrentMode(forceRefresh = false): Promise<OrganizationProductMode> {
    const now = Date.now();
    if (!forceRefresh && cachedMode && now - cacheTs < CACHE_MS) {
      return cachedMode;
    }

    const { data, error } = await supabase.rpc('get_my_organization_product_mode');
    if (error) {
      console.warn('[organizationProductMode] RPC failed:', error.message);
      return 'full';
    }

    const mode: OrganizationProductMode =
      data === 'approval_only' ? 'approval_only' : 'full';
    cachedMode = mode;
    cacheTs = now;
    return mode;
  },

  isApprovalOnly(mode: OrganizationProductMode): boolean {
    return mode === 'approval_only';
  },

  clearCache(): void {
    cachedMode = null;
    cacheTs = 0;
  },

  async adminSetMode(organizationId: string, mode: OrganizationProductMode): Promise<void> {
    const { error } = await supabase.rpc('admin_set_organization_product_mode', {
      p_organization_id: organizationId,
      p_product_mode: mode,
    });
    if (error) throw new Error(error.message || 'Erro ao definir modo do produto');
  },
};

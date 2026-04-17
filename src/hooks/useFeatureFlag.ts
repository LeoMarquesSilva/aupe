// useFeatureFlag - Hook para checar se uma feature está habilitada via add-on na org do usuário.
// INSYT - Instagram Scheduler

import { useEffect, useState, useCallback } from 'react';
import { addonService } from '../services/addonService';

export interface FeatureFlagResult {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Checa via RPC `has_my_feature_addon` se a org do usuário logado tem o add-on ativo.
 * Exemplo: const { enabled, loading } = useFeatureFlag('fluxo_aprovacao');
 */
export function useFeatureFlag(featureFlag: string | null | undefined): FeatureFlagResult {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!featureFlag) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const has = await addonService.hasMyFeatureAddon(featureFlag);
      setEnabled(has);
    } catch (err: any) {
      console.warn('[useFeatureFlag] erro:', err?.message);
      setError(err?.message || 'Erro ao checar feature flag');
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [featureFlag]);

  useEffect(() => {
    check();
  }, [check]);

  return { enabled, loading, error, refresh: check };
}

export default useFeatureFlag;

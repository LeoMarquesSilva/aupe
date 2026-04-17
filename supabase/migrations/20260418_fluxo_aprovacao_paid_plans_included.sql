-- Migration: Fluxo de Aprovação incluso nos planos pagos (BASIC+), vendável
-- como add-on opcional apenas para STARTER.
--
-- Regras finais de gating:
--   * STARTER  → feature gated, só libera se houver add-on ativo
--   * BASIC / PRO / BUSINESS / ENTERPRISE → sempre libera (incluso no preço)
--   * LEGACY   → sempre libera (grandfathered)
--
-- Mudanças:
--   1) subscription_addons.FLUXO_APROVACAO.scope_plan_code: NULL → 'STARTER'
--      (o add-on some de getAvailableAddons() para planos BASIC+)
--   2) has_feature_addon: adiciona branch para planos pagos
--
-- Nota: has_my_feature_addon não precisa ser tocada — ela apenas chama
-- has_feature_addon e herda automaticamente a regra nova.

BEGIN;

------------------------------------------------------------
-- 1) Restringir o add-on FLUXO_APROVACAO ao plano STARTER
------------------------------------------------------------
UPDATE public.subscription_addons
   SET scope_plan_code = 'STARTER',
       updated_at      = now()
 WHERE code = 'FLUXO_APROVACAO';

------------------------------------------------------------
-- 2) RPC: has_feature_addon com regras explícitas
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_feature_addon(
  p_organization_id uuid,
  p_feature_flag text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- (a) Grandfathering: planos LEGACY liberam fluxo_aprovacao automaticamente
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = p_organization_id
        AND s.status IN ('active','trialing')
        AND sp.plan_code = 'LEGACY'
        AND p_feature_flag = 'fluxo_aprovacao'
    )
    OR
    -- (b) Planos pagos (BASIC+) já incluem fluxo_aprovacao no preço
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = p_organization_id
        AND s.status IN ('active','trialing')
        AND sp.plan_code IN ('BASIC','PRO','BUSINESS','ENTERPRISE')
        AND p_feature_flag = 'fluxo_aprovacao'
    )
    OR
    -- (c) Caminho padrão: add-on contratado/concedido para a subscription
    EXISTS (
      SELECT 1
      FROM public.subscription_addon_items sai
      JOIN public.subscription_addons sa ON sa.id = sai.addon_id
      JOIN public.subscriptions s       ON s.id  = sai.subscription_id
      WHERE s.organization_id = p_organization_id
        AND s.status IN ('active','trialing')
        AND sai.status = 'active'
        AND sa.feature_flag = p_feature_flag
        AND sa.active = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_feature_addon(uuid, text) TO authenticated, anon;

COMMIT;

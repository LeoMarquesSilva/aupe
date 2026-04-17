-- Migration: policies para o super-admin gerenciar add-ons manualmente
-- e grandfathering da feature `fluxo_aprovacao` para planos LEGACY.
--
-- Contexto:
--  * A migration original só criou policy SELECT em `subscription_addons`
--    e SELECT (owner) em `subscription_addon_items`, assumindo que apenas
--    o webhook via service role iria modificar essas tabelas.
--  * O painel Super Admin agora precisa conceder/revogar add-ons
--    manualmente (cortesia). Sem policies ALL, qualquer INSERT/UPDATE
--    chegando via anon/auth é barrado pelo RLS.
--  * Os 7 clientes LEGACY (plan_code='LEGACY') têm o fluxo de aprovação
--    liberado "por fora" — a RPC `has_feature_addon` precisa refletir isso.

BEGIN;

------------------------------------------------------------
-- 1) subscription_addons: super-admin pode gerir catálogo
------------------------------------------------------------
DROP POLICY IF EXISTS subscription_addons_super_admin_all ON public.subscription_addons;
CREATE POLICY subscription_addons_super_admin_all
  ON public.subscription_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Super-admin precisa enxergar inativos também (a policy SELECT pública
-- original filtra active=true). ALL já cobre, mas manter explicitamente
-- ajuda a depuração.

------------------------------------------------------------
-- 2) subscription_addon_items: super-admin pode gerir liberações
------------------------------------------------------------
DROP POLICY IF EXISTS subscription_addon_items_super_admin_all ON public.subscription_addon_items;
CREATE POLICY subscription_addon_items_super_admin_all
  ON public.subscription_addon_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

------------------------------------------------------------
-- 3) RPC has_feature_addon: grandfathering para planos LEGACY
------------------------------------------------------------
-- Regra de negócio: subscriptions cujo plano é LEGACY recebem
-- automaticamente a feature 'fluxo_aprovacao' liberada, sem precisar
-- de item em subscription_addon_items.
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
    -- (a) Grandfathering: planos LEGACY ganham fluxo_aprovacao automático
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
    -- (b) Caminho padrão: add-on ativo no catálogo
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

-- has_my_feature_addon já chama has_feature_addon, então pega o novo
-- comportamento automaticamente. Não precisa recriar.

COMMIT;

-- Plano comercial "Só Aprovação" (liberação manual via Super Admin / cortesia).
-- Ex.: agências com contrato fixo de N clientes (Maria Clara — 13 marcas).

BEGIN;

------------------------------------------------------------
-- 1) Índice único de plan_code — incluir APROVACAO_ONLY
------------------------------------------------------------
DROP INDEX IF EXISTS public.subscription_plans_plan_code_unique;

CREATE UNIQUE INDEX subscription_plans_plan_code_unique
  ON public.subscription_plans (plan_code)
  WHERE plan_code IN (
    'STARTER', 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE', 'APROVACAO_ONLY'
  );

------------------------------------------------------------
-- 2) Plano APROVACAO_ONLY (sem Stripe — liberação manual)
------------------------------------------------------------
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
SELECT
  'Aprovação',
  'APROVACAO_ONLY',
  NULL,
  NULL,
  100,
  'brl',
  'month',
  13,
  13,
  0,
  '{"product_mode":"approval_only","fluxo_aprovacao":true,"support":"standard","billing_model":"per_client","price_per_client_cents":1490}'::jsonb,
  true,
  6,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE plan_code = 'APROVACAO_ONLY'
);

UPDATE public.subscription_plans
SET
  name                  = 'Aprovação',
  max_profiles          = 13,
  max_clients           = 13,
  max_posts_per_month   = 0,
  features              = '{"product_mode":"approval_only","fluxo_aprovacao":true,"support":"standard"}'::jsonb,
  active                = true,
  tier_order            = 6,
  is_enterprise_contact = true,
  updated_at            = now()
WHERE plan_code = 'APROVACAO_ONLY';

------------------------------------------------------------
-- 3) Feature fluxo_aprovacao inclusa no plano APROVACAO_ONLY
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
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = p_organization_id
        AND s.status IN ('active','trialing')
        AND sp.plan_code IN ('BASIC','PRO','BUSINESS','ENTERPRISE','APROVACAO_ONLY')
        AND p_feature_flag = 'fluxo_aprovacao'
    )
    OR
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

------------------------------------------------------------
-- 4) product_mode derivado do plano ou da coluna em organizations
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_organization_product_mode()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(o.product_mode, 'full') = 'approval_only' THEN 'approval_only'
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.organization_id = o.id
        AND s.status IN ('active', 'trialing')
        AND sp.plan_code = 'APROVACAO_ONLY'
    ) THEN 'approval_only'
    ELSE 'full'
  END
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_organization_product_mode() TO authenticated;

COMMIT;

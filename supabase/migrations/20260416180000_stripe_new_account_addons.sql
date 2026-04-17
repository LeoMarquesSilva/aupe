-- Migration: Stripe nova conta (acct_1TLrgi5QaHLfiCdU) + sistema de add-ons
-- INSYT - Instagram Scheduler
-- Aditivo: não quebra as subs legadas. Os planos antigos recebem plan_code='LEGACY'
-- e 5 planos novos (STARTER, BASIC, PRO, BUSINESS, ENTERPRISE) são inseridos.

BEGIN;

------------------------------------------------------------
-- 1) Alterações aditivas em subscription_plans
------------------------------------------------------------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS is_enterprise_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_order integer;

-- Marcar planos antigos como LEGACY (não aparecem mais na landing)
UPDATE public.subscription_plans
SET plan_code = 'LEGACY',
    tier_order = NULL
WHERE plan_code IS NULL;

-- Índice único para plan_code dos planos ativos novos
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_plan_code_unique
  ON public.subscription_plans (plan_code)
  WHERE plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE');

------------------------------------------------------------
-- 2) Inserir 5 novos planos (conta Stripe acct_1TLrgi5QaHLfiCdU)
------------------------------------------------------------
-- STARTER — R$ 30,00/mês
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
VALUES
  ('STARTER', 'STARTER',
   'price_1TMy0m5QaHLfiCdUsSYZrfth', 'prod_ULd8iH7ZLuDJQ3',
   3000, 'brl', 'month',
   1, 1, 300,
   '{"support":"standard"}'::jsonb,
   true, 1, false)
ON CONFLICT (plan_code) DO UPDATE SET
  stripe_price_id   = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  amount            = EXCLUDED.amount,
  active            = true,
  tier_order        = EXCLUDED.tier_order,
  updated_at        = now();

-- BASIC — R$ 178,00/mês
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
VALUES
  ('BASIC', 'BASIC',
   'price_1TMwP35QaHLfiCdUu8cEsivL', 'prod_ULd88KNInwxKfE',
   17800, 'brl', 'month',
   3, 5, 1500,
   '{"support":"standard"}'::jsonb,
   true, 2, false)
ON CONFLICT (plan_code) DO UPDATE SET
  stripe_price_id   = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  amount            = EXCLUDED.amount,
  active            = true,
  tier_order        = EXCLUDED.tier_order,
  updated_at        = now();

-- PRO — R$ 356,00/mês
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
VALUES
  ('PRO', 'PRO',
   'price_1TMwTP5QaHLfiCdUsF0ljCLc', 'prod_ULd8ekUEF8PmpF',
   35600, 'brl', 'month',
   5, 10, 3000,
   '{"support":"priority","analytics":true}'::jsonb,
   true, 3, false)
ON CONFLICT (plan_code) DO UPDATE SET
  stripe_price_id   = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  amount            = EXCLUDED.amount,
  active            = true,
  tier_order        = EXCLUDED.tier_order,
  updated_at        = now();

-- BUSINESS — R$ 500,00/mês
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
VALUES
  ('BUSINESS', 'BUSINESS',
   'price_1TMwUV5QaHLfiCdUtd1vMO9P', 'prod_ULd8bONWLYI7no',
   50000, 'brl', 'month',
   10, 20, 6000,
   '{"support":"priority","analytics":true,"api_access":true}'::jsonb,
   true, 4, false)
ON CONFLICT (plan_code) DO UPDATE SET
  stripe_price_id   = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  amount            = EXCLUDED.amount,
  active            = true,
  tier_order        = EXCLUDED.tier_order,
  updated_at        = now();

-- ENTERPRISE — R$ 1,00 simbólico (A Consultar)
INSERT INTO public.subscription_plans
  (name, plan_code, stripe_price_id, stripe_product_id, amount, currency, interval,
   max_profiles, max_clients, max_posts_per_month, features, active, tier_order, is_enterprise_contact)
VALUES
  ('ENTERPRISE', 'ENTERPRISE',
   'price_1TMvst5QaHLfiCdU3Xuifyx4', 'prod_ULd9KfqG5FAbMk',
   100, 'brl', 'month',
   999999, 999999, 999999,
   '{"support":"dedicated","analytics":true,"api_access":true,"sla":true}'::jsonb,
   true, 5, true)
ON CONFLICT (plan_code) DO UPDATE SET
  stripe_price_id       = EXCLUDED.stripe_price_id,
  stripe_product_id     = EXCLUDED.stripe_product_id,
  amount                = EXCLUDED.amount,
  active                = true,
  tier_order            = EXCLUDED.tier_order,
  is_enterprise_contact = true,
  updated_at            = now();

------------------------------------------------------------
-- 3) Catálogo de add-ons
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  name              text NOT NULL,
  type              text NOT NULL CHECK (type IN ('extra_account','feature')),
  scope_plan_code   text,
  stripe_product_id text NOT NULL,
  stripe_price_id   text NOT NULL UNIQUE,
  amount            integer NOT NULL,
  currency          text NOT NULL DEFAULT 'brl',
  interval          text NOT NULL DEFAULT 'month',
  feature_flag      text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_addons IS
  'Catálogo de add-ons compráveis em cima de uma subscription (conta adicional por plano + features universais)';

-- Conta Adicional por plano
INSERT INTO public.subscription_addons
  (code, name, type, scope_plan_code, stripe_product_id, stripe_price_id, amount, feature_flag, active)
VALUES
  ('CONTA_ADICIONAL_STARTER',   'Conta Adicional - STARTER',   'extra_account', 'STARTER',   'prod_ULdoBwipaLyiFt', 'price_1TMwWx5QaHLfiCdUUGYiRPw1', 3000, NULL, true),
  ('CONTA_ADICIONAL_BASIC',     'Conta Adicional - BASIC',     'extra_account', 'BASIC',     'prod_ULdpmbqNL6yx9h', 'price_1TMwXg5QaHLfiCdUvPEoyQXM', 2000, NULL, true),
  ('CONTA_ADICIONAL_PRO',       'Conta Adicional - PRO',       'extra_account', 'PRO',       'prod_ULdpkTzOe7EqHU', 'price_1TMwYG5QaHLfiCdUsQI0R6tT', 1800, NULL, true),
  ('CONTA_ADICIONAL_BUSINESS',  'Conta Adicional - BUSINESS',  'extra_account', 'BUSINESS',  'prod_ULdq3aLaOCzc5L', 'price_1TMwYq5QaHLfiCdUcJZjyTbl', 1500, NULL, true),
  ('CONTA_ADICIONAL_ENTERPRISE','Conta Adicional - ENTERPRISE','extra_account', 'ENTERPRISE','prod_ULdrgb4seetoi4', 'price_1TMwZf5QaHLfiCdUXYjtTuND', 1200, NULL, true),
  ('FLUXO_APROVACAO',           'Fluxo de Aprovação',          'feature',       NULL,        'prod_ULdtirMgzf74J7', 'price_1TMy0q5QaHLfiCdUlK9VbQje', 10000, 'fluxo_aprovacao', true)
ON CONFLICT (code) DO UPDATE SET
  name              = EXCLUDED.name,
  type              = EXCLUDED.type,
  scope_plan_code   = EXCLUDED.scope_plan_code,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id   = EXCLUDED.stripe_price_id,
  amount            = EXCLUDED.amount,
  feature_flag      = EXCLUDED.feature_flag,
  active            = true,
  updated_at        = now();

CREATE INDEX IF NOT EXISTS subscription_addons_scope_idx
  ON public.subscription_addons (scope_plan_code);
CREATE INDEX IF NOT EXISTS subscription_addons_feature_flag_idx
  ON public.subscription_addons (feature_flag);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_addons_select_public ON public.subscription_addons;
CREATE POLICY subscription_addons_select_public
  ON public.subscription_addons
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

------------------------------------------------------------
-- 4) Add-ons ativos por subscription (espelha line_items do Stripe)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_addon_items (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id             uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  addon_id                    uuid NOT NULL REFERENCES public.subscription_addons(id),
  stripe_subscription_item_id text NOT NULL UNIQUE,
  quantity                    integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status                      text NOT NULL DEFAULT 'active',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, addon_id)
);

COMMENT ON TABLE public.subscription_addon_items IS
  'Add-ons ativos em uma subscription (espelha stripe.subscription.items que não são o plano base)';

CREATE INDEX IF NOT EXISTS subscription_addon_items_sub_idx
  ON public.subscription_addon_items (subscription_id);

ALTER TABLE public.subscription_addon_items ENABLE ROW LEVEL SECURITY;

-- SELECT: owner da organização da subscription
DROP POLICY IF EXISTS subscription_addon_items_select_owner ON public.subscription_addon_items;
CREATE POLICY subscription_addon_items_select_owner
  ON public.subscription_addon_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.profiles p
        ON p.organization_id = s.organization_id
      WHERE s.id = subscription_addon_items.subscription_id
        AND p.id = auth.uid()
    )
  );

-- Service role (webhook) faz o resto. Não criamos políticas INSERT/UPDATE/DELETE
-- porque só a edge function com service role deve modificar.

------------------------------------------------------------
-- 5) RPC has_feature_addon
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
  SELECT EXISTS (
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

-- Conveniência: versão que usa a organização do usuário logado
CREATE OR REPLACE FUNCTION public.has_my_feature_addon(p_feature_flag text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_feature_addon(
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    p_feature_flag
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_my_feature_addon(text) TO authenticated;

------------------------------------------------------------
-- 6) View helper: contar contas adicionais compradas por sub
------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_subscription_effective_limits AS
SELECT
  s.id                                 AS subscription_id,
  s.organization_id,
  sp.plan_code,
  sp.max_clients                       AS base_max_clients,
  COALESCE(SUM(
    CASE WHEN sa.type = 'extra_account' THEN sai.quantity ELSE 0 END
  ), 0)::int                           AS extra_accounts,
  (sp.max_clients + COALESCE(SUM(
    CASE WHEN sa.type = 'extra_account' THEN sai.quantity ELSE 0 END
  ), 0))::int                          AS effective_max_clients
FROM public.subscriptions s
JOIN public.subscription_plans sp ON sp.id = s.plan_id
LEFT JOIN public.subscription_addon_items sai
  ON sai.subscription_id = s.id AND sai.status = 'active'
LEFT JOIN public.subscription_addons sa
  ON sa.id = sai.addon_id AND sa.active = true
WHERE s.status IN ('active','trialing')
GROUP BY s.id, s.organization_id, sp.plan_code, sp.max_clients;

GRANT SELECT ON public.v_subscription_effective_limits TO authenticated;

COMMIT;

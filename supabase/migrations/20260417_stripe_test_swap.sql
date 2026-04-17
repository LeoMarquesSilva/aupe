-- ========================================================================
-- Migration: 20260417_stripe_test_swap.sql
-- Objetivo: Migrar temporariamente os Stripe Product/Price IDs para TEST mode
--           para validaÃ§Ã£o ponta-a-ponta, mantendo os IDs LIVE preservados em
--           colunas de backup para reversÃ£o futura.
--
-- ReversÃ­vel por: supabase/migrations/20260418_stripe_revert_to_live.sql
-- CatÃ¡logo gerado por: scripts/stripe-create-test-catalog.mjs
-- ========================================================================

BEGIN;

-- 1) Adicionar colunas de backup em subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id_live   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_product_id_live TEXT;

-- 2) Adicionar colunas de backup em subscription_addons
ALTER TABLE public.subscription_addons
  ADD COLUMN IF NOT EXISTS stripe_price_id_live   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_product_id_live TEXT;

-- 3) Copiar valores atuais (LIVE) para colunas de backup â€” somente se ainda nÃ£o houver backup.
--    Isso protege contra execuÃ§Ãµes repetidas sobrescreverem o backup.
UPDATE public.subscription_plans
   SET stripe_price_id_live = stripe_price_id,
       stripe_product_id_live = stripe_product_id
 WHERE stripe_price_id_live IS NULL
   AND plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE');

UPDATE public.subscription_addons
   SET stripe_price_id_live = stripe_price_id,
       stripe_product_id_live = stripe_product_id
 WHERE stripe_price_id_live IS NULL;

-- 4) Swap: sobrescrever com IDs TEST (novos produtos/preÃ§os criados via script)
-- Planos
UPDATE public.subscription_plans SET
    stripe_price_id   = 'price_1TNCCk5QaHLfiCdUDgq3gXFs',
    stripe_product_id = 'prod_ULu0QpNaDKZNlE',
    updated_at        = now()
  WHERE plan_code = 'STARTER';

UPDATE public.subscription_plans SET
    stripe_price_id   = 'price_1TNCCl5QaHLfiCdUdOTp7k8C',
    stripe_product_id = 'prod_ULu0vv6PeH3UFK',
    updated_at        = now()
  WHERE plan_code = 'BASIC';

UPDATE public.subscription_plans SET
    stripe_price_id   = 'price_1TNCCm5QaHLfiCdUOsn2lUEr',
    stripe_product_id = 'prod_ULu0UA4tiTvwpI',
    updated_at        = now()
  WHERE plan_code = 'PRO';

UPDATE public.subscription_plans SET
    stripe_price_id   = 'price_1TNCCn5QaHLfiCdUuEpXI2Je',
    stripe_product_id = 'prod_ULu0bERgIZYl0a',
    updated_at        = now()
  WHERE plan_code = 'BUSINESS';

UPDATE public.subscription_plans SET
    stripe_price_id   = 'price_1TNCCn5QaHLfiCdUv3ArgbTp',
    stripe_product_id = 'prod_ULu0RK94yVmOdY',
    updated_at        = now()
  WHERE plan_code = 'ENTERPRISE';

-- Add-ons
UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCo5QaHLfiCdUNfzq8ujI',
    stripe_product_id = 'prod_ULu0ztBCxfXm44',
    updated_at        = now()
  WHERE code = 'CONTA_ADICIONAL_STARTER';

UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCp5QaHLfiCdUcwtowKfC',
    stripe_product_id = 'prod_ULu0f8yOKdMyeb',
    updated_at        = now()
  WHERE code = 'CONTA_ADICIONAL_BASIC';

UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCq5QaHLfiCdUZaVf2inw',
    stripe_product_id = 'prod_ULu0ReVHMaStMV',
    updated_at        = now()
  WHERE code = 'CONTA_ADICIONAL_PRO';

UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCq5QaHLfiCdUyPhI69yk',
    stripe_product_id = 'prod_ULu0rVvglHnUcG',
    updated_at        = now()
  WHERE code = 'CONTA_ADICIONAL_BUSINESS';

UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCr5QaHLfiCdUXnbz0Rq4',
    stripe_product_id = 'prod_ULu0oNDfngNXkW',
    updated_at        = now()
  WHERE code = 'CONTA_ADICIONAL_ENTERPRISE';

UPDATE public.subscription_addons SET
    stripe_price_id   = 'price_1TNCCs5QaHLfiCdUI2tqlFha',
    stripe_product_id = 'prod_ULu0Vlnet7wUXB',
    updated_at        = now()
  WHERE code = 'FLUXO_APROVACAO';

-- 5) Sanity checks (levanta erro se algum plano ficou sem ID test)
DO $check$
DECLARE
  missing_plans INT;
  missing_addons INT;
BEGIN
  SELECT count(*) INTO missing_plans
    FROM public.subscription_plans
   WHERE plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE')
     AND (stripe_price_id IS NULL OR stripe_price_id NOT LIKE 'price_1TNCC%');
  IF missing_plans > 0 THEN
    RAISE EXCEPTION 'FATAL: % planos ficaram sem stripe_price_id TEST apÃ³s swap', missing_plans;
  END IF;

  SELECT count(*) INTO missing_addons
    FROM public.subscription_addons
   WHERE stripe_price_id IS NULL OR stripe_price_id NOT LIKE 'price_1TNCC%';
  IF missing_addons > 0 THEN
    RAISE EXCEPTION 'FATAL: % add-ons ficaram sem stripe_price_id TEST apÃ³s swap', missing_addons;
  END IF;

  RAISE NOTICE 'âœ… Swap para TEST mode concluÃ­do. Backup LIVE preservado em *_live.';
END
$check$;

COMMIT;


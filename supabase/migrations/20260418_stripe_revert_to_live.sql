-- ========================================================================
-- Migration: 20260418_stripe_revert_to_live.sql
-- Objetivo: Reverter o swap TEST -> LIVE feito em 20260417_stripe_test_swap.sql,
--           restaurando os Stripe Price/Product IDs LIVE originais a partir do
--           backup salvo em stripe_*_id_live.
--
-- IMPORTANTE: Após aplicar esta migration, você também precisa:
--   1. No .env local: trocar REACT_APP_STRIPE_PUBLISHABLE_KEY (pk_test_ -> pk_live_)
--      usando o valor salvo em REACT_APP_STRIPE_PUBLISHABLE_KEY_LIVE_BACKUP.
--      Idem REACT_APP_STRIPE_SECRET_KEY (sk_test_ -> sk_live_ do LIVE_BACKUP).
--   2. No Supabase Edge Functions (Dashboard > Project Settings > Edge Functions > Secrets):
--      - STRIPE_SECRET_KEY -> valor sk_live_ da conta acct_1TLrgi5QaHLfiCdU
--      - STRIPE_WEBHOOK_SECRET -> whsec_ do webhook endpoint LIVE
--   3. Restaurar src/config/stripeProducts.ts a partir de src/config/stripeProducts.live.ts.bak
--      (ou fazer checkout do arquivo via git antes do swap).
--   4. Restart `npm run dev`.
--
-- Webhook endpoint TEST criado em 2026-04-17: we_1TNCFt5QaHLfiCdUo7T5OPEa
--   Pode ser desabilitado no Dashboard Stripe (modo Test > Developers > Webhooks).
-- ========================================================================

BEGIN;

-- 1) Verificar integridade dos backups antes de reverter
DO $pre_check$
DECLARE
  plans_without_backup INT;
  addons_without_backup INT;
BEGIN
  SELECT count(*) INTO plans_without_backup
    FROM public.subscription_plans
   WHERE plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE')
     AND (stripe_price_id_live IS NULL OR stripe_product_id_live IS NULL);
  IF plans_without_backup > 0 THEN
    RAISE EXCEPTION 'FATAL: % planos sem backup LIVE. Não é seguro reverter.', plans_without_backup;
  END IF;

  SELECT count(*) INTO addons_without_backup
    FROM public.subscription_addons
   WHERE stripe_price_id_live IS NULL OR stripe_product_id_live IS NULL;
  IF addons_without_backup > 0 THEN
    RAISE EXCEPTION 'FATAL: % add-ons sem backup LIVE. Não é seguro reverter.', addons_without_backup;
  END IF;
END
$pre_check$;

-- 2) Reverter subscription_plans usando o backup
UPDATE public.subscription_plans
   SET stripe_price_id   = stripe_price_id_live,
       stripe_product_id = stripe_product_id_live,
       updated_at        = now()
 WHERE plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE')
   AND stripe_price_id_live IS NOT NULL;

-- 3) Reverter subscription_addons usando o backup
UPDATE public.subscription_addons
   SET stripe_price_id   = stripe_price_id_live,
       stripe_product_id = stripe_product_id_live,
       updated_at        = now()
 WHERE stripe_price_id_live IS NOT NULL;

-- 4) Sanity check: conferir que todos voltaram para o prefixo LIVE esperado
DO $post_check$
DECLARE
  still_test INT;
BEGIN
  SELECT count(*) INTO still_test
    FROM public.subscription_plans
   WHERE plan_code IN ('STARTER','BASIC','PRO','BUSINESS','ENTERPRISE')
     AND stripe_price_id LIKE 'price_1TNCC%';
  IF still_test > 0 THEN
    RAISE EXCEPTION 'FATAL: % planos ainda com price_id TEST após reversão', still_test;
  END IF;

  SELECT count(*) INTO still_test
    FROM public.subscription_addons
   WHERE stripe_price_id LIKE 'price_1TNCC%';
  IF still_test > 0 THEN
    RAISE EXCEPTION 'FATAL: % add-ons ainda com price_id TEST após reversão', still_test;
  END IF;

  RAISE NOTICE 'Reversão para LIVE mode concluída com sucesso.';
END
$post_check$;

-- OPCIONAL: descomente para limpar as colunas de backup após validar que a reversão OK
-- ALTER TABLE public.subscription_plans
--   DROP COLUMN IF EXISTS stripe_price_id_live,
--   DROP COLUMN IF EXISTS stripe_product_id_live;
-- ALTER TABLE public.subscription_addons
--   DROP COLUMN IF EXISTS stripe_price_id_live,
--   DROP COLUMN IF EXISTS stripe_product_id_live;

COMMIT;

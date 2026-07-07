-- Renomeia o plano e migra organizações em modo só aprovação para APROVACAO_ONLY

UPDATE public.subscription_plans
SET name = 'Fluxo de Aprovação', updated_at = now()
WHERE plan_code = 'APROVACAO_ONLY';

UPDATE public.subscriptions s
SET
  plan_id = ap.id,
  updated_at = now()
FROM public.organizations o,
     public.subscription_plans ap
WHERE s.organization_id = o.id
  AND ap.plan_code = 'APROVACAO_ONLY'
  AND o.product_mode = 'approval_only'
  AND s.status IN ('active', 'trialing')
  AND s.plan_id IS DISTINCT FROM ap.id;

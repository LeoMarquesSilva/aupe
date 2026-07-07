-- Preço por cliente no plano APROVACAO_ONLY: R$ 14,90/cliente/mês

UPDATE public.subscription_plans
SET
  amount = 1490,
  features = jsonb_build_object(
    'product_mode', 'approval_only',
    'fluxo_aprovacao', true,
    'support', 'standard',
    'billing_model', 'per_client',
    'price_per_client_cents', 1490
  ),
  updated_at = now()
WHERE plan_code = 'APROVACAO_ONLY';

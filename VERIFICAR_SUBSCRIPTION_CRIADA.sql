-- 🔍 Verificar Subscription Criada pelo Checkout
-- Execute após fazer checkout no Stripe
-- INSYT - Instagram Scheduler

-- 1. Ver todas as subscriptions com Stripe (ordenadas por mais recente)
SELECT 
    s.id,
    s.status,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    o.name AS organizacao,
    p.name AS plano,
    p.amount / 100.0 AS preco_mensal
FROM subscriptions s
LEFT JOIN organizations o ON s.organization_id = o.id
LEFT JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.stripe_subscription_id IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 5;

-- 2. Buscar pela session_id do checkout (se tiver o subscription_id)
-- Substitua 'cs_test_...' pelo session_id que aparece na URL de sucesso
-- SELECT 
--     s.*,
--     o.name AS organizacao,
--     p.name AS plano
-- FROM subscriptions s
-- LEFT JOIN organizations o ON s.organization_id = o.id
-- LEFT JOIN subscription_plans p ON s.plan_id = p.id
-- WHERE s.stripe_subscription_id IN (
--     -- Buscar subscription_id do checkout session (precisa fazer no Stripe Dashboard)
--     SELECT subscription_id FROM ... -- Substituir
-- );

-- 3. Ver pagamentos registrados recentemente
SELECT 
    p.id,
    p.amount / 100.0 AS valor,
    p.currency,
    p.status,
    p.paid_at,
    p.stripe_invoice_id,
    s.stripe_subscription_id,
    o.name AS organizacao
FROM payments p
JOIN subscriptions s ON p.subscription_id = s.id
LEFT JOIN organizations o ON s.organization_id = o.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 4. Verificar subscription da organização "Agência AUPE"
SELECT 
    s.id,
    s.status,
    s.stripe_subscription_id,
    s.current_period_start,
    s.current_period_end,
    o.name AS organizacao,
    p.name AS plano
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
JOIN subscription_plans p ON s.plan_id = p.id
WHERE o.name = 'Agência AUPE'
ORDER BY s.created_at DESC;

-- 5. Ver logs de webhook (se tiver tabela de logs)
-- NOTA: Os logs do webhook aparecem no Supabase Dashboard → Edge Functions → Logs

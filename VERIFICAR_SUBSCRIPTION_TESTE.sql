-- 🔍 Verificar Subscriptions Criadas Recentemente
-- Execute para ver todas as subscriptions (incluindo testes)

-- 1. Ver todas as subscriptions com stripe_subscription_id
SELECT 
    s.id,
    s.organization_id,
    s.status,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    o.name AS organizacao,
    p.name AS plano
FROM subscriptions s
LEFT JOIN organizations o ON s.organization_id = o.id
LEFT JOIN subscription_plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 2. Buscar pela subscription ID específica do teste
SELECT 
    s.id,
    s.organization_id,
    s.status,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.plan_id,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    o.name AS organizacao,
    CASE 
        WHEN o.id IS NULL THEN '❌ Organization não encontrada (ID inválido)'
        ELSE '✅ Organization existe'
    END AS status_organization
FROM subscriptions s
LEFT JOIN organizations o ON s.organization_id = o.id
WHERE s.stripe_subscription_id = 'sub_1Sr6ZoHbDBpY5E6nvmzu0otm';

-- 3. Verificar se organization_id "test-org-id-123" existe
SELECT 
    id,
    name,
    created_at
FROM organizations 
WHERE id::text = 'test-org-id-123' OR name LIKE '%test%';

-- 4. Ver todas as organizations disponíveis
SELECT 
    id,
    name,
    created_at
FROM organizations
ORDER BY created_at DESC;

-- 5. Ver subscriptions com organization_id inválido ou null
SELECT 
    s.id,
    s.organization_id,
    s.status,
    s.stripe_subscription_id,
    CASE 
        WHEN s.organization_id IS NULL THEN '❌ organization_id NULL'
        WHEN o.id IS NULL THEN '❌ organization_id não existe no banco'
        ELSE '✅ organization_id válido'
    END AS status_organization
FROM subscriptions s
LEFT JOIN organizations o ON s.organization_id = o.id
WHERE s.organization_id IS NULL OR o.id IS NULL
ORDER BY s.created_at DESC;

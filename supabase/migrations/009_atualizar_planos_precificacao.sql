-- =====================================================
-- SCRIPT: Atualizar Planos de Precificação
-- INSYT - Instagram Scheduler
-- Data: 2026-01-18
-- =====================================================
-- 
-- ESTRUTURA DE PLANOS:
-- 1. Starter: 3 clientes
-- 2. Professional: Até 10 clientes (escalonado)
-- 3. Business: Até 20 clientes (R$ 29,80 por cliente = R$ 596,00)
-- 
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ATUALIZAR STARTER (3 clientes)
-- =====================================================

UPDATE subscription_plans
SET 
    amount = 8940,  -- R$ 89,40 (3 clientes × R$ 29,80)
    max_profiles = 3,
    max_clients = 3,
    max_posts_per_month = 900,  -- 300 por conta × 3
    updated_at = NOW()
WHERE name = 'starter';

-- =====================================================
-- 2. ATUALIZAR PROFESSIONAL (até 10 clientes)
-- =====================================================

UPDATE subscription_plans
SET 
    amount = 29800,  -- R$ 298,00 (10 clientes × R$ 29,80)
    max_profiles = 8,
    max_clients = 10,
    max_posts_per_month = 20000,  -- 2.000 por conta × 10
    updated_at = NOW()
WHERE name = 'professional';

-- =====================================================
-- 3. ATUALIZAR/CRIAR BUSINESS (até 20 clientes)
-- =====================================================

-- Atualizar se existir
UPDATE subscription_plans
SET 
    amount = 59600,  -- R$ 596,00 (20 clientes × R$ 29,80)
    max_profiles = 15,
    max_clients = 20,
    max_posts_per_month = 40000,  -- 2.000 por conta × 20
    updated_at = NOW()
WHERE name = 'business';

-- Se não existir, criar
INSERT INTO subscription_plans (name, amount, max_profiles, max_clients, max_posts_per_month, features)
VALUES (
    'business',
    59600,  -- R$ 596,00 (20 clientes × R$ 29,80)
    15,
    20,
    40000,  -- 2.000 por conta × 20
    '{"analytics": true, "support": "priority", "api_access": true, "custom_integrations": false}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. VERIFICAR PLANOS ATUALIZADOS
-- =====================================================

SELECT 
    name AS plano,
    amount / 100.0 AS preco_brl,
    max_profiles AS profiles,
    max_clients AS clients,
    max_posts_per_month AS posts_mes,
    CASE 
        WHEN amount / max_clients IS NOT NULL 
        THEN ROUND((amount / 100.0) / max_clients, 2)
        ELSE NULL 
    END AS preco_por_cliente
FROM subscription_plans
WHERE name IN ('starter', 'professional', 'business')
ORDER BY amount;

COMMIT;

-- =====================================================
-- RESUMO DOS PLANOS
-- =====================================================
-- 
-- Starter (3 clientes):
--   Preço: R$ 89,40/mês (R$ 29,80 por cliente)
--   Limites: 3 profiles, 3 clients, 900 posts/mês
-- 
-- Professional (10 clientes):
--   Preço: R$ 298,00/mês (R$ 29,80 por cliente)
--   Limites: 8 profiles, 10 clients, 20.000 posts/mês
-- 
-- Business (20 clientes):
--   Preço: R$ 596,00/mês (R$ 29,80 por cliente)
--   Limites: 15 profiles, 20 clients, 40.000 posts/mês
-- 
-- ⚠️ CLIENTE ATUAL (15 clientes):
--   Se está no Professional (até 10), precisa migrar para Business (até 20)
--   Valor atual: R$ 447,00/mês (15 clientes)
--   Com novo plano Business: R$ 596,00/mês (20 clientes)
--   Ou manter Professional e cobrar por conta adicional
-- 
-- =====================================================

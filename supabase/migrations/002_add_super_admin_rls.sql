-- =====================================================
-- MIGRAÇÃO: Adicionar Suporte a Super Admin no RLS
-- INSYT - Instagram Scheduler
-- Data: 2026-01-18
-- =====================================================
-- 
-- Esta migração:
-- 1. Atualiza políticas RLS para incluir 'super_admin'
-- 2. Adiciona políticas de INSERT/UPDATE/DELETE para super_admin
-- 3. Cria função RPC para verificar super_admin
-- 
-- IMPORTANTE: Execute após a migração 001_create_subscription_system.sql
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR FUNÇÃO RPC PARA VERIFICAR SUPER_ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM profiles
    WHERE id = user_id
    LIMIT 1;
    
    RETURN v_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Verifica se o usuário é super_admin';

-- =====================================================
-- 2. ATUALIZAR POLÍTICAS RLS PARA ORGANIZATIONS
-- =====================================================

-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Nova política de SELECT (inclui super_admin)
CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Remover política antiga de ALL
DROP POLICY IF EXISTS "Admins can manage all organizations" ON organizations;

-- Nova política de ALL (inclui super_admin)
CREATE POLICY "Admins can manage all organizations"
    ON organizations FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- =====================================================
-- 3. ATUALIZAR POLÍTICAS RLS PARA SUBSCRIPTIONS
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "Users can view their organization subscription" ON subscriptions;

-- Nova política de SELECT (inclui super_admin)
CREATE POLICY "Users can view their organization subscription"
    ON subscriptions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Adicionar política de INSERT/UPDATE/DELETE para super_admin
CREATE POLICY "Super admins can manage all subscriptions"
    ON subscriptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- =====================================================
-- 4. ATUALIZAR POLÍTICAS RLS PARA SUBSCRIPTION_USAGE
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "Users can view their organization usage" ON subscription_usage;

-- Nova política de SELECT (inclui super_admin)
CREATE POLICY "Users can view their organization usage"
    ON subscription_usage FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Adicionar política de INSERT/UPDATE/DELETE para super_admin
CREATE POLICY "Super admins can manage all usage"
    ON subscription_usage FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- =====================================================
-- 5. ATUALIZAR POLÍTICAS RLS PARA PAYMENTS
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "Users can view their organization payments" ON payments;

-- Nova política de SELECT (inclui super_admin)
CREATE POLICY "Users can view their organization payments"
    ON payments FOR SELECT
    USING (
        subscription_id IN (
            SELECT s.id FROM subscriptions s
            JOIN profiles p ON s.organization_id = p.organization_id
            WHERE p.id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Adicionar política de INSERT/UPDATE/DELETE para super_admin
CREATE POLICY "Super admins can manage all payments"
    ON payments FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- =====================================================
-- 6. ATUALIZAR POLÍTICAS RLS PARA SUBSCRIPTION_PLANS
-- =====================================================

-- Remover política pública antiga
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

-- Nova política de SELECT (público + super_admin pode ver inativos)
CREATE POLICY "Anyone can view active subscription plans"
    ON subscription_plans FOR SELECT
    USING (
        active = true
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Adicionar política de INSERT/UPDATE/DELETE para super_admin
CREATE POLICY "Super admins can manage all plans"
    ON subscription_plans FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

COMMIT;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

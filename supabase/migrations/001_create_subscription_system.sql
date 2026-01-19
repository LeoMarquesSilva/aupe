-- =====================================================
-- MIGRAÇÃO COMPLETA: Sistema de Subscriptions com Hierarquia
-- INSYT - Instagram Scheduler
-- Data: 2025
-- =====================================================
-- 
-- Esta migração cria:
-- 1. Tabela organizations (contratantes)
-- 2. Sistema de subscriptions completo
-- 3. Migra dados existentes
-- 4. Protege posts existentes
-- 5. Cria funções e triggers de verificação
-- 
-- IMPORTANTE: Execute em ambiente de desenvolvimento primeiro!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR TABELA ORGANIZATIONS (CONTRATANTES)
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT, -- CNPJ/CPF
    
    -- Endereço
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'BR',
    
    -- Metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);

-- Comentários
COMMENT ON TABLE organizations IS 'Contratantes (agências/empresas) que pagam pelo sistema';
COMMENT ON COLUMN organizations.name IS 'Nome da agência/empresa';
COMMENT ON COLUMN organizations.email IS 'Email de contato principal';

-- =====================================================
-- 2. CRIAR TABELA SUBSCRIPTION_PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
    stripe_price_id TEXT UNIQUE, -- ID do preço no Stripe
    amount INTEGER NOT NULL, -- Valor em centavos (R$ 49 = 4900)
    currency TEXT DEFAULT 'brl',
    interval TEXT DEFAULT 'month', -- 'month' ou 'year'
    
    -- LIMITES DO PLANO
    max_profiles INTEGER NOT NULL DEFAULT 1, -- Máximo de pessoas com acesso
    max_clients INTEGER NOT NULL DEFAULT 1, -- Máximo de contas Instagram
    max_posts_per_month INTEGER NOT NULL DEFAULT 10, -- Máximo de posts por mês
    
    -- Features (JSONB para flexibilidade)
    features JSONB DEFAULT '{}',
    
    -- Metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Comentários
COMMENT ON TABLE subscription_plans IS 'Planos de assinatura disponíveis';
COMMENT ON COLUMN subscription_plans.max_profiles IS 'Máximo de pessoas (profiles) com acesso ao sistema';
COMMENT ON COLUMN subscription_plans.max_clients IS 'Máximo de contas Instagram conectadas';
COMMENT ON COLUMN subscription_plans.max_posts_per_month IS 'Máximo de posts agendados por mês (total)';

-- Inserir planos padrão
INSERT INTO subscription_plans (name, amount, max_profiles, max_clients, max_posts_per_month, features) VALUES
('starter', 4900, 3, 5, 100, '{"analytics": true, "support": "email"}'::jsonb),
('professional', 14900, 10, 15, 500, '{"analytics": true, "support": "priority", "api_access": true}'::jsonb),
('enterprise', 0, 999999, 999999, 999999, '{"analytics": true, "support": "dedicated", "api_access": true, "custom_integrations": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. CRIAR TABELA SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Stripe IDs
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
    
    -- Período
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Cancelamento
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Comentários
COMMENT ON TABLE subscriptions IS 'Assinaturas ativas das organizações';
COMMENT ON COLUMN subscriptions.organization_id IS 'Organização que possui esta assinatura';

-- =====================================================
-- 4. CRIAR TABELA SUBSCRIPTION_USAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Período de medição
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Uso atual
    profiles_count INTEGER DEFAULT 0, -- Quantas pessoas têm acesso
    clients_count INTEGER DEFAULT 0, -- Quantas contas Instagram conectadas
    posts_count INTEGER DEFAULT 0, -- Quantos posts agendados no período
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Um registro por organização por período
    UNIQUE(organization_id, period_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_usage_organization_id ON subscription_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- Comentários
COMMENT ON TABLE subscription_usage IS 'Uso atual das organizações (para controle de limites)';

-- =====================================================
-- 5. CRIAR TABELA PAYMENTS (Histórico de Pagamentos)
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_invoice_id TEXT,
    
    -- Valores
    amount INTEGER NOT NULL, -- Valor em centavos
    currency TEXT DEFAULT 'brl',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'succeeded', 'pending', 'failed', 'refunded'
    
    -- Método de pagamento
    payment_method TEXT, -- 'card', 'bank_transfer', etc
    
    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payments_status_check CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);

-- Comentários
COMMENT ON TABLE payments IS 'Histórico de pagamentos das assinaturas';

-- =====================================================
-- 6. ADICIONAR ORGANIZATION_ID EM PROFILES
-- =====================================================

-- Adicionar coluna
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- Comentário
COMMENT ON COLUMN profiles.organization_id IS 'Organização à qual este profile pertence';

-- =====================================================
-- 7. ADICIONAR ORGANIZATION_ID EM CLIENTS
-- =====================================================

-- Adicionar coluna
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);

-- Comentário
COMMENT ON COLUMN clients.organization_id IS 'Organização à qual esta conta Instagram pertence (para limites)';

-- =====================================================
-- 8. ADICIONAR CAMPOS EM SCHEDULED_POSTS
-- =====================================================

-- Adicionar organization_id
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Adicionar grandfathered (proteção de posts existentes)
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS grandfathered BOOLEAN DEFAULT false;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_organization_id ON scheduled_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_grandfathered ON scheduled_posts(grandfathered, user_id);

-- Comentários
COMMENT ON COLUMN scheduled_posts.organization_id IS 'Organização à qual este post pertence (para limites)';
COMMENT ON COLUMN scheduled_posts.grandfathered IS 'Se true, este post não conta para limites (posts criados antes da migração)';

-- =====================================================
-- 9. MIGRAR DADOS EXISTENTES
-- =====================================================

-- 9.1. Criar organização padrão para dados existentes
DO $$
DECLARE
    v_organization_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Criar organização padrão
    INSERT INTO organizations (name, email, active)
    VALUES ('Agência AUPE', 'contato@aupe.com.br', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_organization_id;
    
    -- Se não criou, buscar existente
    IF v_organization_id IS NULL THEN
        SELECT id INTO v_organization_id FROM organizations WHERE name = 'Agência AUPE' LIMIT 1;
    END IF;
    
    -- Se ainda não tem, criar com nome genérico
    IF v_organization_id IS NULL THEN
        INSERT INTO organizations (name, active)
        VALUES ('Organização Padrão', true)
        RETURNING id INTO v_organization_id;
    END IF;
    
    -- 9.2. Atualizar todos os profiles existentes
    UPDATE profiles 
    SET organization_id = v_organization_id
    WHERE organization_id IS NULL;
    
    -- 9.3. Atualizar todos os clients existentes
    -- Buscar organization_id do profile do user_id
    UPDATE clients c
    SET organization_id = p.organization_id
    FROM profiles p
    WHERE c.user_id = p.id
        AND c.organization_id IS NULL;
    
    -- Se algum client não foi atualizado, usar organização padrão
    UPDATE clients
    SET organization_id = v_organization_id
    WHERE organization_id IS NULL;
    
    -- 9.4. Atualizar scheduled_posts
    -- Buscar organization_id do client
    UPDATE scheduled_posts sp
    SET organization_id = c.organization_id
    FROM clients c
    WHERE sp.client_id = c.id
        AND sp.organization_id IS NULL;
    
    -- Se algum post não foi atualizado, usar organização padrão
    UPDATE scheduled_posts
    SET organization_id = v_organization_id
    WHERE organization_id IS NULL;
    
    -- 9.5. Marcar TODOS os posts existentes como grandfathered
    UPDATE scheduled_posts
    SET grandfathered = true
    WHERE grandfathered = false
        AND created_at < NOW(); -- Todos os posts criados antes de agora
    
    -- 9.6. Criar subscription padrão (Professional) para a organização
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'professional' LIMIT 1;
    
    IF v_plan_id IS NOT NULL THEN
        INSERT INTO subscriptions (
            organization_id,
            plan_id,
            status,
            current_period_start,
            current_period_end
        )
        VALUES (
            v_organization_id,
            v_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '1 month'
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_subscription_id;
        
        -- Criar registro de uso inicial
        IF v_subscription_id IS NOT NULL THEN
            INSERT INTO subscription_usage (
                organization_id,
                subscription_id,
                period_start,
                period_end,
                profiles_count,
                clients_count,
                posts_count
            )
            SELECT 
                v_organization_id,
                v_subscription_id,
                date_trunc('month', NOW()),
                date_trunc('month', NOW()) + INTERVAL '1 month',
                (SELECT COUNT(*) FROM profiles WHERE organization_id = v_organization_id),
                (SELECT COUNT(*) FROM clients WHERE organization_id = v_organization_id),
                (SELECT COUNT(*) FROM scheduled_posts 
                 WHERE organization_id = v_organization_id 
                 AND scheduled_date >= date_trunc('month', NOW())
                 AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month')
            ON CONFLICT (organization_id, period_start) DO UPDATE SET
                profiles_count = EXCLUDED.profiles_count,
                clients_count = EXCLUDED.clients_count,
                posts_count = EXCLUDED.posts_count;
        END IF;
    END IF;
    
    RAISE NOTICE 'Migração concluída. Organization ID: %, Subscription ID: %', v_organization_id, v_subscription_id;
END $$;

-- =====================================================
-- 10. CRIAR FUNÇÕES DE VERIFICAÇÃO
-- =====================================================

-- 10.1. Verificar limite de profiles
CREATE OR REPLACE FUNCTION can_add_profile(
    p_organization_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_current_profiles INTEGER;
    v_max_profiles INTEGER;
BEGIN
    -- Buscar subscription ativa
    SELECT s.*, sp.max_profiles INTO v_subscription
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.organization_id = p_organization_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
    LIMIT 1;
    
    -- Se não tem subscription ativa, negar
    IF v_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Contar profiles da organização
    SELECT COUNT(*) INTO v_current_profiles
    FROM profiles
    WHERE organization_id = p_organization_id;
    
    -- Verificar limite
    IF v_current_profiles >= v_subscription.max_profiles THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.2. Verificar limite de contas Instagram
CREATE OR REPLACE FUNCTION can_create_instagram_account(
    p_organization_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_current_clients INTEGER;
    v_max_clients INTEGER;
BEGIN
    -- Buscar subscription ativa
    SELECT s.*, sp.max_clients INTO v_subscription
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.organization_id = p_organization_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
    LIMIT 1;
    
    -- Se não tem subscription ativa, negar
    IF v_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Contar contas Instagram conectadas
    SELECT COUNT(*) INTO v_current_clients
    FROM clients
    WHERE organization_id = p_organization_id;
    
    -- Verificar limite
    IF v_current_clients >= v_subscription.max_clients THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.3. Verificar limite de posts
CREATE OR REPLACE FUNCTION can_schedule_post(
    p_organization_id UUID,
    p_post_type TEXT DEFAULT 'post'
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_posts_this_month INTEGER;
    v_max_posts INTEGER;
BEGIN
    -- Buscar subscription ativa
    SELECT s.*, sp.max_posts_per_month INTO v_subscription
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.organization_id = p_organization_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
    LIMIT 1;
    
    -- Se não tem subscription, negar (exceto grandfathered)
    IF v_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Contar posts do mês (EXCLUINDO grandfathered)
    SELECT COUNT(*) INTO v_posts_this_month
    FROM scheduled_posts
    WHERE organization_id = p_organization_id
        AND scheduled_date >= date_trunc('month', NOW())
        AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month'
        AND grandfathered = false;
    
    -- Verificar limite
    IF v_posts_this_month >= v_subscription.max_posts_per_month THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. CRIAR TRIGGERS DE PROTEÇÃO
-- =====================================================

-- 11.1. Trigger para verificar limite de profiles
CREATE OR REPLACE FUNCTION check_profile_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ SEMPRE permitir atualizações
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- ✅ Verificar limite apenas em INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.organization_id IS NOT NULL THEN
            IF NOT can_add_profile(NEW.organization_id) THEN
                RAISE EXCEPTION 'Limite de pessoas com acesso do plano atingido. Faça upgrade para adicionar mais pessoas.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_profile_limit_trigger ON profiles;
CREATE TRIGGER check_profile_limit_trigger
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_profile_limit();

-- 11.2. Trigger para verificar limite de contas Instagram
CREATE OR REPLACE FUNCTION check_instagram_account_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ SEMPRE permitir atualizações
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- ✅ Verificar limite apenas em INSERT
    IF TG_OP = 'INSERT' THEN
        -- Se não tem organization_id, buscar do profile
        IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
            SELECT organization_id INTO NEW.organization_id
            FROM profiles
            WHERE id = NEW.user_id
            LIMIT 1;
        END IF;
        
        IF NEW.organization_id IS NOT NULL THEN
            IF NOT can_create_instagram_account(NEW.organization_id) THEN
                RAISE EXCEPTION 'Limite de contas Instagram do plano atingido. Faça upgrade para conectar mais contas.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_instagram_account_limit_trigger ON clients;
CREATE TRIGGER check_instagram_account_limit_trigger
    BEFORE INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION check_instagram_account_limit();

-- 11.3. Trigger para verificar limite de posts
CREATE OR REPLACE FUNCTION check_scheduled_post_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    -- ✅ SEMPRE permitir posts grandfathered
    IF NEW.grandfathered = true THEN
        RETURN NEW;
    END IF;
    
    -- ✅ SEMPRE permitir atualizações de posts existentes
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- ✅ Buscar organization_id do client
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO v_organization_id
        FROM clients
        WHERE id = NEW.client_id;
        
        IF v_organization_id IS NOT NULL THEN
            NEW.organization_id = v_organization_id;
        END IF;
    END IF;
    
    -- ✅ Apenas verificar limites em NOVOS posts (não grandfathered)
    IF TG_OP = 'INSERT' AND NEW.grandfathered = false THEN
        IF NEW.organization_id IS NOT NULL THEN
            IF NOT can_schedule_post(NEW.organization_id, NEW.post_type) THEN
                RAISE EXCEPTION 'Limite de posts do plano atingido. Faça upgrade para agendar mais posts.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_scheduled_post_limits_trigger ON scheduled_posts;
CREATE TRIGGER check_scheduled_post_limits_trigger
    BEFORE INSERT ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION check_scheduled_post_limits();

-- =====================================================
-- 12. CRIAR FUNÇÃO DE ATUALIZAÇÃO DE USO
-- =====================================================

CREATE OR REPLACE FUNCTION update_subscription_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Determinar organization_id baseado na tabela
    IF TG_TABLE_NAME = 'profiles' THEN
        v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSIF TG_TABLE_NAME = 'clients' THEN
        v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSIF TG_TABLE_NAME = 'scheduled_posts' THEN
        v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
    END IF;
    
    IF v_organization_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Buscar subscription ativa
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE organization_id = v_organization_id
        AND status = 'active'
        AND current_period_end > NOW()
    LIMIT 1;
    
    IF v_subscription_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Atualizar ou criar registro de uso
    INSERT INTO subscription_usage (
        organization_id,
        subscription_id,
        period_start,
        period_end,
        profiles_count,
        clients_count,
        posts_count
    )
    SELECT 
        v_organization_id,
        v_subscription_id,
        date_trunc('month', NOW()),
        date_trunc('month', NOW()) + INTERVAL '1 month',
        (SELECT COUNT(*) FROM profiles WHERE organization_id = v_organization_id),
        (SELECT COUNT(*) FROM clients WHERE organization_id = v_organization_id),
        (SELECT COUNT(*) FROM scheduled_posts 
         WHERE organization_id = v_organization_id 
         AND scheduled_date >= date_trunc('month', NOW())
         AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month'
         AND grandfathered = false)
    ON CONFLICT (organization_id, period_start) DO UPDATE SET
        profiles_count = EXCLUDED.profiles_count,
        clients_count = EXCLUDED.clients_count,
        posts_count = EXCLUDED.posts_count,
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar uso automaticamente
DROP TRIGGER IF EXISTS update_subscription_usage_profiles ON profiles;
CREATE TRIGGER update_subscription_usage_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_usage();

DROP TRIGGER IF EXISTS update_subscription_usage_clients ON clients;
CREATE TRIGGER update_subscription_usage_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_usage();

DROP TRIGGER IF EXISTS update_subscription_usage_posts ON scheduled_posts;
CREATE TRIGGER update_subscription_usage_posts
    AFTER INSERT OR UPDATE OR DELETE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_usage();

-- =====================================================
-- 13. CRIAR FUNÇÃO DE ATUALIZAÇÃO DE UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_usage_updated_at ON subscription_usage;
CREATE TRIGGER update_subscription_usage_updated_at
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 14. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage all organizations"
    ON organizations FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para subscriptions
CREATE POLICY "Users can view their organization subscription"
    ON subscriptions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para subscription_usage
CREATE POLICY "Users can view their organization usage"
    ON subscription_usage FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para payments
CREATE POLICY "Users can view their organization payments"
    ON payments FOR SELECT
    USING (
        subscription_id IN (
            SELECT s.id FROM subscriptions s
            JOIN profiles p ON s.organization_id = p.organization_id
            WHERE p.id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- subscription_plans são públicos (para visualização na landing page)
CREATE POLICY "Anyone can view active subscription plans"
    ON subscription_plans FOR SELECT
    USING (active = true);

-- =====================================================
-- 15. VALIDAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
    v_org_count INTEGER;
    v_profile_count INTEGER;
    v_client_count INTEGER;
    v_post_count INTEGER;
    v_grandfathered_count INTEGER;
BEGIN
    -- Verificar se migração foi bem-sucedida
    SELECT COUNT(*) INTO v_org_count FROM organizations;
    SELECT COUNT(*) INTO v_profile_count FROM profiles WHERE organization_id IS NOT NULL;
    SELECT COUNT(*) INTO v_client_count FROM clients WHERE organization_id IS NOT NULL;
    SELECT COUNT(*) INTO v_post_count FROM scheduled_posts WHERE organization_id IS NOT NULL;
    SELECT COUNT(*) INTO v_grandfathered_count FROM scheduled_posts WHERE grandfathered = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDAÇÃO DA MIGRAÇÃO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organizações criadas: %', v_org_count;
    RAISE NOTICE 'Profiles migrados: %', v_profile_count;
    RAISE NOTICE 'Clients migrados: %', v_client_count;
    RAISE NOTICE 'Posts migrados: %', v_post_count;
    RAISE NOTICE 'Posts grandfathered (protegidos): %', v_grandfathered_count;
    RAISE NOTICE '========================================';
    
    IF v_org_count = 0 THEN
        RAISE WARNING 'Nenhuma organização foi criada!';
    END IF;
    
    IF v_profile_count = 0 THEN
        RAISE WARNING 'Nenhum profile foi migrado!';
    END IF;
    
    IF v_grandfathered_count = 0 THEN
        RAISE WARNING 'Nenhum post foi marcado como grandfathered!';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Verificar se todos os dados foram migrados corretamente
-- 2. Testar criação de novos profiles, clients e posts
-- 3. Verificar se limites estão funcionando
-- 4. Configurar Stripe e criar produtos/preços
-- 5. Implementar frontend de subscriptions
-- 
-- =====================================================

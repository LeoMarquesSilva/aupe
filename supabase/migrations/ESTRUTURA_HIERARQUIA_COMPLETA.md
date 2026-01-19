# 🏗️ Estrutura Hierárquica Completa - INSYT

## 🎯 Hierarquia Correta do Sistema

```
Contratante (Organization)
    ├── Subscription (Plano contratado)
    │   ├── max_profiles (limite de pessoas com acesso)
    │   ├── max_clients (limite de contas Instagram)
    │   └── max_posts_per_month (limite de posts/mês)
    ↓
Profiles (Pessoas com acesso ao sistema)
    ├── Profile 1 (pessoa@agencia.com)
    ├── Profile 2 (pessoa2@agencia.com)
    ├── Profile 3 (pessoa3@agencia.com)
    └── Profile 4 (pessoa4@agencia.com)
    ↓
Clients (Contas Instagram gerenciadas)
    ├── Client 1 (@conta1)
    ├── Client 2 (@conta2)
    └── ... Client 11 (@conta11)
    ↓
Scheduled Posts (Posts agendados)
    ├── Post 1 (para Client 1)
    ├── Post 2 (para Client 1)
    └── ... Post N (para Client N)
```

## 📊 Exemplo Real

**Contratante:** Agência AUPE
- **Subscription:** Professional
- **Limites:** 10 profiles, 15 contas Instagram, 500 posts/mês

**Profiles (pessoas com acesso):**
1. leoma@aupe.com.br
2. pessoa2@aupe.com.br
3. pessoa3@aupe.com.br
4. pessoa4@aupe.com.br

**Clients (contas Instagram):**
1. @marxprojetos
2. @cliente2
3. ... até 11 contas

**Posts:** Todos os posts agendados por qualquer profile para qualquer client

---

## 🗄️ Estrutura de Tabelas

### 1. `organizations` (NOVA - Contratantes)

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Nome da agência/empresa
    email TEXT, -- Email de contato principal
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
```

### 2. `profiles` (MODIFICAR - Adicionar organization_id)

```sql
-- Adicionar campo organization_id
ALTER TABLE profiles 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
```

**Estrutura atual:**
- `id` (uuid, PK) → Referencia `auth.users.id`
- `email` (text)
- `full_name` (text)
- `role` (text) - 'user', 'moderator', 'admin'
- `organization_id` (uuid, FK) - **NOVO**

### 3. `clients` (MODIFICAR - Mudar de user_id para organization_id)

```sql
-- Adicionar campo organization_id
ALTER TABLE clients 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Migrar dados existentes (assumir que todos os user_id pertencem à mesma organization)
-- ATENÇÃO: Ajustar conforme sua realidade
UPDATE clients 
SET organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = clients.user_id 
    LIMIT 1
);

-- Criar índice
CREATE INDEX idx_clients_organization_id ON clients(organization_id);

-- Manter user_id por enquanto (para compatibilidade), mas usar organization_id para limites
```

**Estrutura:**
- `id` (uuid, PK)
- `organization_id` (uuid, FK) - **NOVO - usado para limites**
- `user_id` (uuid) - **Manter para rastreamento de quem criou**
- `name` (text)
- `instagram` (text)
- `instagram_account_id` (text)
- `access_token` (text)

### 4. `subscriptions` (MODIFICAR - Mudar de user_id para organization_id)

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ✅ MUDANÇA
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Stripe IDs
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Período
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Cancelamento
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
```

### 5. `subscription_plans` (ADICIONAR max_profiles)

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'brl',
    interval TEXT DEFAULT 'month',
    
    -- LIMITES DO PLANO
    max_profiles INTEGER NOT NULL, -- ✅ NOVO - Máximo de pessoas com acesso
    max_clients INTEGER NOT NULL, -- Máximo de contas Instagram
    max_posts_per_month INTEGER NOT NULL, -- Máximo de posts por mês
    
    features JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. `subscription_usage` (MODIFICAR - Mudar de user_id para organization_id)

```sql
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ✅ MUDANÇA
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Período de medição
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Uso atual
    profiles_count INTEGER DEFAULT 0, -- ✅ NOVO - Quantas pessoas têm acesso
    clients_count INTEGER DEFAULT 0, -- Quantas contas Instagram conectadas
    posts_count INTEGER DEFAULT 0, -- Quantos posts agendados no período
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, period_start)
);
```

### 7. `scheduled_posts` (MANTER - Mas verificar limites por organization_id)

```sql
-- Adicionar campo organization_id (opcional, pode buscar via client_id)
ALTER TABLE scheduled_posts 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Popular organization_id a partir de client_id
UPDATE scheduled_posts sp
SET organization_id = c.organization_id
FROM clients c
WHERE sp.client_id = c.id;

CREATE INDEX idx_scheduled_posts_organization_id ON scheduled_posts(organization_id);
```

---

## 🔒 Funções de Verificação (Atualizadas)

### 1. Verificar Limite de Profiles (Pessoas com Acesso)

```sql
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
```

### 2. Verificar Limite de Contas Instagram

```sql
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
```

### 3. Verificar Limite de Posts

```sql
CREATE OR REPLACE FUNCTION can_schedule_post(
    p_organization_id UUID,
    p_post_type TEXT DEFAULT 'post'
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_posts_this_month INTEGER;
    v_max_posts INTEGER;
BEGIN
    -- ✅ SEMPRE permitir posts grandfathered
    -- (Esta verificação será feita no trigger, não aqui)
    
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
```

---

## 🛡️ Triggers de Proteção

### 1. Verificar Limite ao Adicionar Profile

```sql
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

CREATE TRIGGER check_profile_limit_trigger
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_profile_limit();
```

### 2. Verificar Limite ao Criar Conta Instagram

```sql
CREATE OR REPLACE FUNCTION check_instagram_account_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ SEMPRE permitir atualizações
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- ✅ Verificar limite apenas em INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.organization_id IS NOT NULL THEN
            IF NOT can_create_instagram_account(NEW.organization_id) THEN
                RAISE EXCEPTION 'Limite de contas Instagram do plano atingido. Faça upgrade para conectar mais contas.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_instagram_account_limit_trigger
    BEFORE INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION check_instagram_account_limit();
```

### 3. Verificar Limite ao Agendar Post

```sql
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

CREATE TRIGGER check_scheduled_post_limits_trigger
    BEFORE INSERT ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION check_scheduled_post_limits();
```

---

## 📋 Plano de Migração

### Fase 1: Criar Estrutura Base

1. **Criar tabela `organizations`**
2. **Criar organização para dados existentes**
   - Assumir que todos os profiles atuais pertencem à mesma organização
3. **Adicionar `organization_id` em `profiles`**
4. **Migrar dados:**
   ```sql
   -- Criar organização padrão
   INSERT INTO organizations (name, email) 
   VALUES ('Agência AUPE', 'contato@aupe.com.br')
   RETURNING id;
   
   -- Atualizar todos os profiles
   UPDATE profiles 
   SET organization_id = (SELECT id FROM organizations LIMIT 1);
   ```

### Fase 2: Migrar Clients

1. **Adicionar `organization_id` em `clients`**
2. **Migrar dados:**
   ```sql
   -- Atualizar clients com organization_id do profile
   UPDATE clients c
   SET organization_id = p.organization_id
   FROM profiles p
   WHERE c.user_id = p.id;
   ```

### Fase 3: Criar Sistema de Subscription

1. **Criar `subscription_plans`**
2. **Criar `subscriptions`**
3. **Criar subscription para organização existente**
4. **Criar `subscription_usage`**

### Fase 4: Proteger Posts Existentes

1. **Adicionar `grandfathered` em `scheduled_posts`**
2. **Marcar todos os posts existentes como grandfathered**
3. **Adicionar `organization_id` em `scheduled_posts`**
4. **Criar triggers de verificação**

---

## ✅ Resumo da Estrutura Final

```
organizations (Contratantes)
    ├── id
    ├── name
    └── subscription_id → subscriptions.id
    
subscriptions
    ├── organization_id → organizations.id
    ├── plan_id → subscription_plans.id
    └── status, current_period_end, etc.
    
subscription_plans
    ├── max_profiles (limite de pessoas)
    ├── max_clients (limite de contas Instagram)
    └── max_posts_per_month (limite de posts)
    
profiles (Pessoas com acesso)
    ├── id → auth.users.id
    └── organization_id → organizations.id
    
clients (Contas Instagram)
    ├── id
    ├── organization_id → organizations.id (para limites)
    └── user_id → profiles.id (quem criou)
    
scheduled_posts
    ├── id
    ├── organization_id → organizations.id (para limites)
    ├── client_id → clients.id
    ├── user_id → profiles.id (quem agendou)
    └── grandfathered (proteção de posts existentes)
```

---

**Próximo Passo:** Criar arquivo SQL de migração completo com todas essas alterações.

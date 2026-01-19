# 📋 Estrutura de Planos - INSYT (Corrigida)

## 🎯 Entendimento Correto da Estrutura

### Hierarquia do Sistema

```
profiles (Agência/Cliente Pagante)
    ↓
    ├── subscription (Plano contratado)
    │   ├── max_clients (limite de contas Instagram)
    │   └── max_posts_per_month (limite de posts/mês)
    ↓
clients (Contas Instagram Conectadas)
    ↓
    ├── client_1 (conta Instagram 1)
    ├── client_2 (conta Instagram 2)
    └── client_N (conta Instagram N)
    ↓
scheduled_posts (Posts Agendados)
    ├── post_1 (para client_1)
    ├── post_2 (para client_1)
    ├── post_3 (para client_2)
    └── post_N (para client_N)
```

### Exemplo Real

**Agência AUPE (profile):**
- Plano: Professional
- Limite: 10 contas Instagram, 500 posts/mês

**Contas Instagram conectadas (clients):**
1. @marxprojetos
2. @cliente2
3. @cliente3
... até 10 contas

**Posts agendados (scheduled_posts):**
- 50 posts para @marxprojetos
- 30 posts para @cliente2
- 20 posts para @cliente3
- Total: 100 posts/mês (dentro do limite de 500)

---

## 💰 Planos Propostos (Ajustados)

### Plano Starter - R$ 49/mês
- **max_clients**: 3 contas Instagram
- **max_posts_per_month**: 100 posts
- Ideal para: Agências pequenas ou freelancers

### Plano Professional - R$ 149/mês
- **max_clients**: 10 contas Instagram
- **max_posts_per_month**: 500 posts
- Ideal para: Agências médias

### Plano Enterprise - Sob consulta
- **max_clients**: Ilimitado
- **max_posts_per_month**: Ilimitado
- Ideal para: Agências grandes

---

## 🔒 Limites e Verificações

### 1. Limite de Contas Instagram (`max_clients`)

**Verificação ao criar nova conta Instagram:**
```sql
-- Ao inserir em clients
-- Verificar se user_id já tem max_clients contas Instagram conectadas
SELECT COUNT(*) FROM clients WHERE user_id = NEW.user_id;
-- Se >= max_clients → BLOQUEAR
```

**Posts existentes:** ✅ Não afetados (grandfathered)

### 2. Limite de Posts por Mês (`max_posts_per_month`)

**Verificação ao agendar novo post:**
```sql
-- Contar posts do mês atual (EXCLUINDO grandfathered)
SELECT COUNT(*) 
FROM scheduled_posts 
WHERE user_id = NEW.user_id
    AND scheduled_date >= date_trunc('month', NOW())
    AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month'
    AND grandfathered = false;
-- Se >= max_posts_per_month → BLOQUEAR
```

**Posts existentes:** ✅ Não afetados (grandfathered)

---

## 📊 Estrutura de Tabelas (Corrigida)

### `subscription_plans`

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
    stripe_price_id TEXT UNIQUE, -- ID do preço no Stripe
    amount INTEGER NOT NULL, -- Valor em centavos (R$ 49 = 4900)
    currency TEXT DEFAULT 'brl',
    interval TEXT DEFAULT 'month', -- 'month' ou 'year'
    
    -- LIMITES DO PLANO
    max_clients INTEGER NOT NULL, -- Máximo de contas Instagram conectadas
    max_posts_per_month INTEGER NOT NULL, -- Máximo de posts agendados por mês
    
    -- Features (JSONB para flexibilidade)
    features JSONB DEFAULT '{}',
    
    -- Metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemplos de Planos:**
```sql
INSERT INTO subscription_plans (name, stripe_price_id, amount, max_clients, max_posts_per_month) VALUES
('starter', 'price_starter_monthly', 4900, 3, 100),
('professional', 'price_professional_monthly', 14900, 10, 500),
('enterprise', NULL, 0, 999999, 999999); -- Ilimitado
```

### `subscriptions`

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Stripe IDs
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
    
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
```

### `subscription_usage`

```sql
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Período de medição
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Uso atual
    clients_count INTEGER DEFAULT 0, -- Quantas contas Instagram conectadas
    posts_count INTEGER DEFAULT 0, -- Quantos posts agendados no período
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period_start) -- Um registro por usuário por período
);
```

---

## 🔐 Funções de Verificação (Corrigidas)

### 1. Verificar Limite de Contas Instagram

```sql
CREATE OR REPLACE FUNCTION can_create_instagram_account(
    p_user_id UUID
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
    WHERE s.user_id = p_user_id
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
    WHERE user_id = p_user_id;
    
    -- Verificar limite
    IF v_current_clients >= v_subscription.max_clients THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Verificar Limite de Posts

```sql
CREATE OR REPLACE FUNCTION can_schedule_post(
    p_user_id UUID,
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
    WHERE s.user_id = p_user_id
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
    WHERE user_id = p_user_id
        AND scheduled_date >= date_trunc('month', NOW())
        AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month'
        AND grandfathered = false; -- ✅ Excluir posts grandfathered
    
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

### 1. Verificar Limite ao Criar Conta Instagram

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
        IF NOT can_create_instagram_account(NEW.user_id) THEN
            RAISE EXCEPTION 'Limite de contas Instagram do plano atingido. Faça upgrade para conectar mais contas.';
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

### 2. Verificar Limite ao Agendar Post

```sql
CREATE OR REPLACE FUNCTION check_scheduled_post_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ SEMPRE permitir posts grandfathered
    IF NEW.grandfathered = true THEN
        RETURN NEW; -- Passa direto, sem verificação
    END IF;
    
    -- ✅ SEMPRE permitir atualizações de posts existentes
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- ✅ Apenas verificar limites em NOVOS posts (não grandfathered)
    IF TG_OP = 'INSERT' AND NEW.grandfathered = false THEN
        IF NOT can_schedule_post(NEW.user_id, NEW.post_type) THEN
            RAISE EXCEPTION 'Limite de posts do plano atingido. Faça upgrade para agendar mais posts.';
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

## ✅ Resumo das Correções

1. **`clients` = Contas Instagram conectadas** (não clientes pagantes)
2. **Limites aplicados:**
   - `max_clients` = Quantidade máxima de contas Instagram
   - `max_posts_per_month` = Quantidade máxima de posts (soma de todas as contas)
3. **Posts existentes protegidos** com campo `grandfathered`
4. **Verificações apenas em novos registros** (INSERT)
5. **Atualizações sempre permitidas** (UPDATE)

---

**Próximo Passo:** Criar arquivo SQL de migração completo com todas as tabelas e funções corrigidas.

# 🛡️ Estratégia de Migração Segura - Posts Agendados

## ⚠️ Problema Identificado

Ao implementar o sistema de pagamentos/subscriptions, precisamos garantir que:

1. ✅ **Posts já agendados continuem funcionando normalmente**
2. ✅ **Nenhum post seja bloqueado ou perdido**
3. ✅ **Webhooks para N8N continuem funcionando**
4. ✅ **Não haja inconsistências nos dados existentes**
5. ✅ **Limites de planos não afetem posts já criados**

---

## 📊 Situação Atual dos Posts

### Estrutura da Tabela `scheduled_posts`

**⚠️ IMPORTANTE:** 
- `user_id` = Agência/empresa que paga pelo sistema (profile)
- `client_id` = Conta do Instagram conectada (não é cliente pagante)

**Campos Críticos:**
- `id` (uuid, PK)
- `user_id` (uuid) - **Agência que agendou o post (usado para verificar limites)**
- `client_id` (uuid, FK) - **Conta do Instagram onde o post será publicado**
- `scheduled_date` (timestamp) - Data/hora do agendamento
- `status` (text) - 'pending', 'sent_to_n8n', 'processing', 'posted', 'failed', 'cancelled'
- `immediate` (boolean) - Se é post imediato
- `created_at` (timestamp) - Quando foi criado

**Triggers Ativos:**
- `intelligent_scheduled_post_webhook` - Envia webhook para N8N em INSERT/UPDATE/DELETE

**RLS Policies:**
- Usuários podem ver/editar próprios posts
- Admins podem ver/editar todos

---

## 🎯 Estratégia de Migração (3 Fases)

### **FASE 1: Preparação (SEM IMPACTO NOS POSTS)**

#### 1.1. Criar Tabelas de Subscription (SEM alterar `scheduled_posts`)
```sql
-- Criar todas as tabelas novas
-- subscription_plans, subscriptions, payments, subscription_usage
-- ✅ Nenhuma alteração em scheduled_posts ainda
```

#### 1.2. Migrar Usuários Existentes para Plano "Legacy" ou "Free"
```sql
-- Criar subscription para todos os usuários existentes
-- Status: 'active' (grandfathered)
-- Sem limites rígidos inicialmente
```

**Resultado:** Posts continuam funcionando normalmente, sem nenhuma alteração.

---

### **FASE 2: Implementação Gradual (PROTEÇÃO DOS POSTS EXISTENTES)**

#### 2.1. Adicionar Campo de "Grandfathered" nos Posts

**Opção A: Campo `grandfathered` (Recomendado)**
```sql
ALTER TABLE scheduled_posts 
ADD COLUMN grandfathered BOOLEAN DEFAULT false;

-- Marcar TODOS os posts existentes como grandfathered
UPDATE scheduled_posts 
SET grandfathered = true 
WHERE created_at < NOW(); -- Todos os posts existentes

-- Criar índice para performance
CREATE INDEX idx_scheduled_posts_grandfathered 
ON scheduled_posts(grandfathered, user_id);
```

**Vantagens:**
- ✅ Posts existentes são explicitamente marcados
- ✅ Fácil identificar posts que não devem ter limites
- ✅ Permite controle fino

**Opção B: Usar `created_at` como critério**
```sql
-- Não adicionar campo, usar created_at < data_migracao
-- Mais simples, mas menos explícito
```

#### 2.2. Modificar Função de Verificação de Limites

```sql
CREATE OR REPLACE FUNCTION can_schedule_post(
    p_user_id UUID,
    p_post_type TEXT DEFAULT 'post'
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_usage RECORD;
    v_posts_this_month INTEGER;
BEGIN
    -- ✅ SEMPRE permitir posts grandfathered
    -- (Esta verificação será feita no trigger, não aqui)
    
    -- Buscar subscription ativa
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
        AND status = 'active'
        AND current_period_end > NOW();
    
    -- Se não tem subscription, negar (exceto grandfathered)
    IF v_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Buscar uso do período atual
    SELECT * INTO v_usage
    FROM subscription_usage
    WHERE user_id = p_user_id
        AND period_start <= NOW()
        AND period_end >= NOW();
    
    -- Contar posts do mês (EXCLUINDO grandfathered)
    -- ✅ IMPORTANTE: Contar TODOS os posts do user_id (soma de todas as contas Instagram)
    SELECT COUNT(*) INTO v_posts_this_month
    FROM scheduled_posts
    WHERE user_id = p_user_id
        AND scheduled_date >= date_trunc('month', NOW())
        AND scheduled_date < date_trunc('month', NOW()) + INTERVAL '1 month'
        AND grandfathered = false; -- ✅ Excluir posts grandfathered
    
    -- Nota: O limite é por agência (user_id), não por conta Instagram (client_id)
    
    -- Verificar limite do plano
    IF v_posts_this_month >= v_subscription.plan.max_posts_per_month THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.3. Modificar Trigger para RESPEITAR Posts Grandfathered

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
        -- Se o post já existe e está sendo atualizado, permitir
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

-- Criar trigger
DROP TRIGGER IF EXISTS check_scheduled_post_limits_trigger ON scheduled_posts;
CREATE TRIGGER check_scheduled_post_limits_trigger
    BEFORE INSERT ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION check_scheduled_post_limits();
```

**Resultado:** 
- ✅ Posts existentes (grandfathered) continuam funcionando
- ✅ Novos posts têm verificação de limites
- ✅ Atualizações de posts existentes sempre permitidas

---

### **FASE 3: Validação e Monitoramento**

#### 3.1. Script de Validação

```sql
-- Verificar se todos os posts existentes foram marcados
SELECT 
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE grandfathered = true) as grandfathered_posts,
    COUNT(*) FILTER (WHERE grandfathered = false) as new_posts
FROM scheduled_posts;

-- Verificar posts que podem ter problemas
SELECT 
    sp.id,
    sp.user_id,
    sp.status,
    sp.scheduled_date,
    sp.grandfathered,
    s.status as subscription_status
FROM scheduled_posts sp
LEFT JOIN subscriptions s ON s.user_id = sp.user_id AND s.status = 'active'
WHERE sp.grandfathered = false
    AND (s.status IS NULL OR s.status != 'active')
    AND sp.scheduled_date > NOW(); -- Posts futuros sem subscription
```

#### 3.2. Monitoramento de Webhooks

- ✅ Verificar logs do N8N para garantir que webhooks continuam chegando
- ✅ Monitorar posts que falharam após migração
- ✅ Alertas para posts que não foram processados

---

## 🔒 Garantias de Segurança

### 1. **Proteção de Posts Existentes**

```sql
-- ✅ NUNCA deletar ou modificar dados de posts existentes
-- ✅ SEMPRE marcar posts existentes como grandfathered
-- ✅ SEMPRE permitir atualizações de posts existentes
```

### 2. **Proteção de Webhooks**

```sql
-- ✅ Trigger de webhook NÃO será modificado
-- ✅ Apenas adicionar novo trigger de limites (BEFORE INSERT)
-- ✅ Webhook continua funcionando normalmente
```

### 3. **Proteção de Status**

```sql
-- ✅ Posts com status 'posted' não serão afetados
-- ✅ Posts com status 'sent_to_n8n' continuam processando
-- ✅ Posts com status 'pending' continuam aguardando
```

### 4. **Rollback Plan**

Se algo der errado:

```sql
-- 1. Desabilitar trigger de limites
DROP TRIGGER IF EXISTS check_scheduled_post_limits_trigger ON scheduled_posts;

-- 2. Remover campo grandfathered (opcional)
-- ALTER TABLE scheduled_posts DROP COLUMN grandfathered;

-- 3. Sistema volta ao estado anterior
-- Posts continuam funcionando normalmente
```

---

## 📋 Checklist de Implementação

### Antes de Começar
- [ ] **Backup completo do banco de dados**
- [ ] **Documentar quantidade de posts existentes**
- [ ] **Testar em ambiente de desenvolvimento primeiro**
- [ ] **Notificar usuários sobre migração (opcional)**

### Fase 1: Preparação
- [ ] Criar tabelas de subscription
- [ ] Migrar usuários para planos
- [ ] Validar que posts continuam funcionando
- [ ] Testar webhooks

### Fase 2: Implementação
- [ ] Adicionar campo `grandfathered`
- [ ] Marcar todos os posts existentes como `grandfathered = true`
- [ ] Criar função `can_schedule_post()`
- [ ] Criar trigger de verificação de limites
- [ ] Testar criação de novos posts
- [ ] Validar que posts grandfathered não são bloqueados

### Fase 3: Validação
- [ ] Executar script de validação
- [ ] Verificar logs de webhooks
- [ ] Monitorar por 24-48h
- [ ] Coletar feedback de usuários

---

## 🚨 Cenários de Risco e Soluções

### Risco 1: Post Existente Bloqueado
**Solução:** Campo `grandfathered` sempre permite posts existentes

### Risco 2: Webhook Parar de Funcionar
**Solução:** Não modificar trigger de webhook, apenas adicionar novo

### Risco 3: Post Perdido Durante Migração
**Solução:** Backup completo antes + transação atômica

### Risco 4: Limite Aplicado a Post Existente
**Solução:** Verificação `grandfathered = true` bypassa limites

### Risco 5: Inconsistência de Dados
**Solução:** Script de validação identifica problemas

---

## 💡 Recomendações Finais

1. **Migração em Horário de Baixo Tráfego**
   - Executar durante madrugada
   - Menos posts sendo criados
   - Menor impacto se houver problema

2. **Comunicação com Usuários**
   - Avisar sobre migração (opcional)
   - Explicar que posts existentes não serão afetados
   - Oferecer suporte durante migração

3. **Monitoramento Intensivo**
   - Primeiras 48h após migração
   - Verificar logs constantemente
   - Estar pronto para rollback

4. **Testes em Ambiente de Desenvolvimento**
   - Testar TODOS os cenários
   - Simular posts existentes
   - Testar limites e bloqueios

---

## ✅ Garantias Finais

**Com esta estratégia, garantimos:**

1. ✅ **100% dos posts existentes continuam funcionando**
2. ✅ **Nenhum post será perdido ou bloqueado**
3. ✅ **Webhooks continuam funcionando normalmente**
4. ✅ **Sistema de limites só afeta NOVOS posts**
5. ✅ **Rollback possível a qualquer momento**
6. ✅ **Zero downtime na migração**

---

**Próximo Passo:** Criar arquivo SQL de migração com todas as alterações seguras.

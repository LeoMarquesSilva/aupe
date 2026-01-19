# 🚀 Migração do Sistema de Subscriptions - INSYT

**Data da Migração:** Janeiro 2026  
**Status:** ✅ **CONCLUÍDA COM SUCESSO**

---

## 📋 Resumo Executivo

Esta migração implementa um sistema completo de subscriptions hierárquico para o INSYT (Instagram Scheduler), incluindo:

- **Hierarquia completa:** `Organizations` → `Profiles` → `Clients` → `Posts`
- **Sistema de planos:** Starter, Professional, Enterprise
- **Controle de limites:** Profiles, contas Instagram, posts por mês
- **Proteção de dados existentes:** Posts marcados como `grandfathered`
- **Integração com Stripe:** Estrutura pronta para pagamentos

---

## 🎯 Objetivos da Migração

### 1. Hierarquia de Dados

Antes da migração, o sistema tinha uma estrutura plana:
- `profiles` (pessoas com acesso)
- `clients` (contas Instagram conectadas)
- `scheduled_posts` (posts agendados)

**Depois da migração:**
```
Organizations (Contratantes/Agency)
  ├── Profiles (Pessoas com acesso - até 10 no plano Professional)
  ├── Clients (Contas Instagram - até 15 no plano Professional)
  └── Scheduled Posts (Posts agendados - até 500/mês no plano Professional)
```

### 2. Sistema de Subscriptions

- **3 Planos de assinatura** com limites específicos
- **Controle automático de limites** via triggers
- **Histórico de pagamentos** e uso mensal
- **Proteção de posts existentes** (grandfathered)

### 3. Segurança de Dados

- **Posts existentes protegidos** - não contam para limites
- **Migração segura** - todos os dados preservados
- **RLS (Row Level Security)** - acesso controlado por organização

---

## 📊 Estrutura Criada

### Tabelas Principais

#### 1. `organizations`
Contratantes (agências/empresas) que pagam pelo sistema.

```sql
- id (UUID, PK)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- document (TEXT) -- CNPJ/CPF
- address, city, state, zip_code, country
- active (BOOLEAN)
- created_at, updated_at
```

#### 2. `subscription_plans`
Planos de assinatura disponíveis.

**Planos Criados:**
- **Starter:** R$ 49/mês - 3 profiles, 5 clients, 100 posts/mês
- **Professional:** R$ 149/mês - 10 profiles, 15 clients, 500 posts/mês
- **Enterprise:** Customizado - Ilimitado

```sql
- id (UUID, PK)
- name (TEXT) -- 'starter', 'professional', 'enterprise'
- stripe_price_id (TEXT)
- amount (INTEGER) -- em centavos
- max_profiles (INTEGER)
- max_clients (INTEGER)
- max_posts_per_month (INTEGER)
- features (JSONB)
- active (BOOLEAN)
```

#### 3. `subscriptions`
Assinaturas ativas das organizações.

```sql
- id (UUID, PK)
- organization_id (UUID, FK -> organizations)
- plan_id (UUID, FK -> subscription_plans)
- stripe_subscription_id (TEXT)
- stripe_customer_id (TEXT)
- status (TEXT) -- 'active', 'canceled', 'past_due', etc
- current_period_start, current_period_end
- trial_start, trial_end
```

#### 4. `subscription_usage`
Controle de uso mensal por organização.

```sql
- id (UUID, PK)
- organization_id (UUID, FK -> organizations)
- subscription_id (UUID, FK -> subscriptions)
- period_start, period_end
- profiles_count (INTEGER)
- clients_count (INTEGER)
- posts_count (INTEGER)
```

#### 5. `payments`
Histórico de pagamentos.

```sql
- id (UUID, PK)
- subscription_id (UUID, FK -> subscriptions)
- stripe_payment_intent_id (TEXT)
- stripe_invoice_id (TEXT)
- amount (INTEGER) -- em centavos
- status (TEXT) -- 'succeeded', 'pending', 'failed'
- paid_at (TIMESTAMPTZ)
```

### Colunas Adicionadas

#### `profiles`
- `organization_id` (UUID, FK -> organizations)

#### `clients`
- `organization_id` (UUID, FK -> organizations)

#### `scheduled_posts`
- `organization_id` (UUID, FK -> organizations)
- `grandfathered` (BOOLEAN) - **Posts existentes protegidos**

---

## 🔧 Funções Criadas

### 1. `can_add_profile(organization_id UUID)`
Verifica se a organização pode adicionar mais profiles (pessoas com acesso).

### 2. `can_create_instagram_account(organization_id UUID)`
Verifica se a organização pode conectar mais contas Instagram.

### 3. `can_schedule_post(organization_id UUID, post_type TEXT)`
Verifica se a organização pode agendar mais posts no mês atual.

**Nota:** Posts com `grandfathered = true` **NÃO** contam para limites.

### 4. `update_subscription_usage()`
Atualiza automaticamente o uso mensal quando profiles, clients ou posts são criados/atualizados/removidos.

### 5. `update_updated_at_column()`
Atualiza automaticamente o campo `updated_at` em todas as tabelas.

---

## 🛡️ Triggers Criados

### 1. Verificação de Limites

#### `check_profile_limit_trigger`
- **Tabela:** `profiles`
- **Quando:** `BEFORE INSERT`
- **Ação:** Bloqueia inserção se limite de profiles foi atingido

#### `check_instagram_account_limit_trigger`
- **Tabela:** `clients`
- **Quando:** `BEFORE INSERT`
- **Ação:** Bloqueia inserção se limite de contas Instagram foi atingido

#### `check_scheduled_post_limits_trigger`
- **Tabela:** `scheduled_posts`
- **Quando:** `BEFORE INSERT`
- **Ação:** Bloqueia inserção se limite de posts foi atingido
- **Exceção:** Posts com `grandfathered = true` **sempre** são permitidos

### 2. Atualização Automática de Uso

#### `update_subscription_usage_profiles`
- **Tabela:** `profiles`
- **Quando:** `AFTER INSERT/UPDATE/DELETE`
- **Ação:** Atualiza contadores de uso

#### `update_subscription_usage_clients`
- **Tabela:** `clients`
- **Quando:** `AFTER INSERT/UPDATE/DELETE`
- **Ação:** Atualiza contadores de uso

#### `update_subscription_usage_posts`
- **Tabela:** `scheduled_posts`
- **Quando:** `AFTER INSERT/UPDATE/DELETE`
- **Ação:** Atualiza contadores de uso (excluindo grandfathered)

### 3. Atualização de `updated_at`

Triggers automáticos para atualizar `updated_at` em:
- `organizations`
- `subscription_plans`
- `subscriptions`
- `subscription_usage`
- `payments`

---

## 🔐 Row Level Security (RLS)

### Políticas Implementadas

#### `organizations`
- ✅ Usuários podem visualizar sua própria organização
- ✅ Admins podem gerenciar todas as organizações

#### `subscriptions`
- ✅ Usuários podem visualizar subscription de sua organização
- ✅ Admins podem visualizar todas as subscriptions

#### `subscription_usage`
- ✅ Usuários podem visualizar uso de sua organização
- ✅ Admins podem visualizar uso de todas as organizações

#### `payments`
- ✅ Usuários podem visualizar pagamentos de sua organização
- ✅ Admins podem visualizar todos os pagamentos

#### `subscription_plans`
- ✅ **Público** - qualquer pessoa pode visualizar planos ativos (para landing page)

---

## 📦 Dados Migrados

### Organização Criada

- **Nome:** Agência AUPE
- **Email:** contato@aupe.com.br
- **Status:** Ativa

### Dados Existentes Migrados

- ✅ **5 Profiles** migrados (todos com `organization_id`)
- ✅ **12 Clients** migrados (todos com `organization_id`)
- ✅ **38 Posts** migrados (todos com `organization_id`)
- ✅ **Todos os posts existentes** marcados como `grandfathered = true`

### Subscription Criada

- **Plano:** Professional (R$ 149/mês)
- **Status:** Active
- **Limites:**
  - Profiles: 10 (uso: 5 - 50%)
  - Clients: 15 (uso: 12 - 80%)
  - Posts/mês: 500 (uso: 38 - 7.6%)

### Uso Atual (Janeiro 2026)

```
Profiles:    5 / 10   (50% usado)
Clients:     12 / 15  (80% usado)
Posts:       38 / 500 (7.6% usado)
```

---

## ✅ Validação da Migração

### Checklist de Verificação

- ✅ Tabelas criadas (5 novas tabelas)
- ✅ Colunas adicionadas (4 colunas novas)
- ✅ Dados migrados (5 profiles, 12 clients, 38 posts)
- ✅ Posts protegidos (todos os posts existentes com `grandfathered = true`)
- ✅ Subscription criada (Professional ativa)
- ✅ Funções criadas (5 funções)
- ✅ Triggers criados (11 triggers)
- ✅ RLS configurado (políticas em todas as tabelas)
- ✅ Índices criados (performance otimizada)

### Status Final

```
✅ ✅ ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO! ✅ ✅ ✅
```

---

## 🎯 Comportamento dos Limites

### Posts Grandfathered

**Posts existentes (antes da migração):**
- ✅ Marcados como `grandfathered = true`
- ✅ **NÃO contam** para limites de posts
- ✅ Podem ser editados/removidos normalmente
- ✅ Novos posts agendados contam normalmente

**Exemplo:**
- 38 posts existentes (grandfathered) = **0 posts no limite**
- 10 novos posts criados = **10 posts no limite**
- Limite: 500 posts/mês
- Disponível: **490 posts restantes**

### Limites por Plano

| Plano | Preço | Profiles | Clients | Posts/mês |
|-------|-------|----------|---------|-----------|
| Starter | R$ 49 | 3 | 5 | 100 |
| Professional | R$ 149 | 10 | 15 | 500 |
| Enterprise | Custom | Ilimitado | Ilimitado | Ilimitado |

### Verificação de Limites

Os limites são verificados **automaticamente** via triggers:

1. **Tentativa de adicionar profile:**
   - Trigger verifica se `profiles_count < max_profiles`
   - Se não, bloqueia e retorna erro

2. **Tentativa de conectar conta Instagram:**
   - Trigger verifica se `clients_count < max_clients`
   - Se não, bloqueia e retorna erro

3. **Tentativa de agendar post:**
   - Trigger verifica se `posts_count < max_posts_per_month`
   - Se não, bloqueia e retorna erro
   - **Exceção:** Posts `grandfathered` sempre permitidos

---

## 🔄 Próximos Passos

### 1. Integração com Stripe

**Configuração:**
1. Criar produtos no Stripe Dashboard
2. Criar preços para cada plano
3. Atualizar `subscription_plans.stripe_price_id` com os IDs do Stripe
4. Configurar webhooks do Stripe

**Edge Functions Necessárias:**
- `stripe-webhook` - Processar eventos do Stripe
- `create-checkout-session` - Criar sessão de checkout
- `manage-subscription` - Atualizar/cancelar subscriptions

### 2. Frontend de Subscriptions

**Páginas Necessárias:**
- `/pricing` - Lista de planos (já existe na landing page)
- `/dashboard/subscription` - Gerenciar subscription atual
- `/dashboard/usage` - Ver uso atual e limites
- `/dashboard/billing` - Histórico de pagamentos

**Componentes:**
- `SubscriptionCard` - Card com plano atual
- `UsageChart` - Gráficos de uso
- `UpgradeButton` - Botão para upgrade
- `BillingHistory` - Tabela de pagamentos

### 3. Notificações de Limites

**Implementar:**
- Alertas quando próximo do limite (80%)
- Email quando limite atingido
- Modal de upgrade quando limite bloqueado

### 4. Testes

**Cenários a Testar:**
- ✅ Criar novo post (deve funcionar)
- ✅ Adicionar profile (deve funcionar se dentro do limite)
- ✅ Conectar conta Instagram (deve funcionar se dentro do limite)
- ⚠️ Testar bloqueio ao atingir limite
- ⚠️ Testar upgrade de plano
- ⚠️ Testar downgrade de plano

---

## 📝 Arquivos da Migração

### Script Principal

- **`001_create_subscription_system.sql`** - Script completo de migração
  - 860 linhas
  - Cria todas as tabelas, funções, triggers e migra dados
  - **MANTIDO** (essencial para histórico)

### Documentação de Análise (Mantida)

- `ANALISE_BANCO_DADOS_COMPLETA.md` - Análise completa do banco antes da migração
- `ESTRUTURA_HIERARQUIA_COMPLETA.md` - Documentação da hierarquia proposta
- `ESTRATEGIA_MIGRACAO_POSTS_SEGURA.md` - Estratégia de proteção de posts
- `ESTRUTURA_PLANOS_CORRIGIDA.md` - Estrutura de planos corrigida

### Scripts de Análise (Mantidos para referência)

- `analyze_database_structure.sql` - Script de análise do banco
- `generate_database_report.sql` - Geração de relatórios

### Scripts Removidos (Executados e desnecessários)

- ~~`009_migrate_existing_data.sql`~~ - Parte do script principal
- ~~`010_validate_migration.sql`~~ - Validação executada
- ~~`011_check_migration_status.sql`~~ - Verificação executada

---

## 🚨 Importante: Proteção de Dados

### Posts Grandfathered

**Todos os posts criados ANTES da migração foram marcados como `grandfathered = true`.**

Isso significa:
- ✅ Podem ser editados normalmente
- ✅ Podem ser removidos normalmente
- ✅ **NÃO contam** para limites de posts
- ✅ Continuam funcionando normalmente no sistema

**Novos posts criados DEPOIS da migração:**
- ❌ **NÃO** são grandfathered
- ✅ Contam para limites
- ✅ Podem ser bloqueados se limite atingido

### Verificação

Para verificar quantos posts estão protegidos:

```sql
SELECT 
    COUNT(*) FILTER (WHERE grandfathered = true) AS posts_protegidos,
    COUNT(*) FILTER (WHERE grandfathered = false) AS posts_novos,
    COUNT(*) AS total
FROM scheduled_posts;
```

---

## 📚 Referências

### Documentação Relacionada

- [Análise do Banco de Dados](./ANALISE_BANCO_DADOS_COMPLETA.md)
- [Estrutura Hierárquica](./ESTRUTURA_HIERARQUIA_COMPLETA.md)
- [Estratégia de Migração](./ESTRATEGIA_MIGRACAO_POSTS_SEGURA.md)
- [Estrutura de Planos](./ESTRUTURA_PLANOS_CORRIGIDA.md)

### Links Úteis

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Subscriptions API](https://stripe.com/docs/billing/subscriptions/overview)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)

---

## ✅ Checklist Pós-Migração

- [x] Script de migração executado
- [x] Dados migrados com sucesso
- [x] Posts existentes protegidos (grandfathered)
- [x] Subscription criada
- [x] Validação executada e aprovada
- [ ] Configurar Stripe (próximo passo)
- [ ] Implementar frontend de subscriptions
- [ ] Testar limites em produção
- [ ] Configurar notificações de limites

---

**Última atualização:** Janeiro 2026  
**Migração executada por:** Sistema Automatizado  
**Status:** ✅ Produção

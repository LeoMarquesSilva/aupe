# 📊 Análise Completa do Banco de Dados - INSYT

**Data da Análise:** 2025  
**Objetivo:** Mapear estrutura completa antes de implementar sistema de pagamentos com Stripe

---

## 🎯 Resumo Executivo

### Estrutura Atual do Banco

**Tabelas Principais (schema `public`):**
- ✅ `profiles` - Usuários do sistema (agências/empresas que pagam pelo INSYT)
- ✅ `clients` - Contas do Instagram conectadas (perfis Instagram gerenciados)
- ✅ `scheduled_posts` - Posts agendados para essas contas Instagram
- ✅ `audit_log` - Log de auditoria
- ✅ `user_profiles` - Perfis alternativos (backup?)
- ✅ `instagram_cache_status` - Status de cache do Instagram
- ✅ `instagram_posts_cache` - Cache de posts do Instagram
- ✅ `instagram_profile_cache` - Cache de perfis do Instagram

**❌ NÃO EXISTEM:**
- ❌ Tabelas de pagamento/subscription
- ❌ Tabelas de planos
- ❌ Tabelas de billing/invoice
- ❌ Campos relacionados a pagamento nas tabelas existentes

---

## 📋 Estrutura Detalhada das Tabelas Principais

### 1. Tabela `profiles`

**Relacionamentos:**
- `id` (UUID) → Primary Key, referencia `auth.users.id`
- Usado para autenticação e permissões

**Campos Identificados (da query 2):**
- `id` (uuid, PK)
- `email` (text)
- `full_name` (text)
- `role` (text) - 'user', 'moderator', 'admin'
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Políticas RLS:**
- ✅ RLS habilitado
- Usuários podem ver/editar próprio perfil
- Admins podem ver/editar todos
- Service role tem acesso total

**Índices:**
- `idx_profiles_created_at` - Índice em `created_at`

---

### 2. Tabela `clients` (Contas do Instagram)

**⚠️ IMPORTANTE:** Esta tabela NÃO representa clientes pagantes do sistema, mas sim **contas do Instagram conectadas** que a agência gerencia.

**Relacionamentos:**
- `user_id` (UUID) → Foreign Key para `profiles.id` (agência/usuário do sistema)
- `id` (UUID) → Primary Key
- Referenciada por:
  - `scheduled_posts.client_id`
  - `instagram_cache_status.client_id`
  - `instagram_posts_cache.client_id`
  - `instagram_profile_cache.client_id`

**Campos Identificados:**
- `id` (uuid, PK)
- `user_id` (uuid, FK para profiles) - **Agência que gerencia esta conta Instagram**
- `name` (text) - Nome da conta Instagram
- `instagram` (text) - Username do Instagram
- `instagram_account_id` (text) - ID da conta no Instagram API
- `access_token` (text) - Token de acesso do Instagram
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Políticas RLS:**
- ✅ RLS habilitado
- Usuários podem ver/editar próprias contas Instagram conectadas
- Admins/moderadores podem ver/editar todas
- Usuários só podem inserir com `user_id = auth.uid()`

**Estrutura de Negócio:**
- Um `profile` (agência) pode ter múltiplos `clients` (contas Instagram)
- Cada `client` representa uma conta do Instagram conectada
- Limites do plano: quantidade máxima de contas Instagram (`max_clients`)

**Índices:**
- `idx_clients_user_id` - Índice em `user_id`
- `idx_clients_instagram` - Índice em `instagram`

**Triggers:**
- `update_clients_updated_at` - Atualiza `updated_at` automaticamente

---

### 3. Tabela `scheduled_posts`

**Relacionamentos:**
- `client_id` (UUID) → Foreign Key para `clients.id` (ON DELETE CASCADE)
- `user_id` (UUID) → Referencia `profiles.id` (implícito)

**Campos Identificados:**
- `id` (uuid, PK)
- `user_id` (uuid)
- `client_id` (uuid, FK)
- `scheduled_date` (timestamp)
- `status` (text) - 'pending', 'sent_to_n8n', 'posted', 'failed'
- `immediate` (boolean)
- `post_type` (text) - 'post', 'carousel', 'reel', 'story'
- `caption` (text)
- `images` (jsonb ou text[])
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Políticas RLS:**
- ✅ RLS habilitado
- Usuários podem ver/editar próprios posts
- Admins/moderadores podem ver/editar todos
- Usuários só podem inserir com `user_id = auth.uid()`

**Triggers:**
- `intelligent_scheduled_post_webhook` - Envia webhook para N8N quando:
  - INSERT (se `immediate = true`)
  - UPDATE (mudanças de status)
  - DELETE

---

## 🔗 Relacionamentos Entre Tabelas

**Estrutura de Negócio:**
- `profiles` = Agências/empresas que pagam pelo INSYT (clientes pagantes)
- `clients` = Contas do Instagram conectadas (perfis Instagram gerenciados)
- `scheduled_posts` = Posts agendados para essas contas Instagram

```
auth.users (Supabase Auth)
    ↓
profiles (id = auth.users.id) ← AGÊNCIA/CLIENTE PAGANTE
    ↓
clients (user_id → profiles.id) ← CONTAS INSTAGRAM CONECTADAS
    ↓
scheduled_posts (client_id → clients.id) ← POSTS AGENDADOS
    ↓
instagram_cache_* (client_id → clients.id) ← CACHE DO INSTAGRAM
```

**Exemplo:**
- 1 `profile` (Agência AUPE) → 5 `clients` (5 contas Instagram diferentes)
- Cada `client` pode ter N `scheduled_posts`

**Foreign Keys Identificadas:**
1. `instagram_cache_status.client_id` → `clients.id` (CASCADE)
2. `instagram_posts_cache.client_id` → `clients.id` (CASCADE)
3. `instagram_profile_cache.client_id` → `clients.id` (CASCADE)
4. `scheduled_posts.client_id` → `clients.id` (CASCADE)

---

## 🔒 Segurança (RLS)

**Tabelas com RLS Habilitado:**
- ✅ `profiles`
- ✅ `clients`
- ✅ `scheduled_posts`
- ✅ `audit_log`
- ✅ `instagram_cache_*`
- ✅ `user_profiles`

**Funções de Segurança:**
- `auth_user_is_admin()` - Verifica se usuário é admin
- `auth_user_is_admin_or_moderator()` - Verifica admin ou moderador
- `is_admin(user_id)` - Verifica role de usuário específico
- `is_moderator_or_admin(user_id)` - Verifica role

---

## 📊 Estatísticas do Banco

**Tamanhos das Tabelas (maiores):**
- `cron.job_run_details`: 17 MB
- `instagram_posts_cache`: 1.3 MB
- `storage.objects`: 1 MB
- `scheduled_posts`: 440 KB
- `clients`: 120 KB
- `profiles`: 96 KB

**Extensões Instaladas:**
- ✅ `pg_cron` (1.6.4) - Agendamento de tarefas
- ✅ `pg_graphql` (1.5.11) - GraphQL API
- ✅ `pg_net` (0.19.5) - HTTP requests
- ✅ `pg_stat_statements` (1.11) - Estatísticas de queries
- ✅ `pgcrypto` (1.3) - Criptografia
- ✅ `supabase_vault` (0.3.1) - Vault para secrets
- ✅ `uuid-ossp` (1.1) - Geração de UUIDs

---

## ⚠️ Observações Importantes

### 1. Sistema de Autenticação
- Usa Supabase Auth (`auth.users`)
- Perfis em `profiles` sincronizados com `auth.users`
- Sistema de roles: 'user', 'moderator', 'admin'

### 2. Sistema de Webhooks
- Trigger `handle_scheduled_post_webhook()` envia webhooks para N8N
- URL: `https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador`
- Usa `pg_net` para fazer HTTP POST

### 3. Cache do Instagram
- Sistema de cache em 3 tabelas separadas
- Status, posts e profile são cacheados separadamente
- Relacionados via `client_id`

### 4. Duplicação de Perfis
- Existem `profiles` e `user_profiles`
- Função `create_user_profile()` tenta inserir em ambos
- Pode ser sistema de backup ou migração

---

## 🎯 Próximos Passos para Implementar Stripe

### Tabelas Necessárias a Criar:

1. **`subscription_plans`** - Planos de assinatura
   - `id` (uuid, PK)
   - `name` (text) - 'starter', 'professional', 'enterprise'
   - `stripe_price_id` (text) - ID do preço no Stripe
   - `amount` (integer) - Valor em centavos
   - `currency` (text) - 'brl'
   - `interval` (text) - 'month', 'year'
   - `features` (jsonb) - Lista de features
   - `max_clients` (integer) - **Máximo de contas Instagram conectadas**
   - `max_posts_per_month` (integer) - **Máximo de posts agendados por mês (total)**
   - `created_at`, `updated_at`

2. **`subscriptions`** - Assinaturas dos usuários
   - `id` (uuid, PK)
   - `user_id` (uuid, FK → profiles.id)
   - `plan_id` (uuid, FK → subscription_plans.id)
   - `stripe_subscription_id` (text, UNIQUE) - ID no Stripe
   - `stripe_customer_id` (text) - ID do customer no Stripe
   - `status` (text) - 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
   - `current_period_start` (timestamp)
   - `current_period_end` (timestamp)
   - `cancel_at_period_end` (boolean)
   - `canceled_at` (timestamp, nullable)
   - `trial_start` (timestamp, nullable)
   - `trial_end` (timestamp, nullable)
   - `created_at`, `updated_at`

3. **`payments`** - Histórico de pagamentos
   - `id` (uuid, PK)
   - `subscription_id` (uuid, FK → subscriptions.id)
   - `stripe_payment_intent_id` (text, UNIQUE)
   - `stripe_invoice_id` (text)
   - `amount` (integer) - Valor em centavos
   - `currency` (text)
   - `status` (text) - 'succeeded', 'pending', 'failed', 'refunded'
   - `payment_method` (text) - 'card', 'bank_transfer', etc
   - `paid_at` (timestamp, nullable)
   - `created_at`, `updated_at`

4. **`subscription_usage`** - Uso/limites do plano
   - `id` (uuid, PK)
   - `user_id` (uuid, FK → profiles.id)
   - `subscription_id` (uuid, FK → subscriptions.id)
   - `period_start` (timestamp)
   - `period_end` (timestamp)
   - `clients_count` (integer) - Clientes criados no período
   - `posts_count` (integer) - Posts agendados no período
   - `created_at`, `updated_at`

### Alterações Necessárias:

1. **Adicionar campo em `profiles`:**
   - `subscription_id` (uuid, FK → subscriptions.id, nullable)
   - `trial_ends_at` (timestamp, nullable)

2. **Adicionar campo em `clients` (contas Instagram):**
   - Nenhuma alteração necessária (limite via subscription)
   - Limite de quantidade de contas Instagram é verificado na criação

3. **Limites do Plano:**
   - `max_clients` = Quantidade máxima de contas Instagram que podem ser conectadas
   - `max_posts_per_month` = Quantidade máxima de posts que podem ser agendados por mês (soma de todos os posts de todas as contas Instagram)

3. **Criar Funções:**
   - `check_subscription_limit(user_id)` - Verifica limites do plano
   - `get_user_subscription(user_id)` - Retorna assinatura ativa
   - `can_create_client(user_id)` - Verifica se pode criar cliente
   - `can_schedule_post(user_id)` - Verifica se pode agendar post

4. **Criar Triggers:**
   - Verificar limites antes de inserir `clients`
   - Verificar limites antes de inserir `scheduled_posts`
   - Atualizar `subscription_usage` automaticamente

5. **Criar Políticas RLS:**
   - Usuários podem ver própria subscription
   - Admins podem ver todas
   - Service role para webhooks do Stripe

---

## 🔐 Considerações de Segurança

1. **Webhooks do Stripe:**
   - Criar endpoint seguro para receber webhooks
   - Validar assinatura do Stripe
   - Usar Supabase Edge Functions ou backend separado

2. **RLS para Tabelas de Pagamento:**
   - `subscriptions`: Usuário vê apenas própria subscription
   - `payments`: Usuário vê apenas próprios pagamentos
   - `subscription_usage`: Usuário vê apenas próprio uso

3. **Secrets:**
   - Usar Supabase Vault para armazenar:
     - Stripe Secret Key
     - Stripe Webhook Secret
     - Stripe Publishable Key

---

## 📝 Checklist de Implementação

### Fase 1: Estrutura do Banco
- [ ] Criar tabela `subscription_plans`
- [ ] Criar tabela `subscriptions`
- [ ] Criar tabela `payments`
- [ ] Criar tabela `subscription_usage`
- [ ] Adicionar campo `subscription_id` em `profiles`
- [ ] Criar índices necessários
- [ ] Criar Foreign Keys
- [ ] Configurar RLS

### Fase 2: Funções e Triggers
- [ ] Criar função `check_subscription_limit()`
- [ ] Criar função `get_user_subscription()`
- [ ] Criar função `can_create_client()`
- [ ] Criar função `can_schedule_post()`
- [ ] Criar trigger para verificar limites em `clients`
- [ ] Criar trigger para verificar limites em `scheduled_posts`
- [ ] Criar trigger para atualizar `subscription_usage`

### Fase 3: Integração Stripe
- [ ] Configurar Stripe Account
- [ ] Criar Products e Prices no Stripe Dashboard
- [ ] Criar Supabase Edge Function para Checkout
- [ ] Criar Supabase Edge Function para Webhooks
- [ ] Implementar lógica de webhooks
- [ ] Testar fluxo completo

### Fase 4: Frontend
- [ ] Criar página de planos
- [ ] Integrar Stripe Checkout
- [ ] Criar página de billing
- [ ] Mostrar status da subscription
- [ ] Implementar cancelamento
- [ ] Mostrar uso/limites

---

## 🚀 Recomendações

1. **Migração Gradual:**
   - Criar tabelas primeiro
   - Migrar usuários existentes para plano "free" ou "starter"
   - Implementar limites gradualmente

2. **Testes:**
   - Usar Stripe Test Mode
   - Testar todos os webhooks
   - Testar limites e bloqueios
   - Testar cancelamento e renovação

3. **Monitoramento:**
   - Logs de webhooks do Stripe
   - Monitorar falhas de pagamento
   - Alertas para subscriptions expiradas

4. **Backup:**
   - Fazer backup antes de criar tabelas
   - Testar rollback se necessário

---

**Próximo Passo:** Criar arquivo de migração SQL com todas as tabelas e funções necessárias.

# 🚀 Próximos Passos - Integração Stripe

**Data:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Checklist de implementação

---

## ✅ Configurações Concluídas

- [x] Variáveis de ambiente (.env) configuradas
- [x] Produtos criados no Stripe Dashboard
- [x] Planos atualizados no banco de dados
- [x] **Price IDs corrigidos** (todos configurados corretamente)
- [x] **Dependências instaladas** (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- [x] Preços configurados:
  - Starter: R$ 87,90/mês → `price_1Sr5MIHbDBpY5E6nuqkIZPbc` ✅
  - Professional: R$ 298,00/mês → `price_1Sr5NrHbDBpY5E6naEroYOGm` ✅
  - Business: R$ 596,00/mês → `price_1Sr5OkHbDBpY5E6nS1QGGUAK` ✅

---

## ⚠️ AÇÃO NECESSÁRIA: Verificar Price IDs

### Problema Identificado

Os IDs configurados no banco são **Product IDs** (`prod_...`), mas para checkout do Stripe precisamos de **Price IDs** (`price_...`).

**IDs atuais no banco:**
- Starter: `prod_ToinsqoHgjhHkr` ❌ (Product ID)
- Professional: `prod_ToipL07CTtlB2A` ❌ (Product ID)
- Business: `prod_ToiqWw0x9NK8lt` ❌ (Product ID)

### Como Corrigir

1. **Acesse:** Stripe Dashboard → Products
2. **Para cada produto:**
   - Clique no produto
   - Na seção "Pricing", encontre o **Price ID** (formato: `price_xxxxx`)
   - Copie o Price ID

3. **Atualize no banco:**

```sql
-- Atualizar com Price IDs corretos
UPDATE subscription_plans
SET stripe_price_id = 'price_XXXXX'  -- ⚠️ SUBSTITUA PELO PRICE ID CORRETO
WHERE name = 'starter';

UPDATE subscription_plans
SET stripe_price_id = 'price_YYYYY'  -- ⚠️ SUBSTITUA PELO PRICE ID CORRETO
WHERE name = 'professional';

UPDATE subscription_plans
SET stripe_price_id = 'price_ZZZZZ'  -- ⚠️ SUBSTITUA PELO PRICE ID CORRETO
WHERE name = 'business';

-- Verificar
SELECT name, amount / 100.0 AS preco, stripe_price_id 
FROM subscription_plans 
WHERE name IN ('starter', 'professional', 'business');
```

**Ou via Super Admin Dashboard:**
- `/super-admin` → Tab "Planos"
- Edite cada plano e substitua o ID por `price_...`

---

## 📋 Próximos Passos (Checklist)

### Fase 1: Correção e Validação ✅ CONCLUÍDO

- [x] **Verificar e corrigir Price IDs** no banco (trocar `prod_` por `price_`)
- [x] Validar que todos os planos têm Price IDs corretos
- [x] Testar conexão com Stripe (usar API keys)

### Fase 2: Instalar Dependências ✅ CONCLUÍDO

- [x] Instalar bibliotecas Stripe no frontend:
  ```bash
  npm install @stripe/stripe-js @stripe/react-stripe-js
  ```

### Fase 3: Criar Edge Functions (Supabase)

- [ ] Criar Edge Function `stripe-checkout`
  - **Arquivo:** `supabase/functions/stripe-checkout/index.ts`
  - **Função:** Criar sessão de checkout
  - **Deploy:** `supabase functions deploy stripe-checkout`

- [ ] Criar Edge Function `stripe-webhook`
  - **Arquivo:** `supabase/functions/stripe-webhook/index.ts`
  - **Função:** Processar eventos do Stripe
  - **Deploy:** `supabase functions deploy stripe-webhook --no-verify-jwt`

### Fase 4: Configurar Webhooks no Stripe

- [ ] Acessar Stripe Dashboard → Developers → Webhooks
- [ ] Criar endpoint: `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`
- [ ] Selecionar eventos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Copiar Webhook Signing Secret (`whsec_...`)
- [ ] Adicionar secret no Supabase: Settings → Secrets → `STRIPE_WEBHOOK_SECRET`

### Fase 5: Criar Service do Stripe (Frontend)

- [ ] Criar `src/services/stripeService.ts`
- [ ] Implementar `createCheckoutSession()`
- [ ] Implementar `redirectToCheckout()`

### Fase 6: Criar Página de Checkout

- [ ] Criar `src/pages/Checkout.tsx`
- [ ] Integrar com `stripeService`
- [ ] Adicionar rota no `App.tsx`
- [ ] Criar página de sucesso: `src/pages/CheckoutSuccess.tsx`
- [ ] Criar página de cancelamento: `src/pages/CheckoutCancel.tsx`

### Fase 7: Criar Página de Planos

- [ ] Criar `src/pages/Pricing.tsx`
- [ ] Listar planos disponíveis
- [ ] Botão "Assinar" que redireciona para checkout
- [ ] Mostrar features de cada plano

### Fase 8: Implementar Webhook Handlers

- [ ] Handler `checkout.session.completed`:
  - Criar subscription no banco
  - Vincular com organization
  - Atualizar status

- [ ] Handler `customer.subscription.updated`:
  - Atualizar subscription no banco
  - Atualizar status e período

- [ ] Handler `customer.subscription.deleted`:
  - Marcar subscription como cancelada
  - Atualizar status da organization

- [ ] Handler `invoice.payment_succeeded`:
  - Criar registro em `payments`
  - Atualizar subscription

- [ ] Handler `invoice.payment_failed`:
  - Marcar subscription como `past_due`
  - Notificar usuário

### Fase 9: Testes

- [ ] Testar checkout com cartão de teste (`4242 4242 4242 4242`)
- [ ] Verificar webhook recebido no Stripe Dashboard
- [ ] Verificar subscription criada no banco
- [ ] Testar fluxo completo: seleção → checkout → pagamento → webhook → subscription ativa
- [ ] Testar cancelamento
- [ ] Testar falha de pagamento

### Fase 10: Integração com Sistema Existente

- [ ] Atualizar `subscriptionService.ts` para usar Stripe
- [ ] Criar método para verificar subscription ativa
- [ ] Integrar verificação de limites com subscription
- [ ] Atualizar dashboard para mostrar status de pagamento

---

## 📝 Arquivos a Criar

### Edge Functions (Supabase)

1. `supabase/functions/stripe-checkout/index.ts`
2. `supabase/functions/stripe-webhook/index.ts`

### Frontend (React)

1. `src/services/stripeService.ts`
2. `src/pages/Checkout.tsx`
3. `src/pages/CheckoutSuccess.tsx`
4. `src/pages/CheckoutCancel.tsx`
5. `src/pages/Pricing.tsx`

### Atualizar

1. `src/App.tsx` (adicionar rotas)
2. `src/services/subscriptionService.ts` (integração Stripe)

---

## 🔧 Configurações Necessárias

### Supabase Secrets

Adicionar em **Settings → Secrets**:

- `STRIPE_SECRET_KEY` = `sk_test_...` (já configurado no .env, copiar)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (obter após criar webhook)

### Variáveis de Ambiente

**Frontend (.env):**
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Supabase Secrets:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🎯 Ordem de Implementação Recomendada

1. **Corrigir Price IDs** ⚠️ (URGENTE)
2. Instalar dependências
3. Criar Edge Function de checkout
4. Criar página de checkout (frontend)
5. Testar checkout básico
6. Configurar webhooks
7. Criar Edge Function de webhook
8. Implementar handlers
9. Testar fluxo completo
10. Criar página de planos
11. Integrar com sistema existente

---

## 📚 Referências

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

## ⚠️ Importante

### Price ID vs Product ID

- **Product ID** (`prod_...`): Identifica o produto
- **Price ID** (`price_...`): Identifica o preço específico ✅ **USE ESTE**

Para checkout, sempre use **Price ID**, não Product ID.

### Test Mode vs Live Mode

- Use **Test Mode** durante desenvolvimento
- Cartão de teste: `4242 4242 4242 4242`
- Migre para **Live Mode** apenas em produção

---

**Última atualização:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Próximos passos definidos

# 🔌 Guia de Integração Stripe - INSYT

**Data:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Guia de implementação

---

## 📋 Pré-requisitos

- ✅ Conta Stripe criada
- ✅ Sistema de subscriptions implementado no banco
- ✅ Super Admin Dashboard funcional
- ✅ Supabase configurado com Edge Functions (opcional para webhooks)

---

## 🎯 Visão Geral da Integração

O sistema já está **99% preparado** para Stripe. Falta apenas:

1. ✅ Criar produtos e preços no Stripe Dashboard
2. ✅ Configurar variáveis de ambiente (API keys)
3. ✅ Atualizar `stripe_price_id` nos planos do banco
4. ⚠️ Criar checkout flow (frontend)
5. ⚠️ Configurar webhooks (Edge Functions)
6. ⚠️ Processar eventos do Stripe

---

## 📝 Passo 1: Configurar Stripe Dashboard

### 1.1. Obter API Keys

1. **Acesse:** [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API keys**

2. **Copie as chaves:**
   - **Publishable key** (pk_test_... ou pk_live_...)
   - **Secret key** (sk_test_... ou sk_live_...)

   ⚠️ **Use Test Mode** primeiro (`pk_test` e `sk_test`) para desenvolvimento

3. **Guarde essas chaves** (vamos configurar no Passo 2)

---

### 1.2. Criar Produtos e Preços

1. **Acesse:** Stripe Dashboard → **Products** → **Add product**

2. **Criar 3 produtos** (um para cada plano):

#### **Produto 1: INSYT Starter**
- **Name:** `INSYT Starter`
- **Description:** `Plano Starter - 3 profiles, 3 clients Instagram, 900 posts/mês`
- **Type:** `Service`

**Preço:**
- **Price:** `R$ 89,40`
- **Billing period:** `Monthly` (Recurring)
- **Recurring:** ✅ Habilitado
- **Price ID gerado:** Copie o `price_id` (ex: `price_1ABC...`)

#### **Produto 2: INSYT Professional**
- **Name:** `INSYT Professional`
- **Description:** `Plano Professional - 8 profiles, 10 clients Instagram, 20.000 posts/mês`
- **Type:** `Service`

**Preço:**
- **Price:** `R$ 298,00`
- **Billing period:** `Monthly` (Recurring)
- **Recurring:** ✅ Habilitado
- **Price ID gerado:** Copie o `price_id` (ex: `price_1XYZ...`)

#### **Produto 3: INSYT Business**
- **Name:** `INSYT Business`
- **Description:** `Plano Business - 15 profiles, 20 clients Instagram, 40.000 posts/mês`
- **Type:** `Service`

**Preço:**
- **Price:** `R$ 596,00`
- **Billing period:** `Monthly` (Recurring)
- **Recurring:** ✅ Habilitado
- **Price ID gerado:** Copie o `price_id` (ex: `price_1DEF...`)

3. **Anote os Price IDs** de cada plano:
   ```
   Starter: price_1ABC... (R$ 89,40/mês)
   Professional: price_1XYZ... (R$ 298,00/mês)
   Business: price_1DEF... (R$ 596,00/mês)
   ```

---

## 📝 Passo 2: Configurar Variáveis de Ambiente

### 2.1. Frontend (React)

**Arquivo:** `.env` ou `.env.local` (criar na raiz do projeto)

```env
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
```

**⚠️ IMPORTANTE:**
- Use `REACT_APP_` como prefixo para variáveis React
- Adicione `.env` ao `.gitignore` (não commitar chaves)
- Use `pk_test_...` para desenvolvimento

### 2.2. Backend/Supabase (Se usar Edge Functions)

**No Supabase Dashboard:** **Settings** → **Secrets**

Adicionar:
- `STRIPE_SECRET_KEY` = `sk_test_51ABC...`
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (obter depois do Passo 4)

---

## 📝 Passo 3: Atualizar Planos no Banco

### 3.1. Via Super Admin Dashboard (Recomendado)

1. **Acesse:** `/super-admin` → Tab **"Planos"**
2. **Edite cada plano:**
   - **Starter:** Adicione o `stripe_price_id` do Starter
   - **Professional:** Adicione o `stripe_price_id` do Professional
   - **Enterprise:** Adicione o `stripe_price_id` (se houver) ou deixe vazio
3. **Salve** cada plano

### 3.2. Via SQL (Alternativo)

**No Supabase SQL Editor:**

```sql
-- Atualizar Starter
UPDATE subscription_plans
SET stripe_price_id = 'price_1ABC...'  -- ⚠️ SUBSTITUA PELO SEU PRICE ID
WHERE name = 'starter';

-- Atualizar Professional
UPDATE subscription_plans
SET stripe_price_id = 'price_1XYZ...'  -- ⚠️ SUBSTITUA PELO SEU PRICE ID
WHERE name = 'professional';

-- Atualizar Enterprise (opcional)
UPDATE subscription_plans
SET stripe_price_id = 'price_1DEF...'  -- ⚠️ SUBSTITUA OU DEIXE NULL
WHERE name = 'enterprise';

-- Verificar
SELECT name, stripe_price_id, amount 
FROM subscription_plans;
```

---

## 📝 Passo 4: Instalar Stripe no Frontend

### 4.1. Instalar Biblioteca

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 4.2. Criar Service do Stripe

**Arquivo:** `src/services/stripeService.ts` (NOVO)

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

export const getStripe = () => stripePromise;

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export class StripeService {
  /**
   * Criar sessão de checkout para subscription
   */
  async createCheckoutSession(
    priceId: string,
    organizationId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    // TODO: Chamar API/Edge Function para criar sessão
    // Por enquanto, retornar mock
    throw new Error('Not implemented - criar Edge Function primeiro');
  }

  /**
   * Redirecionar para checkout
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe não inicializado');

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
  }
}

export const stripeService = new StripeService();
```

---

## 📝 Passo 5: Criar Checkout Flow

### 5.1. Criar Edge Function (Supabase) - Recomendado

**Arquivo:** `supabase/functions/stripe-checkout/index.ts` (NOVO)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    const { priceId, organizationId, userId } = await req.json();

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      client_reference_id: organizationId,
      metadata: {
        organization_id: organizationId,
        user_id: userId,
      },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Deploy:**
```bash
supabase functions deploy stripe-checkout
```

### 5.2. Criar Página de Checkout (Frontend)

**Arquivo:** `src/pages/Checkout.tsx` (NOVO)

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { subscriptionService } from '../services/subscriptionService';
import { supabaseClient } from '../services/supabaseClient';

const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCheckout = async () => {
      if (!planId) {
        navigate('/pricing');
        return;
      }

      try {
        // Buscar plano
        const plans = await subscriptionService.getAllPlans();
        const plan = plans.find(p => p.id === planId);
        
        if (!plan || !plan.stripe_price_id) {
          throw new Error('Plano não encontrado ou sem preço Stripe');
        }

        // Buscar organização do usuário
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // TODO: Buscar organization_id do usuário
        // const organization = await subscriptionService.getOrganizationByUserId(user.id);

        // Criar sessão de checkout
        // const session = await stripeService.createCheckoutSession(...);
        // await stripeService.redirectToCheckout(session.sessionId);

      } catch (error) {
        console.error('Erro no checkout:', error);
        navigate('/pricing?error=checkout_failed');
      } finally {
        setLoading(false);
      }
    };

    handleCheckout();
  }, [planId, navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Preparando checkout...</Typography>
      </Box>
    );
  }

  return null;
};

export default Checkout;
```

---

## 📝 Passo 6: Configurar Webhooks do Stripe

### 6.1. Configurar Webhook no Stripe Dashboard

1. **Acesse:** Stripe Dashboard → **Developers** → **Webhooks**
2. **Clique em:** "Add endpoint"
3. **URL:** `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`
4. **Events to send:**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`
5. **Copie o "Signing secret"** (ex: `whsec_...`) e adicione no Supabase Secrets

### 6.2. Criar Edge Function para Webhooks

**Arquivo:** `supabase/functions/stripe-webhook/index.ts` (NOVO)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Criar/atualizar subscription
        await handleCheckoutCompleted(session);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // TODO: Implementar lógica
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // TODO: Implementar lógica
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // TODO: Implementar lógica
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // TODO: Implementar lógica
}
```

**Deploy:**
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 📝 Passo 7: Testar Integração

### 7.1. Usar Cartões de Teste

**Cartões Stripe (Test Mode):**

- ✅ **Sucesso:** `4242 4242 4242 4242`
- ❌ **Falha:** `4000 0000 0000 0002`
- ⏱️ **3D Secure:** `4000 0027 6000 3184`

**Datas:** Qualquer data futura (ex: `12/34`)  
**CVC:** Qualquer 3 dígitos (ex: `123`)

### 7.2. Fluxo de Teste

1. ✅ Acessar página de planos
2. ✅ Selecionar plano
3. ✅ Redirecionar para checkout Stripe
4. ✅ Completar pagamento com cartão de teste
5. ✅ Verificar webhook recebido
6. ✅ Verificar subscription criada no banco
7. ✅ Verificar status da organização

---

## 🎯 Checklist de Implementação

### Fase 1: Configuração Inicial
- [ ] Obter API keys do Stripe (test mode)
- [ ] Criar produtos no Stripe Dashboard
- [ ] Criar preços (monthly) para cada plano
- [ ] Configurar variáveis de ambiente (frontend)
- [ ] Configurar secrets (Supabase)
- [ ] Atualizar `stripe_price_id` nos planos do banco

### Fase 2: Checkout Flow
- [ ] Instalar `@stripe/stripe-js` e `@stripe/react-stripe-js`
- [ ] Criar `stripeService.ts`
- [ ] Criar Edge Function `stripe-checkout`
- [ ] Criar página `Checkout.tsx`
- [ ] Adicionar rotas no `App.tsx`
- [ ] Testar checkout flow

### Fase 3: Webhooks
- [ ] Configurar webhook no Stripe Dashboard
- [ ] Obter webhook signing secret
- [ ] Criar Edge Function `stripe-webhook`
- [ ] Implementar handlers de eventos
- [ ] Testar webhooks (usar Stripe CLI)

### Fase 4: Integração Completa
- [ ] Sincronizar subscriptions (Stripe ↔ Banco)
- [ ] Atualizar status de subscriptions
- [ ] Criar histórico de pagamentos
- [ ] Implementar cancelamento
- [ ] Implementar upgrade/downgrade
- [ ] Testar fluxo completo

---

## 📚 Referências

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

## 🚨 Próximos Passos

Após completar este guia:

1. **Migrar para Production:**
   - Trocar `pk_test` → `pk_live`
   - Trocar `sk_test` → `sk_live`
   - Atualizar webhook endpoint

2. **Melhorias:**
   - Portal do cliente (gerenciar subscription)
   - Upgrade/downgrade de planos
   - Histórico de pagamentos
   - Notificações de pagamento

---

**Última atualização:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Guia de implementação

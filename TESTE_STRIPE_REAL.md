# 🧪 Teste Real do Stripe - Passo a Passo

**Data:** 2026-01-18  
**Objetivo:** Testar checkout completo com organization_id válido

---

## 📊 Análise dos Resultados

### ✅ O Que Descobrimos:

1. **Subscription do teste não foi criada** ❌
   - Motivo: `organization_id = "test-org-id-123"` não existe
   - Foreign key constraint impediu a criação

2. **Webhook está funcionando** ✅
   - Logs confirmam: eventos processados corretamente
   - Problema foi apenas o ID inválido

3. **Organizations disponíveis:**
   - `26d7c42d-05e3-483b-b273-0de832007d09` - "ORGANIZAÇÃO TESTE"
   - `fc5dd358-1e41-4491-921a-47ad35329dc0` - "Agência AUPE"

---

## 🧪 Teste Real - Opção 1: Via Frontend

### Passo a Passo:

1. **Acesse:** `http://localhost:3000/checkout?planId=<ID_DO_PLANO>`

   Para pegar o `planId`:
   ```sql
   SELECT id, name, amount / 100.0 AS preco FROM subscription_plans;
   ```

2. **O sistema vai:**
   - Pegar automaticamente o `organization_id` do usuário logado
   - Criar checkout session no Stripe
   - Redirecionar para Stripe Checkout

3. **Complete o pagamento** com cartão de teste:
   - Número: `4242 4242 4242 4242`
   - CVV: qualquer 3 dígitos
   - Data: qualquer data futura

4. **Verificar subscription criada:**
   ```sql
   SELECT 
       s.id,
       s.status,
       s.stripe_subscription_id,
       s.organization_id,
       o.name AS organizacao,
       p.name AS plano
   FROM subscriptions s
   JOIN organizations o ON s.organization_id = o.id
   JOIN subscription_plans p ON s.plan_id = p.id
   ORDER BY s.created_at DESC
   LIMIT 1;
   ```

---

## 🧪 Teste Real - Opção 2: Via Supabase Dashboard (Teste da Edge Function)

### Passo a Passo:

1. **Pegar IDs reais:**
   ```sql
   -- Organization ID
   SELECT id, name FROM organizations WHERE name = 'ORGANIZAÇÃO TESTE';
   
   -- Plan ID (para pegar priceId)
   SELECT id, name, stripe_price_id FROM subscription_plans WHERE name = 'starter';
   
   -- User ID (de um usuário que pertence à organization)
   SELECT u.id, u.email, p.organization_id 
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   WHERE p.organization_id = '26d7c42d-05e3-483b-b273-0de832007d09';
   ```

2. **Testar Edge Function `stripe-checkout`:**
   - Acesse: Supabase Dashboard → Edge Functions → `stripe-checkout` → Test
   - Method: `POST`
   - Body:
     ```json
     {
       "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
       "organizationId": "26d7c42d-05e3-483b-b273-0de832007d09",
       "userId": "<USER_ID_REAL_AQUI>"
     }
     ```

3. **Usar a URL retornada** para fazer checkout no Stripe

4. **Verificar logs do webhook** após checkout

5. **Verificar subscription criada:**
   ```sql
   SELECT 
       s.id,
       s.status,
       s.stripe_subscription_id,
       o.name AS organizacao,
       p.name AS plano
   FROM subscriptions s
   JOIN organizations o ON s.organization_id = o.id
   JOIN subscription_plans p ON s.plan_id = p.id
   WHERE s.stripe_subscription_id IS NOT NULL
   ORDER BY s.created_at DESC
   LIMIT 1;
   ```

---

## ✅ Checklist de Verificação

Após o teste, verificar:

- [ ] Checkout session criada no Stripe
- [ ] Pagamento concluído no Stripe
- [ ] Webhook recebido (`checkout.session.completed`)
- [ ] Subscription criada no banco com `stripe_subscription_id`
- [ ] `organization_id` correto na subscription
- [ ] Status `active` na subscription
- [ ] Payment registrado na tabela `payments`

---

## 🔍 Queries Úteis

### Ver todas as subscriptions com Stripe:

```sql
SELECT 
    s.id,
    s.status,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.current_period_start,
    s.current_period_end,
    o.name AS organizacao,
    p.name AS plano,
    p.amount / 100.0 AS preco
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.stripe_subscription_id IS NOT NULL
ORDER BY s.created_at DESC;
```

### Ver pagamentos registrados:

```sql
SELECT 
    p.id,
    p.amount / 100.0 AS valor,
    p.currency,
    p.status,
    p.paid_at,
    s.stripe_subscription_id
FROM payments p
JOIN subscriptions s ON p.subscription_id = s.id
ORDER BY p.created_at DESC
LIMIT 10;
```

---

**Última atualização:** 2026-01-18  
**Status:** 🧪 Pronto para teste real

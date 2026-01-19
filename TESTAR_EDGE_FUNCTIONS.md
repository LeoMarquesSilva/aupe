# 🧪 Como Testar as Edge Functions - Stripe

**Data:** 2026-01-18  
**Status:** Guia de testes

---

## 📋 Pré-requisitos

- ✅ Edge Functions deployadas no Supabase
- ✅ `STRIPE_SECRET_KEY` configurado em Secrets
- ✅ URLs das funções conhecidas

---

## 🎯 Teste 1: Verificar se Funções Estão Ativas

### No Dashboard

1. **Acesse:** Supabase Dashboard → Edge Functions
2. **Verifique:**
   - ✅ `stripe-checkout` aparece na lista
   - ✅ `stripe-webhook` aparece na lista
   - ✅ Status: "Active" ou "Deployed"

### URLs das Funções

**Checkout:**
```
https://SEU_PROJETO.supabase.co/functions/v1/stripe-checkout
```

**Webhook:**
```
https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook
```

⚠️ **Substitua** `SEU_PROJETO` pelo seu project reference ID.

---

## 🧪 Teste 2: Testar stripe-checkout (Via Dashboard)

### No Supabase Dashboard

1. **Acesse:** Edge Functions → `stripe-checkout`
2. **Clique em:** "Invoke function" ou "Test"
3. **Método:** POST
4. **Body (JSON):**
```json
{
  "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
  "organizationId": "test-org-id-123",
  "userId": "test-user-id-456"
}
```

5. **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

6. **Clique em:** "Invoke" ou "Run"

### Resultado Esperado

**✅ Sucesso:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**❌ Erro:**
- Se retornar erro sobre `STRIPE_SECRET_KEY`: Verificar Secrets no Dashboard
- Se retornar erro sobre `priceId`: Verificar se o Price ID está correto
- Se retornar erro 401: Verificar autenticação

---

## 🧪 Teste 3: Testar stripe-checkout (Via Postman/curl)

### Via Postman

1. **Método:** POST
2. **URL:**
```
https://SEU_PROJETO.supabase.co/functions/v1/stripe-checkout
```

3. **Headers:**
```
Content-Type: application/json
```

4. **Body (raw JSON):**
```json
{
  "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
  "organizationId": "test-org-id",
  "userId": "test-user-id"
}
```

5. **Send**

### Via curl (PowerShell)

```powershell
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/stripe-checkout `
  -H "Content-Type: application/json" `
  -d '{"priceId":"price_1Sr5MIHbDBpY5E6nuqkIZPbc","organizationId":"test-org","userId":"test-user"}'
```

---

## 🧪 Teste 4: Testar stripe-webhook (Via Dashboard)

### No Supabase Dashboard

1. **Acesse:** Edge Functions → `stripe-webhook`
2. **Clique em:** "Invoke function" ou "Test"

**⚠️ ATENÇÃO:** O webhook precisa de um payload real do Stripe com signature válida.

### Teste Simples (Pode Falhar)

**Body (JSON):**
```json
{
  "type": "test",
  "data": {}
}
```

**Resultado Esperado:**
- ❌ Pode retornar erro de signature (normal)
- ✅ Se retornar `{"received": true}`, está funcionando

**✅ Teste Real:** Configure webhook no Stripe Dashboard para testar corretamente (ver Teste 5)

---

## 🧪 Teste 5: Testar Webhook com Stripe CLI (Recomendado)

### Instalar Stripe CLI

**Windows:**
```powershell
scoop install stripe
# ou
choco install stripe-cli
```

### Configurar Stripe CLI

```powershell
# Login
stripe login

# Testar webhook localmente
stripe listen --forward-to https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook

# Em outro terminal, disparar evento de teste
stripe trigger checkout.session.completed
```

**✅ Se funcionar:** Você verá o evento sendo processado nos logs.

---

## 🧪 Teste 6: Testar Checkout Completo (End-to-End)

### Via Frontend (Se aplicativo estiver rodando)

1. **Acesse:** `/checkout?plan=PLAN_ID`
2. **Deve redirecionar para Stripe**
3. **Use cartão de teste:** `4242 4242 4242 4242`
4. **Complete pagamento**

### Verificar Logs

**No Supabase Dashboard:**
- Edge Functions → `stripe-checkout` → Logs
- Edge Functions → `stripe-webhook` → Logs

**Verificar:**
- ✅ Checkout criado sem erros
- ✅ Webhook recebido e processado
- ✅ Subscription criada no banco

---

## 📊 Checklist de Testes

### Verificação Básica

- [ ] Funções aparecem no Dashboard (Edge Functions)
- [ ] Status: "Active" ou "Deployed"
- [ ] `STRIPE_SECRET_KEY` configurado em Secrets

### Teste Checkout

- [ ] Teste via Dashboard retorna `sessionId` e `url`
- [ ] Teste via Postman/curl retorna resposta válida
- [ ] URLs de redirect corretas (`/checkout/success`, `/checkout/cancel`)

### Teste Webhook

- [ ] Webhook configurado no Stripe Dashboard (opcional por enquanto)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (quando tiver)

### Verificação de Logs

- [ ] Logs do `stripe-checkout` sem erros
- [ ] Logs do `stripe-webhook` sem erros (quando testado)

---

## 🚨 Problemas Comuns e Soluções

### Erro: "STRIPE_SECRET_KEY not found"

**Causa:** Secret não configurado

**Solução:**
1. Dashboard → Settings → Edge Functions → Secrets
2. Adicionar: `STRIPE_SECRET_KEY` = `sk_test_...`
3. Verificar se está salvo
4. Tentar novamente

---

### Erro: 401 Unauthorized

**Causa:** Autenticação necessária ou problema com secrets

**Solução:**
1. Verificar se `STRIPE_SECRET_KEY` está correto
2. Verificar se não tem espaços extras ao copiar
3. Fazer redeploy da função

---

### Erro: "Invalid price ID"

**Causa:** Price ID incorreto ou produto não existe no Stripe

**Solução:**
1. Verificar Price ID no Stripe Dashboard
2. Verificar se produto está ativo
3. Usar Price ID correto: `price_1Sr5MIHbDBpY5E6nuqkIZPbc` (exemplo)

---

### Checkout funciona mas webhook não recebe eventos

**Causa:** Webhook não configurado no Stripe ou `STRIPE_WEBHOOK_SECRET` incorreto

**Solução:**
1. Configurar webhook no Stripe Dashboard
2. Obter `STRIPE_WEBHOOK_SECRET` (whsec_...)
3. Adicionar em Supabase Secrets
4. Ver `CONFIGURAR_WEBHOOKS_STRIPE.md`

---

## ✅ Teste Rápido (Resumido)

### 1. Verificar Funções (1 min)

- Dashboard → Edge Functions
- Ver se `stripe-checkout` e `stripe-webhook` aparecem

### 2. Testar Checkout (2 min)

- Dashboard → `stripe-checkout` → Invoke
- Body:
```json
{
  "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
  "organizationId": "test",
  "userId": "test"
}
```
- **Deve retornar:** `sessionId` e `url`

### 3. Verificar Logs (1 min)

- Edge Functions → Logs
- **Verificar:** Sem erros

---

## 📝 Próximos Passos Após Testes

Se todos os testes passarem:

1. ✅ **Configurar Webhook no Stripe** (ver `CONFIGURAR_WEBHOOKS_STRIPE.md`)
2. ✅ **Adicionar `STRIPE_WEBHOOK_SECRET`** em Secrets
3. ✅ **Testar fluxo completo** (checkout → pagamento → webhook)
4. ✅ **Verificar subscription criada** no banco

---

**Última atualização:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Guia de testes completo

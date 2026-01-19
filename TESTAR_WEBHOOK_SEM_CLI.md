# 🧪 Como Testar Webhook Stripe SEM CLI

**Data:** 2026-01-18  
**Alternativas à Stripe CLI**

---

## 🎯 Opção 1: Stripe Dashboard (Mais Fácil) ⭐

### Passo 1: Configurar Webhook no Stripe

1. **Acesse:** Stripe Dashboard → Developers → Webhooks
2. **Clique:** "Add endpoint"
3. **URL:** `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`
4. **Events:** Selecione os eventos
5. **Save**

### Passo 2: Enviar Evento de Teste

1. **Após criar o endpoint**, você verá a página de detalhes
2. **Clique em:** **"Send test webhook"** (botão no topo)
3. **Selecione evento:** Ex: `checkout.session.completed`
4. **Clique:** "Send test webhook"

**✅ Pronto!** O evento será enviado automaticamente para sua Edge Function.

### Passo 3: Verificar Logs

**No Supabase Dashboard:**
- Edge Functions → `stripe-webhook` → Logs
- **Procurar por:** `📥 Evento recebido: checkout.session.completed`

---

## 🎯 Opção 2: Postman/Insomnia (Simular Webhook)

### Criar Requisição POST

**URL:**
```
https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook
```

**Method:** POST

**Headers:**
```
Content-Type: application/json
Stripe-Signature: test_signature
```

**Body (JSON):** Exemplo de payload do Stripe
```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "object": "checkout.session",
      "status": "complete",
      "client_reference_id": "test-org-id",
      "metadata": {
        "organization_id": "test-org-id",
        "user_id": "test-user-id"
      },
      "subscription": "sub_test_123"
    }
  }
}
```

**⚠️ ATENÇÃO:** Este teste pode falhar na verificação de signature, mas você verá os logs.

---

## 🎯 Opção 3: Testar Diretamente no Stripe (Checkout Real)

### Fazer Checkout Completo

1. **Acesse:** URL de checkout (do teste anterior)
2. **Complete pagamento** com cartão de teste
3. **Após pagamento,** o Stripe automaticamente envia webhook

**✅ Este é o teste mais realista!**

**Cartão de teste:**
- Número: `4242 4242 4242 4242`
- Data: Qualquer data futura (ex: `12/34`)
- CVC: Qualquer 3 dígitos (ex: `123`)

---

## 🎯 Opção 4: Verificar Eventos no Stripe Dashboard

### Ver Eventos Enviados

1. **Stripe Dashboard** → Developers → Webhooks
2. **Clique no seu endpoint**
3. **Abra a aba:** "Recent events"
4. **Verifique:**
   - ✅ Status: "Succeeded" (verde) = webhook processado
   - ❌ Status: "Failed" (vermelho) = webhook com erro

**Clicando no evento**, você vê:
- Payload enviado
- Response da sua função
- Status code
- Tempo de resposta

---

## ✅ Método Recomendado (SEM CLI)

### **Opção 1: Stripe Dashboard - Send Test Webhook** ⭐

**Por quê:**
- ✅ Mais fácil
- ✅ Não precisa instalar nada
- ✅ Usa payload real do Stripe
- ✅ Verifica signature automaticamente

**Como fazer:**
1. Configurar webhook no Stripe
2. Clicar em "Send test webhook"
3. Selecionar evento
4. Verificar logs no Supabase

---

## 🧪 Teste Completo (Checklist)

### 1. Configurar Webhook (1x)

- [ ] Criar endpoint no Stripe Dashboard
- [ ] URL: `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`
- [ ] Selecionar 6 eventos principais
- [ ] Copiar Webhook Secret (`whsec_...`)
- [ ] Adicionar `STRIPE_WEBHOOK_SECRET` em Supabase Secrets

### 2. Testar com "Send Test Webhook"

- [ ] Stripe Dashboard → Webhook → "Send test webhook"
- [ ] Selecionar: `checkout.session.completed`
- [ ] Enviar
- [ ] Verificar logs no Supabase (Edge Functions → `stripe-webhook` → Logs)

### 3. Testar com Checkout Real

- [ ] Fazer checkout completo (usar cartão teste)
- [ ] Verificar eventos em "Recent events" (Stripe Dashboard)
- [ ] Verificar logs no Supabase
- [ ] Verificar se subscription foi criada no banco

---

## 📊 Verificar se Webhook Funcionou

### No Supabase Logs

**Procurar por:**
- ✅ `📥 Evento recebido: checkout.session.completed`
- ✅ `✅ Subscription sincronizada`
- ❌ `❌ Erro` (se houver problema)

### No Stripe Dashboard

**Webhook → Recent Events:**
- ✅ Status: "Succeeded" (verde)
- ✅ Response Code: `200`
- ❌ Status: "Failed" (se houver erro)

### No Banco de Dados

**Verificar subscription criada:**
```sql
SELECT * FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🚨 Troubleshooting

### Webhook retorna "Failed" no Stripe

**Verificar:**
1. Edge Function deployada?
2. `STRIPE_WEBHOOK_SECRET` configurado?
3. Verificação JWT desabilitada? (webhook não usa JWT)
4. Logs do Supabase mostram erro?

### Webhook não recebe eventos

**Verificar:**
1. URL do webhook está correta?
2. Endpoint está "Enabled"?
3. Eventos selecionados corretamente?

### Subscription não é criada no banco

**Verificar:**
1. Webhook está sendo recebido? (ver logs)
2. `organization_id` está no metadata da sessão?
3. `price_id` corresponde a um plano no banco?

---

## 🎯 Resumo: Formas de Testar (Sem CLI)

| Método | Facilidade | Realismo | Recomendação |
|--------|-----------|----------|--------------|
| **Stripe Dashboard - Send Test** | ⭐⭐⭐ Muito fácil | ⭐⭐⭐ Real | ✅ **RECOMENDADO** |
| **Checkout Real** | ⭐⭐ Fácil | ⭐⭐⭐ Muito real | ✅ **MELHOR TESTE** |
| **Postman/Insomnia** | ⭐ Média | ⭐ Simulado | ⚠️ Pode falhar signature |
| **Verificar Eventos no Dashboard** | ⭐⭐ Fácil | ⭐⭐⭐ Real | ✅ Útil para debug |

---

## ✅ Próximo Passo Recomendado

**1. Configurar webhook no Stripe Dashboard** (5 min)
- URL: `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`
- Eventos: Os 6 principais

**2. Usar "Send test webhook"** (1 min)
- Stripe Dashboard → Webhook → "Send test webhook"
- Evento: `checkout.session.completed`

**3. Verificar logs** (1 min)
- Supabase → Edge Functions → `stripe-webhook` → Logs

**✅ Total: 7 minutos para testar!**

---

**Última atualização:** 2026-01-18  
**Versão:** 1.0.0  
**Status:** 📋 Guia completo - Teste sem CLI

# 🧪 Script de Teste Rápido - stripe-checkout

**Como usar:** Copie e cole no PowerShell ou terminal

---

## 📋 Informações Necessárias

**Antes de testar, obtenha:**

1. **Project Reference ID:** 
   - Dashboard → Settings → General → Reference ID
   - Exemplo: `mrkcoolfxqiwaqeyquuf`

2. **Price ID (teste):**
   - Use um dos Price IDs configurados no banco
   - Exemplo: `price_1Sr5MIHbDBpY5E6nuqkIZPbc` (Starter)

---

## 🧪 Teste 1: Via PowerShell (curl)

**Substitua `SEU_PROJETO` pelo seu project reference:**

```powershell
$projectRef = "mrkcoolfxqiwaqeyquuf"  # ⚠️ SUBSTITUA
$url = "https://$projectRef.supabase.co/functions/v1/stripe-checkout"

$body = @{
    priceId = "price_1Sr5MIHbDBpY5E6nuqkIZPbc"
    organizationId = "test-org-123"
    userId = "test-user-456"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"
```

**✅ Resultado esperado:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

## 🧪 Teste 2: Via Supabase Dashboard (Mais Fácil)

1. **Acesse:** Dashboard → Edge Functions → `stripe-checkout`
2. **Clique:** "Invoke function" ou "Test"
3. **Body:**
```json
{
  "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
  "organizationId": "test-org",
  "userId": "test-user"
}
```
4. **Invoke**

**✅ Deve retornar `sessionId` e `url`**

---

## 🧪 Teste 3: Via Browser Console (Frontend)

**Se o app estiver rodando:**

```javascript
// Abra o console do navegador (F12)
// Execute:

const response = await fetch('https://SEU_PROJETO.supabase.co/functions/v1/stripe-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_1Sr5MIHbDBpY5E6nuqkIZPbc',
    organizationId: 'test-org',
    userId: 'test-user'
  })
});

const data = await response.json();
console.log(data);
```

---

## 🚨 Verificar Se Funcionou

### ✅ Sucesso

**Resposta:**
```json
{
  "sessionId": "cs_test_a1b2c3...",
  "url": "https://checkout.stripe.com/pay/cs_test_a1b2c3..."
}
```

**Significa:**
- ✅ Função está ativa
- ✅ Stripe API está configurada
- ✅ Checkout pode ser criado

---

### ❌ Erro

**Erro 500 - "STRIPE_SECRET_KEY not found":**
- ➡️ Configurar secret no Dashboard
- Settings → Edge Functions → Secrets
- Adicionar: `STRIPE_SECRET_KEY`

**Erro 400 - "Invalid price":**
- ➡️ Verificar Price ID
- Verificar se produto existe no Stripe

**Erro 401 - Unauthorized:**
- ➡️ Verificar secrets configurados
- Fazer redeploy da função

---

## 📝 Checklist Rápido

- [ ] Project Reference ID obtido
- [ ] Price ID de teste disponível
- [ ] Teste executado (Dashboard, PowerShell ou Console)
- [ ] Resposta recebida (`sessionId` e `url`)
- [ ] Sem erros nos logs

---

**Última atualização:** 2026-01-18  
**Status:** 🧪 Script pronto para teste

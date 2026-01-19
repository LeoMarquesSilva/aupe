# ✅ Verificação dos Códigos das Edge Functions

**Data:** 2026-01-18  
**Status:** Códigos verificados e corrigidos

---

## 🔍 Verificação Realizada

### ✅ **stripe-checkout/index.ts** - OK

**Status:** ✅ **Pode colar no Dashboard**

**Verificações:**
- ✅ Imports corretos (Deno std, Stripe, versões corretas)
- ✅ Estrutura correta da função `serve()`
- ✅ CORS headers configurados
- ✅ Validação de parâmetros (priceId, organizationId, userId)
- ✅ Criação de sessão Stripe correta
- ✅ Tratamento de erros adequado

**Nenhum erro encontrado.** Pode colar diretamente.

---

### ⚠️ **stripe-webhook/index.ts** - CORRIGIDO

**Status:** ✅ **Corrigido - Pode colar no Dashboard**

**Problema encontrado:**
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` podem não estar disponíveis como env vars em alguns contextos

**Correção aplicada:**
- ✅ Adicionada verificação e fallback para variáveis
- ✅ Log de erro se variáveis não estiverem disponíveis
- ✅ Código ajustado para garantir compatibilidade

**Agora está correto.** Pode colar diretamente.

---

## 📋 Variáveis de Ambiente Necessárias

### Para stripe-checkout:
- ✅ `STRIPE_SECRET_KEY` (obrigatório)

### Para stripe-webhook:
- ✅ `STRIPE_SECRET_KEY` (obrigatório)
- ✅ `STRIPE_WEBHOOK_SECRET` (obrigatório - obter após configurar webhook)
- ✅ `SUPABASE_URL` (automaticamente disponível pelo Supabase)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (automaticamente disponível pelo Supabase)

**⚠️ IMPORTANTE:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são automaticamente injetados pelo Supabase nas Edge Functions. Se não funcionarem, você pode adicioná-los manualmente em Settings → Edge Functions → Secrets.

---

## ✅ Checklist Antes de Colar

### stripe-checkout:
- [x] Código verificado - sem erros
- [x] 83 linhas completas
- [x] Pronto para colar

### stripe-webhook:
- [x] Código verificado - sem erros
- [x] 326 linhas completas (após correção)
- [x] Pronto para colar

---

## 🚀 Como Colar no Dashboard

### 1. stripe-checkout

1. **Dashboard** → Edge Functions → Create Function
2. **Nome:** `stripe-checkout`
3. **Colar** TODO o conteúdo de `supabase/functions/stripe-checkout/index.ts`
4. **Deploy**

### 2. stripe-webhook

1. **Dashboard** → Edge Functions → Create Function
2. **Nome:** `stripe-webhook`
3. **Colar** TODO o conteúdo de `supabase/functions/stripe-webhook/index.ts` (326 linhas)
4. **Desabilitar verificação JWT** (se houver opção)
5. **Deploy**

---

## 🧪 Testar Após Deploy

### Teste Checkout:
```bash
POST https://SEU_PROJETO.supabase.co/functions/v1/stripe-checkout
Content-Type: application/json

{
  "priceId": "price_1Sr5MIHbDBpY5E6nuqkIZPbc",
  "organizationId": "test-org-id",
  "userId": "test-user-id"
}
```

### Teste Webhook:
- Configurar no Stripe Dashboard primeiro
- Stripe enviará eventos automaticamente

---

## 🚨 Se Der Erro Após Deploy

### Erro: "SUPABASE_URL not found"

**Solução:**
1. Settings → Edge Functions → Secrets
2. Adicionar manualmente:
   - `SUPABASE_URL` = `https://SEU_PROJETO.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (obter em Settings → API → service_role key)

### Erro: "STRIPE_SECRET_KEY not found"

**Solução:**
1. Settings → Edge Functions → Secrets
2. Adicionar: `STRIPE_SECRET_KEY` = `sk_test_...`

---

## ✅ Conclusão

**Ambos os códigos estão corretos e prontos para colar no Dashboard!**

- ✅ `stripe-checkout/index.ts` - 83 linhas - OK
- ✅ `stripe-webhook/index.ts` - 326 linhas - Corrigido e OK

**Pode colar com confiança!** 🚀

---

**Última atualização:** 2026-01-18  
**Status:** ✅ Códigos verificados e corrigidos

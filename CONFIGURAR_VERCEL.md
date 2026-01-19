# 🔧 Configurar Variáveis de Ambiente no Vercel

**Problema:** `Error: Command "npm run build" exited with 1` no Vercel  
**Solução:** Configurar variáveis de ambiente necessárias

---

## 🔍 Variáveis de Ambiente Obrigatórias

### 1. Supabase (OBRIGATÓRIAS)

Estas variáveis **SÃO OBRIGATÓRIAS** para o build funcionar:

```
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_KEY=sua_chave_publica_aqui
```

**Onde encontrar:**
- **Supabase Dashboard** → **Settings** → **API**
- **URL:** `Project URL`
- **Key:** `anon` `public` key (não a `service_role`)

---

### 2. Stripe (OPCIONAL mas Recomendado)

```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
```

**Onde encontrar:**
- **Stripe Dashboard** → **Developers** → **API keys**
- Use a chave **Publishable key** (começa com `pk_test_` ou `pk_live_`)

**Nota:** Sem esta chave, o Stripe pode gerar warnings, mas não impede o build.

---

## 📋 Como Configurar no Vercel

### Passo a Passo:

1. **Acesse:** [Vercel Dashboard](https://vercel.com/dashboard)

2. **Selecione seu projeto:** `aupe` (ou nome do seu projeto)

3. **Vá para:** **Settings** → **Environment Variables**

4. **Adicione as variáveis:**

   **Para Production, Preview e Development:**
   
   ```
   REACT_APP_SUPABASE_URL = https://seu-projeto.supabase.co
   REACT_APP_SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   REACT_APP_STRIPE_PUBLISHABLE_KEY = pk_test_...
   ```

5. **Salve** cada variável

6. **Redeploy** (ou aguarde próximo deploy automático)

---

## 🎯 Exemplo Visual

No Vercel Dashboard → Settings → Environment Variables:

```
Name:                           Value:
───────────────────────────────────────────────────────
REACT_APP_SUPABASE_URL          https://abc123.supabase.co
REACT_APP_SUPABASE_KEY          eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_STRIPE_PUBLISHABLE_KEY pk_test_51ABC123...
```

**Environments:** ✅ Production ✅ Preview ✅ Development

---

## ⚠️ Importante

### Prefixo `REACT_APP_`

**Todas as variáveis do React DEVEM ter o prefixo `REACT_APP_`**

✅ Correto:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_KEY`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`

❌ Errado:
- `SUPABASE_URL` (não funcionará!)
- `VITE_SUPABASE_URL` (não é Vite)

---

## 🔄 Após Configurar

### Opção 1: Redeploy Automático

Após adicionar as variáveis, o próximo push irá fazer deploy automaticamente.

### Opção 2: Redeploy Manual

1. **Vercel Dashboard** → Seu projeto
2. **Deployments** → ... (três pontos) → **Redeploy**

---

## ✅ Verificar Build Local

Para testar localmente antes do deploy:

1. **Criar arquivo `.env`** na raiz do projeto:

```env
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_KEY=sua_chave_publica_aqui
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
```

2. **Testar build:**

```bash
npm run build
```

3. **Se funcionar localmente, funcionará no Vercel!**

---

## 🐛 Problemas Comuns

### Erro: "REACT_APP_SUPABASE_URL is not defined"

**Causa:** Variável não configurada no Vercel

**Solução:** Adicionar `REACT_APP_SUPABASE_URL` em Settings → Environment Variables

---

### Erro: "Build succeeded but app doesn't work"

**Causa:** Variáveis não estão sendo lidas corretamente

**Solução:** 
1. Verificar se tem prefixo `REACT_APP_`
2. Fazer redeploy após adicionar variáveis
3. Verificar se as chaves estão corretas (copiar do Supabase Dashboard)

---

### Build funciona local mas falha no Vercel

**Causa:** Variáveis no `.env` local não foram adicionadas no Vercel

**Solução:** Adicionar todas as variáveis `REACT_APP_*` no Vercel Dashboard

---

## 📝 Checklist

- [ ] `REACT_APP_SUPABASE_URL` configurada no Vercel
- [ ] `REACT_APP_SUPABASE_KEY` configurada no Vercel
- [ ] `REACT_APP_STRIPE_PUBLISHABLE_KEY` configurada (opcional)
- [ ] Variáveis aplicadas para **Production, Preview e Development**
- [ ] Redeploy realizado ou aguardando próximo push

---

**Última atualização:** 2026-01-18  
**Status:** 🔧 Instruções para configurar Vercel

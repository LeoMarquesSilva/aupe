# 🔧 Corrigir Problemas para Testar Checkout

**Data:** 2026-01-18  
**Problemas:** Usuário sem organization_id + Stripe key vazia

---

## 🐛 Problemas Identificados

### 1. ❌ Usuário sem Organization ID

**Erro:** `marx.projetos@gmail.com` não está vinculado a uma organização

**Sintoma:** Checkout falha porque não encontra `organization_id` no perfil

---

### 2. ❌ Stripe Publishable Key Vazia

**Erro:** `IntegrationError: Please call Stripe() with your publishable key. You used an empty string.`

**Sintoma:** `REACT_APP_STRIPE_PUBLISHABLE_KEY` não está configurada no `.env`

---

## ✅ Soluções

### Problema 1: Vincular Usuário à Organização

**Execute este SQL no Supabase:**

```sql
-- Vincular Super Admin à "Agência AUPE"
UPDATE profiles
SET organization_id = (
    SELECT id FROM organizations WHERE name = 'Agência AUPE' LIMIT 1
)
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'marx.projetos@gmail.com'
)
AND organization_id IS NULL;

-- Verificar resultado
SELECT 
    u.email,
    p.organization_id,
    o.name AS organizacao
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'marx.projetos@gmail.com';
```

**Arquivo:** `supabase/migrations/010_vincular_super_admin_organization.sql`

---

### Problema 2: Configurar Stripe Publishable Key

**1. Verificar `.env`:**

Procure por:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**2. Se não existir, adicione:**

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
```

**3. Onde encontrar a chave:**
- Stripe Dashboard → Developers → API keys
- Use a chave **Publishable key** (começa com `pk_test_`)

**4. Reiniciar servidor de desenvolvimento:**

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm start
```

---

## 🧪 Teste Após Correções

### Passo a Passo:

1. **Executar SQL** para vincular usuário à organização ✅
2. **Verificar `.env`** com `REACT_APP_STRIPE_PUBLISHABLE_KEY` ✅
3. **Reiniciar servidor** de desenvolvimento ✅
4. **Acessar:** `http://localhost:3000/checkout?plan=<ID_DO_PLANO>`

**Para pegar o `planId`:**
```sql
SELECT id, name, stripe_price_id FROM subscription_plans WHERE name = 'starter';
```

---

## ✅ Verificações

### Verificar Organization ID:

```sql
SELECT 
    u.email,
    p.organization_id,
    o.name AS organizacao
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'marx.projetos@gmail.com';
```

**Resultado esperado:**
- ✅ `organization_id` preenchido
- ✅ `organizacao` = "Agência AUPE" (ou outra)

---

### Verificar Stripe Key:

No console do navegador, **não deve mais aparecer:**
```
❌ IntegrationError: Please call Stripe() with your publishable key.
```

---

## 📋 Checklist

- [ ] SQL executado para vincular usuário à organização
- [ ] `.env` configurado com `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- [ ] Servidor reiniciado após alterar `.env`
- [ ] Verificado que `organization_id` está preenchido
- [ ] Erro do Stripe desapareceu no console

---

**Última atualização:** 2026-01-18  
**Status:** 🔧 Correções necessárias

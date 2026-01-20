# ✅ Fluxo de Cadastro Antes do Checkout

**Data:** 2026-01-18  
**Status:** ✅ Implementado

---

## 🎯 Objetivo

Garantir que usuários criem uma conta e organização ANTES de realizar o pagamento, evitando erros no fluxo de checkout.

---

## 📋 Mudanças Implementadas

### 1. Nova Página de Cadastro (`src/pages/Signup.tsx`)

**Características:**
- ✅ Formulário em 2 etapas (Stepper):
  1. **Informações da Organização:**
     - Nome da Organização *
     - Email da Organização *
     - Telefone
     - CNPJ/CPF
  2. **Dados de Acesso:**
     - Nome Completo *
     - Email *
     - Senha *
     - Confirmar Senha *

**Fluxo:**
1. Coleta dados da organização
2. Cria organização no banco
3. Cria usuário no Supabase Auth
4. Cria perfil vinculado à organização (role: `admin`)
5. Redireciona para checkout com `planId` (se fornecido)

**Validações:**
- ✅ Email válido
- ✅ Senha mínimo 6 caracteres
- ✅ Confirmação de senha
- ✅ Campos obrigatórios

---

### 2. Atualização da Landing Page (`src/pages/Landing.tsx`)

**Mudança no `handleGetStarted`:**
- **Antes:** Redirecionava para `/login` se não estivesse logado
- **Agora:** Redireciona para `/signup?plan={planId}` se não estivesse logado

**Código:**
```typescript
if (!user) {
  // Se não estiver logado, redirecionar para CADASTRO (não login)
  if (planId) {
    navigate(`/signup?plan=${planId}`);
  } else {
    navigate('/signup');
  }
  return;
}
```

---

### 3. Nova Rota (`src/App.tsx`)

**Adicionada:**
```typescript
{
  path: "/signup",
  element: <PublicLayout><Signup /></PublicLayout>,
}
```

---

### 4. Link no Login (`src/pages/Login.tsx`)

**Adicionado link para cadastro:**
- "Não tem uma conta? **Criar Conta**"
- Preserva `planId` se houver redirecionamento pendente

---

## 🔄 Fluxo Completo

```
1. Usuário clica em "Começar Agora" na Landing Page
   ↓
2. Sistema verifica se está logado
   ↓
3. Se NÃO estiver logado:
   → Redireciona para /signup?plan={planId}
   ↓
4. Usuário preenche dados da organização (Etapa 1)
   ↓
5. Usuário preenche dados de acesso (Etapa 2)
   ↓
6. Sistema cria:
   - Organização no banco
   - Usuário no Supabase Auth
   - Perfil vinculado à organização
   ↓
7. Redireciona para /checkout?plan={planId}
   ↓
8. Checkout verifica:
   - ✅ Usuário autenticado
   - ✅ Perfil existe
   - ✅ organization_id existe
   ↓
9. Cria sessão Stripe e redireciona para pagamento
```

---

## ✅ Benefícios

1. **Organização sempre criada:** Evita erro de `organization_id` não encontrado
2. **Perfil vinculado:** Usuário sempre tem `organization_id` no perfil
3. **Role padrão:** Primeiro usuário recebe role `admin`
4. **Fluxo claro:** Usuário sabe exatamente o que precisa fazer
5. **Validações:** Dados corretos antes de criar conta

---

## 🧪 Testes Necessários

- [ ] Criar conta sem planId
- [ ] Criar conta com planId
- [ ] Verificar se organização é criada corretamente
- [ ] Verificar se perfil é vinculado à organização
- [ ] Verificar se redireciona para checkout após cadastro
- [ ] Testar validações de formulário
- [ ] Testar erro se email já existe
- [ ] Testar erro se organização não é criada

---

## 📝 Notas Técnicas

### Tratamento de Erros

Se erro ao criar usuário após criar organização:
- ✅ Organização é deletada automaticamente
- ✅ Evita dados órfãos no banco

### Criação de Perfil

Tentativas em ordem:
1. Inserção direta na tabela `profiles`
2. Se falhar, tenta RPC `create_user_profile`
3. Se RPC criar perfil, atualiza `organization_id`
4. Se tudo falhar, lança erro

---

**Última atualização:** 2026-01-18  
**Status:** ✅ Implementado e pronto para testes

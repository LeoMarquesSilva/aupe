# 🐛 Debug: Erro de Build no Vercel

**Problema:** `Error: Command "npm run build" exited with 1`  
**Status:** Build inicia mas falha

---

## 🔍 Análise do Log

### O Que Está Funcionando:

- ✅ Dependências instaladas com sucesso
- ✅ `npm run build` iniciado
- ✅ Build começou: "Creating an optimized production build..."

### Problema:

- ❌ Build falha antes de completar
- ❌ Log não mostra erro específico (cortado)

---

## 🔧 Soluções Possíveis

### 1. Verificar Variáveis de Ambiente

**Verificar no Vercel Dashboard:**
- Settings → Environment Variables

**Variáveis obrigatórias:**
```
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_KEY=sua_chave_publica_aqui
```

**⚠️ IMPORTANTE:**
- Variáveis DEVEM ter prefixo `REACT_APP_`
- Aplicar para **Production, Preview e Development**

---

### 2. Verificar Log Completo no Vercel

**Acesse:** Vercel Dashboard → Seu Projeto → Deployments → Último Deploy → Logs

**O que procurar:**
- Erros de compilação TypeScript
- Erros de módulos não encontrados
- Erros de variáveis de ambiente não definidas
- Warnings que podem estar causando falha

---

### 3. Adicionar Fallback para Variáveis

**Arquivo:** `src/services/stripeService.ts`

Se `REACT_APP_STRIPE_PUBLISHABLE_KEY` não estiver definida, o Stripe pode falhar silenciosamente.

**Solução:** Adicionar verificação melhor:

```typescript
const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';

if (!stripeKey) {
  console.warn('⚠️ REACT_APP_STRIPE_PUBLISHABLE_KEY não definida');
}

const stripePromise = loadStripe(stripeKey);
```

---

### 4. Verificar Erro de TypeScript

O build pode estar falhando por erros de TypeScript.

**Testar localmente:**

```bash
# Limpar build anterior
rm -rf build
rm -rf node_modules/.cache

# Testar build
npm run build
```

**Se houver erros TypeScript:**
- Corrigir os erros
- Ou adicionar `// @ts-ignore` temporariamente para warnings não críticos

---

### 5. Aumentar Timeout do Build

**Criar arquivo `vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "create-react-app",
  "build": {
    "env": {
      "CI": "false"
    }
  }
}
```

**Ou configurar no Vercel Dashboard:**
- Settings → General → Build Command
- Deixar padrão ou adicionar: `CI=false npm run build`

---

### 6. Verificar Warnings do ESLint

Se o build falha por warnings do ESLint, adicionar no `package.json`:

```json
{
  "scripts": {
    "build": "CI=false react-scripts build"
  }
}
```

Ou criar arquivo `.eslintrc.js` na raiz:

```javascript
module.exports = {
  extends: ['react-app'],
  rules: {
    // Desabilitar regras que causam problemas
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
```

---

## 🧪 Testar Localmente

### Passo a Passo:

1. **Limpar cache:**
   ```bash
   rm -rf build
   rm -rf node_modules/.cache
   ```

2. **Testar build:**
   ```bash
   CI=false npm run build
   ```

3. **Se funcionar localmente:**
   - Verificar variáveis no Vercel
   - Fazer commit e push

4. **Se falhar localmente:**
   - Corrigir os erros mostrados
   - Testar novamente

---

## 📋 Checklist de Debugging

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Variáveis têm prefixo `REACT_APP_`
- [ ] Variáveis aplicadas para Production, Preview e Development
- [ ] Build funciona localmente com `CI=false npm run build`
- [ ] Não há erros TypeScript críticos
- [ ] Logs do Vercel verificados completamente
- [ ] `vercel.json` criado (se necessário)

---

## 🔍 Próximos Passos

### Opção 1: Verificar Log Completo

1. **Acesse:** Vercel Dashboard → Deployments → Último Deploy
2. **Clique em:** "View Function Logs" ou "View Build Logs"
3. **Procure por:** Mensagens de erro específicas

### Opção 2: Testar com Build Simplificado

Criar arquivo `vercel.json`:

```json
{
  "buildCommand": "CI=false npm run build",
  "installCommand": "npm install",
  "framework": "create-react-app"
}
```

### Opção 3: Verificar Variáveis Específicas

No código, verificar se variáveis estão sendo usadas:

```typescript
// src/services/supabaseClient.ts
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente não definidas!');
  // Isso pode fazer o build falhar
}
```

**Solução:** Tornar opcional ou adicionar fallback:

```typescript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Variáveis do Supabase não definidas (build pode continuar)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 📞 Se Nada Funcionar

### 1. Verificar Logs Completos

Copiar o log completo do Vercel (não apenas o início)

### 2. Testar Build Mínimo

Criar uma branch de teste com build mínimo para isolar o problema

### 3. Contatar Suporte

Se o problema persistir, contatar suporte do Vercel com:
- Link do projeto
- Log completo do build
- Configurações de ambiente (sem valores sensíveis)

---

**Última atualização:** 2026-01-18  
**Status:** 🐛 Aguardando log completo do Vercel

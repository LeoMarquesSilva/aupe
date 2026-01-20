# 🔍 Análise: Problema de Exclusão de Posts por Moderadores

**Data:** 2026-01-19  
**Status:** ✅ Problema Identificado | ✅ Solução Criada

---

## 📋 Problema Reportado

1. **Moderadora da organização "Agência AUPE"** não consegue excluir posts agendados
   - Ao excluir, o post desaparece temporariamente
   - Ao atualizar a página, o post volta (não foi realmente deletado)

2. **Admin consegue excluir posts de hoje**, mas ao tentar excluir posts antigos (de março):
   - O modal de confirmação aparece
   - Ao clicar em "Sim", nada acontece

---

## 🔎 Causa Raiz Identificada

### Problema Principal: Política RLS de DELETE

A política RLS `scheduled_posts_delete_policy` **não permite moderadores** deletarem posts!

**Política Atual (INCORRETA):**
```sql
USING (
    is_super_admin(auth.uid())
    OR
    (auth_user_is_admin() AND (organization_id = get_user_organization_id()))
)
```

**Problema:** Usa apenas `auth_user_is_admin()`, excluindo moderadores.

**Comparação com outras políticas:**
- ✅ **SELECT**: Usa `auth_user_is_admin_or_moderator()` ✅
- ✅ **UPDATE**: Usa `auth_user_is_admin_or_moderator()` ✅
- ❌ **DELETE**: Usa apenas `auth_user_is_admin()` ❌

---

## ✅ Solução Implementada

### 1. Migração SQL: `022_fix_scheduled_posts_delete_rls_moderator.sql`

Atualiza a política DELETE para incluir moderadores:

```sql
CREATE POLICY "scheduled_posts_delete_policy" ON scheduled_posts
FOR DELETE
TO public
USING (
    -- Super admin pode deletar qualquer post
    is_super_admin(auth.uid())
    OR
    -- Admin e moderador podem deletar posts da sua organização
    (
        auth_user_is_admin_or_moderator() 
        AND organization_id = get_user_organization_id()
    )
);
```

### 2. Melhorias no Frontend

#### `src/services/supabaseClient.ts` - `deleteScheduledPost()`
- ✅ Mensagens de erro mais detalhadas
- ✅ Verificação se o post foi realmente deletado
- ✅ Tratamento específico para erro de permissão (42501)

#### `src/pages/StoryCalendar.tsx` - `handleDelete()`
- ✅ Melhor tratamento de erros
- ✅ Mensagens de erro mais informativas
- ✅ Modal não fecha automaticamente em caso de erro

---

## 🧪 Como Verificar

### 1. Executar a Migração

```bash
# No Supabase Dashboard ou via CLI
# Executar: supabase/migrations/022_fix_scheduled_posts_delete_rls_moderator.sql
```

### 2. Verificar a Política

Execute o SQL em `VERIFICAR_DELETE_POSTS.sql` para verificar:
- Se a política foi atualizada corretamente
- Se a função `auth_user_is_admin_or_moderator()` existe e está funcionando
- Posts da organização "Agência AUPE"
- Usuários moderadores da organização

### 3. Testar

1. **Como Moderador:**
   - Tentar excluir um post agendado
   - Deve funcionar agora ✅

2. **Como Admin:**
   - Tentar excluir posts antigos (de março)
   - Deve funcionar normalmente ✅

---

## 📝 Observações

### Por que Admin conseguia deletar posts de hoje mas não antigos?

Isso pode ser um problema diferente:
1. **RLS Policy**: A política permite admins deletarem, então não deveria ser isso
2. **Frontend**: Pode ser um problema de tratamento de erro silencioso
3. **Dados**: Pode ser que o post já tenha sido deletado ou não exista mais

**Solução:** As melhorias no tratamento de erros no frontend devem ajudar a identificar o problema real se ainda persistir.

---

## 🎯 Próximos Passos

1. ✅ **Executar a migração** `022_fix_scheduled_posts_delete_rls_moderator.sql`
2. ✅ **Testar como moderador** - Deve conseguir deletar posts agora
3. ✅ **Testar como admin** - Deletar posts antigos deve funcionar
4. ⚠️ **Se ainda houver problemas**: Verificar logs do console do navegador para ver mensagens de erro detalhadas

---

## 📚 Arquivos Modificados

- ✅ `supabase/migrations/022_fix_scheduled_posts_delete_rls_moderator.sql` (NOVO)
- ✅ `src/services/supabaseClient.ts` (MELHORADO)
- ✅ `src/pages/StoryCalendar.tsx` (MELHORADO)
- ✅ `VERIFICAR_DELETE_POSTS.sql` (NOVO - para diagnóstico)

---

**Status Final:** ✅ Solução implementada e pronta para teste

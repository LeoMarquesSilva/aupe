-- ============================================
-- MIGRAÇÃO: Corrigir RLS DELETE para scheduled_posts
-- Permitir moderadores deletarem posts da sua organização
-- ============================================
-- Data: 2026-01-19
-- Problema: Moderadores não conseguiam deletar posts agendados
-- Solução: Atualizar política DELETE para incluir auth_user_is_admin_or_moderator()
-- ============================================

-- 1. REMOVER POLÍTICA ANTIGA
-- ============================================

DROP POLICY IF EXISTS "scheduled_posts_delete_policy" ON scheduled_posts;

-- 2. CRIAR NOVA POLÍTICA DELETE (INCLUINDO MODERADORES)
-- ============================================

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

-- 3. COMENTÁRIO SOBRE A POLÍTICA
-- ============================================

COMMENT ON POLICY "scheduled_posts_delete_policy" ON scheduled_posts IS 
'Permite deletar: super_admin deleta qualquer post, admin/moderador deleta apenas posts da sua organização';

-- 4. VERIFICAÇÃO
-- ============================================
-- Verificar se a política foi criada corretamente:
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual
-- FROM pg_policies 
-- WHERE tablename = 'scheduled_posts' 
--     AND policyname = 'scheduled_posts_delete_policy';

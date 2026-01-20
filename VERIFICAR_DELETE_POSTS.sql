-- ============================================
-- VERIFICAÇÃO: Problema de exclusão de posts
-- ============================================
-- Verificar se moderadores podem deletar posts
-- ============================================

-- 1. VERIFICAR POLÍTICA DELETE ATUAL
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS condicao_using,
    with_check
FROM pg_policies 
WHERE tablename = 'scheduled_posts' 
    AND policyname = 'scheduled_posts_delete_policy';

-- 2. VERIFICAR FUNÇÃO auth_user_is_admin_or_moderator
-- ============================================
SELECT 
    p.proname AS nome_funcao,
    pg_get_functiondef(p.oid) AS definicao_completa
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'auth_user_is_admin_or_moderator';

-- 3. VERIFICAR SE FUNÇÃO TEM SECURITY DEFINER
-- ============================================
SELECT 
    p.proname AS nome_funcao,
    CASE 
        WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ SEM SECURITY DEFINER'
    END AS status_security_definer,
    p.prosecdef AS tem_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'auth_user_is_admin_or_moderator';

-- 4. VERIFICAR POSTS DA ORGANIZAÇÃO "Agência AUPE"
-- ============================================
SELECT 
    sp.id,
    sp.caption,
    sp.scheduled_date,
    sp.status,
    sp.organization_id,
    o.name AS organizacao_nome,
    c.name AS cliente_nome
FROM scheduled_posts sp
JOIN organizations o ON sp.organization_id = o.id
LEFT JOIN clients c ON sp.client_id = c.id
WHERE o.name = 'Agência AUPE'
ORDER BY sp.scheduled_date DESC
LIMIT 10;

-- 5. VERIFICAR USUÁRIO MODERADOR DA ORGANIZAÇÃO
-- ============================================
SELECT 
    p.id AS user_id,
    p.email,
    p.role,
    p.organization_id,
    o.name AS organizacao_nome
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'Agência AUPE'
    AND p.role = 'moderator';

-- 6. TESTAR SE MODERADOR CONSEGUE VER OS POSTS
-- ============================================
-- (Execute como o usuário moderador logado)
-- SELECT 
--     id,
--     caption,
--     scheduled_date,
--     status,
--     organization_id
-- FROM scheduled_posts
-- WHERE organization_id = (
--     SELECT organization_id 
--     FROM profiles 
--     WHERE id = auth.uid()
-- )
-- ORDER BY scheduled_date DESC
-- LIMIT 5;

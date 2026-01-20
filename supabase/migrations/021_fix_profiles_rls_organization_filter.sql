-- ============================================
-- CORREÇÃO: Filtro por organization_id nas políticas RLS de profiles
-- ============================================
-- PROBLEMA IDENTIFICADO:
-- As políticas RLS de profiles permitiam que admins/moderadores
-- vissem/editem/deletem profiles de OUTRAS organizações
-- ============================================

-- 1. CORRIGIR POLÍTICA SELECT - Adicionar filtro por organization_id
-- ============================================

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
FOR SELECT
TO public
USING (
    -- Pode ver seu próprio profile
    auth.uid() = id
    OR 
    -- Super admin pode ver todos
    is_super_admin(auth.uid())
    OR 
    -- Admin/moderador pode ver apenas profiles da sua organização
    (
        auth_user_is_admin_or_moderator() 
        AND organization_id = get_user_organization_id()
    )
    OR
    -- Usuário comum pode ver profiles da sua organização
    (
        organization_id = get_user_organization_id()
    )
);

-- 2. CORRIGIR POLÍTICA UPDATE - Adicionar filtro por organization_id
-- ============================================

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;

CREATE POLICY "profiles_update_own_or_admin" ON profiles
FOR UPDATE
TO public
USING (
    -- Pode editar seu próprio profile
    auth.uid() = id
    OR 
    -- Super admin pode editar todos
    is_super_admin(auth.uid())
    OR 
    -- Admin pode editar apenas profiles da sua organização
    (
        auth_user_is_admin() 
        AND organization_id = get_user_organization_id()
    )
)
WITH CHECK (
    -- Pode editar seu próprio profile
    auth.uid() = id
    OR 
    -- Super admin pode editar todos
    is_super_admin(auth.uid())
    OR 
    -- Admin pode editar apenas profiles da sua organização
    (
        auth_user_is_admin() 
        AND organization_id = get_user_organization_id()
    )
);

-- 3. CORRIGIR POLÍTICA DELETE - Adicionar filtro por organization_id
-- ============================================

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON profiles;

CREATE POLICY "profiles_delete_admin_only" ON profiles
FOR DELETE
TO public
USING (
    -- Super admin pode deletar qualquer profile (exceto ele mesmo)
    (
        is_super_admin(auth.uid())
        AND auth.uid() <> id
    )
    OR
    -- Admin pode deletar apenas profiles da sua organização (exceto ele mesmo)
    (
        auth_user_is_admin() 
        AND auth.uid() <> id
        AND organization_id = get_user_organization_id()
    )
);

-- 4. COMENTÁRIOS SOBRE AS POLÍTICAS
-- ============================================

COMMENT ON POLICY "profiles_select_all" ON profiles IS 
'Permite visualizar: próprio profile, super_admin vê todos, admin/moderador vê apenas da sua organização';

COMMENT ON POLICY "profiles_update_own_or_admin" ON profiles IS 
'Permite editar: próprio profile, super_admin edita todos, admin edita apenas da sua organização';

COMMENT ON POLICY "profiles_delete_admin_only" ON profiles IS 
'Permite deletar: super_admin deleta qualquer (exceto ele mesmo), admin deleta apenas da sua organização (exceto ele mesmo)';

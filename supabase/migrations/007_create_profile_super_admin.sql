-- =====================================================
-- SCRIPT: Criar Profile para Super Admin
-- INSYT - Instagram Scheduler
-- Data: 2026-01-18
-- =====================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- - Usuário existe em auth.users ✅
-- - Profile NÃO existe em profiles ❌
-- 
-- Este script cria o profile com role super_admin
-- 
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR PROFILE PARA O SUPER ADMIN
-- =====================================================

-- Buscar ID do usuário em auth.users
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_profile_exists BOOLEAN;
BEGIN
    -- Buscar ID do usuário
    SELECT id, email INTO v_user_id, v_email
    FROM auth.users
    WHERE email = 'marx.projetos@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado em auth.users!';
    END IF;
    
    RAISE NOTICE 'Usuário encontrado:';
    RAISE NOTICE '   ID: %', v_user_id;
    RAISE NOTICE '   Email: %', v_email;
    
    -- Verificar se profile já existe
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) INTO v_profile_exists;
    
    IF v_profile_exists THEN
        -- Atualizar role para super_admin
        UPDATE profiles
        SET 
            role = 'super_admin',
            email = v_email,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Profile existente atualizado para super_admin';
    ELSE
        -- Criar novo profile com role super_admin
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            v_user_id,
            v_email,
            'Super Administrator',
            'super_admin',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Novo profile criado com role super_admin';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Perfil criado/atualizado com sucesso!';
    RAISE NOTICE '   ID: %', v_user_id;
    RAISE NOTICE '   Email: %', v_email;
    RAISE NOTICE '   Role: super_admin';
    
END $$;

COMMIT;

-- =====================================================
-- 2. VERIFICAR SE FOI CRIADO CORRETAMENTE
-- =====================================================

SELECT 
    'VERIFICAÇÃO FINAL' AS tipo,
    p.id,
    p.email,
    p.full_name,
    p.role,
    CASE 
        WHEN p.role = 'super_admin' THEN '✅ Super Admin'
        ELSE '❌ Role incorreta: ' || p.role
    END AS role_status,
    p.organization_id,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.email = 'marx.projetos@gmail.com';

-- =====================================================
-- 3. VERIFICAÇÃO COMPLETA (auth.users + profiles)
-- =====================================================

SELECT 
    'VERIFICAÇÃO COMPLETA' AS verificacao,
    au.id AS auth_user_id,
    au.email AS auth_email,
    CASE 
        WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
        THEN '✅' 
        ELSE '❌' 
    END AS senha_status,
    p.id AS profile_id,
    p.role AS profile_role,
    CASE 
        WHEN p.role = 'super_admin' THEN '✅' 
        ELSE '❌' 
    END AS role_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'marx.projetos@gmail.com';

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================
-- 
-- Após executar este script:
-- 1. O profile será criado/atualizado com role super_admin
-- 2. Faça login em: /super-admin/login
-- 3. Email: marx.projetos@gmail.com
-- 4. Senha: A senha que você definiu
-- 
-- Se ainda não funcionar:
-- - Execute o script 002_add_super_admin_rls.sql (atualizar RLS)
-- - Verifique se a senha está correta (use reset via email)
-- 
-- =====================================================

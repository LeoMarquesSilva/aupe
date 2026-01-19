-- =====================================================
-- SCRIPT: Criar Usuário Super Admin
-- INSYT - Instagram Scheduler
-- Data: 2026-01-18
-- =====================================================
-- 
-- INSTRUÇÕES:
-- 1. Substitua 'seu-email@exemplo.com' pelo email do Super Admin
-- 2. Execute este script no Supabase SQL Editor
-- 3. Um email de confirmação será enviado
-- 4. O usuário precisa confirmar o email e definir senha
-- 
-- ALTERNATIVA: Se o usuário já existe, use o script abaixo
-- para apenas atualizar a role para 'super_admin'
-- 
-- =====================================================

-- =====================================================
-- OPÇÃO 1: Criar Novo Usuário Super Admin
-- =====================================================
-- 
-- DESCOMENTE as linhas abaixo e substitua os valores:
-- 
-- INSERT INTO auth.users (
--     instance_id,
--     id,
--     aud,
--     role,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     confirmation_sent_at,
--     recovery_sent_at,
--     last_sign_in_at,
--     raw_app_meta_data,
--     raw_user_meta_data,
--     created_at,
--     updated_at,
--     confirmation_token,
--     email_change,
--     email_change_token_new,
--     recovery_token
-- )
-- VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(),
--     'authenticated',
--     'authenticated',
--     'seu-email@exemplo.com',  -- ⚠️ SUBSTITUA AQUI
--     crypt('senha-temporaria', gen_salt('bf')),  -- ⚠️ SUBSTITUA AQUI (será alterada no primeiro login)
--     NOW(),
--     NOW(),
--     NOW(),
--     NOW(),
--     '{"provider":"email","providers":["email"]}',
--     '{}',
--     NOW(),
--     NOW(),
--     '',
--     '',
--     '',
--     ''
-- )
-- ON CONFLICT (email) DO NOTHING
-- RETURNING id;
-- 
-- -- Criar profile com role super_admin
-- INSERT INTO profiles (id, email, full_name, role)
-- SELECT id, email, 'Super Administrator', 'super_admin'
-- FROM auth.users
-- WHERE email = 'seu-email@exemplo.com'  -- ⚠️ SUBSTITUA AQUI
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- =====================================================
-- OPÇÃO 2: Atualizar Usuário Existente para Super Admin
-- =====================================================
-- 
-- ⚠️ SUBSTITUA 'seu-email@exemplo.com' pelo email do usuário
-- 

BEGIN;

-- Atualizar role para super_admin (usuário já existe)
UPDATE profiles 
SET 
    role = 'super_admin',
    updated_at = NOW()
WHERE email = 'marx.projetos@gmail.com';  -- ⚠️ SUBSTITUA AQUI

-- Verificar se foi atualizado
DO $$
DECLARE
    v_updated INTEGER;
    v_user_id UUID;
    v_email TEXT;
BEGIN
    SELECT id, email INTO v_user_id, v_email
    FROM profiles
    WHERE email = 'marx.projetos@gmail.com';  -- ⚠️ SUBSTITUA AQUI
    
    IF v_user_id IS NULL THEN
        RAISE WARNING 'Usuário não encontrado! Verifique se o email está correto.';
    ELSE
        RAISE NOTICE '✅ Usuário atualizado com sucesso!';
        RAISE NOTICE '   ID: %', v_user_id;
        RAISE NOTICE '   Email: %', v_email;
        RAISE NOTICE '   Role: super_admin';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Ver todos os super admins
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM profiles
WHERE role = 'super_admin';

-- =====================================================
-- INSTRUÇÕES APÓS CRIAR SUPER ADMIN
-- =====================================================
-- 
-- 1. Faça login no sistema em: /super-admin/login
-- 2. Use o email e senha do usuário criado/atualizado
-- 3. Se não lembrar a senha, use "Reset Password" no login
-- 
-- =====================================================

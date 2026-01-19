-- Vincular Super Admin (marx.projetos@gmail.com) a uma Organização
-- INSYT - Instagram Scheduler
-- Data: 2026-01-18

-- Verificar usuário atual
SELECT 
    u.id,
    u.email,
    p.organization_id,
    p.role,
    o.name AS organizacao_atual
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'marx.projetos@gmail.com';

-- Opção 1: Vincular à "Agência AUPE" (organization existente)
UPDATE profiles
SET organization_id = (
    SELECT id FROM organizations WHERE name = 'Agência AUPE' LIMIT 1
)
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'marx.projetos@gmail.com'
)
AND organization_id IS NULL;

-- Opção 2: Vincular à "ORGANIZAÇÃO TESTE" (se preferir)
-- UPDATE profiles
-- SET organization_id = '26d7c42d-05e3-483b-b273-0de832007d09'
-- WHERE id IN (
--     SELECT id FROM auth.users WHERE email = 'marx.projetos@gmail.com'
-- )
-- AND organization_id IS NULL;

-- Verificar resultado
SELECT 
    u.email,
    p.organization_id,
    p.role,
    o.name AS organizacao
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'marx.projetos@gmail.com';

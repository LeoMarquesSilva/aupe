-- Pós-divisão AUPE (2026-03-29): após criar usuários no Supabase Auth (invite ou sign-up),
-- associe cada e-mail à organização correta. Substitua os placeholders antes de executar.
--
-- IDs fixos no projeto (produção):
--   Agência Ordem Digital  = 6ecd2416-39fe-4758-b231-885f6217be18
--   3C Comunicação         = 868a02ba-c682-4d02-aee3-e05ee6d8a12c
--
-- Rode no SQL Editor com permissões que consigam atualizar public.profiles (ex.: service role).

-- UPDATE public.profiles
-- SET organization_id = '6ecd2416-39fe-4758-b231-885f6217be18',
--     role = 'admin',
--     updated_at = now()
-- WHERE email = 'admin@ordem-digital.exemplo.com';

-- UPDATE public.profiles
-- SET organization_id = '868a02ba-c682-4d02-aee3-e05ee6d8a12c',
--     role = 'admin',
--     updated_at = now()
-- WHERE email = 'admin@3c-comunicacao.exemplo.com';

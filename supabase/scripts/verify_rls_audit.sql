-- Uso: SQL Editor Supabase / psql — inspecionar RLS e políticas em public.
-- Não altera dados.

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_force
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'clients',
    'scheduled_posts',
    'approval_requests',
    'approval_request_posts',
    'internal_approval_links',
    'internal_approval_link_posts',
    'whatsapp_config',
    'client_share_links',
    'profiles'
  )
ORDER BY c.relname;

SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'clients',
    'scheduled_posts',
    'approval_requests',
    'approval_request_posts',
    'internal_approval_links',
    'internal_approval_link_posts',
    'whatsapp_config',
    'client_share_links'
  )
ORDER BY tablename, policyname;

-- NO-OP verificado contra o projeto Supabase (MCP / SQL remoto em 2026-03-29).
--
-- Motivo: `clients` e `scheduled_posts` já têm RLS ativo com políticas nomeadas:
--   clients_select_policy, clients_insert_policy, clients_update_policy, clients_delete_policy
--   scheduled_posts_select_policy, scheduled_posts_insert_policy, scheduled_posts_update_policy, scheduled_posts_delete_policy
-- usando get_user_organization_id(), is_super_admin(), auth_user_is_admin_or_moderator(), auth_user_is_admin() (DELETE em clients).
--
-- Uma segunda família de políticas PERMISSIVE (ex.: clients_org_scope_*) NÃO deve ser adicionada: em Postgres
-- políticas permissivas são combinadas com OR e poderiam alargar permissões (ex.: DELETE em clients para qualquer
-- membro da org em vez da regra atual com auth_user_is_admin()).
--
-- Para auditar o estado real, use supabase/scripts/verify_rls_audit.sql no SQL Editor.

SELECT 1;

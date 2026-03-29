# Auditoria RLS (Row Level Security)

Este documento resume o modelo de acesso no Postgres/Supabase e como validar políticas em produção.

## Princípio

O frontend só oculta UI; **a barreira real** é o Postgres. Toda leitura/escrita sensível deve passar por RLS (ou por Edge Function com service role após validação explícita).

## Tabelas e políticas versionadas no repositório

| Área | Tabelas | Migração de referência |
|------|---------|-------------------------|
| Aprovação (cliente) | `approval_requests`, `approval_request_posts` | `20260311000000_approval_p0_security.sql` |
| Aprovação interna | `internal_approval_links`, `internal_approval_link_posts` | `20260322120000_internal_approval_links.sql` |
| WhatsApp | `whatsapp_config` | `20260310000000_whatsapp_config.sql` |
| Clientes e posts | `clients`, `scheduled_posts` | Políticas `clients_*_policy` e `scheduled_posts_*_policy` no projeto; migração `20260329222636_clients_scheduled_posts_rls_verified_noop.sql` é **no-op** (aplicada no remoto via MCP) para não duplicar PERMISSIVE. |

## Tokens e links públicos

- **Links compartilhados** (`client_share_links`, tokens opacos): leitura via Edge Functions com **service role** após validar token, formato e expiração — não expor `access_token` do cliente na resposta. Ver `docs/SEGURANCA_LINKS_COMPARTILHADOS.md`.
- **approval_request** / **internal_approval** por token: mesma ideia; funções dedicadas retornam apenas campos necessários à UI pública.

## Funções auxiliares esperadas

As políticas acima assumem que existem no schema `public` (criadas fora deste repositório ou em migrações anteriores):

- `get_user_organization_id()` — retorna `organization_id` do perfil do usuário autenticado.
- `is_super_admin(uuid)` — papel super-admin.

Se uma migração falhar com “function does not exist”, crie ou importe essas funções antes de alterar políticas. A migração `20260329222636_*` não cria políticas em `clients`/`scheduled_posts` (no-op intencional).

## Verificação manual

Execute no SQL Editor do Supabase (ou `psql`) o script:

`supabase/scripts/verify_rls_audit.sql`

Confira que `clients` e `scheduled_posts` têm `rowsecurity = true` e que não restam políticas legadas **permissivas demais** (ex.: `USING (true)` para `authenticated`) que anulem o isolamento por organização.

## `v_org_id`

Tabela auxiliar com coluna `organization_id`; RLS aplicada na migração `20260329223736_v_org_id_enable_rls.sql` (políticas `v_org_id_*_policy`), alinhada a `get_user_organization_id()` e `is_super_admin`.

## Pós-deploy

Após aplicar RLS em `clients`/`scheduled_posts`, se ainda existirem políticas antigas com nomes diferentes, remova-as manualmente — políticas **PERMISSIVE** são combinadas com OR; uma política frouxa mantém vazamento.

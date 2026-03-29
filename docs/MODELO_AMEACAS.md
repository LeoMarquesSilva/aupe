# Modelo de ameaças (resumo)

## Ativos

- Contas de usuário (Supabase Auth) e perfis com `organization_id`.
- Clientes, posts agendados, tokens Meta (`access_token` em `clients`).
- Links públicos (`token` opaco) para view/approve/revisão interna.
- Segredos: `FACEBOOK_APP_SECRET`, Stripe, `SUPABASE_SERVICE_ROLE_KEY`, cron secrets.

## Atores

- Usuário autenticado (membro de organização).
- Admin / super-admin.
- Anônimo na internet (links públicos, APIs expostas).
- Fornecedores: Meta Graph, Stripe, Supabase, Vercel.

## Superfícies relevantes

| Superfície | Controles principais |
|------------|----------------------|
| Browser (SPA) | Rotas públicas vs protegidas; sem segredos no bundle (`REACT_APP_*` só o que for público). |
| Vercel (estático + `/api/facebook-oauth-token`) | HTTPS, security headers (`vercel.json`), rate limit na troca de `code`. |
| Supabase Postgres | RLS por organização; service role só no servidor/Edge após validação. |
| Edge Functions | CORS com `ALLOWED_ORIGINS`, rate limit por IP em endpoints públicos, respostas mínimas. |

## Cenários (alto nível)

1. **Token de link público vazado:** quem tem o URL age como o destinatário do link. Mitigação: expiração, entropia do token, não retornar credenciais Meta nas APIs públicas, RLS no restante.
2. **Cliente malicioso com JWT válido:** não deve ler/alterar dados de outra organização. Mitigação: RLS em `clients`, `scheduled_posts`, módulo de aprovações, etc.
3. **Abuso de troca OAuth / funções públicas:** brute force de códigos ou flood. Mitigação: rate limit (API + Edge), códigos de uso único e curta vida (Meta).
4. **Vazamento de logs:** tokens em `console` ou corpos de erro. Mitigação: logs redigidos / só em desenvolvimento; erros 500 genéricos ao cliente onde aplicável.

Este documento é complementar a `docs/RLS_AUDIT.md` e `docs/SEGURANCA_LINKS_COMPARTILHADOS.md`.

# Segurança no CI (sugestão)

O pipeline de build/review pode reforçar o que já está no código.

## GitHub (repositório `LeoMarquesSilva/aupe` — sem MCP neste workspace)

1. **Settings → Code security and analysis** (ou *Security*): confirme **Secret scanning** ativo; em contas elegíveis, ative **push protection** para bloquear pushes com segredos conhecidos.
2. Antes de merge em `master`: revisar `git diff`, ficheiros novos (`supabase/functions/`, migrações, `.env.example`) e garantir que não entram valores reais de API keys.
3. O repositório é **público**: qualquer commit com segredo fica exposto — prioridade a não versionar `.env` e a não commitar artefactos de deploy (ex.: `.args-get-standalone.json`). Se algo sensível já foi pushed no passado, rode o histórico (ex.: `git filter-repo`) e **rote** as credenciais.

## Secret scanning (CI)

- **GitHub:** habilite *push protection* e use [Gitleaks](https://github.com/gitleaks/gitleaks) ou [TruffleHog](https://github.com/trufflesecurity/trufflehog) no workflow de PR.
- **Regra:** falhar o job se aparecer padrão de `FACEBOOK_APP_SECRET`, `STRIPE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

## Vercel (após cada push)

No dashboard do projeto **aupe**, confirme que existem e estão corretas (sem expor valores no Git): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, variáveis `REACT_APP_*` necessárias ao build, URL e anon key do Supabase. Após deploy, verifique estado **READY** e, se falhar, logs de build/runtime.

## Dependências

- Dependabot ou Renovate + revisão de PRs com mudanças de `package-lock.json`.
- Opcional: `npm audit` no CI com política de severidade (ex.: falhar em *high* em `main`).

## Checklist em review humano

- Novas rotas públicas documentadas em `docs/rotas-publicas.md`.
- Novas Edge Functions: CORS (`ALLOWED_ORIGINS`), sem dados sensíveis na resposta, rate limit se for pública.
- Migrações: políticas RLS alinhadas a `organization_id` / papéis.

Nada disso substitui testes manuais do fluxo OAuth e dos links compartilhados após deploy.

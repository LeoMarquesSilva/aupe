# Rotas públicas do SPA

Inventário das rotas **sem** `ProtectedRoute`: qualquer pessoa com o URL pode abrir a página. A autorização real para dados sensíveis está no **Supabase (RLS)** e nas **Edge Functions** (token opaco, expiração).

| Rota | Finalidade | Risco se o URL vazar |
|------|------------|----------------------|
| `/landing` | Landing marketing | Baixo (conteúdo público). |
| `/login`, `/signup`, `/reset-password`, `/email-confirmation` | Auth Supabase | Médio: superfície de login (brute force mitigado pelo Supabase). |
| `/super-admin/login` | Login super-admin | Alto: alvo privilegiado; protegido por credenciais + papel no banco. |
| `/privacy-policy` | Política de privacidade | Baixo. |
| `/view/:token` | Dashboard somente leitura do cliente (link compartilhado) | Alto: vê dados do cliente expostos por essa view (sem token Meta no JSON). Ver `SEGURANCA_LINKS_COMPARTILHADOS.md`. |
| `/approve/:token` | Aprovação de posts pelo cliente | Alto: ações de aprovação/rejeição naquele pedido. |
| `/revisao-interna/:token` | Revisão interna (gestor) | Alto: conteúdo e ações de pré-aprovação. |
| `/callback`, `/api/instagram-auth/callback` | Retorno OAuth (Meta/Facebook) | Médio: troca de `code` no fluxo; não expõe sozinho dados persistidos sem o restante do fluxo. |

Rotas autenticadas (home, clientes, admin, checkout, etc.) usam `ProtectedRoute` / `AdminPageLayout` / `SuperAdminPageLayout`; o papel efetivo vem do perfil no Supabase, não só do estado local.

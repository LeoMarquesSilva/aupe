# Borda Vercel: WAF e rate limiting

## WAF (Web Application Firewall)

No **dashboard da Vercel**, verifique o plano do time e do projeto:

- Recursos como **Firewall**, listas de IP e regras gerenciadas variam por plano e produto.
- Se disponível, ative proteções para o domínio de produção e revise regras que possam bloquear callbacks OAuth legítimos (normalmente GET/POST para URLs fixas do app).

## Rate limiting na plataforma

Além do rate limit **aplicado no código** (`/api/facebook-oauth-token` e Edge Functions públicas), a Vercel pode oferecer limitação na borda conforme o produto contratado. Use isso como camada extra contra abuso em escala.

## O que já está no repositório

- Headers de segurança em `vercel.json` para o build estático.
- Rate limit em memória na função de troca de token Facebook e nas funções Supabase indicadas no plano de segurança.

**Ação operacional:** após cada mudança de domínio ou preview, valide no painel Vercel se firewall/WAF e limites estão ativos onde o plano permitir.

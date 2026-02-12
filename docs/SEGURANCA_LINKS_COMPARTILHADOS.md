# Segurança dos links de compartilhamento

Este documento descreve o modelo de segurança dos **links temporários** que permitem ao cliente visualizar o dashboard do Instagram sem login.

## Modelo de segurança

- **Quem pode criar/revogar links:** apenas usuários autenticados da **mesma organização** do cliente (RLS na tabela `client_share_links`).
- **Quem pode ver o relatório:** qualquer pessoa que possua o **link** (token na URL). Não há login; o link funciona como “senha de uso único” (na prática, de uso múltiplo até expirar ou ser revogado).
- **O que é exposto:** apenas dados já em cache do Instagram (perfil público, métricas, posts) e dados básicos do cliente (nome, @, logo). **Nunca** são retornados `access_token`, tokens do Instagram ou credenciais.

## O que já está protegido

| Aspecto | Implementação |
|--------|----------------|
| **Token** | Gerado com `crypto.randomUUID()` + bytes aleatórios (~48 caracteres, alta entropia). Impossível adivinhar por sorte. |
| **Banco** | RLS: anônimos **não** têm permissão em `client_share_links`. Apenas a Edge Function (service role) valida o token e lê os dados. |
| **Resposta da API** | Cliente retorna só `id`, `name`, `instagram`, `logo_url`. Nenhum campo de autenticação. |
| **Validação do token** | Formato restrito (tamanho e caracteres alfanuméricos). Resposta **sempre igual** (404 + “Link inválido ou expirado”) para token ausente, inválido ou expirado, para não vazar se o token existe ou não. |
| **Expiração** | Checada no banco (`.gt('expires_at', now)`). Links expirados não retornam dados. |

## Riscos aceitos e boas práticas

1. **Link = segredo**  
   Quem tiver o link pode ver o relatório até expirar ou ser revogado. O link pode vazar por:
   - histórico do navegador,
   - referrer ao clicar em outros sites,
   - logs de servidor (ex.: proxy, CDN) que registrem URL.  
   **Recomendação:** orientar o cliente a tratar o link como confidencial e não repassar. Para dados mais sensíveis, considerar senha opcional no link no futuro.

2. **CORS**  
   A Edge Function pode usar `Access-Control-Allow-Origin: *` (padrão). Em produção, é mais seguro restringir à origem do app:
   - Configurar no Supabase a variável de ambiente `ALLOWED_ORIGINS` com a origem do front (ex.: `https://seusite.com`).
   - A função já usa `ALLOWED_ORIGINS` quando definida; caso contrário, usa `*`.

3. **Rate limiting**  
   Não há rate limiting na função. Em teoria, um atacante poderia tentar muitos tokens; na prática, o espaço de tokens é grande o suficiente para tornar tentativas de adivinhação inviáveis.  
   **Recomendação:** para ambientes de alto tráfego ou compliance mais rígido, adicionar limite de requisições por IP (ex.: no API Gateway, Cloudflare ou outro proxy na frente do Supabase).

4. **XSS**  
   O frontend usa React, que escapa conteúdo por padrão. Legendas e textos vindos do Instagram são exibidos como texto, não como HTML. Evitar `dangerouslySetInnerHTML` com dados do relatório.

## Resumo

- **Segurança atual:** adequada para “link temporário = acesso somente leitura ao relatório”, sem expor credenciais e com token imprevisível e expiração/revogação.
- **Melhorias opcionais:** restringir CORS (`ALLOWED_ORIGINS`), rate limiting na borda e, se necessário no futuro, proteção extra (ex.: senha opcional no link).

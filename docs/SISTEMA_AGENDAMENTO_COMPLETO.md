# Sistema de Agendamento Instagram - Documentação Completa

> Documento de referência do fluxo Supabase + N8N para publicação no Instagram.  
> Atualizado em: Fevereiro 2026

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Supabase      │     │      N8N        │
│   (React)       │────▶│  scheduled_posts │────▶│   Webhook       │
└─────────────────┘     │  + Triggers      │     │   aupe-agendador│
                        │  + pg_cron       │     └────────┬────────┘
                        └──────────────────┘              │
                                                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  scheduled_posts │◀────│ Instagram Graph │
                        │  (status update) │     │     API         │
                        └──────────────────┘     └─────────────────┘
```

---

## 2. Supabase - Disparadores

### 2.1 Triggers na tabela `scheduled_posts`

| Trigger | Momento | Operações | Função |
|---------|---------|-----------|--------|
| `check_scheduled_post_limits_trigger` | BEFORE | INSERT | Valida limite do plano |
| `intelligent_scheduled_post_webhook` | AFTER | INSERT, UPDATE, DELETE | Envia webhook para N8N |
| `update_subscription_usage_posts` | AFTER | INSERT, UPDATE, DELETE | Atualiza uso de subscription |

### 2.2 Função `handle_scheduled_post_webhook`

**INSERT:**
- Condição: `NEW.immediate = true`
- Payload: `type: 'INSERT'`, `record` com `client_data` (access_token, instagram_account_id, etc.)
- **OAuth Instagram (Business Login):** o contrato do N8N não muda — continuam `access_token` e `instagram_account_id` na tabela `clients` / `client_data` (token long-lived IG User em vez de Page token, quando a conexão usa o fluxo `www.instagram.com/oauth/authorize`).

**UPDATE:**
- Condição: `OLD.status != NEW.status` E `NEW.status IN ('sent_to_n8n', 'posted', 'failed')`
- Payload: `type: 'UPDATE'`, `record` + `old_record` com `client_data`

**DELETE:**
- Sempre envia (N8N ignora via filtro)

**URL:** `https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador`

### 2.3 Função `process_scheduled_posts_by_time` (pg_cron)

- **Schedule:** `* * * * *` (a cada minuto)
- **Job:** `instagram-posts-scheduler`

**Lógica:**
1. Busca até 10 posts com: `status='pending'`, `scheduled_date <= NOW()`, `immediate=false`, janela de 24h, cliente com credenciais
2. Para cada: `UPDATE status='sent_to_n8n'`, `n8n_job_id`, `last_retry_at`
3. Envia webhook com `type: 'TIME_TRIGGER'`, `record` completo incluindo `client_data`
4. Se `net.http_post` falhar: reverte para `status='pending'`, incrementa `retry_count`

---

## 3. N8N - Workflow Completo

### 3.1 Fluxo Principal (por nó)

| Ordem | Nó | Tipo | Função |
|-------|-----|------|--------|
| 1 | Webhook1 | Webhook | Recebe POST em `/webhook/aupe-agendador` |
| 2 | Filtrar TIME_TRIGGER | Code | Filtra eventos válidos (ver seção 3.2) |
| 3 | Extrair Dados | Code | Normaliza payload, parse de images, detecta post_type |
| 4 | Dados do Cliente | Supabase | Busca `clients` por `client_id` (se needClientData) |
| 5 | Combinar Dados | Set | Junta post + cliente → postId, postType, caption, images, video_url, cover_image_url, access_token, instagram_account_id |
| 6 | Switch | Switch | Roteia por postType: post | carousel | reels | stories |

### 3.2 Filtro de Eventos (Filtrar TIME_TRIGGER)

| Tipo | Condição para processar |
|------|-------------------------|
| **TIME_TRIGGER** | Sem `instagram_post_id`, status `pending` ou `sent_to_n8n` |
| **INSERT** | `immediate=true` e `status=pending` |
| **UPDATE** | `immediate: false→true`, status `pending` ou `sent_to_n8n`, sem `instagram_post_id` |

Outros eventos retornam `[]` (ignorados).

### 3.3 Estrutura de Dados Extraídos

```javascript
{
  postId, post_type, media_type, caption,
  video_url, cover_image_url, images[],  // URLs de mídia
  access_token, instagram_account_id, instagram_username, client_name,
  n8n_job_id, scheduled_date, client_id, user_id, status, immediate,
  share_to_feed, retry_count, instagram_post_id,
  needClientData, eventType
}
```

- `post_type`: `post` | `carousel` | `reels` | `stories`
- `images`: array de URLs (parse de JSON/string quando necessário)

---

## 4. Fluxos por Tipo de Post

### 4.1 Post Único (`post`)

```
Criar Mídia Única (POST /media, image_url, caption)
  → Verificar Status do Container de Post Único
  → If ready_to_publish?
       → Sim: Publicar Único (POST /media_publish)
       → Não: Wait 10s → loop Verificar Status
  → Atualizar Status Supabase (status=published, instagram_post_id)
  → Em erro: Error Handler → Atualizar Status Supabase1 (status=failed)
```

**API Instagram:**
- Criar: `POST /{ig-user-id}/media` com `image_url`, `caption`, `access_token`
- Publicar: `POST /{ig-user-id}/media_publish` com `creation_id`, `access_token`

### 4.2 Carrossel (`carousel`)

```
Split Images (uma por item)
  → Wait2 (10s)
  → Criar Item Carrossel (POST /media por imagem, is_carousel_item=true)
  → Aggregate (junta todos os IDs)
  → Format IDs (mediaIds: "id1,id2,id3")
  → Criar Carrossel (POST /media, media_type=CAROUSEL, children=mediaIds)
  → Verificar Status do Container de Post Carrossel
  → If ready_to_publish?
       → Sim: Publicar Carrossel
       → Não: Wait4 10s → loop Verificar Status
  → Atualizar Status Supabase
```

### 4.3 Reels (`reels`)

```
Code in JavaScript1 (Criar container REELS):
  - Valida: video_url, ig_user_id, access_token
  - HEAD na URL do vídeo: contentType, contentLength (máx 1GB)
  - POST /{ig-user-id}/media: media_type=REELS, video_url, caption
  → Wait6 (30s)
  → VALIDAÇÃO (GET /{container_id}?fields=status_code,status):
       - FINISHED → ready_to_publish=true
       - IN_PROGRESS → ready_to_publish=false
       - ERROR → throw (inclui tratamento para MOV/code 0)
       - EXPIRED → throw
  → If ready_to_publish?
       → Sim: Publicar Reel no Instagram
       → Não: Wait3 (60s) → loop VALIDAÇÃO
  → Atualizar Status Supabase
```

**Tratamento de erro MOV:** Mensagem específica sugerindo conversão para MP4 (H.264).

**Nota:** `cover_image_url` e `share_to_feed` não são enviados no container atual (possível melhoria).

#### 4.3.1 Reels – falha intermitente (error code 0)

A API do Instagram pode devolver erro genérico ("Media upload has failed with error code 0") mesmo com arquivo válido. Em parte dos casos o processamento conclui alguns minutos depois; em outros, o codec do vídeo (ex.: HEVC em .mov) está fora do que a API aceita de forma estável.

- **Comportamento recomendado no workflow N8N:** quando o container de Reels retornar `status_code === 'ERROR'` (ou `container_status === 'error'`), não marcar o post como falha imediatamente. Inserir um **Wait** de 2–3 minutos (150–180 s), fazer **mais uma requisição** ao Instagram para checar o status do mesmo container (`GET /{container_id}?fields=status_code`). Se retornar `FINISHED`, seguir o fluxo normal de publicação; se continuar `ERROR` (ou expirado), aí sim ir para Error Handler e atualizar Supabase como `failed`.
- **Implementação no N8N:** no ramo Reels, entre o nó que verifica o status do container (ex.: VALIDAÇÃO / Switch1) e o "Stop and Error" / Atualizar Status Supabase1 (failed), adicionar: **Switch** (saída quando `container_status === 'error'`) → **Wait** (180 segundos) → **HTTP Request** ou **Code** para `GET https://graph.facebook.com/v22.0/{container_id}?fields=status_code&access_token={access_token}` → **Switch** (se `status_code === 'FINISHED'` → Publicar Reel no Instagram; senão → Error Handler). Passo a passo com nomes exatos dos nós: [N8N_REELS_ERROR_RETRY_IMPLEMENTACAO.md](N8N_REELS_ERROR_RETRY_IMPLEMENTACAO.md) (workflow obtido via MCP).
- **Falha persistente:** se após essa nova tentativa o status continuar ERROR, recomenda-se orientar o usuário a reconverter o vídeo para MP4 (H.264 + AAC) e reagendar o post.

### 4.4 Stories (`stories`)

```
Criar Story (POST /media, media_type=STORIES, image_url)
  → Verificar Status do Container de Stories
  → If ready_to_publish?
       → Sim: Publicar Story
       → Não: Wait5 10s → loop Verificar Status
  → Atualizar Status Supabase
```

---

## 5. Status do Container (Instagram API)

| status_code | Significado | Ação |
|-------------|-------------|------|
| FINISHED | Pronto para publicar | Chamar media_publish |
| IN_PROGRESS | Processando | Esperar e verificar de novo |
| ERROR | Falha no processamento | Falhar (não retentar sem correção) |
| EXPIRED | Container expirou (24h) | Criar novo container |
| PUBLISHED | Já publicado | Não publicar de novo |

---

## 6. Tratamento de Erros

### 6.1 Error Handler (dentro do workflow)

- Recebe falha de: Publicar Único, Publicar Carrossel, Publicar Story, Publicar Reel
- Extrai: `postId`, `error_message`
- Atualiza Supabase: `status=failed`, `error_message`, limpa `instagram_post_id` se aplicável

### 6.2 Error Trigger (workflow global)

- Dispara quando qualquer execução do workflow falha
- Fluxo: Error Trigger → Buscar Dados da Execução (API N8N com X-N8N-API-KEY)
- Formatar Texto: extrai cliente (Dados do Cliente), último nó, tipo de post, mensagem de erro
- Enviar mensagem de erro: Evolution API → WhatsApp (grupo AUPE)

**Mensagem enviada:**
```
🚨 FALHA NO AGENDADOR 🚨
👤 Cliente: [nome]
📅 Data: [Brasília]
🏷️ Tipo: [Reels/Carrossel/Story/Imagem]
📍 Parou em: [nome do nó]
❌ Motivo: [descrição do erro]
```

---

## 7. Atualização no Supabase (sucesso)

Campos atualizados em `scheduled_posts`:
- `status` = `'published'`
- `instagram_post_id` = ID retornado pelo media_publish
- `posted_at` = now()
- `error_message` = null (limpo)

---

## 8. Observações Técnicas

### 8.1 Webhook do N8N

- O webhook do Supabase envia o body em `item.json.body`
- Para TIME_TRIGGER: `item.json.body.record` já contém `client_data`
- Para INSERT/UPDATE: `Dados do Cliente` busca no Supabase pois `client_data` pode não vir no record

### 8.2 Switch e postType

- O Switch usa `$json.postType` (camelCase)
- Combinar Dados define: `postType: $('Extrair Dados').item.json.post_type`

### 8.3 Waits e Webhooks

- Waits usam webhooks do N8N (execução assíncrona)
- Reels: Wait6 (30s) + Wait3 (60s) em loop
- Post/Carrossel/Story: Wait 10s em loop

### 8.4 Timeout e Reels

- Reels podem levar 2–5+ minutos para processar
- Loops sem limite máximo de tentativas (risco de execução longa)

---

## 9. Credenciais e Integrações

| Serviço | Uso |
|---------|-----|
| Supabase | Dados do Cliente, Atualizar Status |
| Instagram Graph API v22.0 | Criar containers, verificar status, publicar |
| Evolution API | Envio de erro para WhatsApp |

---

## 10. JSON do Workflow N8N

O export completo do workflow está disponível para referência e eventual migração. Contém:
- IDs dos nós
- Código JavaScript dos nós Code
- Parâmetros de HTTP Request
- Conexões entre nós
- Error Trigger separado do fluxo principal

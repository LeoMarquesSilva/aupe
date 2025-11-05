# 📋 **Documentação do Sistema de Agendamento - Integração N8N**

## 🎯 **Visão Geral**

O sistema de agendamento do Instagram funciona através de uma integração entre **Supabase** (PostgreSQL) e **N8N**, utilizando webhooks para comunicação em tempo real e processamento automático de posts agendados.

---

## 🏗️ **Arquitetura do Sistema**

### **1. Banco de Dados (Supabase)**
- **Tabela:** `scheduled_posts`
- **Triggers:** Automáticos para INSERT/UPDATE
- **Cron Job:** Executa a cada minuto para processar posts na hora agendada
- **Timezone:** UTC (convertido para Brasília no processamento)

### **2. N8N Webhook**
- **URL:** `https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador`
- **Método:** POST
- **Content-Type:** application/json

### **3. Fluxo de Dados**
```
Frontend → Supabase → Webhook → N8N → Instagram API
```

---

## 📊 **Estrutura da Tabela `scheduled_posts`**

```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  user_id UUID NOT NULL,
  caption TEXT NOT NULL,
  images JSONB NOT NULL, -- Array de URLs das imagens
  scheduled_date TIMESTAMPTZ NOT NULL,
  post_type TEXT NOT NULL, -- 'post', 'carousel', 'reels', 'stories'
  immediate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent_to_n8n', 'processing', 'posted', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  instagram_post_id TEXT,
  n8n_job_id TEXT,
  n8n_response JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ
);
```

---

## 🔄 **Tipos de Webhooks Enviados**

### **1. INSERT (Criação de Post)**
Disparado automaticamente quando um post é criado.

```json
{
  "type": "INSERT",
  "table": "scheduled_posts",
  "record": {
    "id": "uuid",
    "client_id": "uuid",
    "caption": "Texto do post",
    "images": ["url1", "url2"],
    "scheduled_date": "2025-11-05T12:57:31.519132+00:00",
    "post_type": "post", // 'post', 'carousel', 'reels', 'stories'
    "immediate": false,
    "status": "pending",
    "user_id": "uuid"
  },
  "old_record": null
}
```

### **2. UPDATE (Mudança de Status)**
Disparado quando o status do post muda.

```json
{
  "type": "UPDATE",
  "table": "scheduled_posts",
  "record": {
    "id": "uuid",
    "status": "sent_to_n8n", // Status atualizado
    "n8n_job_id": "cron_1762347480",
    "last_retry_at": "2025-11-05T12:58:00.014897+00:00"
    // ... outros campos
  },
  "old_record": {
    "status": "pending" // Status anterior
    // ... outros campos
  }
}
```

### **3. TIME_TRIGGER (Processamento por Tempo) ⭐**
**Este é o webhook principal que o N8N deve processar!**

```json
{
  "type": "TIME_TRIGGER",
  "table": "scheduled_posts",
  "record": {
    "id": "uuid",
    "client_id": "uuid",
    "caption": "Texto do post",
    "images": ["url1", "url2"],
    "scheduled_date": "2025-11-05T12:57:31.519132+00:00",
    "scheduled_date_brasilia": "2025-11-05T09:57:31.519132",
    "post_type": "post", // Tipos disponíveis abaixo
    "immediate": true,
    "status": "sent_to_n8n",
    "created_at": "2025-11-05T12:56:31.519132+00:00",
    "user_id": "uuid",
    "n8n_job_id": "cron_1762347480",
    "client_data": {
      "name": "marxprojetos",
      "instagram": "marxprojetos",
      "access_token": "EAAPc2zd7oAc...",
      "instagram_account_id": "17841459848635231"
    }
  },
  "source": "time_based_trigger_brasilia",
  "old_record": null,
  "triggered_by": "pg_cron_brasilia",
  "triggered_at": "2025-11-05T12:58:00.014897+00:00",
  "triggered_at_brasilia": "2025-11-05T09:58:00.014897+00:00"
}
```

---

## 📱 **Tipos de Posts Suportados**

### **1. Post Simples (`post_type: "post"`)**
- **Imagens:** 1 imagem
- **Instagram API:** Single image post
- **Exemplo:**
```json
{
  "post_type": "post",
  "images": ["https://i.ibb.co/image1.jpg"]
}
```

### **2. Carrossel (`post_type: "carousel"`)**
- **Imagens:** 2-10 imagens
- **Instagram API:** Carousel album
- **Exemplo:**
```json
{
  "post_type": "carousel",
  "images": [
    "https://i.ibb.co/image1.jpg",
    "https://i.ibb.co/image2.jpg",
    "https://i.ibb.co/image3.jpg"
  ]
}
```

### **3. Reels (`post_type: "reels"`)**
- **Imagens:** 1 vídeo (URL)
- **Instagram API:** Reels video
- **Exemplo:**
```json
{
  "post_type": "reels",
  "images": ["https://i.ibb.co/video1.mp4"]
}
```

### **4. Stories (`post_type: "stories"`)**
- **Imagens:** 1+ imagens/vídeos
- **Instagram API:** Story
- **Exemplo:**
```json
{
  "post_type": "stories",
  "images": ["https://i.ibb.co/story1.jpg"]
}
```

---

## ⏰ **Sistema de Agendamento**

### **Funcionamento:**
1. **Cron Job** executa a cada minuto
2. Busca posts com `status = 'pending'` e `scheduled_date <= NOW()`
3. Atualiza status para `sent_to_n8n`
4. Envia webhook `TIME_TRIGGER` para N8N
5. N8N processa e posta no Instagram

### **Timezone:**
- **Banco:** UTC
- **Processamento:** Convertido para Brasília
- **Campo adicional:** `scheduled_date_brasilia` no webhook

---

## 🔧 **Configuração no N8N**

### **1. Webhook Node**
```javascript
// Filtrar apenas TIME_TRIGGER
if (webhook.body.type === 'TIME_TRIGGER') {
  return webhook.body;
}
return null;
```

### **2. Extrair Dados do Cliente**
```javascript
const record = webhook.body.record;
const clientData = record.client_data;

// Dados de autenticação Instagram
const accessToken = clientData.access_token;
const instagramAccountId = clientData.instagram_account_id;

// Dados do post
const postType = record.post_type;
const images = record.images;
const caption = record.caption;
const postId = record.id;
```

### **3. Lógica por Tipo de Post**
```javascript
switch (postType) {
  case 'post':
    // Single image post
    return {
      media_type: 'IMAGE',
      image_url: images[0],
      caption: caption
    };
    
  case 'carousel':
    // Multiple images
    return {
      media_type: 'CAROUSEL_ALBUM',
      children: images.map(url => ({
        media_type: 'IMAGE',
        image_url: url
      })),
      caption: caption
    };
    
  case 'reels':
    // Video post
    return {
      media_type: 'REELS',
      video_url: images[0],
      caption: caption
    };
    
  case 'stories':
    // Story
    return {
      media_type: 'STORY',
      image_url: images[0]
    };
}
```

---

## 📤 **Fluxo de Postagem no Instagram**

### **1. Criar Container de Mídia**
```
POST /{instagram-account-id}/media
```

### **2. Publicar Container**
```
POST /{instagram-account-id}/media_publish
```

### **3. Atualizar Status no Supabase**
Após sucesso, atualizar:
```sql
UPDATE scheduled_posts 
SET 
  status = 'posted',
  posted_at = NOW(),
  instagram_post_id = '{instagram_id}'
WHERE id = '{post_id}';
```

### **4. Em Caso de Erro**
```sql
UPDATE scheduled_posts 
SET 
  status = 'failed',
  error_message = '{error_details}',
  retry_count = retry_count + 1
WHERE id = '{post_id}';
```

---

## 🚨 **Tratamento de Erros**

### **Status Possíveis:**
- `pending` - Aguardando processamento
- `sent_to_n8n` - Enviado para N8N
- `processing` - Sendo processado
- `posted` - Publicado com sucesso
- `failed` - Falha no processamento

### **Retry Logic:**
- Máximo 3 tentativas
- Campo `retry_count` incrementado a cada falha
- Campo `last_retry_at` atualizado

---

## 📋 **Checklist de Implementação N8N**

### **✅ Webhook Configuration:**
- [ ] URL: `https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador`
- [ ] Method: POST
- [ ] Filter: `webhook.body.type === 'TIME_TRIGGER'`

### **✅ Data Extraction:**
- [ ] `record.client_data.access_token`
- [ ] `record.client_data.instagram_account_id`
- [ ] `record.post_type`
- [ ] `record.images`
- [ ] `record.caption`
- [ ] `record.id`

### **✅ Instagram API Integration:**
- [ ] Handle `post` (single image)
- [ ] Handle `carousel` (multiple images)
- [ ] Handle `reels` (video)
- [ ] Handle `stories` (story)

### **✅ Status Updates:**
- [ ] Success: Update to `posted`
- [ ] Error: Update to `failed` with error message
- [ ] Set `instagram_post_id` on success

---

## 🔍 **Exemplo Completo de Webhook TIME_TRIGGER**

```json
{
  "type": "TIME_TRIGGER",
  "table": "scheduled_posts",
  "record": {
    "id": "8ea8e4a6-b155-4676-8413-ad992b7ebdd7",
    "client_id": "6260b324-0da4-4685-98ea-6f28bc64c953",
    "user_id": "68db1ff2-fbfd-448e-a55b-0db4de51746b",
    "caption": "🚀 Post agendado automaticamente pelo sistema!",
    "images": [
      "https://i.ibb.co/image1.jpg",
      "https://i.ibb.co/image2.jpg"
    ],
    "scheduled_date": "2025-11-05T12:57:31.519132+00:00",
    "scheduled_date_brasilia": "2025-11-05T09:57:31.519132",
    "post_type": "carousel",
    "immediate": true,
    "status": "sent_to_n8n",
    "created_at": "2025-11-05T12:56:31.519132+00:00",
    "n8n_job_id": "cron_1762347480",
    "client_data": {
      "name": "marxprojetos",
      "instagram": "marxprojetos",
      "access_token": "EAAPc2zd7oAcBP7lObyvdnUv4uXLIh0HS07UFqMfOkg5xwl1t1QY2VwtZAZBAIx0mQrlgF6971A0qJAAEwpG4ZAxhB37Fc3iEKNXLMrS3Fm2nCQVCNC4rtRMQPK45GfT1nvbr6bDWfjmmeEnvD2ZBTOJfm6ZA9Qsv9KKSoA2P2CTj3X3kfg96od1Ip08rxZBxzKPJO7Qu0ZD",
      "instagram_account_id": "17841459848635231"
    }
  },
  "source": "time_based_trigger_brasilia",
  "old_record": null,
  "triggered_by": "pg_cron_brasilia",
  "triggered_at": "2025-11-05T12:58:00.014897+00:00",
  "triggered_at_brasilia": "2025-11-05T09:58:00.014897+00:00"
}
```

---

## 🎯 **Pontos Importantes**

1. **Foco no TIME_TRIGGER:** Ignore webhooks INSERT/UPDATE, processe apenas TIME_TRIGGER
2. **Dados Completos:** Todos os dados necessários estão no webhook (token, account_id, etc.)
3. **Tipos de Post:** Sistema suporta post, carousel, reels e stories
4. **Timezone:** Horários em UTC e Brasília fornecidos
5. **Status Updates:** Sempre atualizar status no Supabase após processamento
6. **Error Handling:** Capturar erros e atualizar com detalhes

---

**🚀 Sistema funcionando 100%! Pronto para integração com N8N!**
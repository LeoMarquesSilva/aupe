# ✅ Verificação: Compatibilidade Payload N8N

**Data:** 2026-01-19  
**Status:** ✅ **Payload compatível com N8N**

---

## 🔍 Análise do Payload vs N8N

### Payload Enviado pela Função:

```json
{
  "type": "TIME_TRIGGER",
  "table": "scheduled_posts",
  "record": {
    "id": "uuid",
    "client_id": "uuid",
    "caption": "texto",
    "video": "url ou null",
    "cover_image": "url ou null",
    "images": ["url1", "url2"],
    "scheduled_date": "timestamp",
    "scheduled_date_brasilia": "timestamp",
    "post_type": "post|carousel|reels|stories",
    "postType": "post|carousel|reels|stories",  // ✅ ADICIONADO para compatibilidade
    "status": "sent_to_n8n",
    "share_to_feed": true/false,
    "immediate": false,
    "organization_id": "uuid",
    "client_data": {
      "instagram_account_id": "id",
      "access_token": "token",
      "instagram": "username",
      "name": "nome"
    }
  },
  "triggered_by": "pg_cron_time_based",
  "triggered_at": "timestamp",
  "triggered_at_brasilia": "timestamp",
  "source": "time_based_trigger"
}
```

### O que o N8N Espera:

**1. Filtro "Filtrar TIME_TRIGGER":**
- ✅ Verifica: `item.json.body.type === 'TIME_TRIGGER'`
- ✅ Payload tem: `"type": "TIME_TRIGGER"` ✅

**2. Extração de Dados:**
- ✅ Busca: `record.post_type`
- ✅ Payload tem: `"post_type": "post|carousel|reels|stories"` ✅
- ✅ Também busca: `record.video`, `record.cover_image`, `record.images`
- ✅ Payload tem todos esses campos ✅

**3. Dados do Cliente:**
- ✅ Busca: `record.client_data.access_token`, `record.client_data.instagram_account_id`
- ✅ Payload tem: `"client_data": {...}` ✅

**4. Switch (Tipos de Post):**
- ✅ Verifica: `$json.postType`
- ✅ "Combinar Dados" usa: `$('Extrair Dados').item.json.post_type`
- ✅ Adicionei `"postType"` no payload para compatibilidade ✅

---

## ✅ Compatibilidade: 100%

Todos os campos necessários estão presentes no payload.

---

## 📋 Próximos Passos

1. **Execute a migração 019** (se ainda não executou):
   ```sql
   -- Arquivo: supabase/migrations/019_fix_process_posts_conditions.sql
   ```

2. **Reagende os posts para 17:48:**
   ```sql
   -- Arquivo: REAGENDAR_POSTS_1748.sql
   ```

3. **Aguarde até 17:48** e verifique:
   - Se os posts foram processados
   - Se os webhooks chegaram no N8N
   - Se foram publicados no Instagram

---

**Payload está correto! O problema deve ser na função ou no envio do webhook.**

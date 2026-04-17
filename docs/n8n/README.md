# n8n workflow — Instagram Business Login scheduler

This folder contains the **new** n8n workflow that publishes scheduled posts
to Instagram via the Instagram Business Login API (`graph.instagram.com`).
It is intentionally **separate** from the existing `aupe-agendador` workflow
(which publishes via `graph.facebook.com`) so it cannot break anything in
production.

| File | Purpose |
|------|---------|
| `aupe-agendador-ig-business.workflow.json` | Importable workflow JSON — listens on `/webhook/aupe-agendador-ig-business` and publishes to Instagram |
| `../../supabase/migrations/20260418_scheduled_post_webhook_route_by_token_type.sql` | Updates the Supabase trigger to route posts to the new webhook when `clients.token_type = 'instagram_business'` |

## Setup

### 1. Create the Supabase credential in n8n

The workflow writes the result back to Supabase using the **native Supabase
node**. The service-role key lives only in n8n's encrypted credential vault
(never as an easypanel env var, never in the workflow JSON).

1. Open n8n → **Credentials → New credential → Supabase API**.
2. Fill in:
   - **Host**: `https://mrkcoolfxqiwaqeyquuf.supabase.co`
   - **Service Role Secret**: paste the `service_role` key from
     Supabase → *Project Settings → API → Project API keys*.
3. Name it `Supabase AUPE (service_role)` and save.

> Why service_role? The `scheduled_posts` table has RLS; the n8n callback
> needs to bypass RLS to update any post. The key never leaves Supabase's
> environment visibility — it is stored in the n8n credential vault.

### 2. Import the workflow into n8n

1. Open n8n at `https://ia-n8n.a8fvaf.easypanel.host`.
2. Click **Workflows → Import from file**.
3. Select `aupe-agendador-ig-business.workflow.json`.
4. n8n will warn that the two Supabase nodes (`Mark as posted`,
   `Mark as failed`) have a missing credential reference.
   Open each node and pick the `Supabase AUPE (service_role)` credential
   you just created, then save.
5. Review the 4 nodes:
   - **Webhook** — listens on path `aupe-agendador-ig-business`.
   - **Publish to Instagram** — single Code node that handles photos,
     Reels (with async container polling) and carousels. Has exponential
     backoff on transient Graph API errors (same `is_transient` retry
     behaviour the current workflow uses). Emits one of two shapes:
     - on success: `{ scheduled_post_id, status: 'posted', instagram_post_id, posted_at }`
     - on failure: `{ scheduled_post_id, status: 'failed', error_message, last_retry_at }`
   - **Posted?** — IF node that routes the execution based on `status`.
   - **Mark as posted** / **Mark as failed** — native Supabase update
     nodes that patch the `scheduled_posts` row by `id`.

### 3. Activate the workflow

Toggle the workflow to **Active**.

Smoke-test the webhook URL is reachable:

```bash
curl -X POST https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador-ig-business \
  -H 'Content-Type: application/json' \
  -d '{"type":"INSERT","record":{}}'
```

n8n should respond with `200` and you should see a failed execution in the
workflow history (failed because `record.client_data` is missing — that's
expected; the important thing is that the webhook is live and the Supabase
nodes are wired correctly).

### 4. Apply the Supabase trigger migration

Two options:

**A. Ask the assistant to apply it via MCP** (recommended):
> "Apply `20260418_scheduled_post_webhook_route_by_token_type.sql`"

**B. Apply it manually** through the Supabase Dashboard SQL editor — copy
and paste the full content of that migration and run it.

After the migration is applied, every INSERT/UPDATE on `scheduled_posts`
is automatically routed to the correct webhook:

| `clients.token_type`  | Webhook URL                                |
|-----------------------|--------------------------------------------|
| `instagram_business`  | `/webhook/aupe-agendador-ig-business` (new) |
| any other / null      | `/webhook/aupe-agendador` (existing, unchanged) |

## Expected webhook payload

```json
{
  "type": "INSERT",
  "table": "scheduled_posts",
  "record": {
    "id": "…",
    "client_id": "…",
    "caption": "…",
    "images": ["https://…/photo.jpg"],
    "video": null,
    "cover_image": null,
    "share_to_feed": true,
    "post_type": "post",
    "immediate": true,
    "status": "pending",
    "client_data": {
      "instagram_account_id": "178…",
      "access_token": "IGAA…",
      "instagram": "insyt_handle",
      "name": "Client name",
      "token_type": "instagram_business"
    }
  },
  "old_record": null,
  "triggered_by": "insert_trigger",
  "triggered_at": "2026-04-18T17:00:00Z"
}
```

## How the Code node decides what to publish

| Incoming record                           | Flow                                      |
|-------------------------------------------|-------------------------------------------|
| `post_type='reels'` **or** video + no images | 3-step Reels: create container → poll until `FINISHED` → publish |
| multiple `images`                         | Carousel: create child containers → create parent → publish |
| single `image`                            | Photo: create container → publish         |

Graph API transient errors (`is_transient=true`, codes `1/2/4/17/341/368`)
are retried with exponential backoff up to 4 attempts.

## Troubleshooting

- **Workflow not triggered after post scheduled**
  → Check `clients.token_type` is exactly `'instagram_business'` and the
    migration was applied. Inspect `SELECT token_type FROM clients WHERE id = '…';`.
- **Supabase node throws "missing credentials"**
  → The imported nodes keep the placeholder `REPLACE_WITH_SUPABASE_CRED_ID`.
    Open `Mark as posted` and `Mark as failed` and pick the
    `Supabase AUPE (service_role)` credential.
- **"Media container creation failed" with `is_transient: true`**
  → The Code node already retries. If all 4 attempts fail, the Graph API
    is having a broader outage. Retry manually later.
- **Reel publish hangs**
  → Check the video meets Meta's Reels specs
    (≤ 100MB, 3-90s, aspect ratio 9:16, etc.). The poll loop aborts after
    5 minutes with a timeout error written to `error_message`.
- **Supabase update silently does nothing**
  → Double-check the credential points to the correct project and uses
    the `service_role` (not `anon`) key — RLS will block `anon` writes.

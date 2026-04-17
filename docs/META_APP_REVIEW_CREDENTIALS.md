# Meta App Review — Test Account

> **Context**: This file documents the dedicated test account we share with
> Meta's App Review team in the submission notes. The account has no real
> data, no billing information and access to **only the sandbox Instagram
> Business account** provided by Meta for testing.
>
> **DO NOT use these credentials for anything else.** If they need to be
> rotated, update both this file and
> `supabase/migrations/20260418_meta_app_review_test_account.sql`.

## Credentials to paste into the App Review submission notes

```
Test URL:       https://www.insyt.com.br/login
Email:          meta-app-review@insyt.com.br
Password:       MetaReview2026!
```

## Account details (read-only reference)

| Field            | Value                                          |
|------------------|------------------------------------------------|
| Organization     | `Meta App Review - Insyt`                      |
| Organization ID  | `18bf97e1-496a-489f-bd43-360d964a8500`         |
| User ID (Auth)   | `b24e248f-48cd-435d-9589-99a1efe5734c`         |
| Role             | `admin`                                        |
| Subscription     | `BUSINESS` (active, 1-year period)             |
| Post limit       | 6000 posts/month                               |
| Client limit     | 20 clients                                     |

## How it was provisioned

The migration `supabase/migrations/20260418_meta_app_review_test_account.sql`
is **idempotent** — it can be re-run any time to:

1. Create (or skip) the `auth.users` row with email confirmed and password set.
2. Create (or skip) the `auth.identities` row so the email provider works.
3. Create (or skip) the `organizations` + `profiles` rows via the existing
   `public.create_organization_and_profile_on_signup` RPC.
4. Create (or skip) an `active` row in `public.subscriptions` on the BUSINESS plan.

Re-apply after resetting the database, or after rotating the password (update
`v_password` in the migration).

## Reviewer walkthrough (what they do with this account)

**Only this email** (`meta-app-review@insyt.com.br`) triggers the dedicated
English-language flow. Login, client creation and routing to the demo page
are all handled automatically without affecting normal users.

The demo uses the **same production pipeline** real customers use:

```
Demo UI
  → Supabase Storage (post-images bucket)
  → INSERT into scheduled_posts
  → handle_scheduled_post_webhook
  → n8n workflow `aupe-agendador-ig-business`
  → graph.instagram.com (create container + publish + Reels polling)
  → UPDATE scheduled_posts.status = 'posted'
```

The browser never calls `graph.instagram.com` for publishing.

### Screencast walkthrough (all UI in English)

1. **Sign in** — open `https://www.insyt.com.br/login`, enter the reviewer
   credentials and submit. After login the reviewer is redirected to
   `https://www.insyt.com.br/connect/instagram-business`.
2. **Auto-provisioned client** — on arrival, the app automatically finds or
   creates a dedicated `Meta App Review Client` row inside the reviewer's
   organization (via `ensureMetaAppReviewClient()`). No manual client
   creation is required; this keeps the reviewer walkthrough short.
3. **Continue with Instagram** — clicking the orange button opens the Meta
   consent dialog requesting `instagram_business_basic`,
   `instagram_business_content_publish`, and
   `instagram_business_manage_insights`.
4. **Callback** — after the reviewer approves, they are redirected to
   `https://www.insyt.com.br/callback/instagram-business?code=...`. The app
   exchanges the code for a long-lived token and persists it onto the
   auto-provisioned client row with `token_type='instagram_business'`.
5. **Demo page** — the reviewer then lands on
   `https://www.insyt.com.br/connect/instagram-business/demo?clientId=...`,
   which shows three sections:
   - **Section A — Profile (`instagram_business_basic`)**: the authenticated
     profile (@username, name, account type, media count) is fetched via
     `GET graph.instagram.com/me`.
   - **Section B — Publish (`instagram_business_content_publish`)**: a photo
     or Reel is uploaded from the reviewer's device to Supabase Storage,
     and a `scheduled_posts` row is created. The reviewer chooses
     **Post now** (immediate) or **Schedule for...** (datetime picker).
     The UI polls `scheduled_posts` every 3 s and shows the pipeline status
     (`pending → sent_to_n8n → posted`). When `posted`, the UI displays the
     returned Instagram media id.
   - **Section C — Insights (`instagram_business_manage_insights`)**: the
     last 5 media are listed with per-media metrics (reach, likes,
     comments, saved, total interactions). After publishing in Section B,
     the reviewer refreshes this section to see the new media appear.
6. **Verify on Instagram** — the reviewer opens the Instagram app or
   `https://www.instagram.com/<username>` and sees the newly published
   photo/Reel. This closes the loop from consent dialog to live post.

### Verifying server-side (optional, for us)

After the reviewer publishes, we can double-check the pipeline with:

```sql
-- Supabase: latest scheduled post for the reviewer org
SELECT id, status, instagram_post_id, posted_at, error_message
FROM scheduled_posts
WHERE organization_id = '18bf97e1-496a-489f-bd43-360d964a8500'
ORDER BY created_at DESC
LIMIT 5;

-- Client row shows the Instagram Business token type:
SELECT id, name, token_type, instagram_account_id, is_active
FROM clients
WHERE name = 'Meta App Review Client';
```

- In n8n, the workflow `aupe-agendador-ig-business` should show a green
  execution for each `Post now` click.

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

1. Open `https://www.insyt.com.br/login` and sign in with the credentials above.
2. From the dashboard, go to **Clients → New client** and create a placeholder
   client (any name + the Instagram handle of their Meta test account).
3. On that client's dashboard, click **Connect via Instagram Business Login**.
   This opens the English consent page at `/clients/:clientId/connect-instagram-business`,
   redirects to Meta for authorization, and returns to
   `/callback/instagram-business`. The callback:
     1. Exchanges the code for a long-lived Instagram Business token.
     2. Reads the user's Instagram profile via `graph.instagram.com/me`.
     3. Writes `access_token`, `instagram_account_id`, `instagram_username`,
        `profile_picture`, `token_expiry` and `token_type='instagram_business'`
        onto the `clients` row.
     4. Redirects to `/clients/:clientId` (the client dashboard).
4. From the client dashboard, schedule a post (photo or Reel) using the
   existing scheduler UI. The post is saved to `scheduled_posts` with status
   `pending`; the Supabase webhook fires the n8n workflow; n8n reads
   `token_type='instagram_business'` and publishes via `graph.instagram.com`
   (with built-in retry for transient errors).
5. The reviewer opens Instagram and sees the post live on the connected account.
6. Insights for published media are visible on the client dashboard.

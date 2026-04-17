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

**Only this email** (`meta-app-review@insyt.com.br`) is redirected after login to the
English Instagram Business flow. All other users keep the normal redirect to `/dashboard`
(or `sessionStorage.redirectAfterLogin` when set).

### Primary path (App Review screencast — public demo, all UI in English)

1. Open `https://www.insyt.com.br/login` and sign in with the credentials above.
2. You are **automatically redirected** to `https://www.insyt.com.br/connect/instagram-business`
   (same page as the public URL, but you are now signed in for support flows if needed).
3. Click **Continue with Instagram**, complete the Meta consent dialog, then use the demo at
   `/connect/instagram-business/demo` to exercise **instagram_business_basic**,
   **instagram_business_content_publish**, and **instagram_business_manage_insights**
   (profile, publish photo/Reel, insights).

### Optional (full scheduling pipeline with n8n)

If you need to demonstrate posts through `scheduled_posts` → Supabase → n8n: from the
app shell go to **Clients → New client**, open that client, then **Connect via Instagram
Business Login** (`/clients/:clientId/connect-instagram-business`). The callback persists
the token on that client row and returns to the client dashboard for scheduling.

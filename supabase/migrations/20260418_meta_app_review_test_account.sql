-- =====================================================================
-- Meta App Review — dedicated test account
-- =====================================================================
-- Creates (idempotently) a dedicated organization + admin user whose
-- credentials we share in the App Review submission notes. The reviewer
-- logs into the system with these credentials, connects their Instagram
-- Business account via our OAuth flow, schedules a post, and sees the
-- real Supabase + n8n pipeline publish to Instagram.
--
-- Credentials (kept in sync with docs/META_APP_REVIEW_CREDENTIALS.md):
--   email:    meta-app-review@insyt.com.br
--   password: MetaReview2026!
--   plan:     BUSINESS (6000 posts/month, 20 clients)
--
-- This migration is safe to run multiple times: it only creates what is
-- missing and never overwrites an existing password or subscription.
-- =====================================================================

DO $$
DECLARE
  v_email       text := 'meta-app-review@insyt.com.br';
  v_password    text := 'MetaReview2026!';
  v_full_name   text := 'Meta App Review Reviewer';
  v_org_name    text := 'Meta App Review - Insyt';
  v_plan_id     uuid := '2dca9be5-918e-413d-be0b-7907eab93cea'; -- BUSINESS
  v_user_id     uuid;
  v_org_id      uuid;
  v_created_user boolean := false;
BEGIN
  -- 1) auth.users — create if missing.
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      is_sso_user,
      is_anonymous
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );

    -- Identities row so Supabase Auth recognises the email provider.
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object(
        'sub',            v_user_id::text,
        'email',          v_email,
        'email_verified', true
      ),
      now(),
      now(),
      now()
    );

    v_created_user := true;
  END IF;

  -- 2) profile + organization — create via the existing RPC if missing.
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    v_org_id := public.create_organization_and_profile_on_signup(
      v_user_id,
      v_email,
      v_full_name,
      v_org_name,
      v_email,
      NULL,
      NULL,
      'BR'
    );
  END IF;

  -- 3) Active subscription on the BUSINESS plan so the reviewer can
  -- freely schedule posts without hitting trial/free-plan limits.
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE organization_id = v_org_id
      AND status IN ('active','trialing')
  ) THEN
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      v_org_id,
      v_plan_id,
      'active',
      now(),
      now() + interval '1 year'
    );
  END IF;

  RAISE NOTICE
    'Meta App Review account ready — user_id=%, org_id=%, created_user=%',
    v_user_id, v_org_id, v_created_user;
END $$;

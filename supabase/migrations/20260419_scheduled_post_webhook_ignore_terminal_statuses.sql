-- =====================================================================
-- Fix duplicate publishing for Instagram Business scheduled_posts
-- =====================================================================
-- The previous version of `handle_scheduled_post_webhook` fired the
-- outbound webhook on ANY status transition into
--   ('sent_to_n8n', 'posted', 'failed')
-- which caused the following loop for immediate posts:
--   1. App INSERTs a row with status='pending' and immediate=true.
--   2. INSERT branch of the trigger fires → n8n publishes successfully.
--   3. n8n UPDATEs the row with status='posted'.
--   4. UPDATE branch of the trigger re-fires the SAME webhook URL → n8n
--      publishes a SECOND time (and the cycle tried to keep going,
--      stopped only because 'posted' → 'posted' has no status change).
--
-- Root cause: `posted` and `failed` are terminal states written BY n8n
-- and must not re-trigger publishing. The only legitimate UPDATE event
-- we need for the Instagram Business workflow is the `sent_to_n8n`
-- transition from the scheduling cron (`process_scheduled_posts_by_time`).
--
-- This migration:
--   • For `clients.token_type = 'instagram_business'`:
--       - Fires on INSERT when immediate=true (same as before).
--       - Fires on UPDATE only when status transitions into 'sent_to_n8n'.
--       - Does NOT fire on DELETE (n8n has nothing to do with deletions).
--   • For the legacy Facebook Login clients (any other token_type):
--       - Behaviour kept IDENTICAL to the previous migration so we don't
--         accidentally break the production pipeline downstream
--         listeners that rely on UPDATE('posted'|'failed') or DELETE.
--
-- Idempotent: only redefines the function.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_scheduled_post_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    webhook_payload JSONB;
    client_data     RECORD;
    target_url      TEXT;
    is_ig_business  BOOLEAN;
BEGIN
    SELECT
        instagram_account_id,
        access_token,
        instagram,
        name,
        token_type
    INTO client_data
    FROM clients
    WHERE id = COALESCE(NEW.client_id, OLD.client_id);

    is_ig_business := (client_data.token_type = 'instagram_business');

    IF is_ig_business THEN
        target_url := 'https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador-ig-business';
    ELSE
        target_url := 'https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.immediate = true THEN
            webhook_payload := jsonb_build_object(
                'type', 'INSERT',
                'table', 'scheduled_posts',
                'record', row_to_json(NEW)::jsonb || jsonb_build_object(
                    'client_data', jsonb_build_object(
                        'instagram_account_id', client_data.instagram_account_id,
                        'access_token',         client_data.access_token,
                        'instagram',            client_data.instagram,
                        'name',                 client_data.name,
                        'token_type',           COALESCE(client_data.token_type, 'facebook_login')
                    )
                ),
                'old_record',   null,
                'triggered_by', 'insert_trigger',
                'triggered_at', NOW()
            );

            PERFORM net.http_post(
                url     := target_url,
                body    := webhook_payload,
                headers := '{"Content-Type": "application/json"}'::jsonb,
                timeout_milliseconds := 10000
            );
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Only emit an UPDATE webhook when the status actually changed.
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF is_ig_business THEN
                -- Instagram Business: the only legitimate UPDATE that must
                -- re-notify n8n is the cron promoting a row to
                -- 'sent_to_n8n'. Terminal states ('posted' / 'failed')
                -- are written by n8n itself and re-firing would publish
                -- again.
                IF NEW.status = 'sent_to_n8n' THEN
                    webhook_payload := jsonb_build_object(
                        'type', 'UPDATE',
                        'table', 'scheduled_posts',
                        'record', row_to_json(NEW)::jsonb || jsonb_build_object(
                            'client_data', jsonb_build_object(
                                'instagram_account_id', client_data.instagram_account_id,
                                'access_token',         client_data.access_token,
                                'instagram',            client_data.instagram,
                                'name',                 client_data.name,
                                'token_type',           COALESCE(client_data.token_type, 'facebook_login')
                            )
                        ),
                        'old_record',   row_to_json(OLD)::jsonb,
                        'triggered_by', 'update_trigger',
                        'triggered_at', NOW()
                    );

                    PERFORM net.http_post(
                        url     := target_url,
                        body    := webhook_payload,
                        headers := '{"Content-Type": "application/json"}'::jsonb,
                        timeout_milliseconds := 10000
                    );
                END IF;
            ELSE
                -- Legacy Facebook Login flow kept IDENTICAL to the
                -- previous migration so we don't break downstream
                -- consumers that may rely on 'posted' / 'failed' events.
                IF NEW.status IN ('sent_to_n8n', 'posted', 'failed') THEN
                    webhook_payload := jsonb_build_object(
                        'type', 'UPDATE',
                        'table', 'scheduled_posts',
                        'record', row_to_json(NEW)::jsonb || jsonb_build_object(
                            'client_data', jsonb_build_object(
                                'instagram_account_id', client_data.instagram_account_id,
                                'access_token',         client_data.access_token,
                                'instagram',            client_data.instagram,
                                'name',                 client_data.name,
                                'token_type',           COALESCE(client_data.token_type, 'facebook_login')
                            )
                        ),
                        'old_record',   row_to_json(OLD)::jsonb,
                        'triggered_by', 'update_trigger',
                        'triggered_at', NOW()
                    );

                    PERFORM net.http_post(
                        url     := target_url,
                        body    := webhook_payload,
                        headers := '{"Content-Type": "application/json"}'::jsonb,
                        timeout_milliseconds := 10000
                    );
                END IF;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Instagram Business workflow has no handler for DELETE events;
        -- firing would send n8n a payload without client_data and make
        -- the Code node fail. Keep the legacy behaviour untouched.
        IF NOT is_ig_business THEN
            webhook_payload := jsonb_build_object(
                'type', 'DELETE',
                'table', 'scheduled_posts',
                'record', null,
                'old_record', row_to_json(OLD)::jsonb,
                'triggered_by', 'delete_trigger',
                'triggered_at', NOW()
            );

            PERFORM net.http_post(
                url     := target_url,
                body    := webhook_payload,
                headers := '{"Content-Type": "application/json"}'::jsonb,
                timeout_milliseconds := 10000
            );
        END IF;
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

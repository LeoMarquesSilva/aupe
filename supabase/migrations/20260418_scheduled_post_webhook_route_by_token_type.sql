-- =====================================================================
-- Route scheduled_posts webhook based on clients.token_type
-- =====================================================================
-- Until now, every scheduled_posts INSERT/UPDATE/DELETE fired the same
-- n8n webhook at `/webhook/aupe-agendador`. That workflow publishes to
-- Instagram via graph.facebook.com (Facebook Login for Business).
--
-- Clients connected via the new Instagram Business Login flow have
-- `clients.token_type = 'instagram_business'` and need a different n8n
-- workflow that publishes via `graph.instagram.com` instead.
--
-- This migration updates the trigger function so it:
--   1. Reads `token_type` from the client.
--   2. Chooses the webhook URL based on that value:
--        - 'instagram_business' -> /webhook/aupe-agendador-ig-business
--        - anything else        -> /webhook/aupe-agendador         (current)
--   3. Forwards `token_type` inside `client_data` for observability.
--
-- Idempotent: only replaces the function definition.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_scheduled_post_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    webhook_payload JSONB;
    client_data     RECORD;
    target_url      TEXT;
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

    -- Route based on client.token_type.
    IF client_data.token_type = 'instagram_business' THEN
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
        IF OLD.status != NEW.status AND NEW.status IN ('sent_to_n8n', 'posted', 'failed') THEN
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
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
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
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

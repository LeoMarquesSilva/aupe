-- Gate de aprovação no cron → N8N
-- Posts com for_approval_only=true nunca são enviados.
-- Posts com requires_approval=true só são enviados se approval_status='approved'.
-- Payload enriquecido com requires_approval, approval_status, for_approval_only.

CREATE OR REPLACE FUNCTION public.process_scheduled_posts_by_time()
 RETURNS TABLE(processed_count integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_record RECORD;
  proc_count INTEGER := 0;
  webhook_payload JSONB;
  current_brasilia TIMESTAMPTZ;
  webhook_result BIGINT;
  error_count INTEGER := 0;
BEGIN
  current_brasilia := NOW() AT TIME ZONE 'America/Sao_Paulo';

  FOR post_record IN
    SELECT
      sp.*,
      c.instagram_account_id,
      c.access_token,
      c.instagram,
      c.name as client_name,
      sp.scheduled_date AT TIME ZONE 'America/Sao_Paulo' as scheduled_brasilia
    FROM scheduled_posts sp
    JOIN clients c ON sp.client_id = c.id
    WHERE sp.status = 'pending'
      AND sp.scheduled_date <= NOW()
      AND sp.scheduled_date > NOW() - INTERVAL '24 hours'
      AND sp.scheduled_date < NOW() + INTERVAL '1 minute'
      AND sp.immediate = false
      AND c.access_token IS NOT NULL
      AND c.instagram_account_id IS NOT NULL
      -- Gate de aprovação: nunca enviar for_approval_only
      AND COALESCE(sp.for_approval_only, false) = false
      -- Gate de aprovação: se requires_approval, só enviar se approved
      AND (
        COALESCE(sp.requires_approval, false) = false
        OR sp.approval_status = 'approved'
      )
    ORDER BY sp.scheduled_date ASC
    LIMIT 10
  LOOP
    BEGIN
      IF post_record.scheduled_date > NOW() THEN
        RAISE NOTICE 'Post % agendado para o futuro, pulando (scheduled: %, now: %)',
          post_record.id, post_record.scheduled_date, NOW();
        CONTINUE;
      END IF;

      UPDATE scheduled_posts
      SET
        status = 'sent_to_n8n',
        n8n_job_id = 'cron_' || extract(epoch from NOW())::bigint,
        last_retry_at = NOW()
      WHERE id = post_record.id
        AND status = 'pending'
        AND scheduled_date <= NOW()
        -- Proteção defensiva: repetir gate de aprovação no update
        AND COALESCE(for_approval_only, false) = false
        AND (
          COALESCE(requires_approval, false) = false
          OR approval_status = 'approved'
        );

      IF FOUND THEN
        webhook_payload := jsonb_build_object(
          'type', 'TIME_TRIGGER',
          'table', 'scheduled_posts',
          'record', jsonb_build_object(
            'id', post_record.id,
            'client_id', post_record.client_id,
            'caption', post_record.caption,
            'video', post_record.video,
            'cover_image', post_record.cover_image,
            'images', post_record.images,
            'scheduled_date', post_record.scheduled_date,
            'scheduled_date_brasilia', post_record.scheduled_brasilia::text,
            'post_type', post_record.post_type,
            'postType', post_record.post_type,
            'status', 'sent_to_n8n',
            'share_to_feed', post_record.share_to_feed,
            'immediate', post_record.immediate,
            'organization_id', post_record.organization_id,
            'requires_approval', COALESCE(post_record.requires_approval, false),
            'approval_status', post_record.approval_status,
            'for_approval_only', COALESCE(post_record.for_approval_only, false),
            'client_data', jsonb_build_object(
              'instagram_account_id', post_record.instagram_account_id,
              'access_token', post_record.access_token,
              'instagram', post_record.instagram,
              'name', post_record.client_name
            )
          ),
          'triggered_by', 'pg_cron_time_based',
          'triggered_at', NOW(),
          'triggered_at_brasilia', current_brasilia::text,
          'source', 'time_based_trigger'
        );

        BEGIN
          SELECT net.http_post(
            url := 'https://ia-n8n.a8fvaf.easypanel.host/webhook/aupe-agendador',
            body := webhook_payload,
            headers := '{"Content-Type": "application/json"}'::jsonb,
            timeout_milliseconds := 15000
          ) INTO webhook_result;

          RAISE NOTICE 'Post % processado e webhook enviado (request_id: %)',
            post_record.id, webhook_result;

          proc_count := proc_count + 1;

        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Erro ao enviar webhook para post %: %', post_record.id, SQLERRM;

          UPDATE scheduled_posts
          SET
            status = 'pending',
            error_message = 'Erro webhook: ' || SQLERRM,
            retry_count = COALESCE(retry_count, 0) + 1,
            last_retry_at = NOW()
          WHERE id = post_record.id;

          error_count := error_count + 1;
        END;
      ELSE
        RAISE NOTICE 'Post % nao atualizado (processado por outro processo ou bloqueado pelo gate de aprovacao)', post_record.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar post %: %', post_record.id, SQLERRM;

      UPDATE scheduled_posts
      SET
        status = 'failed',
        error_message = 'Erro cron: ' || SQLERRM,
        retry_count = COALESCE(retry_count, 0) + 1,
        last_retry_at = NOW()
      WHERE id = post_record.id;

      error_count := error_count + 1;
    END;
  END LOOP;

  IF error_count > 0 THEN
    RETURN QUERY SELECT proc_count,
      ('Processados ' || proc_count || ' posts, ' || error_count || ' erros')::TEXT;
  ELSE
    RETURN QUERY SELECT proc_count, ('Processados ' || proc_count || ' posts')::TEXT;
  END IF;
END;
$function$;

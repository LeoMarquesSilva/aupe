-- Clients: ativar/inativar
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clients.is_active IS 'When false, client is inactive (UI/scheduling may hide or warn).';

-- Scheduled posts: plataforma, pré-aprovação interna, anexos no feedback do cliente
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS posting_platform text NOT NULL DEFAULT 'instagram';

ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_posting_platform_check;

ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_posting_platform_check
  CHECK (posting_platform IN ('instagram', 'linkedin'));

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS requires_internal_approval boolean NOT NULL DEFAULT false;

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS internal_approval_status text;

ALTER TABLE public.scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_internal_approval_status_check;

ALTER TABLE public.scheduled_posts
  ADD CONSTRAINT scheduled_posts_internal_approval_status_check
  CHECK (
    internal_approval_status IS NULL
    OR internal_approval_status IN ('pending', 'approved', 'rejected')
  );

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS internal_approval_comment text;

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS approval_feedback_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.scheduled_posts.posting_platform IS 'instagram (automação N8N) | linkedin (sem automação)';
COMMENT ON COLUMN public.scheduled_posts.requires_internal_approval IS 'If true, gestor must internal_approve before client link';
COMMENT ON COLUMN public.scheduled_posts.internal_approval_status IS 'pending | approved | rejected; NULL if not required';
COMMENT ON COLUMN public.scheduled_posts.approval_feedback_attachments IS 'Array of public URLs for client attachment on reject';

-- Storage bucket for client feedback attachments (public read; uploads via Edge Function + service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'approval-feedback',
  'approval-feedback',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "approval_feedback_public_read" ON storage.objects;
CREATE POLICY "approval_feedback_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'approval-feedback');

-- Cron: never process LinkedIn-targeted posts
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
      AND COALESCE(sp.posting_platform, 'instagram') = 'instagram'
      AND COALESCE(sp.for_approval_only, false) = false
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
        AND COALESCE(for_approval_only, false) = false
        AND COALESCE(posting_platform, 'instagram') = 'instagram'
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

-- RPC: block client link until internal approval done
CREATE OR REPLACE FUNCTION public.create_approval_request_atomic(
  p_client_id uuid,
  p_post_ids uuid[],
  p_expires_in_days integer,
  p_label text,
  p_token text
)
RETURNS TABLE(id uuid, token text, expires_at timestamptz, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id uuid;
  v_expires_at timestamptz;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente é obrigatório.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_post_ids IS NULL OR array_length(p_post_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um post.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_expires_in_days NOT IN (7, 15, 30) THEN
    RAISE EXCEPTION 'Validade inválida. Use 7, 15 ou 30 dias.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.id = p_client_id
      AND (
        is_super_admin(v_uid)
        OR c.organization_id = get_user_organization_id()
      )
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_post_ids) AS pid
    LEFT JOIN scheduled_posts sp ON sp.id = pid
    WHERE sp.id IS NULL
      OR sp.client_id <> p_client_id
      OR sp.status <> 'pending'
  ) THEN
    RAISE EXCEPTION 'Um ou mais posts são inválidos para esta solicitação.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM scheduled_posts sp
    WHERE sp.id = ANY(p_post_ids)
      AND COALESCE(sp.requires_internal_approval, false) = true
      AND COALESCE(sp.internal_approval_status, '') <> 'approved'
  ) THEN
    RAISE EXCEPTION 'Um ou mais posts exigem pré-aprovação interna antes de enviar ao cliente.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM approval_request_posts arp
    JOIN approval_requests ar ON ar.id = arp.approval_request_id
    WHERE arp.scheduled_post_id = ANY(p_post_ids)
      AND ar.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Um ou mais posts já estão vinculados a outro link de aprovação ativo.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_expires_at := now() + make_interval(days => p_expires_in_days);

  INSERT INTO approval_requests (client_id, token, expires_at, label, created_by)
  VALUES (p_client_id, p_token, v_expires_at, NULLIF(trim(coalesce(p_label, '')), ''), v_uid)
  RETURNING approval_requests.id INTO v_request_id;

  INSERT INTO approval_request_posts (approval_request_id, scheduled_post_id, sort_order)
  SELECT
    v_request_id,
    pid,
    ord - 1
  FROM unnest(p_post_ids) WITH ORDINALITY AS x(pid, ord);

  UPDATE scheduled_posts
  SET
    requires_approval = true,
    approval_status = 'pending',
    approval_feedback = null,
    approval_feedback_attachments = '[]'::jsonb,
    approval_responded_at = null
  WHERE scheduled_posts.id = ANY(p_post_ids);

  RETURN QUERY
  SELECT ar.id, ar.token, ar.expires_at, ar.label
  FROM approval_requests ar
  WHERE ar.id = v_request_id;
END;
$function$;

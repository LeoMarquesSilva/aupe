-- Atomic approval request creation + duplicate active-link guard

CREATE OR REPLACE FUNCTION public.check_no_duplicate_active_approval_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM approval_request_posts arp
    JOIN approval_requests ar ON ar.id = arp.approval_request_id
    WHERE arp.scheduled_post_id = NEW.scheduled_post_id
      AND arp.approval_request_id <> NEW.approval_request_id
      AND ar.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Post % já está vinculado a outro link de aprovação ativo.', NEW.scheduled_post_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS approval_request_posts_no_duplicate_active_trigger ON approval_request_posts;
CREATE TRIGGER approval_request_posts_no_duplicate_active_trigger
  BEFORE INSERT OR UPDATE ON approval_request_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_no_duplicate_active_approval_link();

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

  -- Validate all posts belong to this client and are pending.
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

  -- Ensure none of these posts is already in another active request.
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
    approval_responded_at = null
  WHERE scheduled_posts.id = ANY(p_post_ids);

  RETURN QUERY
  SELECT ar.id, ar.token, ar.expires_at, ar.label
  FROM approval_requests ar
  WHERE ar.id = v_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_approval_request_atomic(uuid, uuid[], integer, text, text) TO authenticated;

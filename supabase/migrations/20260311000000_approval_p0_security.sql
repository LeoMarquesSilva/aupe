-- P0: Security and integrity for approval flow
-- 1. Enable RLS on approval_requests and approval_request_posts
-- 2. Add policies so anon has no access; authenticated users access only their org's data
-- 3. Add integrity constraint: post client_id must match request client_id

-- Enable RLS (default deny when no policy matches)
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_request_posts ENABLE ROW LEVEL SECURITY;

-- approval_requests: authenticated users can access only when client belongs to their org
CREATE POLICY approval_requests_select_policy ON approval_requests
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (auth_user_is_admin_or_moderator() AND client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    ))
    OR client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_requests_insert_policy ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_requests_update_policy ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_requests_delete_policy ON approval_requests
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR client_id IN (
      SELECT id FROM clients WHERE organization_id = get_user_organization_id()
    )
  );

-- approval_request_posts: via approval_request's client
CREATE POLICY approval_request_posts_select_policy ON approval_request_posts
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR approval_request_id IN (
      SELECT ar.id FROM approval_requests ar
      JOIN clients c ON c.id = ar.client_id
      WHERE c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_request_posts_insert_policy ON approval_request_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR approval_request_id IN (
      SELECT ar.id FROM approval_requests ar
      JOIN clients c ON c.id = ar.client_id
      WHERE c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_request_posts_update_policy ON approval_request_posts
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR approval_request_id IN (
      SELECT ar.id FROM approval_requests ar
      JOIN clients c ON c.id = ar.client_id
      WHERE c.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY approval_request_posts_delete_policy ON approval_request_posts
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR approval_request_id IN (
      SELECT ar.id FROM approval_requests ar
      JOIN clients c ON c.id = ar.client_id
      WHERE c.organization_id = get_user_organization_id()
    )
  );

-- Integrity: post must belong to same client as the approval request
CREATE OR REPLACE FUNCTION check_approval_request_post_client_match()
RETURNS TRIGGER AS $$
DECLARE
  req_client uuid;
  post_client uuid;
BEGIN
  SELECT client_id INTO req_client FROM approval_requests WHERE id = NEW.approval_request_id;
  SELECT client_id INTO post_client FROM scheduled_posts WHERE id = NEW.scheduled_post_id;
  IF req_client IS NULL OR post_client IS NULL OR req_client != post_client THEN
    RAISE EXCEPTION 'approval_request_posts: post client_id must match approval_request client_id'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_request_posts_client_match_trigger
  BEFORE INSERT OR UPDATE ON approval_request_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_approval_request_post_client_match();

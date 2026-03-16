-- Approval module: approval_requests, approval_request_posts, and new columns on scheduled_posts
-- Phase 1: approval flow only; cron is NOT changed.

-- Table: approval_requests (one link sent to client = one request)
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_token ON approval_requests(token);
CREATE INDEX IF NOT EXISTS idx_approval_requests_client_id ON approval_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_expires_at ON approval_requests(expires_at);

-- Table: approval_request_posts (which posts are in each request)
CREATE TABLE IF NOT EXISTS approval_request_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  scheduled_post_id uuid NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE(approval_request_id, scheduled_post_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_request_posts_request ON approval_request_posts(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_posts_post ON approval_request_posts(scheduled_post_id);

-- Add approval columns to scheduled_posts (nullable for existing rows)
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approval_feedback text,
  ADD COLUMN IF NOT EXISTS approval_responded_at timestamptz;

COMMENT ON COLUMN scheduled_posts.requires_approval IS 'When true, post was sent to client for approval (phase 2: cron may gate on approval_status)';
COMMENT ON COLUMN scheduled_posts.approval_status IS 'pending | approved | rejected';
COMMENT ON COLUMN scheduled_posts.approval_feedback IS 'Client comment when rejecting/soliciting change';
COMMENT ON COLUMN scheduled_posts.approval_responded_at IS 'When client submitted approve/reject';

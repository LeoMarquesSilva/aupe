-- Content created on the Approval page is for approval only, not for N8N posting.
-- Webhook/trigger that sends to N8N should ignore rows where for_approval_only = true.

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS for_approval_only boolean DEFAULT false;

COMMENT ON COLUMN scheduled_posts.for_approval_only IS 'When true, content was created for client approval only; do not send to N8N for posting.';

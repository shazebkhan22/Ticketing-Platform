-- Up Migration

-- Who responded is currently unrecoverable — only the response text and
-- timestamp are stored (schema.sql:92-93). Mirrors remarks.created_by
-- (display name snapshot, not a FK) so the UI can show "who" the same way
-- the remarks timeline already does.
ALTER TABLE tickets ADD COLUMN admin_feedback_responded_by TEXT;

-- Down Migration

ALTER TABLE tickets DROP COLUMN IF EXISTS admin_feedback_responded_by;

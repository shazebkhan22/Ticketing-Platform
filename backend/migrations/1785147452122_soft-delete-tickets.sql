-- Up Migration

-- Soft delete: deleteTicket now sets this instead of removing the row, so
-- ticket history (and everything that references it: remarks,
-- ticket_assignees, activity_log, ticket_inventory) survives a delete
-- instead of cascading away. Every read path gets a matching
-- "deleted_at IS NULL" filter — see controllers/tickets.ts, excel.ts,
-- controllers/{meta,inventory,feedback,customers}.ts, middleware/auth.ts,
-- jobs/feedbackReminder.ts.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Down Migration

ALTER TABLE tickets DROP COLUMN IF EXISTS deleted_at;

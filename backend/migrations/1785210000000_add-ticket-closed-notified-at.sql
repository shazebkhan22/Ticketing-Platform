-- Up Migration

-- Tracks whether the customer has already been emailed that their ticket
-- closed, so updateTicketStatus doesn't resend if the ticket bounces back
-- to Closed again later. Separate from ticket_inventory.outward_notified_at
-- (the "repair completed and dispatched" email), which counts as the
-- closure notice for tickets that went through the inventory workflow.
ALTER TABLE tickets ADD COLUMN closed_notified_at TIMESTAMPTZ;

-- Down Migration

ALTER TABLE tickets DROP COLUMN IF EXISTS closed_notified_at;

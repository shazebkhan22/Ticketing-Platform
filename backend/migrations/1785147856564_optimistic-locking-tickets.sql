-- Up Migration

-- Optimistic concurrency for tickets: row_version auto-increments on every
-- update via trigger, and controllers/tickets.ts's updateTicket now requires
-- the client to send back the version it last read, checking it in the
-- UPDATE's WHERE clause. A mismatch (0 rows affected but the ticket exists)
-- means someone else changed it first — surfaced to the frontend as a 409,
-- instead of the previous silent last-write-wins behavior.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION bump_row_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.row_version = OLD.row_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_row_version ON tickets;
CREATE TRIGGER trg_tickets_row_version
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION bump_row_version();

-- Down Migration

DROP TRIGGER IF EXISTS trg_tickets_row_version ON tickets;
DROP FUNCTION IF EXISTS bump_row_version();
ALTER TABLE tickets DROP COLUMN IF EXISTS row_version;

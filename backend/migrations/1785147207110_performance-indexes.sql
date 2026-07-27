-- Up Migration

-- company_name/ticket_no searches use ILIKE '%...%' (leading wildcard),
-- which a plain btree index can't serve at all — pg_trgm + a GIN index lets
-- Postgres actually use an index for these instead of a full table scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tickets_company_name_trgm ON tickets USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_no_trgm ON tickets USING gin (ticket_no gin_trgm_ops);

-- feedbackReminder.ts polls WHERE status = 'Closed' AND closed_at <= ...
-- every 15 minutes. A partial index keyed to exactly that predicate stays
-- tiny forever (only closed tickets), independent of total table size.
CREATE INDEX IF NOT EXISTS idx_tickets_closed_at_when_closed ON tickets(closed_at) WHERE status = 'Closed';

-- The overdue filter (status IN (...) AND deadline_date < CURRENT_DATE)
-- benefits from one composite index over the two separate single-column ones.
CREATE INDEX IF NOT EXISTS idx_tickets_status_deadline ON tickets(status, deadline_date);

-- NOTE: these are plain (non-CONCURRENTLY) index builds, which briefly
-- lock the table against writes while building. That's a non-issue at the
-- current row count. Once tickets is large enough for that lock to be felt
-- in production, rebuild any future indexes with CREATE INDEX CONCURRENTLY
-- instead — that requires running outside node-pg-migrate's transaction
-- wrapper (a standalone psql session), since CONCURRENTLY cannot run
-- inside a transaction block.

-- Down Migration

DROP INDEX IF EXISTS idx_tickets_status_deadline;
DROP INDEX IF EXISTS idx_tickets_closed_at_when_closed;
DROP INDEX IF EXISTS idx_tickets_ticket_no_trgm;
DROP INDEX IF EXISTS idx_tickets_company_name_trgm;

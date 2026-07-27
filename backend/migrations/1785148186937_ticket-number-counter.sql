-- Up Migration

-- Fixes a real race condition in generateTicketNumber (utils/ticketNumber.ts):
-- it used to SELECT the highest existing ticket_no for today's date prefix,
-- compute next+1 in application code, then INSERT — two concurrent ticket
-- creations on the same day could read the same "last" number and both
-- attempt to insert the same ticket_no, one failing with a raw unique-
-- violation 500. A per-prefix counter row + INSERT ... ON CONFLICT DO
-- UPDATE is a single atomic statement in Postgres, so concurrent callers
-- serialize on it safely with no explicit locking needed.
CREATE TABLE IF NOT EXISTS ticket_number_counters (
  prefix TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

-- Backfill: seed each existing date prefix's counter from the highest
-- sequence number already used, so newly generated numbers continue after
-- existing tickets instead of colliding with them. ticket_no is always
-- 8 digits (ddmmyyyy) + 2-digit sequence, per generateTicketNumber's format.
INSERT INTO ticket_number_counters (prefix, last_seq)
SELECT
  substring(ticket_no from 1 for 8) AS prefix,
  MAX(substring(ticket_no from 9)::int) AS last_seq
FROM tickets
WHERE ticket_no ~ '^\d{10}$'
GROUP BY substring(ticket_no from 1 for 8)
ON CONFLICT (prefix) DO UPDATE SET last_seq = GREATEST(ticket_number_counters.last_seq, EXCLUDED.last_seq);

-- Down Migration

DROP TABLE IF EXISTS ticket_number_counters;

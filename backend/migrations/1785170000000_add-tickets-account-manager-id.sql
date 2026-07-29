-- Up Migration

-- Same rationale/pattern as projects.account_manager_id (see migrations/
-- 1785160000000_add-account-managers.sql) — tickets get the same nullable
-- FK into the shared account_managers directory. The existing
-- `account_manager` text column stays untouched for display/filters/exports.
ALTER TABLE tickets ADD COLUMN account_manager_id INTEGER REFERENCES account_managers(id);
CREATE INDEX idx_tickets_account_manager_id ON tickets(account_manager_id);

-- Backfill: account_managers was originally seeded from the distinct
-- account_manager values across BOTH tickets and projects (see the
-- migration above), so most existing tickets can be exactly matched by name
-- right now — no need to wait for each one to be individually re-saved.
UPDATE tickets t
SET account_manager_id = am.id
FROM account_managers am
WHERE t.account_manager = am.name
  AND t.account_manager_id IS NULL;

-- Down Migration

DROP INDEX IF EXISTS idx_tickets_account_manager_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS account_manager_id;

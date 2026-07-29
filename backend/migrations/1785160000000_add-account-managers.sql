-- Up Migration

-- "Account Manager" on projects (and tickets) has always been free text —
-- fine for display/filtering, but useless as an email target for the new
-- daily remarks digest (see jobs/dailyDigest.ts). This table is a small
-- directory (name + email), deliberately NOT part of `users`: an account
-- manager doesn't need a login, so giving them a password_hash/role would
-- drag in auth/permission concerns for no reason. `user_id` is a nullable
-- FK for the day an account manager *does* need real platform access — set
-- it then and every downstream reference (via account_manager_id) keeps
-- working unchanged.
CREATE TABLE account_managers (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed from every distinct account_manager value already typed into tickets
-- and projects, so the new dropdown isn't empty on day one. Emails are
-- SAMPLE placeholders (slugified-name@cygnussolutions.co.in) — an admin
-- needs to replace these with real addresses before the digest job is
-- useful; nothing here is fetched from any external system.
INSERT INTO account_managers (name, email)
SELECT
  am.name,
  lower(
    regexp_replace(
      regexp_replace(trim(am.name), '[^a-zA-Z0-9]+', '.', 'g'),
      '^\.+|\.+$', '', 'g'
    )
  ) || '@cygnussolutions.co.in'
FROM (
  SELECT DISTINCT account_manager AS name FROM tickets
    WHERE account_manager IS NOT NULL AND account_manager <> ''
  UNION
  SELECT DISTINCT account_manager AS name FROM projects
    WHERE account_manager IS NOT NULL AND account_manager <> ''
) am
ON CONFLICT (name) DO NOTHING;

-- Nullable and separate from the existing `account_manager` text column
-- (kept as-is for display/filters/exports) — projects created before this
-- migration have no way to be reliably matched to a directory row, so they
-- simply have no account_manager_id until next edited and re-saved with a
-- picked account manager.
ALTER TABLE projects ADD COLUMN account_manager_id INTEGER REFERENCES account_managers(id);
CREATE INDEX idx_projects_account_manager_id ON projects(account_manager_id);

-- Down Migration

DROP INDEX IF EXISTS idx_projects_account_manager_id;
ALTER TABLE projects DROP COLUMN IF EXISTS account_manager_id;
DROP TABLE IF EXISTS account_managers;

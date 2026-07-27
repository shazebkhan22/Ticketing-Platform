-- Up Migration

-- Offboarding an employee previously had no clean story: users can't be
-- hard-deleted (owner_user_id/ticket_assignees/activity_log all reference
-- them), so the only options were "leave their account active forever" or
-- "break referential integrity." is_active gives a real deactivation path —
-- login and getMe both check it (see controllers/auth.ts).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Down Migration

ALTER TABLE users DROP COLUMN IF EXISTS is_active;

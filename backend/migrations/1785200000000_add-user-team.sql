-- Up Migration

-- Which of the two field teams an employee belongs to — lets tickets/
-- projects assigned to them be grouped by team in the UI. Nullable since
-- existing employees (and admins) may not belong to either.
DO $$ BEGIN
  CREATE TYPE user_team AS ENUM ('FMS', 'Field');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS team user_team;

-- Down Migration

ALTER TABLE users DROP COLUMN IF EXISTS team;
DROP TYPE IF EXISTS user_team;

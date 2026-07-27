-- Intentional no-op. This marks the point where migration tracking switches
-- from the legacy hand-rolled system (db/schema.sql + db/migrate.ts's
-- ADDITIVE_MIGRATIONS array) to node-pg-migrate.
--
-- On a database that already has the app's tables (dev, staging, prod as of
-- this change): `npm run migrate:up` just records this migration as applied
-- and moves on to the real migrations that follow it — nothing here needs to
-- run again, since schema.sql + the additive array already brought it to
-- this exact state.
--
-- On a genuinely fresh database going forward: run `npm run migrate` (the
-- legacy script) once first to lay down the original schema, THEN
-- `npm run migrate:up` to apply this baseline (no-op) plus anything after
-- it. db/schema.sql and db/migrate.ts are intentionally left untouched and
-- frozen — they are not maintained further; all NEW schema changes from now
-- on are node-pg-migrate migrations only.

-- Up Migration

-- Down Migration
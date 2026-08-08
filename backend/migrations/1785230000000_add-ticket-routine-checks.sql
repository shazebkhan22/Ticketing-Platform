-- Up Migration

-- New call_type value for the FMS daily system-admin checklist report (see
-- types/ticket.ts ROUTINE_CHECK_TASKS) — logged as a ticket like everything
-- else instead of a separate entity.
ALTER TYPE call_type ADD VALUE IF NOT EXISTS 'Routine Checks';

-- One row per fixed checklist task (see ROUTINE_CHECK_TASKS): [{ section,
-- task, detail?, status, note? }, ...]. Only populated for callType =
-- "Routine Checks" tickets; empty array for every other ticket. The usual
-- company/contact fields already identify who's submitting the report, so
-- there's no separate administrator/department/location column.
ALTER TABLE tickets ADD COLUMN routine_checks JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Down Migration

ALTER TABLE tickets DROP COLUMN IF EXISTS routine_checks;
-- Postgres has no ALTER TYPE ... DROP VALUE — reverting the enum value
-- requires manually recreating the type, which node-pg-migrate's down
-- doesn't attempt here (matches how this repo treats other enum additions).

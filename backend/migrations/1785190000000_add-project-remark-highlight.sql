-- Up Migration

-- Lets an assignee/admin flag a remark as important — surfaced in bold in
-- the daily account-manager digest (jobs/dailyDigest.ts) and with an orange
-- cell fill in the project Excel export (controllers/projectExcel.ts).
ALTER TABLE project_remarks ADD COLUMN highlighted BOOLEAN NOT NULL DEFAULT false;

-- Down Migration

ALTER TABLE project_remarks DROP COLUMN IF EXISTS highlighted;

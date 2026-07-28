-- Up Migration

-- "Projects" is a parallel entity to tickets for longer-running work: it has
-- a start date + a duration ("time") instead of a manually-picked deadline
-- (the deadline is computed server-side from start_date + time_value/unit,
-- see utils/projectDeadline.ts), no call_type (every project is implicitly
-- that "type"), no internal_tag, and adds project_components + po_number.
-- Row shape otherwise mirrors tickets (customer snapshot, feedback flow,
-- soft delete, optimistic locking) so it can reuse the same middleware
-- (requireAdmin) and patterns (getOrCreateCustomerId, logActivity).
CREATE TYPE project_time_unit AS ENUM ('Days', 'Weeks', 'Months');

CREATE TABLE projects (
  sr_no SERIAL PRIMARY KEY,
  project_no TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  time_value INTEGER NOT NULL,
  time_unit project_time_unit NOT NULL,
  -- Computed from start_date + time_value/time_unit at write time (never
  -- accepted directly from the client) — stored so it can be indexed and
  -- filtered the same way tickets.deadline_date is for overdue queries.
  deadline_date DATE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  -- Point-in-time snapshot of the customer's details, same rationale as
  -- tickets.company_name/contact_name/... (see schema.sql) — not a live
  -- reference to `customers`. designation/department describe the contact
  -- person specifically for this project, not the company as a whole, so
  -- they live only here, never on the shared `customers` table.
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_no TEXT,
  email_id TEXT,
  designation TEXT,
  department TEXT,
  address TEXT,
  -- Line items for hardware/software delivered on this project — each entry
  -- is {model, quantity, serialNumbers}, e.g. one row per product type
  -- (Server, Storage, Monitor, ...) with its own serial numbers, replacing
  -- the single free-text "model" + "serial number" fields tickets use,
  -- since a project can involve many distinct components at once.
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  po_number TEXT,
  contract_number TEXT,
  problem TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  account_manager TEXT NOT NULL,
  assigned_by TEXT,
  priority ticket_priority NOT NULL DEFAULT 'P3',
  status ticket_status NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  feedback_token TEXT UNIQUE,
  feedback_requested_at TIMESTAMPTZ,
  customer_feedback_rating SMALLINT,
  customer_feedback_comment TEXT,
  customer_feedback_submitted_at TIMESTAMPTZ,
  admin_feedback_response TEXT,
  admin_feedback_responded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_account_manager ON projects(account_manager);
CREATE INDEX idx_projects_owner_user_id ON projects(owner_user_id);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_company_name ON projects(company_name);

CREATE TABLE project_assignees (
  project_sr_no INTEGER NOT NULL REFERENCES projects(sr_no) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_sr_no, user_id)
);

CREATE INDEX idx_project_assignees_user_id ON project_assignees(user_id);

CREATE TABLE project_remarks (
  id SERIAL PRIMARY KEY,
  project_sr_no INTEGER NOT NULL REFERENCES projects(sr_no) ON DELETE CASCADE,
  remark_date DATE NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_remarks_project_sr_no ON project_remarks(project_sr_no);

-- Same atomic per-prefix counter pattern as ticket_number_counters (see
-- utils/ticketNumber.ts) to avoid a race condition on generated numbers.
CREATE TABLE project_number_counters (
  prefix TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_row_version
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION bump_row_version();

-- Let the existing activity log cover project actions too.
ALTER TABLE activity_log ADD COLUMN project_sr_no INTEGER REFERENCES projects(sr_no) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN project_no TEXT;
CREATE INDEX idx_activity_log_project_sr_no ON activity_log(project_sr_no);

-- Down Migration

DROP INDEX IF EXISTS idx_activity_log_project_sr_no;
ALTER TABLE activity_log DROP COLUMN IF EXISTS project_no;
ALTER TABLE activity_log DROP COLUMN IF EXISTS project_sr_no;

DROP TRIGGER IF EXISTS trg_projects_row_version ON projects;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;

DROP TABLE IF EXISTS project_number_counters;
DROP TABLE IF EXISTS project_remarks;
DROP TABLE IF EXISTS project_assignees;
DROP TABLE IF EXISTS projects;

DROP TYPE IF EXISTS project_time_unit;

-- Cygnus Ticketing System schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE ticket_mode AS ENUM ('Whatsapp', 'Call', 'Mail', 'Verbally');
CREATE TYPE call_type AS ENUM ('Warranty', 'AMC', 'OEM', 'Office', 'Installation', 'Project', 'Call', 'Chargeable', 'Non-Chargeable');
CREATE TYPE ticket_status AS ENUM ('Pending', 'In Progress', 'Closed');
CREATE TYPE internal_tag AS ENUM ('Internal', 'External');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  sr_no SERIAL PRIMARY KEY,
  ticket_no TEXT UNIQUE NOT NULL,
  ticket_date DATE NOT NULL,
  mode ticket_mode NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_no TEXT,
  email_id TEXT,
  address TEXT,
  model TEXT,
  serial_number TEXT,
  problem TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  account_manager TEXT NOT NULL,
  assigned_by TEXT,
  call_type call_type NOT NULL,
  assigned_to_user_id INTEGER NOT NULL REFERENCES users(id),
  assigned_to TEXT NOT NULL,
  deadline_date DATE,
  status ticket_status NOT NULL DEFAULT 'Pending',
  feedback TEXT,
  internal_tag internal_tag NOT NULL DEFAULT 'External',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_call_type ON tickets(call_type);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_assigned_to_user_id ON tickets(assigned_to_user_id);
CREATE INDEX idx_tickets_account_manager ON tickets(account_manager);
CREATE INDEX idx_tickets_owner_user_id ON tickets(owner_user_id);
CREATE INDEX idx_tickets_ticket_date ON tickets(ticket_date);
CREATE INDEX idx_tickets_company_name ON tickets(company_name);

CREATE TABLE remarks (
  id SERIAL PRIMARY KEY,
  ticket_sr_no INTEGER NOT NULL REFERENCES tickets(sr_no) ON DELETE CASCADE,
  remark_date DATE NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remarks_ticket_sr_no ON remarks(ticket_sr_no);

CREATE TABLE call_type_targets (
  call_type call_type PRIMARY KEY,
  target_resolution_days INTEGER
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  ticket_sr_no INTEGER REFERENCES tickets(sr_no) ON DELETE SET NULL,
  ticket_no TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_activity_log_ticket_sr_no ON activity_log(ticket_sr_no);
CREATE INDEX idx_activity_log_actor_user_id ON activity_log(actor_user_id);

CREATE TABLE smtp_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  from_address TEXT,
  secure BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT smtp_config_singleton CHECK (id = 1)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

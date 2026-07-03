-- Cygnus Ticketing System schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE ticket_mode AS ENUM ('Whatsapp', 'Call', 'Mail', 'Verbally');
CREATE TYPE call_type AS ENUM ('Warranty', 'AMC', 'OEM', 'Office', 'Installation', 'POC', 'Project', 'Call', 'Chargeable', 'Non-Chargeable');
CREATE TYPE ticket_status AS ENUM ('Pending', 'In Progress', 'Closed');
CREATE TYPE internal_tag AS ENUM ('Internal', 'External');
CREATE TYPE ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE repair_location AS ENUM ('In-House', 'Outsourced');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per distinct company a ticket has ever been logged for — created
-- automatically (see controllers/tickets.ts/excel.ts) whenever a ticket is
-- saved with a company name not seen before. This is what makes "customer
-- history" (all tickets for a company across time) possible without
-- changing how tickets are entered.
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  contact_no TEXT,
  email_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  sr_no SERIAL PRIMARY KEY,
  ticket_no TEXT UNIQUE NOT NULL,
  ticket_date DATE NOT NULL,
  mode ticket_mode NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
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
  priority ticket_priority NOT NULL DEFAULT 'P3',
  -- Manually set target/due date for resolving this ticket — plain field,
  -- no automatic calculation or breach tracking (that was the old SLA
  -- feature, removed; may be reintroduced later as its own thing).
  deadline_date DATE,
  status ticket_status NOT NULL DEFAULT 'Pending',
  feedback TEXT,
  internal_tag internal_tag NOT NULL DEFAULT 'External',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_call_type ON tickets(call_type);
CREATE INDEX idx_tickets_account_manager ON tickets(account_manager);
CREATE INDEX idx_tickets_owner_user_id ON tickets(owner_user_id);
CREATE INDEX idx_tickets_ticket_date ON tickets(ticket_date);
CREATE INDEX idx_tickets_company_name ON tickets(company_name);

-- Many-to-many: a ticket can have multiple assignees, all of whom get full
-- edit rights (see requireAssigneeOrAdmin). No denormalized name column —
-- always join to users for display_name, since this repo already has one
-- staleness gap from denormalizing names (customers.name copy) and there's
-- no need to repeat it here.
CREATE TABLE ticket_assignees (
  ticket_sr_no INTEGER NOT NULL REFERENCES tickets(sr_no) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (ticket_sr_no, user_id)
);

CREATE INDEX idx_ticket_assignees_user_id ON ticket_assignees(user_id);

CREATE TABLE remarks (
  id SERIAL PRIMARY KEY,
  ticket_sr_no INTEGER NOT NULL REFERENCES tickets(sr_no) ON DELETE CASCADE,
  remark_date DATE NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remarks_ticket_sr_no ON remarks(ticket_sr_no);

-- One row per ticket (not per serial number) tracking the physical
-- inward/outward movement of whatever product(s) came in for repair —
-- quantity is derived from tickets.serial_number (comma-separated) rather
-- than stored here, since all units on a ticket move in/out together.
CREATE TABLE ticket_inventory (
  ticket_sr_no INTEGER PRIMARY KEY REFERENCES tickets(sr_no) ON DELETE CASCADE,
  inward_date DATE,
  outward_date DATE,
  repair_location repair_location NOT NULL DEFAULT 'In-House',
  outsource_vendor TEXT,
  expected_return_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TRIGGER trg_ticket_inventory_updated_at
BEFORE UPDATE ON ticket_inventory
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

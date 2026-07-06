import fs from "fs";
import path from "path";
import { pool } from "./pool";

// Statements here run every time, even on databases that already have the
// `tickets` table — schema.sql below only applies once, on a brand new
// database, so any addition to an existing deployment's schema must also be
// listed here as an idempotent (IF NOT EXISTS) statement.
const ADDITIVE_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    ticket_sr_no INTEGER REFERENCES tickets(sr_no) ON DELETE SET NULL,
    ticket_no TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_sr_no ON activity_log(ticket_sr_no)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_log_actor_user_id ON activity_log(actor_user_id)`,
  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    contact_name TEXT,
    contact_no TEXT,
    email_id TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id)`,
  // Backfill: one customer row per distinct existing company name, then
  // link every ticket to it. Safe to re-run — ON CONFLICT/WHERE NULL guards
  // make both statements no-ops once already applied.
  `INSERT INTO customers (name, contact_name, contact_no, email_id, address)
   SELECT DISTINCT ON (company_name) company_name, contact_name, contact_no, email_id, address
   FROM tickets
   ORDER BY company_name, created_at DESC
   ON CONFLICT (name) DO NOTHING`,
  `UPDATE tickets SET customer_id = customers.id
   FROM customers
   WHERE tickets.customer_id IS NULL AND tickets.company_name = customers.name`,
  // SLA feature removed (to be reimplemented later) in favor of a manual
  // priority field. deadline_date stays — it's now a plain, manually-set
  // field with no auto-calculation or breach tracking attached to it.
  `DO $$ BEGIN
     CREATE TYPE ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority ticket_priority NOT NULL DEFAULT 'P3'`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)`,
  `DROP TABLE IF EXISTS call_type_targets`,
  // "POC" was added to the CALL_TYPES const/dropdown without a matching
  // enum migration — ADD VALUE IF NOT EXISTS keeps this safe to re-run.
  `ALTER TYPE call_type ADD VALUE IF NOT EXISTS 'POC'`,
  // Per-ticket inward/outward repair tracking (Inventory page).
  `DO $$ BEGIN
     CREATE TYPE repair_location AS ENUM ('In-House', 'Outsourced');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS ticket_inventory (
    ticket_sr_no INTEGER PRIMARY KEY REFERENCES tickets(sr_no) ON DELETE CASCADE,
    inward_date DATE,
    outward_date DATE,
    repair_location repair_location NOT NULL DEFAULT 'In-House',
    outsource_vendor TEXT,
    expected_return_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DROP TRIGGER IF EXISTS trg_ticket_inventory_updated_at ON ticket_inventory`,
  `CREATE TRIGGER trg_ticket_inventory_updated_at
   BEFORE UPDATE ON ticket_inventory
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at()`,
  // Multi-assignee tickets: replaces the single assigned_to_user_id/
  // assigned_to columns with a join table.
  `CREATE TABLE IF NOT EXISTS ticket_assignees (
    ticket_sr_no INTEGER NOT NULL REFERENCES tickets(sr_no) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (ticket_sr_no, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user_id ON ticket_assignees(user_id)`,
  // Backfill + drop the old columns in one guarded block, keyed on the
  // column still existing — the backfill SELECT references
  // assigned_to_user_id, so this whole block must become a no-op (not
  // error) on every deploy after the first time it runs, once that column
  // is gone.
  `DO $$ BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'tickets' AND column_name = 'assigned_to_user_id'
     ) THEN
       INSERT INTO ticket_assignees (ticket_sr_no, user_id)
       SELECT sr_no, assigned_to_user_id FROM tickets
       WHERE assigned_to_user_id IS NOT NULL
       ON CONFLICT (ticket_sr_no, user_id) DO NOTHING;
       DROP INDEX IF EXISTS idx_tickets_assigned_to;
       DROP INDEX IF EXISTS idx_tickets_assigned_to_user_id;
       ALTER TABLE tickets DROP COLUMN assigned_to_user_id;
       ALTER TABLE tickets DROP COLUMN assigned_to;
     END IF;
   END $$`,
  // Outward-date email notification + customer feedback form (public,
  // tokenized link emailed 24h after a ticket closes).
  `CREATE TABLE IF NOT EXISTS smtp_config (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    host TEXT,
    port INTEGER,
    username TEXT,
    password TEXT,
    from_address TEXT,
    secure BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT smtp_config_singleton CHECK (id = 1)
  )`,
  `ALTER TABLE ticket_inventory ADD COLUMN IF NOT EXISTS outward_notified_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_token TEXT UNIQUE`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_feedback_rating SMALLINT`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_feedback_comment TEXT`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_feedback_submitted_at TIMESTAMPTZ`,
];

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets'`
    );
    if (existing.rowCount && existing.rowCount > 0) {
      console.log("Schema already applied, running additive migrations only.");
      for (const statement of ADDITIVE_MIGRATIONS) {
        await client.query(statement);
      }
      console.log("Additive migrations applied successfully.");
      return;
    }
    await client.query(sql);
    console.log("Migration applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

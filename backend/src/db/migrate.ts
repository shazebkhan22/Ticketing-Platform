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

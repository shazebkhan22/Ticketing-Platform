import fs from "fs";
import path from "path";
import { pool } from "./pool";

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets'`
    );
    if (existing.rowCount && existing.rowCount > 0) {
      console.log("Schema already applied, skipping.");
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

import fs from "fs";
import path from "path";
import { Client } from "pg";
import bcrypt from "bcrypt";
import { beforeAll, afterAll } from "vitest";
import { TEST_ADMIN } from "./testUsers";

// Point the app at a disposable test database instead of dev/prod — set
// before any other module (app.ts, db/pool.ts) is imported by a test file,
// since env.ts reads process.env exactly once at first import.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://cygnus:cygnus_dev_password@localhost:5432/cygnus_ticketing_test";
process.env.SESSION_SECRET ??= "test-session-secret-not-for-production";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.NODE_ENV = "test";

beforeAll(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Reset to a clean slate every run rather than assuming prior state,
  // so tests are deterministic locally and in CI alike.
  await client.query("DROP SCHEMA public CASCADE");
  await client.query("CREATE SCHEMA public");

  const schemaSql = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf-8");
  await client.query(schemaSql);

  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);
  await client.query(
    `INSERT INTO users (username, password_hash, role, display_name, email)
     VALUES ($1, $2, 'admin', 'Test Admin', 'test_admin@example.com')`,
    [TEST_ADMIN.username, passwordHash]
  );

  await client.end();
}, 30000);

afterAll(async () => {
  const { pool } = await import("../db/pool");
  await pool.end();
});

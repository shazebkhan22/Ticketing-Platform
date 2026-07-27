import { Pool, types } from "pg";
import { env } from "../config/env";

// pg's default DATE parser builds a JS Date at LOCAL midnight, then
// Express's res.json() serializes it with toJSON() (always UTC) — on a
// server whose timezone isn't UTC, that round-trip shifts the date by a
// day. DATE columns here are plain calendar dates with no time component,
// so keep them as the raw "YYYY-MM-DD" string pg already gives us.
types.setTypeParser(types.builtins.DATE, (value) => value);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  // How long an idle connection sits in the pool before being closed.
  idleTimeoutMillis: 30_000,
  // How long to wait for a connection to become available before giving up
  // (instead of queuing forever if the pool is exhausted).
  connectionTimeoutMillis: 5_000,
  // Passed through to Postgres itself (SET statement_timeout) — kills a
  // runaway query server-side instead of letting it hold a pool connection
  // hostage indefinitely.
  statement_timeout: env.dbStatementTimeoutMs,
});

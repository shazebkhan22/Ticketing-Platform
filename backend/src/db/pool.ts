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
});

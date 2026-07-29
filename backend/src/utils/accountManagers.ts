import { pool } from "../db/pool";

// Shared by controllers/tickets.ts and controllers/projects.ts: both keep a
// denormalized account_manager TEXT column (display/filters/exports) in
// sync with account_manager_id, which is the only thing the daily remarks
// digest (jobs/dailyDigest.ts) can actually resolve to an email address.
export async function resolveAccountManagerName(accountManagerId: number): Promise<string | null> {
  const result = await pool.query("SELECT name FROM account_managers WHERE id = $1", [accountManagerId]);
  return result.rows[0]?.name ?? null;
}

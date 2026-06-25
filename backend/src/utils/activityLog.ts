import { pool } from "../db/pool";

export interface LogActivityInput {
  actorUserId?: number | null;
  actorName: string;
  action: string;
  ticketSrNo?: number | null;
  ticketNo?: string | null;
  details?: string | null;
}

// Fire-and-forget by design: a logging failure must never block or fail the
// ticket mutation that triggered it, so errors are caught and only logged.
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, ticket_sr_no, ticket_no, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.actorUserId ?? null,
        input.actorName,
        input.action,
        input.ticketSrNo ?? null,
        input.ticketNo ?? null,
        input.details ?? null,
      ]
    );
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

import { pool } from "../db/pool";
import { logger } from "./logger";

export interface LogActivityInput {
  actorUserId?: number | null;
  actorName: string;
  action: string;
  ticketSrNo?: number | null;
  ticketNo?: string | null;
  projectSrNo?: number | null;
  projectNo?: string | null;
  details?: string | null;
}

// Fire-and-forget by design: a logging failure must never block or fail the
// ticket/project mutation that triggered it, so errors are caught and only logged.
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, ticket_sr_no, ticket_no, project_sr_no, project_no, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.actorUserId ?? null,
        input.actorName,
        input.action,
        input.ticketSrNo ?? null,
        input.ticketNo ?? null,
        input.projectSrNo ?? null,
        input.projectNo ?? null,
        input.details ?? null,
      ]
    );
  } catch (err) {
    logger.error({ err }, "Failed to write activity log");
  }
}

import { Request, Response } from "express";
import { pool } from "../db/pool";

export async function listActivity(req: Request, res: Response) {
  const {
    ticketSrNo,
    projectSrNo,
    actorUserId,
    action,
    dateFrom,
    dateTo,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];

  if (ticketSrNo) {
    params.push(ticketSrNo);
    conditions.push(`al.ticket_sr_no = $${params.length}`);
  }
  if (projectSrNo) {
    params.push(projectSrNo);
    conditions.push(`al.project_sr_no = $${params.length}`);
  }
  if (actorUserId) {
    params.push(actorUserId);
    conditions.push(`al.actor_user_id = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`al.created_at >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`al.created_at < ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  // actor_name on the row is a username snapshot from when the action
  // happened — prefer the user's current display_name via the FK, falling
  // back to that snapshot only if the user's since been deleted.
  const query = `
    SELECT al.id, al.actor_user_id, COALESCE(u.display_name, al.actor_name) AS actor_name,
      al.action, al.ticket_sr_no, al.ticket_no, al.project_sr_no, al.project_no, al.details, al.created_at
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.actor_user_id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const countQuery = `SELECT COUNT(*) FROM activity_log al ${whereClause}`;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params),
  ]);

  res.json({
    entries: rowsResult.rows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id,
      actorName: r.actor_name,
      action: r.action,
      ticketSrNo: r.ticket_sr_no,
      ticketNo: r.ticket_no,
      projectSrNo: r.project_sr_no,
      projectNo: r.project_no,
      details: r.details,
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count, 10),
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: limit,
  });
}

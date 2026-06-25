import { Request, Response } from "express";
import { pool } from "../db/pool";

export async function listActivity(req: Request, res: Response) {
  const {
    ticketSrNo,
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
    conditions.push(`ticket_sr_no = $${params.length}`);
  }
  if (actorUserId) {
    params.push(actorUserId);
    conditions.push(`actor_user_id = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const query = `
    SELECT id, actor_user_id, actor_name, action, ticket_sr_no, ticket_no, details, created_at
    FROM activity_log
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const countQuery = `SELECT COUNT(*) FROM activity_log ${whereClause}`;

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
      details: r.details,
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count, 10),
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: limit,
  });
}

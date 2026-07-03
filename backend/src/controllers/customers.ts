import { Request, Response } from "express";
import { pool } from "../db/pool";

export async function listCustomers(req: Request, res: Response) {
  const {
    search,
    page = "1",
    pageSize = "7",
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`c.name ILIKE $${params.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = Math.min(parseInt(pageSize, 10) || 7, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT
        c.id, c.name, c.contact_name, c.contact_no, c.email_id, c.address, c.created_at,
        COUNT(t.sr_no) AS ticket_count,
        COUNT(t.sr_no) FILTER (WHERE t.status <> 'Closed') AS open_ticket_count,
        MAX(t.ticket_date) AS last_ticket_date
      FROM customers c
      LEFT JOIN tickets t ON t.customer_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    pool.query(`SELECT COUNT(*) FROM customers c ${whereClause}`, params),
  ]);

  res.json({
    customers: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      contactName: r.contact_name,
      contactNo: r.contact_no,
      emailId: r.email_id,
      address: r.address,
      createdAt: r.created_at,
      ticketCount: parseInt(r.ticket_count, 10),
      openTicketCount: parseInt(r.open_ticket_count, 10),
      lastTicketDate: r.last_ticket_date,
    })),
    total: parseInt(countResult.rows[0].count, 10),
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: limit,
  });
}

export async function getCustomer(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);

  const customerResult = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
  if (customerResult.rows.length === 0) {
    return res.status(404).json({ error: "Customer not found" });
  }
  const c = customerResult.rows[0];

  const ticketsResult = await pool.query(
    `SELECT t.sr_no, t.ticket_no, t.ticket_date, t.call_type, t.status, t.priority, t.problem,
       t.deadline_date, t.closed_at, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM tickets t
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object('id', ta.user_id, 'displayName', u.display_name) ORDER BY u.display_name) AS assignees
       FROM ticket_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.ticket_sr_no = t.sr_no
     ) assignee_agg ON true
     WHERE t.customer_id = $1 ORDER BY t.sr_no DESC`,
    [id]
  );

  res.json({
    customer: {
      id: c.id,
      name: c.name,
      contactName: c.contact_name,
      contactNo: c.contact_no,
      emailId: c.email_id,
      address: c.address,
      createdAt: c.created_at,
    },
    tickets: ticketsResult.rows.map((r) => ({
      srNo: r.sr_no,
      ticketNo: r.ticket_no,
      ticketDate: r.ticket_date,
      callType: r.call_type,
      status: r.status,
      priority: r.priority,
      problem: r.problem,
      assignees: r.assignees ?? [],
      deadlineDate: r.deadline_date,
      closedAt: r.closed_at,
    })),
  });
}

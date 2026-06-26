import { Request, Response } from "express";
import { pool } from "../db/pool";

export async function listCustomers(req: Request, res: Response) {
  const { search } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`c.name ILIKE $${params.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT
      c.id, c.name, c.contact_name, c.contact_no, c.email_id, c.address, c.created_at,
      COUNT(t.sr_no) AS ticket_count,
      COUNT(t.sr_no) FILTER (WHERE t.status <> 'Closed') AS open_ticket_count,
      MAX(t.ticket_date) AS last_ticket_date
    FROM customers c
    LEFT JOIN tickets t ON t.customer_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.name`,
    params
  );

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
    `SELECT sr_no, ticket_no, ticket_date, call_type, status, problem, assigned_to, deadline_date, closed_at
     FROM tickets WHERE customer_id = $1 ORDER BY sr_no DESC`,
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
      problem: r.problem,
      assignedTo: r.assigned_to,
      deadlineDate: r.deadline_date,
      closedAt: r.closed_at,
    })),
  });
}

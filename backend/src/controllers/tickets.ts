import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateTicketNumber } from "../utils/ticketNumber";
import { logActivity } from "../utils/activityLog";
import { getOrCreateCustomerId } from "../utils/customers";
import {
  TICKET_MODES,
  CALL_TYPES,
  TICKET_STATUSES,
  INTERNAL_TAGS,
  TICKET_PRIORITIES,
} from "../types/ticket";

const createTicketSchema = z.object({
  ticketDate: z.string(),
  mode: z.enum(TICKET_MODES),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactNo: z.string().min(1),
  emailId: z.string().email(),
  address: z.string().min(1),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  problem: z.string().min(1),
  // Account Manager = whoever in the office reported/raised this issue — free
  // text, NOT the logged-in user. Can be anybody, not just the 5 platform users.
  accountManager: z.string().min(1),
  // Assigned By = whoever in the company assigned/raised this ticket — free
  // text just like accountManager, can be anybody, not limited to platform users.
  assignedBy: z.string().min(1),
  callType: z.enum(CALL_TYPES),
  // Assigned To = which of the 5 platform employees will resolve this ticket.
  // Stored as a user id (must reference an existing user); edit/delete rights
  // follow this field, not who created the ticket.
  assignedToUserId: z.coerce.number().int().positive(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  deadlineDate: z.string().optional(),
  internalTag: z.enum(INTERNAL_TAGS).optional(),
});

const updateTicketSchema = createTicketSchema.partial();

const statusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

const remarkSchema = z.object({
  body: z.string().min(1),
  remarkDate: z.string().optional(),
});

function rowToTicket(row: any) {
  return {
    srNo: row.sr_no,
    ticketNo: row.ticket_no,
    ticketDate: row.ticket_date,
    mode: row.mode,
    customerId: row.customer_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactNo: row.contact_no,
    emailId: row.email_id,
    address: row.address,
    model: row.model,
    serialNumber: row.serial_number,
    problem: row.problem,
    ownerUserId: row.owner_user_id,
    accountManager: row.account_manager,
    assignedBy: row.assigned_by,
    callType: row.call_type,
    assignedToUserId: row.assigned_to_user_id,
    assignedTo: row.assigned_to,
    priority: row.priority,
    deadlineDate: row.deadline_date,
    status: row.status,
    feedback: row.feedback,
    internalTag: row.internal_tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    lastRemark: row.last_remark ?? undefined,
  };
}

export async function listTickets(req: Request, res: Response) {
  const {
    status,
    callType,
    assignedTo,
    assignedBy,
    accountManager,
    priority,
    dateFrom,
    dateTo,
    search,
    overdue,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (callType) {
    params.push(callType);
    conditions.push(`t.call_type = $${params.length}`);
  }
  if (assignedTo) {
    params.push(assignedTo);
    conditions.push(`t.assigned_to = $${params.length}`);
  }
  if (accountManager) {
    params.push(accountManager);
    conditions.push(`t.account_manager = $${params.length}`);
  }
  if (assignedBy) {
    params.push(assignedBy);
    conditions.push(`t.assigned_by = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`t.ticket_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`t.ticket_date <= $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    conditions.push(`t.priority = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(t.company_name ILIKE $${params.length} OR t.ticket_no ILIKE $${params.length})`);
  }
  if (overdue === "true") {
    conditions.push(
      `t.status IN ('Pending', 'In Progress') AND t.deadline_date IS NOT NULL AND t.deadline_date < CURRENT_DATE`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const query = `
    SELECT t.*, (
      SELECT r.body FROM remarks r WHERE r.ticket_sr_no = t.sr_no ORDER BY r.created_at DESC LIMIT 1
    ) AS last_remark
    FROM tickets t
    ${whereClause}
    ORDER BY t.sr_no DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countQuery = `SELECT COUNT(*) FROM tickets t ${whereClause}`;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params),
  ]);

  res.json({
    tickets: rowsResult.rows.map(rowToTicket),
    total: parseInt(countResult.rows[0].count, 10),
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: limit,
  });
}

export async function getSummary(req: Request, res: Response) {
  const { assignedTo } = req.query as Record<string, string>;
  const whereClause = assignedTo ? "WHERE t.assigned_to = $1" : "";
  const params = assignedTo ? [assignedTo] : [];

  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'Closed') AS closed,
      COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
      COUNT(*) FILTER (WHERE status IN ('Pending', 'In Progress') AND deadline_date IS NOT NULL AND deadline_date < CURRENT_DATE) AS overdue
    FROM tickets t
    ${whereClause}
  `,
    params
  );
  const row = result.rows[0];
  res.json({
    total: parseInt(row.total, 10),
    pending: parseInt(row.pending, 10),
    closed: parseInt(row.closed, 10),
    inProgress: parseInt(row.in_progress, 10),
    overdue: parseInt(row.overdue, 10),
  });
}

export async function getTicket(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const result = await pool.query(`SELECT t.* FROM tickets t WHERE t.sr_no = $1`, [srNo]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const remarksResult = await pool.query(
    "SELECT id, remark_date, body, created_by, created_at FROM remarks WHERE ticket_sr_no = $1 ORDER BY created_at ASC",
    [srNo]
  );
  res.json({
    ticket: rowToTicket(result.rows[0]),
    remarks: remarksResult.rows.map((r) => ({
      id: r.id,
      remarkDate: r.remark_date,
      body: r.body,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
  });
}

export async function createTicket(req: Request, res: Response) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;
  const ticketDate = new Date(d.ticketDate);
  const ticketNo = await generateTicketNumber(ticketDate);

  // owner_user_id is informational (who logged the ticket); it is NOT the
  // permission basis — that's assigned_to_user_id, resolved below.
  const ownerUserId = req.session.userId;

  // Employees may only assign tickets to themselves; admins can assign to
  // anyone (including themselves or another admin).
  if (req.session.role !== "admin" && d.assignedToUserId !== req.session.userId) {
    return res.status(403).json({ error: "You can only assign tickets to yourself" });
  }

  const assigneeResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [
    d.assignedToUserId,
  ]);
  if (assigneeResult.rows.length === 0) {
    return res.status(400).json({ error: "assignedToUserId does not reference a valid user" });
  }
  const assignedToName = assigneeResult.rows[0].display_name;

  const customerId = await getOrCreateCustomerId({
    companyName: d.companyName,
    contactName: d.contactName,
    contactNo: d.contactNo,
    emailId: d.emailId,
    address: d.address,
  });

  const result = await pool.query(
    `INSERT INTO tickets (
      ticket_no, ticket_date, mode, customer_id, company_name, contact_name, contact_no, email_id, address,
      model, serial_number, problem, owner_user_id, account_manager, assigned_by, call_type,
      assigned_to_user_id, assigned_to, priority, deadline_date, internal_tag
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *`,
    [
      ticketNo,
      d.ticketDate,
      d.mode,
      customerId,
      d.companyName,
      d.contactName ?? null,
      d.contactNo ?? null,
      d.emailId || null,
      d.address ?? null,
      d.model ?? null,
      d.serialNumber ?? null,
      d.problem,
      ownerUserId,
      d.accountManager,
      d.assignedBy,
      d.callType,
      d.assignedToUserId,
      assignedToName,
      d.priority ?? "P3",
      d.deadlineDate || null,
      d.internalTag ?? "External",
    ]
  );

  const ticket = result.rows[0];

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Created ticket",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
  });

  res.status(201).json(rowToTicket(ticket));
}

export async function updateTicket(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  const fieldMap: Record<string, string> = {
    ticketDate: "ticket_date",
    mode: "mode",
    companyName: "company_name",
    contactName: "contact_name",
    contactNo: "contact_no",
    emailId: "email_id",
    address: "address",
    model: "model",
    serialNumber: "serial_number",
    problem: "problem",
    accountManager: "account_manager",
    assignedBy: "assigned_by",
    callType: "call_type",
    priority: "priority",
    deadlineDate: "deadline_date",
    internalTag: "internal_tag",
  };

  const setClauses: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in d) {
      // deadline_date is a nullable DATE column — Postgres rejects "" for
      // DATE (unlike the other, TEXT-typed nullable columns here), so an
      // emptied-out deadline field has to become NULL, not "".
      const value = key === "deadlineDate" ? (d as any)[key] || null : (d as any)[key];
      params.push(value);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  // Reassigning a ticket updates both the FK and the denormalized display
  // name together, so they never drift apart.
  if (d.assignedToUserId !== undefined) {
    // Employees may only reassign tickets to themselves; admins can assign
    // to anyone (including themselves or another admin).
    if (req.session.role !== "admin" && d.assignedToUserId !== req.session.userId) {
      return res.status(403).json({ error: "You can only assign tickets to yourself" });
    }
    const assigneeResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [
      d.assignedToUserId,
    ]);
    if (assigneeResult.rows.length === 0) {
      return res.status(400).json({ error: "assignedToUserId does not reference a valid user" });
    }
    params.push(d.assignedToUserId);
    setClauses.push(`assigned_to_user_id = $${params.length}`);
    params.push(assigneeResult.rows[0].display_name);
    setClauses.push(`assigned_to = $${params.length}`);
  }

  // Editing the company name re-links to (or creates) the matching customer
  // row, the same way creation does, so customer history stays accurate.
  if (d.companyName !== undefined) {
    const customerId = await getOrCreateCustomerId({
      companyName: d.companyName,
      contactName: d.contactName,
      contactNo: d.contactNo,
      emailId: d.emailId,
      address: d.address,
    });
    params.push(customerId);
    setClauses.push(`customer_id = $${params.length}`);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  params.push(srNo);
  const result = await pool.query(
    `UPDATE tickets SET ${setClauses.join(", ")} WHERE sr_no = $${params.length} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const ticket = result.rows[0];
  const changedFields = Object.keys(d);
  if (d.assignedToUserId !== undefined) {
    changedFields.push("assignedTo");
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Updated ticket",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
    details: `Changes in ticket`,
  });

  res.json(rowToTicket(ticket));
}

export async function updateTicketStatus(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const closedAtClause = parsed.data.status === "Closed" ? ", closed_at = now()" : "";
  const result = await pool.query(
    `UPDATE tickets SET status = $1${closedAtClause} WHERE sr_no = $2 RETURNING *`,
    [parsed.data.status, srNo]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const ticket = result.rows[0];

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Changed status",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
    details: `New status: ${parsed.data.status}`,
  });

  res.json(rowToTicket(ticket));
}

const feedbackSchema = z.object({
  feedback: z.string().max(50),
});

export async function updateFeedback(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await pool.query("SELECT status FROM tickets WHERE sr_no = $1", [srNo]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const result = await pool.query(
    `UPDATE tickets SET feedback = $1 WHERE sr_no = $2 RETURNING *`,
    [parsed.data.feedback, srNo]
  );
  const ticket = result.rows[0];

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Added feedback",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
    details: parsed.data.feedback,
  });

  res.json(rowToTicket(ticket));
}

export async function deleteTicket(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const result = await pool.query("DELETE FROM tickets WHERE sr_no = $1 RETURNING sr_no, ticket_no", [
    srNo,
  ]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Deleted ticket",
    ticketSrNo: null,
    ticketNo: result.rows[0].ticket_no,
  });

  res.json({ success: true });
}

export async function addRemark(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = remarkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const ticketExists = await pool.query("SELECT ticket_no FROM tickets WHERE sr_no = $1", [srNo]);
  if (ticketExists.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const remarkDate = parsed.data.remarkDate ?? new Date().toISOString().slice(0, 10);
  const createdBy = req.session.username ?? null;

  const result = await pool.query(
    `INSERT INTO remarks (ticket_sr_no, remark_date, body, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [srNo, remarkDate, parsed.data.body, createdBy]
  );

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Added remark",
    ticketSrNo: srNo,
    ticketNo: ticketExists.rows[0].ticket_no,
    details: parsed.data.body,
  });

  res.status(201).json({
    id: result.rows[0].id,
    remarkDate: result.rows[0].remark_date,
    body: result.rows[0].body,
    createdBy: result.rows[0].created_by,
    createdAt: result.rows[0].created_at,
  });
}

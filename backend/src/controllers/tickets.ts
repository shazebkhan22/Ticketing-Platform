import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateTicketNumber } from "../utils/ticketNumber";
import { logActivity } from "../utils/activityLog";
import { getOrCreateCustomerId } from "../utils/customers";
import { resolveAccountManagerName } from "../utils/accountManagers";
import { broadcastEvent } from "../utils/sse";
import { sendMail } from "../utils/mailer";
import { renderEmailHtml } from "../utils/emailTemplate";
import { isLegalStatusTransition, allowedSourceStatuses } from "../utils/statusTransitions";
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
  // Account Manager = whoever in the office reported/raised this issue.
  // Used to be free text; now picked from the shared account_managers
  // directory (see migrations/1785160000000_add-account-managers.sql) so
  // every ticket resolves to a real email, same as projects.
  accountManagerId: z.coerce.number().int().positive(),
  // Assigned By = whoever in the company assigned/raised this ticket — free
  // text just like accountManager, can be anybody, not limited to platform users.
  assignedBy: z.string().min(1),
  callType: z.enum(CALL_TYPES),
  // Assigned To = which of the platform employees will resolve this ticket.
  // A ticket can have multiple assignees, all of whom get full edit/delete
  // rights (see requireTicketAssigneeOrAdmin) — this is the actual permission
  // record, not who created the ticket.
  assigneeUserIds: z.array(z.coerce.number().int().positive()).min(1, "At least one assignee required"),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  deadlineDate: z.string().optional(),
  internalTag: z.enum(INTERNAL_TAGS).optional(),
});

const updateTicketSchema = createTicketSchema.partial().extend({
  // Optimistic concurrency: the client must send back the row_version it
  // last read. A stale value means someone else edited this ticket first —
  // updateTicket() below turns that mismatch into a 409, instead of the
  // update silently overwriting their change.
  rowVersion: z.number().int().positive(),
});

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
    accountManagerId: row.account_manager_id,
    assignedBy: row.assigned_by,
    callType: row.call_type,
    assignees: row.assignees ?? [],
    priority: row.priority,
    deadlineDate: row.deadline_date,
    status: row.status,
    customerFeedbackRating: row.customer_feedback_rating,
    customerFeedbackComment: row.customer_feedback_comment,
    customerFeedbackSubmittedAt: row.customer_feedback_submitted_at,
    adminFeedbackResponse: row.admin_feedback_response,
    adminFeedbackRespondedAt: row.admin_feedback_responded_at,
    adminFeedbackRespondedBy: row.admin_feedback_responded_by,
    internalTag: row.internal_tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    lastRemark: row.last_remark ?? undefined,
    rowVersion: row.row_version,
    inInventory: row.in_inventory ?? false,
    inventoryPending: row.inventory_pending ?? false,
  };
}

// Aggregates each ticket's assignees into a JSON array of {id, displayName}
// via a lateral join, so list/detail queries stay "one row per ticket" and
// can keep using t.* + pagination/ORDER BY without a GROUP BY.
const ASSIGNEES_LATERAL_JOIN = `
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', ta.user_id, 'displayName', u.display_name, 'team', u.team) ORDER BY u.display_name) AS assignees
    FROM ticket_assignees ta
    JOIN users u ON u.id = ta.user_id
    WHERE ta.ticket_sr_no = t.sr_no
  ) assignee_agg ON true
`;

export async function listTickets(req: Request, res: Response) {
  const {
    status,
    callType,
    assigneeUserId,
    assignedBy,
    accountManager,
    priority,
    team,
    dateFrom,
    dateTo,
    search,
    overdue,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string>;

  const conditions: string[] = ["t.deleted_at IS NULL"];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (callType) {
    params.push(callType);
    conditions.push(`t.call_type = $${params.length}`);
  }
  if (assigneeUserId) {
    params.push(parseInt(assigneeUserId, 10));
    conditions.push(
      `EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_sr_no = t.sr_no AND ta.user_id = $${params.length})`
    );
  }
  if (team) {
    params.push(team);
    conditions.push(
      `EXISTS (SELECT 1 FROM ticket_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.ticket_sr_no = t.sr_no AND u.team = $${params.length})`
    );
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

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const query = `
    SELECT t.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees, (
      SELECT r.body FROM remarks r WHERE r.ticket_sr_no = t.sr_no ORDER BY r.created_at DESC LIMIT 1
    ) AS last_remark
    FROM tickets t
    ${ASSIGNEES_LATERAL_JOIN}
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
  const { assigneeUserId } = req.query as Record<string, string>;
  const whereClause = assigneeUserId
    ? "WHERE t.deleted_at IS NULL AND EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_sr_no = t.sr_no AND ta.user_id = $1)"
    : "WHERE t.deleted_at IS NULL";
  const params = assigneeUserId ? [parseInt(assigneeUserId, 10)] : [];

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
  const result = await pool.query(
    `SELECT t.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees,
       EXISTS (SELECT 1 FROM ticket_inventory i WHERE i.ticket_sr_no = t.sr_no) AS in_inventory,
       EXISTS (SELECT 1 FROM ticket_inventory i WHERE i.ticket_sr_no = t.sr_no AND i.outward_date IS NULL) AS inventory_pending
     FROM tickets t
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE t.sr_no = $1 AND t.deleted_at IS NULL`,
    [srNo]
  );
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

// Validates a proposed assignee set against the confirmed permission rule:
// admins may assign to any mix of admins/employees; non-admins must include
// themselves and may only add other employees (never an admin).
async function resolveAssignees(
  req: Request,
  ids: number[]
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const usersResult = await pool.query("SELECT id, role FROM users WHERE id = ANY($1)", [ids]);
  if (usersResult.rows.length !== new Set(ids).size) {
    return { ok: false, status: 400, error: "One or more assignees do not reference a valid user" };
  }
  if (req.session.role !== "admin") {
    if (!ids.includes(req.session.userId!)) {
      return { ok: false, status: 403, error: "You must include yourself as an assignee" };
    }
    if (usersResult.rows.some((r) => r.role === "admin")) {
      return { ok: false, status: 403, error: "Employees cannot assign tickets to an admin" };
    }
  }
  return { ok: true };
}

async function insertAssignees(
  queryable: Pick<typeof pool, "query">,
  ticketSrNo: number,
  userIds: number[]
) {
  const values = userIds.map((_, i) => `($1, $${i + 2})`).join(", ");
  await queryable.query(`INSERT INTO ticket_assignees (ticket_sr_no, user_id) VALUES ${values}`, [
    ticketSrNo,
    ...userIds,
  ]);
}

export async function createTicket(req: Request, res: Response) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  if (d.deadlineDate && d.deadlineDate < d.ticketDate) {
    return res.status(400).json({ error: "Deadline cannot be before the ticket date" });
  }

  const assigneeCheck = await resolveAssignees(req, d.assigneeUserIds);
  if (!assigneeCheck.ok) {
    return res.status(assigneeCheck.status).json({ error: assigneeCheck.error });
  }

  const accountManagerName = await resolveAccountManagerName(d.accountManagerId);
  if (accountManagerName === null) {
    return res.status(400).json({ error: "Invalid account manager" });
  }

  const ticketDate = new Date(d.ticketDate);
  const ticketNo = await generateTicketNumber(ticketDate);

  // owner_user_id is informational (who logged the ticket); it is NOT the
  // permission basis — that's ticket_assignees, resolved above.
  const ownerUserId = req.session.userId;

  const customerId = await getOrCreateCustomerId({
    companyName: d.companyName,
    contactName: d.contactName,
    contactNo: d.contactNo,
    emailId: d.emailId,
    address: d.address,
  });

  // The ticket row and its assignee set must land together — a crash or
  // error between the two would otherwise leave an assignee-less ticket
  // that no one has permission to see or edit.
  const client = await pool.connect();
  let ticket;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO tickets (
        ticket_no, ticket_date, mode, customer_id, company_name, contact_name, contact_no, email_id, address,
        model, serial_number, problem, owner_user_id, account_manager, account_manager_id, assigned_by, call_type,
        priority, deadline_date, internal_tag
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
        accountManagerName,
        d.accountManagerId,
        d.assignedBy,
        d.callType,
        d.priority ?? "P3",
        d.deadlineDate || null,
        d.internalTag ?? "External",
      ]
    );
    ticket = result.rows[0];
    await insertAssignees(client, ticket.sr_no, d.assigneeUserIds);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Created ticket",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
  });

  const created = await pool.query(
    `SELECT t.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM tickets t
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE t.sr_no = $1`,
    [ticket.sr_no]
  );

  broadcastEvent(
    "ticket:created",
    {
      srNo: ticket.sr_no,
      ticketNo: ticket.ticket_no,
      companyName: ticket.company_name,
      createdBy: req.session.username ?? "Unknown",
    },
    req.session.userId
  );

  res.status(201).json(rowToTicket(created.rows[0]));
}

export async function updateTicket(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  if (d.ticketDate !== undefined || d.deadlineDate !== undefined) {
    const existing = await pool.query(
      "SELECT ticket_date, deadline_date FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
      [srNo]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const effectiveTicketDate = d.ticketDate ?? existing.rows[0].ticket_date;
    const effectiveDeadlineDate = d.deadlineDate ?? existing.rows[0].deadline_date;
    if (effectiveDeadlineDate && effectiveTicketDate && effectiveDeadlineDate < effectiveTicketDate) {
      return res.status(400).json({ error: "Deadline cannot be before the ticket date" });
    }
  }

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

  // account_manager (text) is always kept in sync with account_manager_id —
  // never set independently, unlike the plain scalar fields above.
  if (d.accountManagerId !== undefined) {
    const accountManagerName = await resolveAccountManagerName(d.accountManagerId);
    if (accountManagerName === null) {
      return res.status(400).json({ error: "Invalid account manager" });
    }
    params.push(accountManagerName);
    setClauses.push(`account_manager = $${params.length}`);
    params.push(d.accountManagerId);
    setClauses.push(`account_manager_id = $${params.length}`);
  }

  // Reassigning a ticket replaces the full ticket_assignees set — never
  // touches the tickets table directly, same as the companyName/customerId
  // side effect below.
  if (d.assigneeUserIds !== undefined) {
    const assigneeCheck = await resolveAssignees(req, d.assigneeUserIds);
    if (!assigneeCheck.ok) {
      return res.status(assigneeCheck.status).json({ error: assigneeCheck.error });
    }
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

  if (setClauses.length === 0 && d.assigneeUserIds === undefined) {
    return res.status(400).json({ error: "No fields to update" });
  }

  // The row update and the assignee-set replace must commit together —
  // otherwise a failure between the DELETE and the INSERT could leave the
  // ticket with no assignees at all.
  let ticket;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (setClauses.length > 0) {
      params.push(srNo);
      const srNoParamIndex = params.length;
      params.push(d.rowVersion);
      const rowVersionParamIndex = params.length;
      const result = await client.query(
        `UPDATE tickets SET ${setClauses.join(", ")}
         WHERE sr_no = $${srNoParamIndex} AND deleted_at IS NULL AND row_version = $${rowVersionParamIndex}
         RETURNING *`,
        params
      );
      if (result.rows.length === 0) {
        // Distinguish "doesn't exist/already deleted" from "exists but someone
        // else changed it first" — the frontend needs a different message (and
        // different recovery action: refresh) for the latter.
        const stillExists = await client.query(
          "SELECT 1 FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
          [srNo]
        );
        await client.query("ROLLBACK");
        if (stillExists.rows.length === 0) {
          return res.status(404).json({ error: "Ticket not found" });
        }
        return res.status(409).json({
          error: "This ticket was changed by someone else. Please refresh and try again.",
        });
      }
      ticket = result.rows[0];
    } else {
      const existing = await client.query(
        "SELECT * FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
        [srNo]
      );
      if (existing.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Ticket not found" });
      }
      ticket = existing.rows[0];
    }

    if (d.assigneeUserIds !== undefined) {
      await client.query("DELETE FROM ticket_assignees WHERE ticket_sr_no = $1", [srNo]);
      await insertAssignees(client, srNo, d.assigneeUserIds);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Updated ticket",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
    details: `Changes in ticket`,
  });

  const updated = await pool.query(
    `SELECT t.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM tickets t
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE t.sr_no = $1`,
    [srNo]
  );

  res.json(rowToTicket(updated.rows[0]));
}

export async function updateTicketStatus(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Fold the allowed-transition check into the UPDATE's WHERE clause
  // (status = ANY(sources)) instead of a separate check-then-update, so a
  // concurrent status change can't race between the read and the write.
  // In the SET list below, `tickets.status` refers to the pre-update value
  // (Postgres evaluates all SET expressions against the old row), so the
  // feedback-wipe columns can be conditioned on "was this Closed before
  // this update" in the same atomic statement.
  const sources = allowedSourceStatuses(parsed.data.status);

  let result;
  if (parsed.data.status === "Closed") {
    // The pending-inventory check and the update happen in the same
    // statement (NOT EXISTS in the WHERE clause) so a concurrent request
    // can't slip a fresh ticket_inventory row in between a separate check
    // query and the update — this is a single atomic operation.
    result = await pool.query(
      `UPDATE tickets SET status = $1, closed_at = now()
       WHERE sr_no = $2 AND deleted_at IS NULL AND status = ANY($3)
         AND NOT EXISTS (
           SELECT 1 FROM ticket_inventory i WHERE i.ticket_sr_no = tickets.sr_no AND i.outward_date IS NULL
         )
       RETURNING *`,
      [parsed.data.status, srNo, sources]
    );
  } else {
    // Leaving Closed (reopening) starts a fresh notification/feedback
    // cycle — otherwise a second close later would silently skip the
    // closure email and feedback request (guarded by these same columns
    // being non-null from the first close), and the old rating/comment
    // would keep showing against a ticket that's since been reworked.
    // Moving between the other two statuses leaves feedback untouched
    // since the ticket was never closed on this cycle.
    result = await pool.query(
      `UPDATE tickets SET
         status = $1,
         closed_notified_at = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE closed_notified_at END,
         feedback_token = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE feedback_token END,
         feedback_requested_at = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE feedback_requested_at END,
         customer_feedback_rating = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE customer_feedback_rating END,
         customer_feedback_comment = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE customer_feedback_comment END,
         customer_feedback_submitted_at = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE customer_feedback_submitted_at END,
         admin_feedback_response = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE admin_feedback_response END,
         admin_feedback_responded_at = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE admin_feedback_responded_at END,
         admin_feedback_responded_by = CASE WHEN tickets.status = 'Closed' THEN NULL ELSE admin_feedback_responded_by END
       WHERE sr_no = $2 AND deleted_at IS NULL AND status = ANY($3)
       RETURNING *`,
      [parsed.data.status, srNo, sources]
    );
  }

  if (result.rows.length === 0) {
    const current = await pool.query(
      "SELECT status FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
      [srNo]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const currentStatus = current.rows[0].status;
    if (!isLegalStatusTransition(currentStatus, parsed.data.status)) {
      return res.status(400).json({
        error: `Cannot move a ticket from "${currentStatus}" to "${parsed.data.status}". Allowed order is Pending → In Progress → Closed, with reopening only from Closed back to Pending.`,
      });
    }
    return res.status(400).json({
      error: "This ticket has a pending inventory item that hasn't been dispatched yet. Complete the outward workflow in Inventory before closing.",
    });
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

  if (parsed.data.status === "Closed" && !ticket.closed_notified_at && ticket.email_id) {
    // Tickets dispatched through the inventory workflow already got a
    // "Repair Completed and Dispatched" email when the outward date was
    // set (see upsertInventory) — that serves as their closure notice, so
    // only send this generic one for tickets that never went through it.
    const inventoryResult = await pool.query(
      "SELECT 1 FROM ticket_inventory WHERE ticket_sr_no = $1 AND outward_notified_at IS NOT NULL",
      [srNo]
    );
    if (inventoryResult.rows.length === 0) {
      const text = `Dear ${ticket.contact_name || "Customer"},\n\nGreetings from the Cygnus Support Team.\n\nWe are writing to inform you that the reported issue has been successfully resolved, and the case is now being marked as closed from our end.\n\nCase Reference Number: ${ticket.ticket_no}\nReported Issue: ${ticket.problem}\n\nIf you feel the issue has not been fully resolved or requires further attention, please let us know and we will be happy to assist you further.\n\nBest regards,\nSupport Team`;
      const sent = await sendMail({
        to: ticket.email_id,
        subject: `Ticket Closed — ${ticket.ticket_no}`,
        text,
        html: renderEmailHtml(text),
      });
      if (sent) {
        await pool.query("UPDATE tickets SET closed_notified_at = now() WHERE sr_no = $1", [srNo]);
      }
    }
  }

  res.json(rowToTicket(ticket));
}

const adminFeedbackResponseSchema = z.object({
  response: z.string().min(1).max(800),
});

export async function updateAdminFeedbackResponse(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = adminFeedbackResponseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await pool.query(
    "SELECT customer_feedback_submitted_at FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
    [srNo]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  if (!existing.rows[0].customer_feedback_submitted_at) {
    return res
      .status(400)
      .json({ error: "Customer has not submitted feedback for this ticket yet" });
  }

  const result = await pool.query(
    `UPDATE tickets SET admin_feedback_response = $1, admin_feedback_responded_at = now(),
       admin_feedback_responded_by = $2
     WHERE sr_no = $3 AND deleted_at IS NULL RETURNING *`,
    [parsed.data.response, req.session.username ?? "Unknown", srNo]
  );
  const ticket = result.rows[0];

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Responded to customer feedback",
    ticketSrNo: ticket.sr_no,
    ticketNo: ticket.ticket_no,
    details: parsed.data.response,
  });

  res.json(rowToTicket(ticket));
}

export async function deleteTicket(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  // Soft delete: ticket, its remarks, assignees, and activity history all
  // stay in the DB — this just hides it from every read path (see the
  // "deleted_at IS NULL" filter on list/get/summary/analytics/export
  // queries). "AND deleted_at IS NULL" here also makes a second delete
  // attempt on an already-deleted ticket correctly 404 instead of silently
  // re-stamping deleted_at.
  const result = await pool.query(
    "UPDATE tickets SET deleted_at = now() WHERE sr_no = $1 AND deleted_at IS NULL RETURNING sr_no, ticket_no",
    [srNo]
  );
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

  const ticketExists = await pool.query(
    "SELECT ticket_no FROM tickets WHERE sr_no = $1 AND deleted_at IS NULL",
    [srNo]
  );
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

// Monthly created-vs-closed counts for the last 6 calendar months, plus a
// breakdown by call type — feeds the Analytics page charts. Reads from
// materialized views (see jobs/analyticsRefresh.ts) refreshed every 15 min,
// rather than re-aggregating the full tickets table on every page view.
export async function getAnalytics(_req: Request, res: Response) {
  const monthlyResult = await pool.query(`
    SELECT month, created, closed FROM mv_analytics_monthly ORDER BY month_start
  `);

  const callTypeResult = await pool.query(`
    SELECT call_type, count FROM mv_analytics_call_type ORDER BY count DESC
  `);

  const employeeResult = await pool.query(`
    SELECT employee, pending, in_progress, closed FROM mv_analytics_employee ORDER BY employee
  `);

  // These four are point-in-time composition breakdowns (not trended like
  // `monthly` above) — ORDER BY the enum column itself rather than COUNT(*)
  // so the pie/donut legend order matches each enum's declared order
  // (e.g. P1..P4, Pending/In Progress/Closed) instead of shuffling by count.
  const priorityResult = await pool.query(`
    SELECT priority, count FROM mv_analytics_priority ORDER BY priority
  `);

  const statusResult = await pool.query(`
    SELECT status, count FROM mv_analytics_status ORDER BY status
  `);

  const modeResult = await pool.query(`
    SELECT mode, count FROM mv_analytics_mode ORDER BY mode
  `);

  const internalTagResult = await pool.query(`
    SELECT internal_tag, count FROM mv_analytics_internal_tag ORDER BY internal_tag
  `);

  res.json({
    monthly: monthlyResult.rows.map((r) => ({
      month: r.month,
      created: parseInt(r.created, 10),
      closed: parseInt(r.closed, 10),
    })),
    byCallType: callTypeResult.rows.map((r) => ({
      callType: r.call_type,
      count: parseInt(r.count, 10),
    })),
    byEmployee: employeeResult.rows.map((r) => ({
      employee: r.employee,
      pending: parseInt(r.pending, 10),
      inProgress: parseInt(r.in_progress, 10),
      closed: parseInt(r.closed, 10),
    })),
    byPriority: priorityResult.rows.map((r) => ({
      priority: r.priority,
      count: parseInt(r.count, 10),
    })),
    byStatus: statusResult.rows.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    })),
    byMode: modeResult.rows.map((r) => ({
      mode: r.mode,
      count: parseInt(r.count, 10),
    })),
    byInternalTag: internalTagResult.rows.map((r) => ({
      internalTag: r.internal_tag,
      count: parseInt(r.count, 10),
    })),
  });
}

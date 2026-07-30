import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateProjectNumber } from "../utils/projectNumber";
import { computeDeadline } from "../utils/projectDeadline";
import { logActivity } from "../utils/activityLog";
import { getOrCreateCustomerId } from "../utils/customers";
import { resolveAccountManagerName } from "../utils/accountManagers";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "../types/ticket";
import { PROJECT_TIME_UNITS } from "../types/project";

const projectComponentSchema = z.object({
  model: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  serialNumbers: z.string().optional(),
});

const createProjectSchema = z.object({
  startDate: z.string(),
  timeValue: z.coerce.number().int().positive(),
  timeUnit: z.enum(PROJECT_TIME_UNITS),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactNo: z.string().min(1),
  emailId: z.string().email(),
  designation: z.string().optional(),
  department: z.string().optional(),
  address: z.string().min(1),
  components: z.array(projectComponentSchema).optional(),
  contractNumber: z.string().optional(),
  poNumber: z.string().optional(),
  problem: z.string().min(1),
  // Unlike tickets' free-text Account Manager, projects require picking a
  // real account_managers row — that's what makes the daily remarks digest
  // (see jobs/dailyDigest.ts) able to reliably email someone.
  accountManagerId: z.coerce.number().int().positive(),
  assignedBy: z.string().min(1),
  assigneeUserIds: z.array(z.coerce.number().int().positive()).min(1, "At least one assignee required"),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  rowVersion: z.number().int().positive(),
});

const statusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

const remarkSchema = z.object({
  body: z.string().min(1),
  remarkDate: z.string().optional(),
});

function rowToProject(row: any) {
  return {
    srNo: row.sr_no,
    projectNo: row.project_no,
    startDate: row.start_date,
    timeValue: row.time_value,
    timeUnit: row.time_unit,
    deadlineDate: row.deadline_date,
    customerId: row.customer_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactNo: row.contact_no,
    emailId: row.email_id,
    designation: row.designation,
    department: row.department,
    address: row.address,
    components: row.components ?? [],
    poNumber: row.po_number,
    contractNumber: row.contract_number,
    problem: row.problem,
    ownerUserId: row.owner_user_id,
    accountManager: row.account_manager,
    accountManagerId: row.account_manager_id,
    assignedBy: row.assigned_by,
    assignees: row.assignees ?? [],
    priority: row.priority,
    status: row.status,
    customerFeedbackRating: row.customer_feedback_rating,
    customerFeedbackComment: row.customer_feedback_comment,
    customerFeedbackSubmittedAt: row.customer_feedback_submitted_at,
    adminFeedbackResponse: row.admin_feedback_response,
    adminFeedbackRespondedAt: row.admin_feedback_responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    lastRemark: row.last_remark ?? undefined,
    rowVersion: row.row_version,
  };
}

const ASSIGNEES_LATERAL_JOIN = `
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', pa.user_id, 'displayName', u.display_name) ORDER BY u.display_name) AS assignees
    FROM project_assignees pa
    JOIN users u ON u.id = pa.user_id
    WHERE pa.project_sr_no = p.sr_no
  ) assignee_agg ON true
`;

// Same permission rule as tickets' resolveAssignees (see controllers/tickets.ts):
// admins may assign to any mix of admins/employees; non-admins must include
// themselves and may only add other employees.
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
      return { ok: false, status: 403, error: "Employees cannot assign projects to an admin" };
    }
  }
  return { ok: true };
}

async function insertAssignees(projectSrNo: number, userIds: number[]) {
  const values = userIds.map((_, i) => `($1, $${i + 2})`).join(", ");
  await pool.query(`INSERT INTO project_assignees (project_sr_no, user_id) VALUES ${values}`, [
    projectSrNo,
    ...userIds,
  ]);
}

export async function listProjects(req: Request, res: Response) {
  const {
    status,
    assigneeUserId,
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

  const conditions: string[] = ["p.deleted_at IS NULL"];
  const params: any[] = [];

  // Non-admins only ever see projects they're assigned to — unlike tickets,
  // where any employee can see the full list. Overrides whatever
  // assigneeUserId the client sent, rather than trusting it, so a non-admin
  // can't widen this by querying someone else's id.
  const effectiveAssigneeUserId =
    req.session.role === "admin" ? assigneeUserId : String(req.session.userId);

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (effectiveAssigneeUserId) {
    params.push(parseInt(effectiveAssigneeUserId, 10));
    conditions.push(
      `EXISTS (SELECT 1 FROM project_assignees pa WHERE pa.project_sr_no = p.sr_no AND pa.user_id = $${params.length})`
    );
  }
  if (accountManager) {
    params.push(accountManager);
    conditions.push(`p.account_manager = $${params.length}`);
  }
  if (assignedBy) {
    params.push(assignedBy);
    conditions.push(`p.assigned_by = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`p.start_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`p.start_date <= $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    conditions.push(`p.priority = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.company_name ILIKE $${params.length} OR p.project_no ILIKE $${params.length})`);
  }
  if (overdue === "true") {
    conditions.push(`p.status IN ('Pending', 'In Progress') AND p.deadline_date < CURRENT_DATE`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const query = `
    SELECT p.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees, (
      SELECT r.body FROM project_remarks r WHERE r.project_sr_no = p.sr_no ORDER BY r.created_at DESC LIMIT 1
    ) AS last_remark
    FROM projects p
    ${ASSIGNEES_LATERAL_JOIN}
    ${whereClause}
    ORDER BY p.sr_no DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countQuery = `SELECT COUNT(*) FROM projects p ${whereClause}`;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params),
  ]);

  res.json({
    projects: rowsResult.rows.map(rowToProject),
    total: parseInt(countResult.rows[0].count, 10),
    page: Math.max(parseInt(page, 10) || 1, 1),
    pageSize: limit,
  });
}

export async function getSummary(req: Request, res: Response) {
  const { assigneeUserId } = req.query as Record<string, string>;
  // Same non-admin scoping as listProjects — never trust a client-supplied
  // assigneeUserId for a non-admin.
  const effectiveAssigneeUserId =
    req.session.role === "admin" ? assigneeUserId : String(req.session.userId);
  const whereClause = effectiveAssigneeUserId
    ? "WHERE p.deleted_at IS NULL AND EXISTS (SELECT 1 FROM project_assignees pa WHERE pa.project_sr_no = p.sr_no AND pa.user_id = $1)"
    : "WHERE p.deleted_at IS NULL";
  const params = effectiveAssigneeUserId ? [parseInt(effectiveAssigneeUserId, 10)] : [];

  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'Closed') AS closed,
      COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
      COUNT(*) FILTER (WHERE status IN ('Pending', 'In Progress') AND deadline_date < CURRENT_DATE) AS overdue
    FROM projects p
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

export async function getProject(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const result = await pool.query(
    `SELECT p.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM projects p
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE p.sr_no = $1 AND p.deleted_at IS NULL`,
    [srNo]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Project not found" });
  }

  // Non-admins can only view projects they're assigned to (unlike tickets,
  // which any employee can view) — 404 rather than 403 so a project's
  // existence isn't disclosed to employees who aren't on it.
  if (req.session.role !== "admin") {
    const assignees: { id: number }[] = result.rows[0].assignees ?? [];
    const isAssigned = assignees.some((a) => a.id === req.session.userId);
    if (!isAssigned) {
      return res.status(404).json({ error: "Project not found" });
    }
  }

  const remarksResult = await pool.query(
    "SELECT id, remark_date, body, created_by, created_at, highlighted FROM project_remarks WHERE project_sr_no = $1 ORDER BY created_at ASC",
    [srNo]
  );
  res.json({
    project: rowToProject(result.rows[0]),
    remarks: remarksResult.rows.map((r) => ({
      id: r.id,
      remarkDate: r.remark_date,
      body: r.body,
      createdBy: r.created_by,
      createdAt: r.created_at,
      highlighted: r.highlighted,
    })),
  });
}

export async function createProject(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  const assigneeCheck = await resolveAssignees(req, d.assigneeUserIds);
  if (!assigneeCheck.ok) {
    return res.status(assigneeCheck.status).json({ error: assigneeCheck.error });
  }

  const accountManagerName = await resolveAccountManagerName(d.accountManagerId);
  if (accountManagerName === null) {
    return res.status(400).json({ error: "Invalid account manager" });
  }

  const startDate = new Date(d.startDate);
  const projectNo = await generateProjectNumber(startDate);
  const deadlineDate = computeDeadline(d.startDate, d.timeValue, d.timeUnit);

  const ownerUserId = req.session.userId;

  const customerId = await getOrCreateCustomerId({
    companyName: d.companyName,
    contactName: d.contactName,
    contactNo: d.contactNo,
    emailId: d.emailId,
    address: d.address,
  });

  const result = await pool.query(
    `INSERT INTO projects (
      project_no, start_date, time_value, time_unit, deadline_date, customer_id,
      company_name, contact_name, contact_no, email_id, designation, department, address,
      components, po_number, contract_number, problem, owner_user_id,
      account_manager, account_manager_id, assigned_by, priority
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    RETURNING *`,
    [
      projectNo,
      d.startDate,
      d.timeValue,
      d.timeUnit,
      deadlineDate,
      customerId,
      d.companyName,
      d.contactName ?? null,
      d.contactNo ?? null,
      d.emailId || null,
      d.designation ?? null,
      d.department ?? null,
      d.address ?? null,
      JSON.stringify(d.components ?? []),
      d.poNumber ?? null,
      d.contractNumber ?? null,
      d.problem,
      ownerUserId,
      accountManagerName,
      d.accountManagerId,
      d.assignedBy,
      d.priority ?? "P3",
    ]
  );

  const project = result.rows[0];
  await insertAssignees(project.sr_no, d.assigneeUserIds);

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Created project",
    projectSrNo: project.sr_no,
    projectNo: project.project_no,
  });

  const created = await pool.query(
    `SELECT p.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM projects p
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE p.sr_no = $1`,
    [project.sr_no]
  );

  res.status(201).json(rowToProject(created.rows[0]));
}

export async function updateProject(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  const fieldMap: Record<string, string> = {
    startDate: "start_date",
    companyName: "company_name",
    contactName: "contact_name",
    contactNo: "contact_no",
    emailId: "email_id",
    designation: "designation",
    department: "department",
    address: "address",
    poNumber: "po_number",
    contractNumber: "contract_number",
    problem: "problem",
    assignedBy: "assigned_by",
    priority: "priority",
  };

  const setClauses: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in d) {
      params.push((d as any)[key]);
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

  // JSONB column — needs serializing, unlike the scalar fields in fieldMap.
  if (d.components !== undefined) {
    params.push(JSON.stringify(d.components));
    setClauses.push(`components = $${params.length}`);
  }

  // Deadline is derived from start_date/time_value/time_unit — recompute
  // whenever any of the three changes, same as create.
  if (d.startDate !== undefined || d.timeValue !== undefined || d.timeUnit !== undefined) {
    const existing = await pool.query(
      "SELECT start_date, time_value, time_unit FROM projects WHERE sr_no = $1 AND deleted_at IS NULL",
      [srNo]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const effectiveStartDate = d.startDate ?? existing.rows[0].start_date.toISOString().slice(0, 10);
    const effectiveTimeValue = d.timeValue ?? existing.rows[0].time_value;
    const effectiveTimeUnit = d.timeUnit ?? existing.rows[0].time_unit;

    if (d.timeValue !== undefined) {
      params.push(d.timeValue);
      setClauses.push(`time_value = $${params.length}`);
    }
    if (d.timeUnit !== undefined) {
      params.push(d.timeUnit);
      setClauses.push(`time_unit = $${params.length}`);
    }

    params.push(computeDeadline(effectiveStartDate, effectiveTimeValue, effectiveTimeUnit));
    setClauses.push(`deadline_date = $${params.length}`);
  }

  if (d.assigneeUserIds !== undefined) {
    const assigneeCheck = await resolveAssignees(req, d.assigneeUserIds);
    if (!assigneeCheck.ok) {
      return res.status(assigneeCheck.status).json({ error: assigneeCheck.error });
    }
  }

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

  let project;
  if (setClauses.length > 0) {
    params.push(srNo);
    const srNoParamIndex = params.length;
    params.push(d.rowVersion);
    const rowVersionParamIndex = params.length;
    const result = await pool.query(
      `UPDATE projects SET ${setClauses.join(", ")}
       WHERE sr_no = $${srNoParamIndex} AND deleted_at IS NULL AND row_version = $${rowVersionParamIndex}
       RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      const stillExists = await pool.query(
        "SELECT 1 FROM projects WHERE sr_no = $1 AND deleted_at IS NULL",
        [srNo]
      );
      if (stillExists.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.status(409).json({
        error: "This project was changed by someone else. Please refresh and try again.",
      });
    }
    project = result.rows[0];
  } else {
    const existing = await pool.query("SELECT * FROM projects WHERE sr_no = $1 AND deleted_at IS NULL", [
      srNo,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    project = existing.rows[0];
  }

  if (d.assigneeUserIds !== undefined) {
    await pool.query("DELETE FROM project_assignees WHERE project_sr_no = $1", [srNo]);
    await insertAssignees(srNo, d.assigneeUserIds);
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Updated project",
    projectSrNo: project.sr_no,
    projectNo: project.project_no,
    details: `Changes in project`,
  });

  const updated = await pool.query(
    `SELECT p.*, COALESCE(assignee_agg.assignees, '[]'::json) AS assignees
     FROM projects p
     ${ASSIGNEES_LATERAL_JOIN}
     WHERE p.sr_no = $1`,
    [srNo]
  );

  res.json(rowToProject(updated.rows[0]));
}

export async function updateProjectStatus(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const closedAtClause = parsed.data.status === "Closed" ? ", closed_at = now()" : "";
  const result = await pool.query(
    `UPDATE projects SET status = $1${closedAtClause} WHERE sr_no = $2 AND deleted_at IS NULL RETURNING *`,
    [parsed.data.status, srNo]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Project not found" });
  }

  const project = result.rows[0];

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Changed status",
    projectSrNo: project.sr_no,
    projectNo: project.project_no,
    details: `New status: ${parsed.data.status}`,
  });

  res.json(rowToProject(project));
}

export async function deleteProject(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const result = await pool.query(
    "UPDATE projects SET deleted_at = now() WHERE sr_no = $1 AND deleted_at IS NULL RETURNING sr_no, project_no",
    [srNo]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Project not found" });
  }

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Deleted project",
    projectSrNo: null,
    projectNo: result.rows[0].project_no,
  });

  res.json({ success: true });
}

// Unlike tickets' getAnalytics (controllers/tickets.ts), which reads from
// materialized views refreshed every 15 min (see jobs/analyticsRefresh.ts),
// this computes directly on every call — projects is a much smaller table
// and the Analytics page (admin-only, see AdminRoute) isn't hit often
// enough to justify the same materialized-view machinery yet.
export async function getProjectAnalytics(_req: Request, res: Response) {
  const monthlyResult = await pool.query(`
    WITH months AS (
      SELECT date_trunc('month', now()) - (n || ' months')::interval AS month_start
      FROM generate_series(0, 5) AS n
    )
    SELECT
      to_char(m.month_start, 'Mon YYYY') AS month,
      COUNT(*) FILTER (WHERE date_trunc('month', p.start_date) = m.month_start) AS created,
      COUNT(*) FILTER (WHERE date_trunc('month', p.closed_at) = m.month_start) AS closed
    FROM months m
    LEFT JOIN projects p
      ON p.deleted_at IS NULL
      AND (date_trunc('month', p.start_date) = m.month_start OR date_trunc('month', p.closed_at) = m.month_start)
    GROUP BY m.month_start
    ORDER BY m.month_start
  `);

  const priorityResult = await pool.query(`
    SELECT priority, COUNT(*) FROM projects WHERE deleted_at IS NULL GROUP BY priority ORDER BY priority
  `);

  const statusResult = await pool.query(`
    SELECT status, COUNT(*) FROM projects WHERE deleted_at IS NULL GROUP BY status ORDER BY status
  `);

  const employeeResult = await pool.query(`
    SELECT u.display_name AS employee,
      COUNT(*) FILTER (WHERE p.status = 'Pending') AS pending,
      COUNT(*) FILTER (WHERE p.status = 'In Progress') AS in_progress,
      COUNT(*) FILTER (WHERE p.status = 'Closed') AS closed
    FROM project_assignees pa
    JOIN users u ON u.id = pa.user_id
    JOIN projects p ON p.sr_no = pa.project_sr_no AND p.deleted_at IS NULL
    GROUP BY u.display_name
    ORDER BY u.display_name
  `);

  const accountManagerResult = await pool.query(`
    SELECT COALESCE(account_manager, 'Unassigned') AS account_manager, COUNT(*)
    FROM projects
    WHERE deleted_at IS NULL
    GROUP BY account_manager
    ORDER BY COUNT(*) DESC
  `);

  res.json({
    monthly: monthlyResult.rows.map((r) => ({
      month: r.month,
      created: parseInt(r.created, 10),
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
    byEmployee: employeeResult.rows.map((r) => ({
      employee: r.employee,
      pending: parseInt(r.pending, 10),
      inProgress: parseInt(r.in_progress, 10),
      closed: parseInt(r.closed, 10),
    })),
    byAccountManager: accountManagerResult.rows.map((r) => ({
      accountManager: r.account_manager,
      count: parseInt(r.count, 10),
    })),
  });
}

export async function addRemark(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = remarkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const projectExists = await pool.query(
    "SELECT project_no FROM projects WHERE sr_no = $1 AND deleted_at IS NULL",
    [srNo]
  );
  if (projectExists.rows.length === 0) {
    return res.status(404).json({ error: "Project not found" });
  }

  const remarkDate = parsed.data.remarkDate ?? new Date().toISOString().slice(0, 10);
  const createdBy = req.session.username ?? null;

  const result = await pool.query(
    `INSERT INTO project_remarks (project_sr_no, remark_date, body, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [srNo, remarkDate, parsed.data.body, createdBy]
  );

  await logActivity({
    actorUserId: req.session.userId,
    actorName: req.session.username ?? "Unknown",
    action: "Added remark",
    projectSrNo: srNo,
    projectNo: projectExists.rows[0].project_no,
    details: parsed.data.body,
  });

  res.status(201).json({
    id: result.rows[0].id,
    remarkDate: result.rows[0].remark_date,
    body: result.rows[0].body,
    createdBy: result.rows[0].created_by,
    createdAt: result.rows[0].created_at,
    highlighted: result.rows[0].highlighted,
  });
}

const remarkHighlightSchema = z.object({
  highlighted: z.boolean(),
});

export async function updateRemarkHighlight(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const remarkId = parseInt(req.params.remarkId, 10);
  if (!Number.isInteger(remarkId) || remarkId <= 0) {
    return res.status(400).json({ error: "Invalid remark reference" });
  }
  const parsed = remarkHighlightSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await pool.query(
    `UPDATE project_remarks SET highlighted = $1
     WHERE id = $2 AND project_sr_no = $3
     RETURNING id, remark_date, body, created_by, created_at, highlighted`,
    [parsed.data.highlighted, remarkId, srNo]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Remark not found" });
  }
  const r = result.rows[0];

  res.json({
    id: r.id,
    remarkDate: r.remark_date,
    body: r.body,
    createdBy: r.created_by,
    createdAt: r.created_at,
    highlighted: r.highlighted,
  });
}

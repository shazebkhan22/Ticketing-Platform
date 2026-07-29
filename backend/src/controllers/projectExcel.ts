import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateProjectNumber } from "../utils/projectNumber";
import { computeDeadline } from "../utils/projectDeadline";
import { getOrCreateCustomerId } from "../utils/customers";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "../types/ticket";
import { PROJECT_TIME_UNITS, ProjectTimeUnit } from "../types/project";

// Column headers used by both the export and the import template — keep in
// sync so a freshly exported file (or the downloaded template) can be
// re-imported unchanged. "Components" packs model/qty/serials into one
// multi-line cell — one line per component, formatted
// "<model> (<qty> Qty): - <serials>" — matching the format already used by
// the print report (see ProjectDetailPage.tsx), so the same parsing/
// formatting logic only needs to exist once conceptually.
const COLUMNS = [
  { header: "Project No", key: "projectNo", width: 16 },
  { header: "Start Date", key: "startDate", width: 14 },
  { header: "Time Value", key: "timeValue", width: 10 },
  { header: "Time Unit", key: "timeUnit", width: 10 },
  { header: "Company Name", key: "companyName", width: 28 },
  { header: "Contact Name", key: "contactName", width: 18 },
  { header: "Contact No", key: "contactNo", width: 14 },
  { header: "Email ID", key: "emailId", width: 30 },
  { header: "Designation", key: "designation", width: 20 },
  { header: "Department", key: "department", width: 16 },
  { header: "Address", key: "address", width: 40 },
  { header: "Components", key: "components", width: 40 },
  { header: "PO Number", key: "poNumber", width: 16 },
  { header: "Contract Number", key: "contractNumber", width: 16 },
  { header: "Scope", key: "problem", width: 40 },
  { header: "Account Manager", key: "accountManager", width: 20 },
  { header: "Assigned By", key: "assignedBy", width: 16 },
  { header: "Assigned To", key: "assignedTo", width: 36 },
  { header: "Priority", key: "priority", width: 10 },
  { header: "Deadline Date", key: "deadlineDate", width: 14 },
  { header: "Status", key: "status", width: 12 },
] as const;

// Export-only, same rationale as controllers/excel.ts's UPDATE_COLUMNS —
// remark history doesn't belong in the import template since re-importing
// always creates new projects. (Unlike tickets, projects have no customer
// feedback flow, so there's no equivalent of tickets' feedback columns.)
const UPDATE_COLUMNS = [{ header: "Remarks", key: "remarks", width: 26 }] as const;

function excelDateToIso(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  return str || undefined;
}

function cellToString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && "text" in (value as any)) {
    return String((value as any).text).trim() || undefined;
  }
  const str = String(value).trim();
  return str || undefined;
}

// Same formula-injection guard as controllers/excel.ts.
function sanitizeForExcel(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function sanitizeRowValues<T extends Record<string, unknown>>(row: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeForExcel(value);
  }
  return sanitized as T;
}

interface ProjectComponent {
  model: string;
  quantity: number;
  serialNumbers?: string;
}

function formatComponentLine(c: ProjectComponent): string {
  return `${c.model} (${c.quantity} Qty): - ${c.serialNumbers || "-"}`;
}

// Semicolon-joined, single line — kept compact (no wrapText / tall cell)
// since the visible cell also gets a dropdown (see exportProjects) letting
// the user browse one component at a time instead of reading a wall of text.
function formatComponentsForExcel(components: ProjectComponent[]): string {
  return components.map(formatComponentLine).join("; ");
}

const COMPONENT_LINE_RE = /^(.*?)\s*\((\d+)\s*Qty\):\s*-\s*(.*)$/;

function parseComponentsFromExcel(text: string | undefined): ProjectComponent[] {
  if (!text) return [];
  const components: ProjectComponent[] = [];
  for (const rawSegment of text.split(";")) {
    const line = rawSegment.trim();
    if (!line) continue;
    const match = line.match(COMPONENT_LINE_RE);
    if (!match) continue;
    const [, model, quantity, serials] = match;
    const component: ProjectComponent = {
      model: model.trim(),
      quantity: parseInt(quantity, 10),
    };
    const trimmedSerials = serials.trim();
    if (trimmedSerials !== "-" && trimmedSerials !== "") {
      component.serialNumbers = trimmedSerials;
    }
    components.push(component);
  }
  return components;
}

export async function exportProjects(req: Request, res: Response) {
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
  } = req.query as Record<string, string>;

  const conditions: string[] = ["p.deleted_at IS NULL"];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (assigneeUserId) {
    params.push(parseInt(assigneeUserId, 10));
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
  const result = await pool.query(
    `SELECT p.*,
      (SELECT array_agg(
         r.remark_date || ' ' || to_char(r.created_at, 'HH24:MI')
           || COALESCE(' (' || r.created_by || ')', '') || ': ' || r.body
         ORDER BY r.created_at)
       FROM project_remarks r WHERE r.project_sr_no = p.sr_no) AS remarks_list,
      (SELECT string_agg(u.display_name, ', ' ORDER BY u.display_name)
       FROM project_assignees pa JOIN users u ON u.id = pa.user_id
       WHERE pa.project_sr_no = p.sr_no) AS assigned_to_names
    FROM projects p ${whereClause} ORDER BY p.sr_no DESC`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Projects");
  sheet.columns = [...COLUMNS, ...UPDATE_COLUMNS] as unknown as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };

  // Both remarks and components can have several entries per project — each
  // gets a hidden lookup sheet (one row per project) plus a dropdown data
  // validation on the visible cell, so the cell shows one entry at a time
  // instead of a tall wrapped block of text. Same pattern as controllers/
  // excel.ts's RemarksLookup for tickets.
  const remarksLookupSheet = workbook.addWorksheet("RemarksLookup");
  remarksLookupSheet.state = "veryHidden";
  const remarksColLetter = sheet.getColumn("remarks").letter;

  const componentsLookupSheet = workbook.addWorksheet("ComponentsLookup");
  componentsLookupSheet.state = "veryHidden";
  const componentsColLetter = sheet.getColumn("components").letter;

  result.rows.forEach((row, i) => {
    const remarksList: string[] = row.remarks_list ?? [];
    const components: ProjectComponent[] = row.components ?? [];
    const componentsSummary = formatComponentsForExcel(components);

    sheet.addRow(
      sanitizeRowValues({
        projectNo: row.project_no,
        startDate: row.start_date,
        timeValue: row.time_value,
        timeUnit: row.time_unit,
        companyName: row.company_name,
        contactName: row.contact_name,
        contactNo: row.contact_no,
        emailId: row.email_id,
        designation: row.designation,
        department: row.department,
        address: row.address,
        components: componentsSummary,
        poNumber: row.po_number,
        contractNumber: row.contract_number,
        problem: row.problem,
        accountManager: row.account_manager,
        assignedBy: row.assigned_by,
        assignedTo: row.assigned_to_names ?? "",
        priority: row.priority,
        deadlineDate: row.deadline_date,
        status: row.status,
        remarks: remarksList.length > 0 ? remarksList[remarksList.length - 1] : "",
      })
    );

    const lookupRowNum = i + 1;
    const dataRowNum = i + 2; // header row offset

    if (remarksList.length > 0) {
      const lookupRow = remarksLookupSheet.getRow(lookupRowNum);
      remarksList.forEach((remark, col) => {
        lookupRow.getCell(col + 1).value = sanitizeForExcel(remark) as string;
      });
      lookupRow.commit();

      const lastCol = String.fromCharCode("A".charCodeAt(0) + remarksList.length - 1);
      sheet.getCell(`${remarksColLetter}${dataRowNum}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`RemarksLookup!$A$${lookupRowNum}:$${lastCol}$${lookupRowNum}`],
      };
    }

    if (components.length > 0) {
      // First option is the full summary (matches the cell's default value,
      // so re-importing an un-touched export still carries every component);
      // the rest let the user browse one component at a time.
      const options = [componentsSummary, ...components.map(formatComponentLine)];
      const lookupRow = componentsLookupSheet.getRow(lookupRowNum);
      options.forEach((option, col) => {
        lookupRow.getCell(col + 1).value = sanitizeForExcel(option) as string;
      });
      lookupRow.commit();

      const lastCol = String.fromCharCode("A".charCodeAt(0) + options.length - 1);
      sheet.getCell(`${componentsColLetter}${dataRowNum}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`ComponentsLookup!$A$${lookupRowNum}:$${lastCol}$${lookupRowNum}`],
      };
    }
  });
  sheet.getColumn("startDate").numFmt = "yyyy-mm-dd";
  sheet.getColumn("deadlineDate").numFmt = "yyyy-mm-dd";

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="projects-export-${new Date().toISOString().slice(0, 10)}.xlsx"`
  );
  await workbook.xlsx.write(res);
  res.end();
}

export async function downloadProjectImportTemplate(_req: Request, res: Response) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Projects");
  sheet.columns = COLUMNS.filter(
    (c) => c.key !== "projectNo" && c.key !== "deadlineDate"
  ) as unknown as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    startDate: "2026-01-15",
    timeValue: 30,
    timeUnit: "Days",
    companyName: "Acme Corp",
    contactName: "John Doe",
    contactNo: "9999999999",
    emailId: "john@acme.com",
    designation: "IT Manager",
    department: "IT",
    address: "123 Street",
    components:
      "HP Z8 Fury G5 Workstation (9 Qty): - SN123, SN124; HP E27K G5 Monitor (18 Qty): - CNK001, CNK002",
    poNumber: "PO-1001",
    contractNumber: "CN-1001",
    problem: "Datacenter refresh project",
    accountManager: "Reception Desk - Sunita",
    assignedBy: "Office Manager",
    assignedTo: "Pranesh Kute",
    priority: "P3",
    status: "Pending",
  });

  const employeesResult = await pool.query(
    "SELECT display_name FROM users ORDER BY display_name"
  );
  const refSheet = workbook.addWorksheet("Reference");
  refSheet.columns = [
    { header: "Time Units", key: "timeUnits", width: 14 },
    { header: "Statuses", key: "statuses", width: 14 },
    { header: "Priorities", key: "priorities", width: 12 },
    { header: "Assigned To (employees)", key: "employees", width: 22 },
  ];
  refSheet.getRow(1).font = { bold: true };
  const maxRows = Math.max(
    PROJECT_TIME_UNITS.length,
    TICKET_STATUSES.length,
    TICKET_PRIORITIES.length,
    employeesResult.rows.length
  );
  for (let i = 0; i < maxRows; i++) {
    refSheet.addRow({
      timeUnits: PROJECT_TIME_UNITS[i] ?? "",
      statuses: TICKET_STATUSES[i] ?? "",
      priorities: TICKET_PRIORITIES[i] ?? "",
      employees: employeesResult.rows[i]?.display_name ?? "",
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="project-import-template.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

const importRowSchema = z.object({
  startDate: z.string().min(1, "Start Date is required"),
  timeValue: z.coerce.number().int().positive("Time Value is required"),
  timeUnit: z.enum(PROJECT_TIME_UNITS),
  companyName: z.string().min(1, "Company Name is required"),
  contactName: z.string().optional(),
  contactNo: z.string().optional(),
  emailId: z.string().email().optional().or(z.literal("")),
  designation: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  components: z.string().optional(),
  poNumber: z.string().optional(),
  contractNumber: z.string().optional(),
  problem: z.string().min(1, "Problem is required"),
  accountManager: z.string().min(1, "Account Manager is required"),
  assignedBy: z.string().min(1, "Assigned By is required"),
  // Comma-separated list of employee display names, e.g. "Pranesh Kute, Jane Doe" —
  // matches the export format so a re-imported export round-trips unchanged.
  assignedTo: z.string().min(1, "Assigned To is required"),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
});

interface ImportRowResult {
  row: number;
  success: boolean;
  projectNo?: string;
  error?: string;
}

export async function importProjects(req: Request, res: Response) {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    // See controllers/excel.ts importTickets for why this cast is needed.
    await workbook.xlsx.load(file.buffer as any);
  } catch {
    return res.status(400).json({ error: "Could not read the uploaded file as an Excel workbook" });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(400).json({ error: "Workbook has no sheets" });
  }

  const MAX_IMPORT_ROWS = 2000;
  if (sheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    return res.status(400).json({
      error: `Workbook has too many rows (max ${MAX_IMPORT_ROWS} projects per import)`,
    });
  }

  const headerRow = sheet.getRow(1);
  const columnKeyByIndex = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = String(cell.value ?? "").trim();
    const match = COLUMNS.find((c) => c.header.toLowerCase() === header.toLowerCase());
    if (match) columnKeyByIndex.set(colNumber, match.key);
  });

  if (columnKeyByIndex.size === 0) {
    return res.status(400).json({
      error: "No recognized column headers found. Use the downloadable import template.",
    });
  }

  const employeesResult = await pool.query("SELECT id, display_name FROM users");
  const employeeIdByName = new Map(
    employeesResult.rows.map((r) => [r.display_name.toLowerCase(), r.id as number])
  );

  const ownerUserId = req.session.userId;
  const results: ImportRowResult[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0 || row.values.length === 0) continue;

    const raw: Record<string, unknown> = {};
    columnKeyByIndex.forEach((key, colNumber) => {
      raw[key] = row.getCell(colNumber).value;
    });

    const hasAnyValue = Object.values(raw).some((v) => v !== null && v !== undefined && v !== "");
    if (!hasAnyValue) continue;

    const candidate = {
      startDate: excelDateToIso(raw.startDate),
      timeValue: cellToString(raw.timeValue),
      timeUnit: cellToString(raw.timeUnit),
      companyName: cellToString(raw.companyName),
      contactName: cellToString(raw.contactName),
      contactNo: cellToString(raw.contactNo),
      emailId: cellToString(raw.emailId),
      designation: cellToString(raw.designation),
      department: cellToString(raw.department),
      address: cellToString(raw.address),
      components: cellToString(raw.components),
      poNumber: cellToString(raw.poNumber),
      contractNumber: cellToString(raw.contractNumber),
      problem: cellToString(raw.problem),
      accountManager: cellToString(raw.accountManager),
      assignedBy: cellToString(raw.assignedBy),
      assignedTo: cellToString(raw.assignedTo),
      priority: cellToString(raw.priority),
      status: cellToString(raw.status),
    };

    const parsed = importRowSchema.safeParse(candidate);
    if (!parsed.success) {
      results.push({
        row: rowNumber,
        success: false,
        error: parsed.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    const d = parsed.data;
    const assigneeNames = d.assignedTo.split(",").map((s) => s.trim()).filter(Boolean);
    const unmatchedNames = assigneeNames.filter((name) => !employeeIdByName.has(name.toLowerCase()));
    if (assigneeNames.length === 0 || unmatchedNames.length > 0) {
      results.push({
        row: rowNumber,
        success: false,
        error:
          unmatchedNames.length > 0
            ? `${unmatchedNames.map((n) => `"${n}"`).join(", ")} does not match any platform employee`
            : `"Assigned To" must list at least one employee`,
      });
      continue;
    }
    const assigneeUserIds = [
      ...new Set(assigneeNames.map((name) => employeeIdByName.get(name.toLowerCase())!)),
    ];

    try {
      const startDate = new Date(d.startDate);
      const projectNo = await generateProjectNumber(startDate);
      const deadlineDate = computeDeadline(d.startDate, d.timeValue, d.timeUnit as ProjectTimeUnit);
      const customerId = await getOrCreateCustomerId({
        companyName: d.companyName,
        contactName: d.contactName,
        contactNo: d.contactNo,
        emailId: d.emailId,
        address: d.address,
      });
      const components = parseComponentsFromExcel(d.components);
      const inserted = await pool.query(
        `INSERT INTO projects (
          project_no, start_date, time_value, time_unit, deadline_date, customer_id,
          company_name, contact_name, contact_no, email_id, designation, department, address,
          components, po_number, contract_number, problem, owner_user_id,
          account_manager, assigned_by, priority, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        RETURNING sr_no`,
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
          JSON.stringify(components),
          d.poNumber ?? null,
          d.contractNumber ?? null,
          d.problem,
          ownerUserId,
          d.accountManager,
          d.assignedBy,
          d.priority ?? "P3",
          d.status ?? "Pending",
        ]
      );
      const projectSrNo = inserted.rows[0].sr_no;
      const assigneeValues = assigneeUserIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await pool.query(
        `INSERT INTO project_assignees (project_sr_no, user_id) VALUES ${assigneeValues}`,
        [projectSrNo, ...assigneeUserIds]
      );
      results.push({ row: rowNumber, success: true, projectNo });
    } catch (err) {
      results.push({
        row: rowNumber,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const created = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  res.status(failed.length > 0 && created === 0 ? 400 : 200).json({
    created,
    failedCount: failed.length,
    errors: failed,
  });
}

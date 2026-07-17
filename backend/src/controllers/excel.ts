import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateTicketNumber } from "../utils/ticketNumber";
import { getOrCreateCustomerId } from "../utils/customers";
import {
  TICKET_MODES,
  CALL_TYPES,
  TICKET_STATUSES,
  INTERNAL_TAGS,
  TICKET_PRIORITIES,
} from "../types/ticket";

// Column headers used by both the export and the import template — keep
// these in sync with each other so a freshly exported file (or the
// downloaded template) can be re-imported unchanged.
const COLUMNS = [
  { header: "Ticket No", key: "ticketNo", width: 14 },
  { header: "Date Received", key: "ticketDate", width: 14 },
  { header: "Mode", key: "mode", width: 10 },
  { header: "Company Name", key: "companyName", width: 28 },
  { header: "Contact Name", key: "contactName", width: 18 },
  { header: "Contact No", key: "contactNo", width: 14 },
  { header: "Email ID", key: "emailId", width: 26 },
  { header: "Address", key: "address", width: 28 },
  { header: "Model", key: "model", width: 20 },
  { header: "Serial Number", key: "serialNumber", width: 18 },
  { header: "Problem", key: "problem", width: 40 },
  { header: "Account Manager", key: "accountManager", width: 20 },
  { header: "Assigned By", key: "assignedBy", width: 16 },
  { header: "Call Type", key: "callType", width: 12 },
  { header: "Assigned To", key: "assignedTo", width: 30 },
  { header: "Priority", key: "priority", width: 10 },
  { header: "Deadline Date", key: "deadlineDate", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Feedback From User", key: "feedback", width: 24 },
  { header: "Internal Tag", key: "internalTag", width: 12 },
] as const;

// Export-only — full remark history doesn't belong in the import template
// (a re-imported file always creates new tickets, it can't carry remarks
// into them). Appended after COLUMNS purely for display; import ignores any
// header it doesn't recognize, so a re-imported export is unaffected.
const UPDATE_COLUMNS = [{ header: "Remarks", key: "remarks", width: 50 }] as const;

function excelDateToIso(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  // exceljs gives plain strings for text-formatted cells.
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

// Excel/CSV formula injection guard: a cell value starting with =, +, - or @
// is interpreted by Excel as a formula when the file is opened, which lets
// attacker-influenced ticket data (company name, problem, remarks, etc.)
// execute HYPERLINK/webservice formulas or worse against whoever opens an
// export. Prefixing with a single quote forces Excel to treat it as literal
// text instead of a formula, without changing what's displayed.
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

export async function exportTickets(req: Request, res: Response) {
  const {
    status,
    callType,
    assigneeUserId,
    assignedBy,
    accountManager,
    priority,
    dateFrom,
    dateTo,
    search,
    overdue,
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
  if (assigneeUserId) {
    params.push(parseInt(assigneeUserId, 10));
    conditions.push(
      `EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_sr_no = t.sr_no AND ta.user_id = $${params.length})`
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT t.*,
      (SELECT array_agg(
         r.remark_date || COALESCE(' (' || r.created_by || ')', '') || ': ' || r.body
         ORDER BY r.created_at)
       FROM remarks r WHERE r.ticket_sr_no = t.sr_no) AS remarks_list,
      (SELECT string_agg(u.display_name, ', ' ORDER BY u.display_name)
       FROM ticket_assignees ta JOIN users u ON u.id = ta.user_id
       WHERE ta.ticket_sr_no = t.sr_no) AS assigned_to_names
    FROM tickets t ${whereClause} ORDER BY t.sr_no DESC`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tickets");
  sheet.columns = [...COLUMNS, ...UPDATE_COLUMNS] as unknown as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };

  // Individual remarks live on a hidden sheet, one ticket per row, so the
  // visible Remarks cell can show a dropdown instead of one long wrapped
  // block of text (Excel data validation lists need a cell range to source
  // their options from).
  const lookupSheet = workbook.addWorksheet("RemarksLookup");
  lookupSheet.state = "veryHidden";
  const remarksColLetter = sheet.getColumn("remarks").letter;

  result.rows.forEach((row, i) => {
    const remarksList: string[] = row.remarks_list ?? [];

    sheet.addRow(
      sanitizeRowValues({
        ticketNo: row.ticket_no,
        ticketDate: row.ticket_date,
        mode: row.mode,
        companyName: row.company_name,
        contactName: row.contact_name,
        contactNo: row.contact_no,
        emailId: row.email_id,
        address: row.address,
        model: row.model,
        serialNumber: row.serial_number,
        problem: row.problem,
        accountManager: row.account_manager,
        assignedBy: row.assigned_by,
        callType: row.call_type,
        assignedTo: row.assigned_to_names ?? "",
        priority: row.priority,
        deadlineDate: row.deadline_date,
        status: row.status,
        feedback: row.feedback,
        internalTag: row.internal_tag,
        remarks: remarksList.length > 0 ? remarksList[remarksList.length - 1] : "",
      })
    );

    if (remarksList.length > 0) {
      const lookupRowNum = i + 1;
      const lookupRow = lookupSheet.getRow(lookupRowNum);
      remarksList.forEach((remark, col) => {
        lookupRow.getCell(col + 1).value = sanitizeForExcel(remark) as string;
      });
      lookupRow.commit();

      const dataRowNum = i + 2; // header row offset
      const lastCol = String.fromCharCode("A".charCodeAt(0) + remarksList.length - 1);
      sheet.getCell(`${remarksColLetter}${dataRowNum}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`RemarksLookup!$A$${lookupRowNum}:$${lastCol}$${lookupRowNum}`],
      };
    }
  });
  sheet.getColumn("ticketDate").numFmt = "yyyy-mm-dd";
  sheet.getColumn("deadlineDate").numFmt = "yyyy-mm-dd";
  sheet.getColumn("remarks").alignment = { wrapText: true };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tickets-export-${new Date().toISOString().slice(0, 10)}.xlsx"`
  );
  await workbook.xlsx.write(res);
  res.end();
}

export async function downloadImportTemplate(_req: Request, res: Response) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tickets");
  sheet.columns = COLUMNS.filter((c) => c.key !== "ticketNo") as unknown as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    ticketDate: "2026-01-15",
    mode: "Call",
    companyName: "Acme Corp",
    contactName: "John Doe",
    contactNo: "9999999999",
    emailId: "john@acme.com",
    address: "123 Street",
    model: "Dell XPS",
    serialNumber: "SN123,SN124",
    problem: "Laptop not booting",
    accountManager: "Reception Desk - Sunita",
    assignedBy: "Office Manager",
    callType: "Warranty",
    assignedTo: "Pranesh Kute",
    priority: "P3",
    deadlineDate: "2026-01-22",
    status: "Pending",
    feedback: "",
    internalTag: "External",
  });

  const employeesResult = await pool.query(
    "SELECT display_name FROM users ORDER BY display_name"
  );
  const refSheet = workbook.addWorksheet("Reference");
  refSheet.columns = [
    { header: "Modes", key: "modes", width: 14 },
    { header: "Call Types", key: "callTypes", width: 16 },
    { header: "Statuses", key: "statuses", width: 14 },
    { header: "Priorities", key: "priorities", width: 12 },
    { header: "Internal Tags", key: "internalTags", width: 14 },
    { header: "Assigned To (employees)", key: "employees", width: 22 },
  ];
  refSheet.getRow(1).font = { bold: true };
  const maxRows = Math.max(
    TICKET_MODES.length,
    CALL_TYPES.length,
    TICKET_STATUSES.length,
    TICKET_PRIORITIES.length,
    INTERNAL_TAGS.length,
    employeesResult.rows.length
  );
  for (let i = 0; i < maxRows; i++) {
    refSheet.addRow({
      modes: TICKET_MODES[i] ?? "",
      callTypes: CALL_TYPES[i] ?? "",
      statuses: TICKET_STATUSES[i] ?? "",
      priorities: TICKET_PRIORITIES[i] ?? "",
      internalTags: INTERNAL_TAGS[i] ?? "",
      employees: employeesResult.rows[i]?.display_name ?? "",
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="ticket-import-template.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

const importRowSchema = z.object({
  ticketDate: z.string().min(1, "Date Received is required"),
  mode: z.enum(TICKET_MODES),
  companyName: z.string().min(1, "Company Name is required"),
  contactName: z.string().optional(),
  contactNo: z.string().optional(),
  emailId: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  problem: z.string().min(1, "Problem is required"),
  accountManager: z.string().min(1, "Account Manager is required"),
  assignedBy: z.string().min(1, "Assigned By is required"),
  callType: z.enum(CALL_TYPES),
  // Comma-separated list of employee display names, e.g. "Pranesh Kute, Jane Doe" —
  // matches the export format so a re-imported export round-trips unchanged.
  assignedTo: z.string().min(1, "Assigned To is required"),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  deadlineDate: z.string().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  feedback: z.string().max(50).optional(),
  internalTag: z.enum(INTERNAL_TAGS).optional(),
});

interface ImportRowResult {
  row: number;
  success: boolean;
  ticketNo?: string;
  error?: string;
}

export async function importTickets(req: Request, res: Response) {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's type defs resolve Buffer via a nested, older @types/node
    // (pulled in transitively through @fast-csv), which is structurally
    // incompatible with this project's @types/node Buffer — an `any` cast
    // is the only way around the mismatch; the runtime value is a real
    // Buffer either way.
    await workbook.xlsx.load(file.buffer as any);
  } catch {
    return res.status(400).json({ error: "Could not read the uploaded file as an Excel workbook" });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(400).json({ error: "Workbook has no sheets" });
  }

  // Each row runs several sequential DB round trips; an unbounded row count
  // (limited only by the 10MB file-size cap) can tie up a pool connection
  // and the event loop for a very long time on one request.
  const MAX_IMPORT_ROWS = 2000;
  if (sheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    return res.status(400).json({
      error: `Workbook has too many rows (max ${MAX_IMPORT_ROWS} tickets per import)`,
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

    // Skip fully blank rows (trailing empty rows are common in spreadsheets).
    const hasAnyValue = Object.values(raw).some((v) => v !== null && v !== undefined && v !== "");
    if (!hasAnyValue) continue;

    const candidate = {
      ticketDate: excelDateToIso(raw.ticketDate),
      mode: cellToString(raw.mode),
      companyName: cellToString(raw.companyName),
      contactName: cellToString(raw.contactName),
      contactNo: cellToString(raw.contactNo),
      emailId: cellToString(raw.emailId),
      address: cellToString(raw.address),
      model: cellToString(raw.model),
      serialNumber: cellToString(raw.serialNumber),
      problem: cellToString(raw.problem),
      accountManager: cellToString(raw.accountManager),
      assignedBy: cellToString(raw.assignedBy),
      callType: cellToString(raw.callType),
      assignedTo: cellToString(raw.assignedTo),
      priority: cellToString(raw.priority),
      deadlineDate: excelDateToIso(raw.deadlineDate),
      status: cellToString(raw.status),
      feedback: cellToString(raw.feedback),
      internalTag: cellToString(raw.internalTag),
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
      const ticketDate = new Date(d.ticketDate);
      const ticketNo = await generateTicketNumber(ticketDate);
      const customerId = await getOrCreateCustomerId({
        companyName: d.companyName,
        contactName: d.contactName,
        contactNo: d.contactNo,
        emailId: d.emailId,
        address: d.address,
      });
      const inserted = await pool.query(
        `INSERT INTO tickets (
          ticket_no, ticket_date, mode, customer_id, company_name, contact_name, contact_no, email_id, address,
          model, serial_number, problem, owner_user_id, account_manager, assigned_by, call_type,
          priority, deadline_date, status, feedback, internal_tag
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING sr_no`,
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
          d.priority ?? "P3",
          d.deadlineDate || null,
          d.status ?? "Pending",
          d.feedback || null,
          d.internalTag ?? "External",
        ]
      );
      const ticketSrNo = inserted.rows[0].sr_no;
      const assigneeValues = assigneeUserIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await pool.query(
        `INSERT INTO ticket_assignees (ticket_sr_no, user_id) VALUES ${assigneeValues}`,
        [ticketSrNo, ...assigneeUserIds]
      );
      results.push({ row: rowNumber, success: true, ticketNo });
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

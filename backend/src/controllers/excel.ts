import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { pool } from "../db/pool";
import { generateTicketNumber } from "../utils/ticketNumber";
import {
  TICKET_MODES,
  CALL_TYPES,
  TICKET_STATUSES,
  INTERNAL_TAGS,
} from "../types/ticket";

// Column headers used by both the export and the import template — keep
// these in sync with each other so a freshly exported file (or the
// downloaded template) can be re-imported unchanged.
const COLUMNS = [
  { header: "Ticket No", key: "ticketNo", width: 14 },
  { header: "Date Received", key: "ticketDate", width: 14 },
  { header: "Mode", key: "mode", width: 10 },
  { header: "Company Name", key: "companyName", width: 24 },
  { header: "Contact Name", key: "contactName", width: 18 },
  { header: "Contact No", key: "contactNo", width: 14 },
  { header: "Email ID", key: "emailId", width: 22 },
  { header: "Address", key: "address", width: 24 },
  { header: "Model", key: "model", width: 16 },
  { header: "Serial Number", key: "serialNumber", width: 18 },
  { header: "Problem", key: "problem", width: 30 },
  { header: "Account Manager", key: "accountManager", width: 20 },
  { header: "Assigned By", key: "assignedBy", width: 20 },
  { header: "Call Type", key: "callType", width: 14 },
  { header: "Assigned To", key: "assignedTo", width: 20 },
  { header: "Deadline Date", key: "deadlineDate", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Feedback From User", key: "feedback", width: 16 },
  { header: "Internal Tag", key: "internalTag", width: 12 },
] as const;

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

export async function exportTickets(req: Request, res: Response) {
  const {
    status,
    callType,
    assignedTo,
    assignedBy,
    accountManager,
    dateFrom,
    dateTo,
    search,
    overdue,
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (callType) {
    params.push(callType);
    conditions.push(`call_type = $${params.length}`);
  }
  if (assignedTo) {
    params.push(assignedTo);
    conditions.push(`assigned_to = $${params.length}`);
  }
  if (accountManager) {
    params.push(accountManager);
    conditions.push(`account_manager = $${params.length}`);
  }
  if (assignedBy) {
    params.push(assignedBy);
    conditions.push(`assigned_by = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`ticket_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`ticket_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(company_name ILIKE $${params.length} OR ticket_no ILIKE $${params.length})`);
  }
  if (overdue === "true") {
    conditions.push(
      `status IN ('Pending', 'In Progress') AND deadline_date IS NOT NULL AND deadline_date < CURRENT_DATE`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM tickets ${whereClause} ORDER BY sr_no DESC`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tickets");
  sheet.columns = COLUMNS as unknown as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };

  for (const row of result.rows) {
    sheet.addRow({
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
      assignedTo: row.assigned_to,
      deadlineDate: row.deadline_date,
      status: row.status,
      feedback: row.feedback,
      internalTag: row.internal_tag,
    });
  }
  sheet.getColumn("ticketDate").numFmt = "yyyy-mm-dd";
  sheet.getColumn("deadlineDate").numFmt = "yyyy-mm-dd";

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
    { header: "Internal Tags", key: "internalTags", width: 14 },
    { header: "Assigned To (employees)", key: "employees", width: 22 },
  ];
  refSheet.getRow(1).font = { bold: true };
  const maxRows = Math.max(
    TICKET_MODES.length,
    CALL_TYPES.length,
    TICKET_STATUSES.length,
    INTERNAL_TAGS.length,
    employeesResult.rows.length
  );
  for (let i = 0; i < maxRows; i++) {
    refSheet.addRow({
      modes: TICKET_MODES[i] ?? "",
      callTypes: CALL_TYPES[i] ?? "",
      statuses: TICKET_STATUSES[i] ?? "",
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
  assignedTo: z.string().min(1, "Assigned To is required"),
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
    const assignedToUserId = employeeIdByName.get(d.assignedTo.toLowerCase());
    if (!assignedToUserId) {
      results.push({
        row: rowNumber,
        success: false,
        error: `"${d.assignedTo}" does not match any platform employee`,
      });
      continue;
    }

    try {
      const ticketDate = new Date(d.ticketDate);
      const ticketNo = await generateTicketNumber(ticketDate);
      await pool.query(
        `INSERT INTO tickets (
          ticket_no, ticket_date, mode, company_name, contact_name, contact_no, email_id, address,
          model, serial_number, problem, owner_user_id, account_manager, assigned_by, call_type,
          assigned_to_user_id, assigned_to, deadline_date, status, feedback, internal_tag
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          ticketNo,
          d.ticketDate,
          d.mode,
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
          assignedToUserId,
          d.assignedTo,
          d.deadlineDate || null,
          d.status ?? "Pending",
          d.feedback || null,
          d.internalTag ?? "External",
        ]
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

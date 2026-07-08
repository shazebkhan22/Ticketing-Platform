import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { REPAIR_LOCATIONS } from "../types/ticket";
import { sendMail } from "../utils/mailer";

// Quantity is derived from the ticket's comma-separated serial_number field
// rather than stored on ticket_inventory — "xyz,abc" means 2 units came in
// together, and they move in/out of the workshop as one batch per ticket.
function quantityFromSerialNumber(serialNumber: string | null): number {
  if (!serialNumber) return 0;
  return serialNumber
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function deriveStatus(row: {
  inward_date: string | null;
  outward_date: string | null;
  repair_location: string;
}): string {
  if (row.outward_date) return "Returned to Customer";
  if (row.inward_date) return row.repair_location === "Outsourced" ? "Outsourced" : "In-House";
  return "Pending Inward";
}

function rowToInventoryItem(row: any) {
  return {
    srNo: row.sr_no,
    ticketNo: row.ticket_no,
    companyName: row.company_name,
    model: row.model,
    serialNumber: row.serial_number,
    quantity: quantityFromSerialNumber(row.serial_number),
    status: row.status,
    inwardDate: row.inward_date,
    outwardDate: row.outward_date,
    repairLocation: row.repair_location ?? "In-House",
    outsourceVendor: row.outsource_vendor,
    expectedReturnDate: row.expected_return_date,
    derivedStatus: deriveStatus({
      inward_date: row.inward_date,
      outward_date: row.outward_date,
      repair_location: row.repair_location ?? "In-House",
    }),
  };
}

export async function listInventory(req: Request, res: Response) {
  const {
    search,
    repairLocation,
    status,
    page = "1",
    pageSize = "7",
  } = req.query as Record<string, string>;

  const conditions: string[] = [`t.serial_number IS NOT NULL`, `t.serial_number <> ''`];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(t.company_name ILIKE $${params.length} OR t.ticket_no ILIKE $${params.length} OR t.serial_number ILIKE $${params.length})`
    );
  }
  if (repairLocation) {
    params.push(repairLocation);
    conditions.push(`COALESCE(i.repair_location::text, 'In-House') = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const result = await pool.query(
    `SELECT
      t.sr_no, t.ticket_no, t.company_name, t.model, t.serial_number,
      i.inward_date, i.outward_date, i.repair_location, i.outsource_vendor, i.expected_return_date
    FROM tickets t
    LEFT JOIN ticket_inventory i ON i.ticket_sr_no = t.sr_no
    ${whereClause}
    ORDER BY t.sr_no DESC`,
    params
  );

  let items = result.rows.map(rowToInventoryItem);

  // derivedStatus depends on values computed in JS (quantity/status logic
  // mirrors the SQL row), so this filter is applied after the query rather
  // than pushed into the WHERE clause.
  if (status) {
    items = items.filter((item) => item.derivedStatus === status);
  }

  // Pagination also happens here in JS rather than via SQL LIMIT/OFFSET,
  // since the status filter above already requires the full filtered set
  // to be in memory before a page can be sliced out of it.
  const limit = Math.min(parseInt(pageSize, 10) || 7, 200);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const total = items.length;
  const start = (pageNum - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  res.json({ items: pageItems, total, page: pageNum, pageSize: limit });
}

const upsertInventorySchema = z.object({
  inwardDate: z.string().optional(),
  outwardDate: z.string().optional(),
  repairLocation: z.enum(REPAIR_LOCATIONS).optional(),
  outsourceVendor: z.string().optional(),
  expectedReturnDate: z.string().optional(),
});

export async function upsertInventory(req: Request, res: Response) {
  const srNo = parseInt(req.params.srNo, 10);
  const parsed = upsertInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;

  if (d.outwardDate && !d.inwardDate) {
    return res.status(400).json({ error: "Inward date is required before setting an outward date" });
  }
  if (d.inwardDate && d.outwardDate && d.outwardDate < d.inwardDate) {
    return res.status(400).json({ error: "Outward date cannot be before inward date" });
  }
  if (d.repairLocation === "Outsourced") {
    if (!d.outsourceVendor?.trim()) {
      return res.status(400).json({ error: "Repair center name is required for outsourced repairs" });
    }
    if (!d.expectedReturnDate) {
      return res.status(400).json({ error: "Expected return date is required for outsourced repairs" });
    }
  }
  if (d.outwardDate && d.expectedReturnDate && d.expectedReturnDate > d.outwardDate) {
    return res.status(400).json({ error: "Expected return date cannot be after the outward date" });
  }

  const ticketResult = await pool.query(
    "SELECT sr_no, ticket_no, company_name, contact_name, email_id FROM tickets WHERE sr_no = $1",
    [srNo]
  );
  if (ticketResult.rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const ticket = ticketResult.rows[0];

  const existingResult = await pool.query(
    "SELECT outward_date, outward_notified_at FROM ticket_inventory WHERE ticket_sr_no = $1",
    [srNo]
  );
  const existing = existingResult.rows[0];
  const newOutwardDate = d.outwardDate || null;
  // Only notify the first time an outward date is actually set — re-saving
  // the same (or a different) outward date on an already-notified ticket
  // shouldn't send another "your product has shipped" email.
  const shouldNotify = newOutwardDate && !existing?.outward_date && !existing?.outward_notified_at;

  const result = await pool.query(
    `INSERT INTO ticket_inventory (
      ticket_sr_no, inward_date, outward_date, repair_location, outsource_vendor, expected_return_date
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (ticket_sr_no) DO UPDATE SET
      inward_date = EXCLUDED.inward_date,
      outward_date = EXCLUDED.outward_date,
      repair_location = EXCLUDED.repair_location,
      outsource_vendor = EXCLUDED.outsource_vendor,
      expected_return_date = EXCLUDED.expected_return_date
    RETURNING *`,
    [
      srNo,
      d.inwardDate || null,
      newOutwardDate,
      d.repairLocation ?? "In-House",
      d.outsourceVendor || null,
      d.expectedReturnDate || null,
    ]
  );

  let row = result.rows[0];
  if (shouldNotify && ticket.email_id) {
    const sent = await sendMail({
      to: ticket.email_id,
      subject: `Your product has been repaired and sent — ${ticket.ticket_no}`,
      text: `Hi ${ticket.contact_name},\n\nYour product for ticket ${ticket.ticket_no} has been repaired and dispatched back to you.\n\nThank you for your patience.`,
    });
    if (sent) {
      const notifiedResult = await pool.query(
        `UPDATE ticket_inventory SET outward_notified_at = now() WHERE ticket_sr_no = $1 RETURNING *`,
        [srNo]
      );
      row = notifiedResult.rows[0];
    }
  }

  res.json({
    srNo: row.ticket_sr_no,
    inwardDate: row.inward_date,
    outwardDate: row.outward_date,
    repairLocation: row.repair_location,
    outsourceVendor: row.outsource_vendor,
    expectedReturnDate: row.expected_return_date,
  });
}

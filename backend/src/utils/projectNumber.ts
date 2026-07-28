import { pool } from "../db/pool";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// Same atomic counter pattern as generateTicketNumber (see ticketNumber.ts)
// to avoid a race condition under concurrent project creation. "PRJ" prefix
// visually distinguishes project numbers from tickets' all-digit numbers.
export async function generateProjectNumber(startDate: Date): Promise<string> {
  const dd = pad2(startDate.getDate());
  const mm = pad2(startDate.getMonth() + 1);
  const yyyy = startDate.getFullYear().toString();
  const prefix = `PRJ${dd}${mm}${yyyy}`;

  const result = await pool.query(
    `INSERT INTO project_number_counters (prefix, last_seq)
     VALUES ($1, 1)
     ON CONFLICT (prefix) DO UPDATE SET last_seq = project_number_counters.last_seq + 1
     RETURNING last_seq`,
    [prefix]
  );

  const nextSeq: number = result.rows[0].last_seq;
  return `${prefix}${pad2(nextSeq)}`;
}

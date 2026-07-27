import { pool } from "../db/pool";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// Atomic: INSERT ... ON CONFLICT DO UPDATE is a single statement in
// Postgres, so concurrent calls for the same date serialize on the
// ticket_number_counters row instead of racing on a read-then-write in
// application code (which could hand out the same ticket_no twice under
// concurrent ticket creation).
export async function generateTicketNumber(ticketDate: Date): Promise<string> {
  const dd = pad2(ticketDate.getDate());
  const mm = pad2(ticketDate.getMonth() + 1);
  const yyyy = ticketDate.getFullYear().toString();
  const prefix = `${dd}${mm}${yyyy}`;

  const result = await pool.query(
    `INSERT INTO ticket_number_counters (prefix, last_seq)
     VALUES ($1, 1)
     ON CONFLICT (prefix) DO UPDATE SET last_seq = ticket_number_counters.last_seq + 1
     RETURNING last_seq`,
    [prefix]
  );

  const nextSeq: number = result.rows[0].last_seq;
  return `${prefix}${pad2(nextSeq)}`;
}

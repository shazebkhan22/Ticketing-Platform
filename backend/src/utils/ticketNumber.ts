import { pool } from "../db/pool";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export async function generateTicketNumber(ticketDate: Date): Promise<string> {
  const dd = pad2(ticketDate.getDate());
  const mm = pad2(ticketDate.getMonth() + 1);
  const yyyy = ticketDate.getFullYear().toString();
  const prefix = `${dd}${mm}${yyyy}`;

  const result = await pool.query(
    `SELECT ticket_no FROM tickets WHERE ticket_no LIKE $1 ORDER BY ticket_no DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (result.rows.length > 0) {
    const lastTicketNo: string = result.rows[0].ticket_no;
    const seqPart = lastTicketNo.slice(prefix.length);
    const lastSeq = parseInt(seqPart, 10);
    if (!Number.isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${pad2(nextSeq)}`;
}

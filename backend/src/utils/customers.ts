import { pool } from "../db/pool";

// Every ticket save (create, and bulk Excel import) calls this so that
// "customer history" builds up automatically from company names already
// being typed into tickets — nobody has to separately manage a customer
// list. First ticket for a company creates the customer row and seeds its
// contact details; later tickets just link to the existing row.
export async function getOrCreateCustomerId(input: {
  companyName: string;
  contactName?: string | null;
  contactNo?: string | null;
  emailId?: string | null;
  address?: string | null;
}): Promise<number> {
  const result = await pool.query(
    `INSERT INTO customers (name, contact_name, contact_no, email_id, address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      input.companyName,
      input.contactName ?? null,
      input.contactNo ?? null,
      input.emailId ?? null,
      input.address ?? null,
    ]
  );
  return result.rows[0].id;
}

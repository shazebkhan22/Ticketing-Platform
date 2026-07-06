import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

export async function getFeedbackByToken(req: Request, res: Response) {
  const { token } = req.params;
  const result = await pool.query(
    `SELECT ticket_no, company_name, customer_feedback_submitted_at
     FROM tickets WHERE feedback_token = $1`,
    [token]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Invalid or expired feedback link" });
  }
  const row = result.rows[0];
  res.json({
    ticketNo: row.ticket_no,
    companyName: row.company_name,
    alreadySubmitted: row.customer_feedback_submitted_at !== null,
  });
}

const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function submitFeedback(req: Request, res: Response) {
  const { token } = req.params;
  const parsed = submitFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await pool.query(
    `UPDATE tickets SET
       customer_feedback_rating = $1,
       customer_feedback_comment = $2,
       customer_feedback_submitted_at = now()
     WHERE feedback_token = $3 AND customer_feedback_submitted_at IS NULL
     RETURNING sr_no`,
    [parsed.data.rating, parsed.data.comment || null, token]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Invalid or already-used feedback link" });
  }

  res.json({ success: true });
}

import cron from "node-cron";
import { pool } from "../db/pool";
import { sendMail } from "../utils/mailer";
import { renderEmailHtml } from "../utils/emailTemplate";
import { generateFeedbackToken } from "../utils/feedbackToken";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Runs every 15 minutes, looking for tickets that closed at least 24h ago
// and haven't had a feedback email sent yet. A token is generated lazily
// here (rather than at close time) so it's only ever created right before
// it's actually needed.
async function runFeedbackReminderSweep() {
  const result = await pool.query(
    `SELECT sr_no, ticket_no, company_name,contact_name, email_id
     FROM tickets
     WHERE status = 'Closed'
       AND closed_at IS NOT NULL
       AND closed_at <= now() - interval '24 hours'
       AND feedback_requested_at IS NULL
       AND email_id IS NOT NULL
       AND email_id <> ''`
  );

  for (const ticket of result.rows) {
    const token = generateFeedbackToken();
    const link = `${env.frontendOrigin}/feedback/${token}`;

    const text = `Dear ${ticket.contact_name},\n\nYour ticket ${ticket.ticket_no} has recently been closed. To help us improve our service quality, we kindly request your feedback on the support experience. Please rate your overall satisfaction on a scale of 1 to 5, where:\n1 – Very Dissatisfied\n2 – Dissatisfied\n3 – Neutral\n4 – Satisfied\n5 – Excellent\n\nYou may share your rating and any additional comments here:\n${link}\n\nThank you for choosing Cygnus. We appreciate your time and feedback.\n\nBest regards,\nSupport Team`;

    await sendMail({
      to: ticket.email_id,
      subject: `We'd Value Your Feedback — Ticket ${ticket.ticket_no}`,
      text,
      html: renderEmailHtml(text),
    });

    await pool.query(
      `UPDATE tickets SET feedback_token = $1, feedback_requested_at = now() WHERE sr_no = $2`,
      [token, ticket.sr_no]
    );
  }
}

export function startFeedbackReminderJob() {
  cron.schedule("*/15 * * * *", () => {
    runFeedbackReminderSweep().catch((err) => {
      logger.error({ err }, "Feedback reminder sweep failed");
    });
  });
}

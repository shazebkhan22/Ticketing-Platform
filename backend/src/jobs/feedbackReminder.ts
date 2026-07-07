import cron from "node-cron";
import { pool } from "../db/pool";
import { sendMail } from "../utils/mailer";
import { generateFeedbackToken } from "../utils/feedbackToken";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Runs every 15 minutes, looking for tickets that closed at least 24h ago
// and haven't had a feedback email sent yet. A token is generated lazily
// here (rather than at close time) so it's only ever created right before
// it's actually needed.
async function runFeedbackReminderSweep() {
  const result = await pool.query(
    `SELECT sr_no, ticket_no, company_name, email_id
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

    await sendMail({
      to: ticket.email_id,
      subject: `How did we do? Feedback for ticket ${ticket.ticket_no}`,
      text: `Hi ${ticket.company_name},\n\nYour ticket ${ticket.ticket_no} was recently closed. We'd appreciate your feedback:\n${link}\n\nThanks!`,
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

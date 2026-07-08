import nodemailer from "nodemailer";
import { pool } from "../db/pool";
import { logger } from "./logger";

interface MailInput {
  to: string;
  subject: string;
  text: string;
}

// SMTP credentials live in the smtp_config singleton row (see Settings page)
// rather than env vars, so admins can change them at runtime without a
// redeploy. If nothing has been configured yet, emails are skipped rather
// than throwing, so ticket/inventory writes never fail because of mail setup.
// Returns whether the mail actually went out — callers that gate a
// one-time "notified" flag on this must not set that flag when it's false,
// or a real send failure (e.g. bad SMTP auth) gets silently treated as sent
// and never retried.
export async function sendMail(input: MailInput): Promise<boolean> {
  const result = await pool.query(
    "SELECT host, port, username, password, from_address, secure FROM smtp_config WHERE id = 1"
  );
  const config = result.rows[0];
  if (!config || !config.host || !config.from_address) {
    logger.warn({ to: input.to }, "Skipping email: SMTP is not configured");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure,
    auth: config.username ? { user: config.username, pass: config.password } : undefined,
  });

  try {
    await transporter.sendMail({
      from: config.from_address,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return true;
  } catch (err) {
    logger.error({ err, to: input.to }, "Failed to send email");
    return false;
  }
}

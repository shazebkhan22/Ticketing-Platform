import nodemailer from "nodemailer";
import { pool } from "../db/pool";
import { logger } from "./logger";
import { decryptSecret } from "./secretCrypto";

// Passwords saved before encryption support was added are still plaintext in
// the DB; decryptSecret's "v1:..." format check lets us tell those apart and
// use them as-is instead of erroring, until the admin re-saves SMTP settings.
function decryptStoredPassword(stored: string | null): string | undefined {
  if (!stored) return undefined;
  try {
    return decryptSecret(stored);
  } catch {
    return stored;
  }
}

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
    "SELECT host, port, username, password, from_address, from_name, secure FROM smtp_config WHERE id = 1"
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
    auth: config.username ? { user: config.username, pass: decryptStoredPassword(config.password) } : undefined,
  });

  try {
    await transporter.sendMail({
      from: config.from_name ? { name: config.from_name, address: config.from_address } : config.from_address,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (err) {
    logger.error({ err, to: input.to }, "Failed to send email");
    return false;
  }
}

import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { pool } from "../db/pool";
import { renderEmailHtml } from "../utils/emailTemplate";
import { decryptSecret } from "../utils/secretCrypto";

const OVERVIEW_DOC_PATH = path.join(__dirname, "assets", "employee-poc.html");

interface Recipient {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

const RECIPIENTS: Recipient[] = [
  { fullName: "Narendar Kumar", username: "narendrak", email: "fms.dehradun@cygnussolutions.co.in", password: "N@r3ndr@@1005" },
  { fullName: "Ajay Malik", username: "ajaym", email: "fms.dehradun@cygnussolutions.co.in", password: "Aj@y@1005" },
  { fullName: "Rajesh R", username: "rajeshr", email: "fms.chennai@cygnussolutions.co.in", password: "R@j3sh@1005" },
  { fullName: "Yash Gupta", username: "yashg", email: "fms.vadodara@cygnussolutions.co.in", password: "Y@sh@1005" },
  { fullName: "Ravi Kumar Gorrela", username: "ravig", email: "fms.rajahmundry@cygnussolutions.co.in", password: "R@v!@1005" },
  { fullName: "Rohit Kumar", username: "rohitk", email: "fms.iitpatna@cygnussolutions.co.in", password: "R0h!t@1005" },
  { fullName: "Aman Sandim", username: "amans", email: "Aman.Sandim@shelfdrilling.com", password: "Am@n@1005" },
  { fullName: "Shazeb Khan", username: "shazebk", email: "shazebk@cygnusanalytics.ai", password: "Sh@z3b@1005" }
];

function decryptStoredPassword(stored: string | null): string | undefined {
  if (!stored) return undefined;
  try {
    return decryptSecret(stored);
  } catch {
    return stored;
  }
}

async function getTransporterAndFrom() {
  const result = await pool.query(
    "SELECT host, port, username, password, from_address, from_name, secure FROM smtp_config WHERE id = 1"
  );
  const config = result.rows[0];
  if (!config || !config.host || !config.from_address) {
    throw new Error("SMTP is not configured (smtp_config table is empty). Set it up via the Settings page first.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure,
    auth: config.username ? { user: config.username, pass: decryptStoredPassword(config.password) } : undefined,
  });

  const from = config.from_name ? { name: config.from_name, address: config.from_address } : config.from_address;
  return { transporter, from };
}

async function main() {
  if (!fs.existsSync(OVERVIEW_DOC_PATH)) {
    throw new Error(
      `Project overview doc not found at ${OVERVIEW_DOC_PATH}. Add the file there (or update OVERVIEW_DOC_PATH) before running this script.`
    );
  }

  const { transporter, from } = await getTransporterAndFrom();

  // TEST_EMAIL=you@example.com npm run send-password-emails sends only the
  // first recipient's credentials to that address instead of the real list.
  const testEmail = process.env.TEST_EMAIL;
  const recipients = testEmail ? [{ ...RECIPIENTS[0], email: testEmail }] : RECIPIENTS;

  for (const recipient of recipients) {
    const text = `Hi ${recipient.fullName},

Your account has been created. Here are your login credentials:

Username: ${recipient.username}
Password: ${recipient.password}

Please change your password after logging in for the first time.

Attached is a Proof of Concept document giving an overview of the system and what you can do as an employee.`;

    try {
      await transporter.sendMail({
        from,
        to: recipient.email,
        subject: "Your Account Credentials & Project Overview",
        text,
        html: renderEmailHtml(text),
        attachments: [
          {
            filename: path.basename(OVERVIEW_DOC_PATH),
            path: OVERVIEW_DOC_PATH,
          },
        ],
      });
      console.log(`Sent to ${recipient.fullName} <${recipient.email}>`);
    } catch (err) {
      console.error(`Failed to send to ${recipient.fullName} <${recipient.email}>:`, err);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

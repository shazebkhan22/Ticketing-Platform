import cron from "node-cron";
import { pool } from "../db/pool";
import { sendMail } from "../utils/mailer";
import { renderEmailHtml } from "../utils/emailTemplate";
import { logger } from "../utils/logger";

interface DigestRemarkRow {
  am_id: number;
  am_name: string;
  am_email: string;
  sr_no: number;
  project_no: string;
  company_name: string;
  body: string;
  created_by: string | null;
  created_at: Date;
  highlighted: boolean;
}

// Runs once a day, emailing each account manager a summary of every remark
// added (by anyone, on any of their projects) in the last 24 hours — not a
// polling sweep like feedbackReminder.ts, since there's no per-remark
// "already sent" state to track; the digest is simply defined by the rolling
// time window, so a missed/late run just catches up next time it fires.
async function runDailyDigest() {
  const result = await pool.query<DigestRemarkRow>(
    `SELECT am.id AS am_id, am.name AS am_name, am.email AS am_email,
       p.sr_no, p.project_no, p.company_name,
       r.body, r.created_by, r.created_at, r.highlighted
     FROM project_remarks r
     JOIN projects p ON p.sr_no = r.project_sr_no AND p.deleted_at IS NULL
     JOIN account_managers am ON am.id = p.account_manager_id
     WHERE r.created_at >= now() - interval '24 hours'
       AND am.email IS NOT NULL AND am.email <> ''
     ORDER BY am.id, p.sr_no, r.created_at`
  );

  // Group remarks by account manager, then by project — one email per
  // manager covering every project of theirs that got a remark today.
  const byManager = new Map<number, { name: string; email: string; projects: Map<number, DigestRemarkRow[]> }>();
  for (const row of result.rows) {
    let manager = byManager.get(row.am_id);
    if (!manager) {
      manager = { name: row.am_name, email: row.am_email, projects: new Map() };
      byManager.set(row.am_id, manager);
    }
    const projectRemarks = manager.projects.get(row.sr_no) ?? [];
    projectRemarks.push(row);
    manager.projects.set(row.sr_no, projectRemarks);
  }

  for (const manager of byManager.values()) {
    const projectRemarkLists = [...manager.projects.values()];

    // Two parallel renderings of the same remark line — plain text keeps
    // highlighted remarks readable (no markup) since it's the non-HTML
    // fallback body; the HTML version wraps them in <strong> so they
    // actually render bold in an email client. renderEmailHtml only
    // transforms "\n"/"\n\n", so the <strong> tags pass through untouched.
    function remarkLine(r: DigestRemarkRow): string {
      return `  - ${r.created_at.toISOString().slice(0, 16).replace("T", " ")}${
        r.created_by ? ` (${r.created_by})` : ""
      }: ${r.body}`;
    }

    const textSections = projectRemarkLists.map((remarks) => {
      const { project_no, company_name } = remarks[0];
      const lines = remarks.map((r) => (r.highlighted ? `${remarkLine(r)} [HIGHLIGHT]` : remarkLine(r)));
      return `${project_no} — ${company_name}\n${lines.join("\n")}`;
    });

    const htmlSections = projectRemarkLists.map((remarks) => {
      const { project_no, company_name } = remarks[0];
      const lines = remarks.map((r) =>
        r.highlighted ? `<strong>${remarkLine(r)}</strong>` : remarkLine(r)
      );
      return `${project_no} — ${company_name}\n${lines.join("\n")}`;
    });

    const text = `Dear ${manager.name},\n\nHere is a summary of remarks added to your projects in the last 24 hours:\n\n${textSections.join(
      "\n\n"
    )}\n\nBest regards,\nCygnus Ticketing System`;

    const html = `Dear ${manager.name},\n\nHere is a summary of remarks added to your projects in the last 24 hours:\n\n${htmlSections.join(
      "\n\n"
    )}\n\nBest regards,\nCygnus Ticketing System`;

    await sendMail({
      to: manager.email,
      subject: `Daily Project Remarks Digest — ${textSections.length} project(s) updated`,
      text,
      html: renderEmailHtml(html),
    });
  }
}

export function startDailyDigestJob() {
  // Once daily at 09:00 server time — unlike the 15-minute polling sweeps
  // elsewhere in jobs/, this is a true daily batch (see runDailyDigest).
  cron.schedule("0 9 * * *", () => {
    runDailyDigest().catch((err) => {
      logger.error({ err }, "Daily digest job failed");
    });
  });
}

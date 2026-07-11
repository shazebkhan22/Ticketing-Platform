import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { renderEmailHtml } from "../utils/emailTemplate";

// Dev-only tool: renders the current `renderEmailHtml` template with sample
// data and writes it to a static HTML file you can open directly in a
// browser — no server, no auth, no route to remember to remove later. Re-run
// `npm run preview-email` after every template edit to see the change; it
// overwrites the same file each time.
const SAMPLE_TEXT = `Dear John Doe,

We are pleased to inform you that the repair for your product under ticket 1006202601 has been completed and dispatched back to you.

Thank you for your patience throughout this process. Please do not hesitate to reach out if you have any questions.

Best regards,
Support Team`;

const html = renderEmailHtml(SAMPLE_TEXT);
const outPath = path.join(__dirname, "../../email-preview.html");
fs.writeFileSync(outPath, html, "utf-8");

console.log(`Email preview written to ${outPath}`);

if (process.platform === "darwin") {
  execSync(`open "${outPath}"`);
}

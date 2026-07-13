const LOGO_URL ="https://res.cloudinary.com/duhhwugqb/image/upload/v1783410566/Cygnus_Exp_rl8ue3.png";
const WEBSITE_URL = "https://www.cygnussolutions.co.in";
const LINKEDIN_URL = "https://www.linkedin.com/company/cygnus-information-solutions-pvt-ltd-/posts/?feedView=all";

export function renderEmailHtml(bodyText: string): string {
  const paragraphs = bodyText
    .split("\n\n")
    .map(
      (p) =>
        `<p style="margin:0 0 16px;line-height:1.5;">${p.replace(
          /\n/g,
          "<br/>"
        )}</p>`
    )
    .join("");

  const year = new Date().getFullYear();

  return `
<div style="font-family:Arial,Helvetica,sans-serif;margin:0 auto;padding:16px 0;color:#1f2937;max-width:600px;width:100%;background-color: #ffffff;border-radius: 12px;overflow: hidden;box-shadow: 0 6px 40px rgba(10, 40, 80, 0.13);">
  <div style="text-align:center;padding:0 28px;">
    <img src="${LOGO_URL}" alt="Cygnus" style="height:40px;margin-top:24px;display:inline-block;" />
  </div>
  <div style="padding:24px;">
    ${paragraphs}
  </div>
  <div style="margin-top:8px;padding:20px 24px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">
      <a href="${WEBSITE_URL}" style="color:#0a3b6e;text-decoration:none;margin:0 10px;">Website</a>
      <a href="${LINKEDIN_URL}" style="color:#0a3b6e;text-decoration:none;margin:0 10px;">LinkedIn</a>
    </p>
    <p style="margin:0;font-size:11px;color:#9ca3af;">
      &copy; ${year} Cygnus Information Solutions Pvt. Ltd. All rights reserved.
    </p>
  </div>
</div>`.trim();
}

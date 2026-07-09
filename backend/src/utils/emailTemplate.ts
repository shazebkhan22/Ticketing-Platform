const LOGO_URL =
  "https://res.cloudinary.com/duhhwugqb/image/upload/v1783410566/Cygnus_Exp_rl8ue3.png";

// Wraps plain-text-style email bodies (using \n\n paragraph breaks) in a
// minimal branded HTML shell so all outgoing mail shares the same look.
export function renderEmailHtml(bodyText: string): string {
  const paragraphs = bodyText
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;line-height:1.5;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
<div style="font-family:Arial,Helvetica,sans-serif;margin:0 auto;padding:16px 0;color:#1f2937;">
  ${paragraphs}
  <img src="${LOGO_URL}" alt="Cygnus" style="height:40px;margin-top:24px;" />
</div>`.trim();
}

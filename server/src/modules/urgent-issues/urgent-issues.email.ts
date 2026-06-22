import { sendEmail } from "../email/email.service";
import { getManagerEmails } from "../managers/manager-access";

type IssueEmailData = {
  tableId: string;
  itemName: string;
  articleNumber: string | null;
  tableName: string;
  location: string | null;
  quantity: number;
  unit: string;
  message: string;
  senderName: string;
  senderRole: string;
  senderEmail: string;
};

function buildHtml(data: IssueEmailData): string {
  const articleRow = data.articleNumber
    ? `<div style="margin-top:6px;font-size:13px;color:#64748b;">Article: <strong>${data.articleNumber}</strong></div>`
    : "";

  const locationRow = data.location
    ? `<td style="padding:6px 12px 6px 0;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Location</span><div style="font-size:13px;font-weight:600;color:#1e293b;">${data.location}</div></td>`
    : "";

  const roleLabel = data.senderRole.charAt(0).toUpperCase() + data.senderRole.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Urgent Issue Reported</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px;">
                Tool Inventory System
              </div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">
                Manager Notification
              </div>
            </td>
          </tr>

          <!-- Red alert banner -->
          <tr>
            <td style="background:#dc2626;padding:14px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:22px;vertical-align:middle;padding-right:10px;">&#128680;</td>
                  <td style="color:#ffffff;font-size:16px;font-weight:700;vertical-align:middle;">
                    Urgent Issue Reported
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                An urgent issue has been reported on an item in your table
                <strong style="color:#0f172a;">${data.tableName}</strong>.
                Your immediate attention may be required.
              </p>

              <!-- Item details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:6px;">
                      Item
                    </div>
                    <div style="font-size:18px;font-weight:700;color:#0f172a;">
                      ${data.itemName}
                    </div>
                    ${articleRow}
                    <table cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px;">
                      <tr>
                        <td style="padding:6px 24px 6px 0;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Table</span>
                          <div style="font-size:13px;font-weight:600;color:#1e293b;">${data.tableName}</div>
                        </td>
                        ${locationRow}
                        <td style="padding:6px 0;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Quantity</span>
                          <div style="font-size:13px;font-weight:600;color:#1e293b;">${data.quantity} ${data.unit}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message card -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:8px;">
                  Issue Message
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;
                            border-radius:6px;padding:16px 20px;font-size:14px;color:#1e293b;
                            line-height:1.65;font-style:italic;">
                  &#8220;${data.message}&#8221;
                </div>
              </div>

              <!-- Reported by -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 24px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:8px;">
                      Reported By
                    </div>
                    <div style="font-size:15px;font-weight:700;color:#0f172a;">${data.senderName}</div>
                    <div style="font-size:13px;color:#64748b;margin-top:2px;">
                      ${roleLabel} &middot; ${data.senderEmail}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f172a;border-radius:7px;">
                    <a href="#" style="display:inline-block;padding:14px 28px;color:#ffffff;
                                       font-size:14px;font-weight:700;text-decoration:none;
                                       letter-spacing:.2px;">
                      View Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                This notification was sent automatically by the Tool Inventory System because you
                are assigned as a manager of the table
                <strong>${data.tableName}</strong>.
                Log in to the system to view the full item details, resolve the issue, or take action.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(data: IssueEmailData): string {
  const roleLabel = data.senderRole.charAt(0).toUpperCase() + data.senderRole.slice(1);
  return [
    "URGENT ISSUE REPORTED — Tool Inventory System",
    "=".repeat(50),
    "",
    `Table: ${data.tableName}`,
    `Item:  ${data.itemName}${data.articleNumber ? ` (${data.articleNumber})` : ""}`,
    data.location ? `Location: ${data.location}` : null,
    `Quantity: ${data.quantity} ${data.unit}`,
    "",
    "Message:",
    `"${data.message}"`,
    "",
    `Reported by: ${data.senderName} (${roleLabel}) — ${data.senderEmail}`,
    "",
    "Log in to the system to view the item and resolve the issue.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Fire-and-forget: sends urgent issue email to all table/group managers.
 * Never throws — a failed email must not prevent the issue from being saved.
 */
export async function sendUrgentIssueEmail(data: IssueEmailData): Promise<void> {
  try {
    const emails = await getManagerEmails(data.tableId);
    if (emails.length === 0) return;

    const subject = `🚨 Urgent Issue — ${data.itemName} in ${data.tableName}`;
    const html = buildHtml(data);
    const text = buildText(data);

    await Promise.allSettled(
      emails.map((to) => sendEmail({ to, subject, html, text }))
    );
  } catch {
    // Silently swallow — email failure must not affect issue creation
  }
}

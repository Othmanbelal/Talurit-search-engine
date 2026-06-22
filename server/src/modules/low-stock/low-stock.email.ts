import { sendEmail } from "../email/email.service";
import { getManagerEmails } from "../managers/manager-access";

export type LowStockEmailData = {
  tableId: string;
  itemName: string;
  articleNumber: string | null;
  tableName: string;
  location: string | null;
  quantity: number;
  threshold: number;
  unit: string;
  reorderUrl: string | null;
};

export type LowStockEmailResult = { sent: boolean; recipients: string[]; error?: string };

/**
 * Send the reorder email to the table/group managers. Never throws — returns a
 * result the caller logs and uses to decide whether to mark the row notified.
 */
export async function sendLowStockEmail(data: LowStockEmailData): Promise<LowStockEmailResult> {
  let recipients: string[] = [];
  try {
    recipients = await getManagerEmails(data.tableId);
    if (recipients.length === 0) {
      return { sent: false, recipients, error: "No managers assigned to this table." };
    }
    const subject = `🔻 Low stock — ${data.itemName} (${data.quantity} ${data.unit} left)`;
    const html = buildHtml(data);
    const text = buildText(data);
    const results = await Promise.allSettled(recipients.map((to) => sendEmail({ to, subject, html, text })));
    const anySent = results.some((r) => r.status === "fulfilled");
    if (!anySent) {
      const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      return { sent: false, recipients, error: errorText(firstError?.reason) };
    }
    return { sent: true, recipients };
  } catch (error) {
    return { sent: false, recipients, error: errorText(error) };
  }
}

function errorText(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Email delivery failed.";
}

function buildHtml(data: LowStockEmailData): string {
  const articleRow = data.articleNumber
    ? `<div style="margin-top:6px;font-size:13px;color:#64748b;">Article: <strong>${data.articleNumber}</strong></div>`
    : "";
  const locationRow = data.location
    ? `<td style="padding:6px 12px 6px 0;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Location</span><div style="font-size:13px;font-weight:600;color:#1e293b;">${data.location}</div></td>`
    : "";
  const cta = data.reorderUrl
    ? `<table cellpadding="0" cellspacing="0"><tr><td style="background:#0f172a;border-radius:7px;">
         <a href="${data.reorderUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.2px;">Reorder now &rarr;</a>
       </td></tr></table>`
    : `<div style="font-size:13px;color:#94a3b8;">No order link configured. Add one in the inventory table to enable one-click reordering.</div>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Low Stock</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <div style="color:#ffffff;font-size:20px;font-weight:700;">Tool Inventory System</div>
          <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Low Stock Alert</div>
        </td></tr>
        <tr><td style="background:#d97706;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;">&#128229; Reorder needed</td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            <strong style="color:#0f172a;">${data.itemName}</strong> in
            <strong style="color:#0f172a;">${data.tableName}</strong> has reached its low-stock threshold.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:6px;">Item</div>
              <div style="font-size:18px;font-weight:700;color:#0f172a;">${data.itemName}</div>
              ${articleRow}
              <table cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px;"><tr>
                <td style="padding:6px 24px 6px 0;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Table</span><div style="font-size:13px;font-weight:600;color:#1e293b;">${data.tableName}</div></td>
                ${locationRow}
                <td style="padding:6px 24px 6px 0;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">In stock</span><div style="font-size:13px;font-weight:600;color:#b91c1c;">${data.quantity} ${data.unit}</div></td>
                <td style="padding:6px 0;"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Threshold</span><div style="font-size:13px;font-weight:600;color:#1e293b;">${data.threshold} ${data.unit}</div></td>
              </tr></table>
            </td></tr>
          </table>
          ${cta}
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">Sent automatically because you manage <strong>${data.tableName}</strong>. Log in to adjust the low-stock threshold or order link.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText(data: LowStockEmailData): string {
  return [
    "LOW STOCK ALERT — Tool Inventory System",
    "=".repeat(50),
    "",
    `Item:      ${data.itemName}${data.articleNumber ? ` (${data.articleNumber})` : ""}`,
    `Table:     ${data.tableName}`,
    data.location ? `Location:  ${data.location}` : null,
    `In stock:  ${data.quantity} ${data.unit}`,
    `Threshold: ${data.threshold} ${data.unit}`,
    "",
    data.reorderUrl ? `Reorder:   ${data.reorderUrl}` : "No order link configured.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

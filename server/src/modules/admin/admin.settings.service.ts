import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import {
  getEmailStatus,
  getSmtpSettingsForAdmin,
  saveSmtpSettings,
  sendEmail,
} from "../email/email.service";
import type { SendTestEmailInput, UpdateSettingsInput } from "./admin.schemas";
import {
  findFirstActiveAdminEmail,
  getSetting,
  setSetting,
} from "./admin.users.repository";

const weeklySummaryEmailKey = "email.weeklySummaryRecipient";

export async function getAdminSettings() {
  const [weeklySummaryEmail, email, smtp] = await Promise.all([
    getWeeklySummaryEmail(),
    getEmailStatus(),
    getSmtpSettingsForAdmin(),
  ]);

  return {
    email,
    smtp,
    weeklySummaryEmail,
  };
}

export async function updateAdminSettings(input: UpdateSettingsInput) {
  await saveSmtpSettings({
    smtpHost: optionalSetting(input, "smtpHost"),
    smtpPort: input.smtpPort,
    smtpUser: optionalSetting(input, "smtpUser"),
    smtpPass: normalizeOptional(input.smtpPass) ?? undefined,
    smtpFrom: optionalSetting(input, "smtpFrom"),
    smtpSecure: input.smtpSecure,
  });

  const value = normalizeOptional(input.weeklySummaryEmail) ?? "";
  await setSetting(weeklySummaryEmailKey, value);

  return getAdminSettings();
}

export async function sendAdminTestEmail(input: SendTestEmailInput) {
  const recipient = input.email ?? (await getDefaultAdminEmail());

  if (!recipient) {
    throw new AppError("No test email recipient is configured.", 400);
  }

  try {
    await sendEmail({
      to: recipient,
      subject: "Tool Inventory email test",
      text: "SMTP email is configured for Tool Inventory System.",
      html: "<p>SMTP email is configured for Tool Inventory System.</p>",
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("[email] SMTP test send failed:", error);
    throw new AppError("Test email could not be sent. Check SMTP settings.", 502);
  }

  return { sentTo: recipient };
}

async function getWeeklySummaryEmail() {
  const setting = await getSetting(weeklySummaryEmailKey);
  return setting?.value || env.ADMIN_SUMMARY_EMAIL || "";
}

async function getDefaultAdminEmail() {
  const configured = await getWeeklySummaryEmail();

  if (configured) {
    return configured;
  }

  return (await findFirstActiveAdminEmail())?.email ?? "";
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function optionalSetting(input: UpdateSettingsInput, key: keyof UpdateSettingsInput) {
  return key in input ? normalizeOptional(input[key] as string | undefined) ?? "" : undefined;
}

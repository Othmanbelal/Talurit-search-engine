import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { decryptSecret, encryptSecret } from "../../utils/secret-crypto";
import { getEmailSettingRows, setEmailSetting } from "./email.repository";
import {
  emailNotConfiguredMessage,
  type EmailMessage,
  type EmailStatus,
  type SmtpConfig,
  type SmtpSettingsInput,
} from "./email.types";

const emailSettingKeys = {
  host: "email.smtpHost",
  port: "email.smtpPort",
  user: "email.smtpUser",
  pass: "email.smtpPass",
  from: "email.smtpFrom",
  secure: "email.smtpSecure",
};

export async function getEmailStatus(): Promise<EmailStatus> {
  const config = await getSmtpConfig();
  const configured = Boolean(config.host && config.from);

  return {
    configured,
    warning: configured ? null : emailNotConfiguredMessage,
    from: config.from || null,
    host: config.host || null,
    port: config.port,
    secure: config.secure,
    user: config.user || null,
    passwordConfigured: Boolean(config.pass),
  };
}

export async function getSmtpSettingsForAdmin() {
  const config = await getSmtpConfig();

  return {
    smtpHost: config.host,
    smtpPort: config.port,
    smtpUser: config.user,
    smtpFrom: config.from,
    smtpSecure: config.secure,
    smtpPasswordConfigured: Boolean(config.pass),
  };
}

export async function saveSmtpSettings(input: SmtpSettingsInput) {
  const writes: Array<Promise<unknown>> = [];

  maybeSet(writes, emailSettingKeys.host, input.smtpHost);
  maybeSet(writes, emailSettingKeys.port, input.smtpPort?.toString());
  maybeSet(writes, emailSettingKeys.user, input.smtpUser);
  maybeSet(writes, emailSettingKeys.from, input.smtpFrom);
  maybeSet(writes, emailSettingKeys.secure, input.smtpSecure?.toString());

  if (input.smtpPass) {
    writes.push(setEmailSetting(emailSettingKeys.pass, encryptSecret(input.smtpPass)));
  }

  await Promise.all(writes);
}

export async function sendEmail(message: EmailMessage) {
  const config = await getSmtpConfig();
  const status = await getEmailStatus();

  if (!status.configured) {
    throw new AppError(emailNotConfiguredMessage, 400);
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: buildSmtpAuth(config),
    connectionTimeout: 10_000, // fail fast — surface SMTP errors quickly
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const rows = await getEmailSettingRows(Object.values(emailSettingKeys));
  const settings = new Map(rows.map((row) => [row.key, row.value ?? ""]));

  return {
    host: valueOrEnv(settings, emailSettingKeys.host, env.SMTP_HOST),
    port: parsePort(valueOrEnv(settings, emailSettingKeys.port, env.SMTP_PORT.toString())),
    user: valueOrEnv(settings, emailSettingKeys.user, env.SMTP_USER),
    pass: decryptSecret(valueOrEnv(settings, emailSettingKeys.pass, env.SMTP_PASS)),
    from: valueOrEnv(settings, emailSettingKeys.from, env.SMTP_FROM),
    secure: valueOrEnv(settings, emailSettingKeys.secure, env.SMTP_SECURE.toString()) === "true",
  };
}

function maybeSet(writes: Array<Promise<unknown>>, key: string, value: string | undefined) {
  if (value !== undefined) {
    writes.push(setEmailSetting(key, value.trim()));
  }
}

function valueOrEnv(settings: Map<string, string>, key: string, fallback: string) {
  const value = settings.get(key);
  return value === undefined ? fallback : value;
}

function parsePort(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function buildSmtpAuth(config: SmtpConfig) {
  // Some company relays authenticate by network, so auth is optional.
  if (!config.user && !config.pass) {
    return undefined;
  }

  return {
    user: config.user,
    pass: config.pass,
  };
}

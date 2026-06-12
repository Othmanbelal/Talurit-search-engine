export const emailNotConfiguredMessage =
  "Email is not configured. Invitations and weekly summaries cannot be sent yet.";

export type EmailStatus = {
  configured: boolean;
  warning: string | null;
  from: string | null;
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  passwordConfigured: boolean;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SmtpSettingsInput = {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;
};

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

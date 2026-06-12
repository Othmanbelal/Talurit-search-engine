import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../.env"),
];

const envPath = envCandidates.find((candidate) => existsSync(candidate));

if (envPath) {
  config({ path: envPath });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16).default("change_me_long_random_secret"),
  COOKIE_NAME: z.string().min(1).default("tool_inventory_session"),
  SESSION_DAYS: z.coerce.number().int().positive().default(7),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),
  SMTP_SECURE: z
    .preprocess((value) => value === true || value === "true", z.boolean())
    .default(false),
  ADMIN_SUMMARY_EMAIL: z.string().optional().default(""),
  BACKUP_DIR: z.string().default("./backups"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  SUPABASE_STORAGE_BUCKET: z.string().default("tool-inventory-uploads"),
  SUPABASE_SIGNED_URL_SECONDS: z.coerce.number().int().positive().default(3600),
});

export const env = envSchema.parse(process.env);

import { defineConfig } from "vitest/config";

// Resolve the test database URL once so both `test.env` (used by the app under test)
// and globalSetup (used to run migrations before tests start) agree on the same target.
const baseTestDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://tool_user:tool_password@localhost:5433/tool_inventory_test";

// Prisma's default connection pool (num_cpus * 2 + 1) and default interactive-transaction
// maxWait (2000ms) are tuned for a single app instance. Our concurrency tests deliberately
// fire multiple overlapping prisma.$transaction() calls against the same process, which can
// exhaust the default pool and make a transaction fail with "Unable to start a transaction
// in the given time" — a test-infra artifact, not the 409 the app itself would raise under
// real concurrent load with a normally-sized pool. Widen the pool for the test run only.
const testDatabaseUrl = withPoolParams(baseTestDatabaseUrl);

function withPoolParams(url: string): string {
  const withParams = new URL(url);
  if (!withParams.searchParams.has("connection_limit")) withParams.searchParams.set("connection_limit", "20");
  if (!withParams.searchParams.has("pool_timeout")) withParams.searchParams.set("pool_timeout", "20");
  return withParams.toString();
}

export default defineConfig({
  test: {
    environment: "node",
    // Tests share one real Postgres database (TRUNCATE between tests), so test files
    // must not run concurrently against it. fileParallelism alone does not prevent
    // vitest's default thread pool from interleaving async work across files on
    // separate worker threads against the same DB connection pool; force a single
    // worker thread so every test genuinely runs one-at-a-time.
    fileParallelism: false,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Vitest applies `env` to process.env BEFORE any test file (or setupFile) is
    // imported. env.ts's dotenv.config() call does NOT override already-set
    // process.env values, so DATABASE_URL below always wins over anything in a
    // real .env file at repo root. tests/setup.ts double-checks this at runtime.
    env: {
      NODE_ENV: "test",
      PORT: "4000",
      CLIENT_URL: "http://localhost:5173",
      APP_PUBLIC_URL: "http://localhost:5173",
      DATABASE_URL: testDatabaseUrl,
      SESSION_SECRET: "test_session_secret_at_least_32_characters_long",
      COOKIE_NAME: "tool_inventory_session",
      SESSION_DAYS: "7",
      PASSWORD_RESET_MINUTES: "30",
      SMTP_HOST: "",
      SMTP_PORT: "587",
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "",
      SMTP_SECURE: "false",
      ADMIN_SUMMARY_EMAIL: "",
      BACKUP_DIR: "./backups",
      UPLOAD_DIR: "./uploads",
      STORAGE_DRIVER: "local",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_STORAGE_BUCKET: "tool-inventory-uploads",
      SUPABASE_SIGNED_URL_SECONDS: "3600",
    },
  },
});

import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Vitest globalSetup: runs once before any test file, in a separate process from
 * the test workers. Applies pending Prisma migrations to the test database so the
 * suite never depends on a developer having run `db:migrate:deploy` manually.
 *
 * This module is NOT covered by `test.env` (globalSetup runs outside the worker
 * env injection), so we resolve the same URL fallback logic independently.
 */
export default function globalSetup() {
  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ?? "postgresql://tool_user:tool_password@localhost:5433/tool_inventory_test";

  if (!testDatabaseUrl.includes("tool_inventory_test")) {
    throw new Error("Refusing to run migrations against a non-test database");
  }

  const serverDir = resolve(__dirname, "..");

  execSync("npx prisma migrate deploy --schema ../prisma/schema.prisma", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });
}

// MANDATORY safety guard: test helpers TRUNCATE tables, so this suite must never
// be able to run against anything but the dedicated test database. This check runs
// before any test file's imports execute (setupFiles run before the test module).
if (!process.env.DATABASE_URL?.includes("tool_inventory_test")) {
  throw new Error("Refusing to run tests against a non-test database");
}

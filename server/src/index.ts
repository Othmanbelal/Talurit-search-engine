import dns from "node:dns";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { startBackupScheduler } from "./modules/backups/backup.scheduler";

// Render free tier has no IPv6 outbound — prefer IPv4 for all DNS lookups.
dns.setDefaultResultOrder("ipv4first");

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
  startBackupScheduler();
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Shutting down server.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Force exit if an open connection prevents a graceful shutdown.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

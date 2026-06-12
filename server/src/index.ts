import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./db/prisma";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
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

import { APP_NAME } from "../../config/constants";
import { prisma } from "../../db/prisma";

export type HealthStatus = {
  service: string;
  status: "ok" | "degraded";
  database: "ok" | "unavailable";
  timestamp: string;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: HealthStatus["database"] = "ok";

  try {
    // A lightweight database ping proves the Prisma client and PostgreSQL connection are usable.
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  return {
    service: APP_NAME,
    status: database === "ok" ? "ok" : "degraded",
    database,
    timestamp: new Date().toISOString(),
  };
}

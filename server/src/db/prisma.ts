import { PrismaClient, type Prisma } from "@prisma/client";
import { env } from "../config/env";

const logLevels: Prisma.LogLevel[] =
  env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

export const prisma = new PrismaClient({
  log: logLevels,
});

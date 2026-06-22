import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { z } from "zod";

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  ADMIN_NAME: z.string().min(1, "ADMIN_NAME is required"),
});

function loadSeedEnv() {
  const envPath = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
  ].find((candidate) => existsSync(candidate));

  if (envPath) {
    config({ path: envPath });
  }

  const seedEnv = seedEnvSchema.parse(process.env);
  if (seedEnv.NODE_ENV === "production") {
    if (seedEnv.ADMIN_EMAIL.toLowerCase() === "admin@example.com") {
      throw new Error("Production ADMIN_EMAIL must be changed from admin@example.com.");
    }
    if (seedEnv.ADMIN_PASSWORD.length < 12 || /^changeme/i.test(seedEnv.ADMIN_PASSWORD)) {
      throw new Error("Production ADMIN_PASSWORD must be a non-placeholder password of at least 12 characters.");
    }
  }
  return seedEnv;
}

async function seedAdminUser(seedEnv: z.infer<typeof seedEnvSchema>) {
  const existingUser = await prisma.user.findUnique({
    where: { email: seedEnv.ADMIN_EMAIL },
  });

  if (existingUser) {
    // Re-running the seed should not silently rotate a real admin password.
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: seedEnv.ADMIN_NAME,
        role: "admin",
        isActive: true,
        profile: {
          upsert: {
            create: profileFromName(seedEnv.ADMIN_NAME),
            update: profileFromName(seedEnv.ADMIN_NAME),
          },
        },
      },
    });
  }

  const passwordHash = await hash(seedEnv.ADMIN_PASSWORD, 12);

  return prisma.user.create({
    data: {
      email: seedEnv.ADMIN_EMAIL,
      name: seedEnv.ADMIN_NAME,
      passwordHash,
      role: "admin",
      isActive: true,
      profile: {
        create: profileFromName(seedEnv.ADMIN_NAME),
      },
    },
  });
}

function profileFromName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);

  return {
    firstName: firstName || "System",
    lastName: rest.join(" ") || "Admin",
  };
}

async function seedMachines() {
  const machines = [
    {
      name: "OKUMA",
      description: "Machine-specific tool list imported from the OKUMA workbook sheet.",
    },
    {
      name: "HAAS",
      description: "Legacy positional machine tool list imported from the HAAS workbook sheet.",
    },
  ];

  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { name: machine.name },
      update: { description: machine.description },
      create: machine,
    });
  }
}

async function seedAppSettings() {
  const settings = [
    {
      key: "system.foundationReady",
      value: "true",
      description: "Marks that the Phase 1 database foundation has been seeded.",
    },
    {
      key: "inventory.lowStockThreshold",
      value: "5",
      description: "Default quantity threshold used for low-stock reporting.",
    },
    {
      key: "inventory.toolStatuses",
      value: "AVAILABLE,LOW_STOCK,MISSING,DAMAGED,MAINTENANCE,ARCHIVED",
      description: "Supported tool status values exposed by the application.",
    },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
      },
      create: setting,
    });
  }
}

async function main() {
  const seedEnv = loadSeedEnv();

  await seedAdminUser(seedEnv);
  await seedMachines();
  await seedAppSettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database seed completed.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { AppError } from "../../utils/AppError";

export async function createPostgresDump(databaseUrl: string, filePath: string) {
  await runCommand("pg_dump", [
    "--dbname",
    databaseUrl,
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    filePath,
  ]);
}

export async function validatePostgresDump(filePath: string) {
  await runCommand("pg_restore", ["--list", filePath]);
}

export async function restorePostgresDump(databaseUrl: string, filePath: string) {
  await runCommand("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--single-transaction",
    "--dbname",
    databaseUrl,
    filePath,
  ]);
}

export async function deployDatabaseMigrations() {
  const schemaPath = findPrismaSchema();
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  await runCommand(command, ["prisma", "migrate", "deploy", "--schema", schemaPath], dirname(dirname(schemaPath)));
}

export async function createBackupArchive(sourceDirectory: string, archivePath: string) {
  await runCommand("tar", ["-czf", archivePath, "-C", sourceDirectory, "."]);
}

export async function listBackupArchive(archivePath: string) {
  return runCommandWithOutput("tar", ["-tzf", archivePath]);
}

export async function extractBackupArchive(archivePath: string, targetDirectory: string) {
  await runCommand("tar", ["-xzf", archivePath, "-C", targetDirectory]);
}

function findPrismaSchema() {
  const candidates = [
    resolve(process.cwd(), "prisma/schema.prisma"),
    resolve(process.cwd(), "../prisma/schema.prisma"),
  ];
  const schemaPath = candidates.find(existsSync);
  if (!schemaPath) throw new AppError("Prisma schema could not be found after restore.", 500);
  return schemaPath;
}

function runCommand(command: string, args: string[], cwd?: string) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 8_000) stderr += chunk.toString();
    });
    child.on("error", (error) => {
      const message = (error as NodeJS.ErrnoException).code === "ENOENT"
        ? `${command} is not installed in the backend environment.`
        : `${command} could not be started.`;
      reject(new AppError(message, 500));
    });
    child.on("close", (code) => {
      if (code === 0) return resolvePromise();
      const detail = stderr.trim().split("\n").slice(-3).join(" ");
      reject(new AppError(detail ? `Database command failed: ${detail}` : "Database command failed.", 500));
    });
  });
}

function runCommandWithOutput(command: string, args: string[]) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < 2_000_000) stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 8_000) stderr += chunk.toString();
    });
    child.on("error", (error) => reject(commandStartError(command, error)));
    child.on("close", (code) => {
      if (code === 0) return resolvePromise(stdout);
      reject(commandFailure(stderr));
    });
  });
}

function commandStartError(command: string, error: Error) {
  const message = (error as NodeJS.ErrnoException).code === "ENOENT"
    ? `${command} is not installed in the backend environment.`
    : `${command} could not be started.`;
  return new AppError(message, 500);
}

function commandFailure(stderr: string) {
  const detail = stderr.trim().split("\n").slice(-3).join(" ");
  return new AppError(detail ? `Database command failed: ${detail}` : "Database command failed.", 500);
}

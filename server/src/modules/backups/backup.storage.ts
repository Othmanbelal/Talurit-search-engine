import { constants, existsSync } from "node:fs";
import { access, mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

export function getBackupStorageRoot() {
  if (env.BACKUP_DIR.startsWith("/") || /^[A-Za-z]:[\\/]/.test(env.BACKUP_DIR)) {
    return resolve(env.BACKUP_DIR);
  }
  return resolve(findProjectRoot(), env.BACKUP_DIR);
}

export function resolveBackupDirectory(directory: string) {
  const root = getBackupStorageRoot();
  const candidate = resolve(directory);
  const relativePath = relative(root, candidate);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new AppError(`Backup directory must be inside ${root}.`, 400);
  }
  return candidate;
}

export async function ensureBackupDirectory(directory: string) {
  const resolved = resolveBackupDirectory(directory);
  await mkdir(resolved, { recursive: true });
  await access(resolved, constants.R_OK | constants.W_OK);
  return resolved;
}

export async function testBackupDirectory(directory: string) {
  const resolved = await ensureBackupDirectory(directory);
  const testFile = join(resolved, `.backup-write-test-${randomUUID()}`);
  await writeFile(testFile, "ok", "utf8");
  await unlink(testFile);
  return resolved;
}

export async function listBackupFiles(directory: string) {
  const resolved = await ensureBackupDirectory(directory);
  const entries = await readdir(resolved, { withFileTypes: true });
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && [".dump", ".tibackup"].includes(extname(entry.name).toLowerCase()))
    .map(async (entry) => {
      const filePath = join(resolved, entry.name);
      const details = await stat(filePath);
      return {
        fileName: entry.name,
        kind: extname(entry.name).toLowerCase() === ".tibackup" ? "full" as const : "database_only_legacy" as const,
        sizeBytes: details.size,
        modifiedAt: details.mtime,
      };
    }));
  return files.sort((left, right) => right.modifiedAt.getTime() - left.modifiedAt.getTime());
}

export function resolveBackupFile(directory: string, fileName: string) {
  if (basename(fileName) !== fileName || ![".dump", ".tibackup"].includes(extname(fileName).toLowerCase())) {
    throw new AppError("Invalid backup filename.", 400);
  }
  return join(resolveBackupDirectory(directory), fileName);
}

function findProjectRoot() {
  const current = process.cwd();
  if (existsSync(resolve(current, "prisma/schema.prisma"))) return current;
  if (existsSync(resolve(current, "../prisma/schema.prisma"))) return resolve(current, "..");
  return current;
}

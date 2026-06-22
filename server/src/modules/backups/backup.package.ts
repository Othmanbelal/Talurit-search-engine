import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { getLocalUploadRoot } from "../uploads/storage.local";
import { downloadStorageObject, restoreStorageObject } from "../uploads/storage.service";
import {
  createBackupArchive,
  createPostgresDump,
  extractBackupArchive,
  listBackupArchive,
  validatePostgresDump,
} from "./backup.commands";
import { listApplicationStorageReferences } from "./backup.repository";

const FORMAT = "tool-inventory-full-backup";
const VERSION = 1;

type FileRecord = {
  file: string;
  sha256: string;
  sizeBytes: number;
};

type StorageRecord = FileRecord & {
  ref: string;
  contentType: string;
};

export type FullBackupManifest = {
  format: typeof FORMAT;
  version: typeof VERSION;
  createdAt: string;
  database: FileRecord;
  storageObjects: StorageRecord[];
  localUploads: FileRecord[];
  requiredConfig: {
    sessionSecretFingerprint: string;
  };
};

export async function createFullBackupPackage(databaseUrl: string, archivePath: string) {
  const workDirectory = await mkdtemp(join(tmpdir(), "tool-inventory-backup-"));
  try {
    const databasePath = join(workDirectory, "database.dump");
    await createPostgresDump(databaseUrl, databasePath);
    const database = await fileRecord(workDirectory, databasePath);
    const storageObjects = await captureStorageObjects(workDirectory);
    const localUploads = await captureLocalUploads(workDirectory);
    const manifest: FullBackupManifest = {
      format: FORMAT,
      version: VERSION,
      createdAt: new Date().toISOString(),
      database,
      storageObjects,
      localUploads,
      requiredConfig: {
        sessionSecretFingerprint: secretFingerprint(),
      },
    };
    await writeFile(join(workDirectory, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    await createBackupArchive(workDirectory, archivePath);
    return {
      storageObjectCount: storageObjects.length,
      localUploadCount: localUploads.length,
    };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

export async function openFullBackupPackage(archivePath: string) {
  await validateArchiveEntries(archivePath);
  const workDirectory = await mkdtemp(join(tmpdir(), "tool-inventory-restore-"));
  try {
    await extractBackupArchive(archivePath, workDirectory);
    const manifest = parseManifest(await readFile(join(workDirectory, "manifest.json"), "utf8"));
    validateRequiredConfiguration(manifest);
    await verifyRecord(workDirectory, manifest.database);
    for (const record of manifest.storageObjects) await verifyRecord(workDirectory, record);
    for (const record of manifest.localUploads) await verifyRecord(workDirectory, record);
    const databasePath = resolvePackageFile(workDirectory, manifest.database.file);
    await validatePostgresDump(databasePath);
    return { databasePath, manifest, workDirectory };
  } catch (error) {
    await rm(workDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function restorePackageFiles(
  workDirectory: string,
  manifest: FullBackupManifest,
) {
  for (const record of manifest.storageObjects) {
    const buffer = await readFile(resolvePackageFile(workDirectory, record.file));
    await restoreStorageObject(record.ref, buffer, record.contentType);
  }

  const uploadRoot = getLocalUploadRoot();
  await clearDirectoryContents(uploadRoot);
  for (const record of manifest.localUploads) {
    const relativePath = record.file.replace(/^local-uploads\//, "");
    const destination = resolveInside(uploadRoot, relativePath);
    await mkdir(resolve(destination, ".."), { recursive: true });
    await cp(resolvePackageFile(workDirectory, record.file), destination);
  }
}

async function clearDirectoryContents(directory: string) {
  // The uploads root is commonly a Docker bind mount. Removing the mount point
  // itself fails with EBUSY on Windows, so remove only its children.
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map((entry) => rm(join(directory, entry.name), {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })));
}

export async function closeFullBackupPackage(workDirectory: string) {
  await rm(workDirectory, { recursive: true, force: true });
}

function parseManifest(raw: string): FullBackupManifest {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new AppError("Backup manifest is not valid JSON.", 400);
  }
  const manifest = value as Partial<FullBackupManifest>;
  if (
    manifest.format !== FORMAT ||
    manifest.version !== VERSION ||
    !manifest.database ||
    !Array.isArray(manifest.storageObjects) ||
    !Array.isArray(manifest.localUploads) ||
    !manifest.requiredConfig?.sessionSecretFingerprint
  ) {
    throw new AppError("Backup package format is unsupported or incomplete.", 400);
  }
  return manifest as FullBackupManifest;
}

async function captureStorageObjects(workDirectory: string) {
  const references = await listApplicationStorageReferences();
  const records: StorageRecord[] = [];
  await mkdir(join(workDirectory, "storage"), { recursive: true });
  for (const [index, ref] of references.entries()) {
    const object = await downloadStorageObject(ref);
    const extension = extensionFor(object.contentType);
    const file = `storage/${String(index + 1).padStart(6, "0")}${extension}`;
    const filePath = join(workDirectory, file);
    await writeFile(filePath, object.buffer);
    records.push({ ...(await fileRecord(workDirectory, filePath)), ref, contentType: object.contentType });
  }
  return records;
}

async function captureLocalUploads(workDirectory: string) {
  const uploadRoot = getLocalUploadRoot();
  if (!existsSync(uploadRoot)) return [];
  const files = await walkFiles(uploadRoot);
  const records: FileRecord[] = [];
  for (const source of files) {
    const relativePath = relative(uploadRoot, source).split(sep).join("/");
    const destination = join(workDirectory, "local-uploads", relativePath);
    await mkdir(resolve(destination, ".."), { recursive: true });
    await cp(source, destination);
    records.push(await fileRecord(workDirectory, destination));
  }
  return records;
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : entry.isFile() ? [path] : [];
  }));
  return nested.flat();
}

async function fileRecord(root: string, filePath: string): Promise<FileRecord> {
  const details = await stat(filePath);
  return {
    file: relative(root, filePath).split(sep).join("/"),
    sha256: await hashFile(filePath),
    sizeBytes: details.size,
  };
}

async function verifyRecord(root: string, record: FileRecord) {
  if (!record.file || !record.sha256 || !Number.isFinite(record.sizeBytes)) {
    throw new AppError("Backup manifest contains an invalid file record.", 400);
  }
  const filePath = resolvePackageFile(root, record.file);
  const details = await stat(filePath);
  if (details.size !== record.sizeBytes || await hashFile(filePath) !== record.sha256) {
    throw new AppError(`Backup file integrity check failed for ${record.file}.`, 400);
  }
}

function hashFile(filePath: string) {
  return new Promise<string>((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolvePromise(hash.digest("hex")));
  });
}

async function validateArchiveEntries(archivePath: string) {
  const listing = await listBackupArchive(archivePath);
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (entries.length === 0) throw new AppError("Backup package is empty.", 400);
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized) continue;
    if (normalized.startsWith("/") || normalized.split("/").includes("..") || /^[A-Za-z]:/.test(normalized)) {
      throw new AppError("Backup package contains an unsafe path.", 400);
    }
  }
}

function resolvePackageFile(root: string, file: string) {
  return resolveInside(root, file);
}

function resolveInside(root: string, file: string) {
  const candidate = resolve(root, file);
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || basename(file) === "") {
    throw new AppError("Backup package contains an invalid file path.", 400);
  }
  return candidate;
}

function secretFingerprint() {
  return createHash("sha256").update(env.SESSION_SECRET).digest("hex");
}

function validateRequiredConfiguration(manifest: FullBackupManifest) {
  if (manifest.requiredConfig.sessionSecretFingerprint !== secretFingerprint()) {
    throw new AppError("This backup requires the same SESSION_SECRET used when it was created.", 409);
  }
}

function extensionFor(contentType: string) {
  const extensions: Record<string, string> = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return extensions[contentType] ?? ".bin";
}

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { imageExtension } from "./upload-images";
import type { StorageObject } from "./storage.service";

const LOCAL_PREFIX = "local://";

export async function uploadLocalImage(
  image: Express.Multer.File,
  folder: string,
  userId: string,
) {
  const relativePath = [
    safeSegment(folder),
    safeSegment(userId),
    `${Date.now()}-${randomUUID()}${imageExtension(image.mimetype)}`,
  ].join("/");
  const destination = resolveLocalPath(relativePath);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, image.buffer, { flag: "wx" });
  return `${LOCAL_PREFIX}${relativePath}`;
}

export async function readLocalStorageObject(ref: string): Promise<StorageObject> {
  const relativePath = parseLocalStorageRef(ref);
  if (!relativePath) throw new AppError("Invalid local storage reference.", 400);
  try {
    return {
      buffer: await readFile(resolveLocalPath(relativePath)),
      contentType: contentTypeForPath(relativePath),
    };
  } catch {
    throw new AppError("Image not found.", 404);
  }
}

export async function restoreLocalStorageObject(ref: string, buffer: Buffer) {
  const relativePath = parseLocalStorageRef(ref);
  if (!relativePath) throw new AppError("Invalid local storage reference.", 400);
  const destination = resolveLocalPath(relativePath);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, buffer);
}

export function isLocalStorageRef(value: string) {
  return value.startsWith(LOCAL_PREFIX);
}

export function parseLocalStorageRef(ref: string) {
  if (!isLocalStorageRef(ref)) return null;
  const relativePath = ref.slice(LOCAL_PREFIX.length).replace(/\\/g, "/");
  if (!relativePath || relativePath.startsWith("/") || relativePath.split("/").includes("..")) {
    return null;
  }
  return relativePath;
}

export function getLocalUploadRoot() {
  if (env.UPLOAD_DIR.startsWith("/") || /^[A-Za-z]:[\\/]/.test(env.UPLOAD_DIR)) {
    return resolve(env.UPLOAD_DIR);
  }
  const current = process.cwd();
  const projectRoot = existsSync(resolve(current, "prisma/schema.prisma"))
    ? current
    : resolve(current, "..");
  return resolve(projectRoot, env.UPLOAD_DIR);
}

function resolveLocalPath(relativePath: string) {
  const root = getLocalUploadRoot();
  const candidate = resolve(root, relativePath);
  const fromRoot = relative(root, candidate);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) {
    throw new AppError("Invalid local storage path.", 400);
  }
  return candidate;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function contentTypeForPath(path: string) {
  const types: Record<string, string> = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return types[extname(path).toLowerCase()] ?? "application/octet-stream";
}

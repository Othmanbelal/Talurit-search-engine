import { mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { env } from "../../config/env";

export function uploadRoot() {
  return isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : resolve(process.cwd(), env.UPLOAD_DIR);
}

export function imageUploadDirectory() {
  const directory = resolve(uploadRoot(), "images");
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function publicUploadUrl(fileName: string) {
  return `/uploads/images/${fileName}`;
}

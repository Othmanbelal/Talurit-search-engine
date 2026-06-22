import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { imageExtension } from "./upload-images";
import type { StorageObject } from "./storage.service";

const SUPABASE_PREFIX = "supabase://";
let client: SupabaseClient | null = null;

export async function uploadSupabaseImage(
  image: Express.Multer.File,
  folder: string,
  userId: string,
) {
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const path = `${safeSegment(folder)}/${safeSegment(userId)}/${Date.now()}-${randomUUID()}${imageExtension(image.mimetype)}`;
  const { error } = await supabase().storage.from(bucket).upload(path, image.buffer, {
    cacheControl: "31536000",
    contentType: image.mimetype,
    upsert: false,
  });
  if (error) throw new AppError(`Image upload failed: ${error.message}`, 502);
  return `${SUPABASE_PREFIX}${bucket}/${path}`;
}

export async function readSupabaseStorageObject(ref: string): Promise<StorageObject> {
  const parsed = parseSupabaseStorageRef(ref);
  if (!parsed) throw new AppError("Invalid Supabase storage reference.", 400);
  const { data, error } = await supabase().storage.from(parsed.bucket).download(parsed.path);
  if (error || !data) {
    throw new AppError(`Could not download image: ${error?.message ?? "File unavailable."}`, 502);
  }
  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    contentType: data.type || "application/octet-stream",
  };
}

export async function restoreSupabaseStorageObject(
  ref: string,
  buffer: Buffer,
  contentType: string,
) {
  const parsed = parseSupabaseStorageRef(ref);
  if (!parsed) throw new AppError("Invalid Supabase storage reference.", 400);
  const { error } = await supabase().storage.from(parsed.bucket).upload(parsed.path, buffer, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  });
  if (error) throw new AppError(`Could not restore ${ref}: ${error.message}`, 502);
}

export function isSupabaseStorageRef(value: string) {
  return value.startsWith(SUPABASE_PREFIX);
}

export function parseSupabaseStorageRef(ref: string) {
  if (!isSupabaseStorageRef(ref)) return null;
  const withoutPrefix = ref.slice(SUPABASE_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf("/");
  if (slashIndex <= 0) return null;
  return {
    bucket: withoutPrefix.slice(0, slashIndex),
    path: withoutPrefix.slice(slashIndex + 1),
  };
}

function supabase() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      "Supabase Storage is not configured. Use STORAGE_DRIVER=local or configure Supabase.",
      503,
    );
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

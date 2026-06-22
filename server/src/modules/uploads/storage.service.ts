import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { imageExtension, validateImageFile } from "./upload-images";

const STORAGE_REF_PREFIX = "supabase://";
let client: SupabaseClient | null = null;

export async function uploadImageToStorage(file: Express.Multer.File | undefined, folder: string, userId: string) {
  const image = validateImageFile(file);
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const path = `${safeSegment(folder)}/${safeSegment(userId)}/${Date.now()}-${randomUUID()}${imageExtension(image.mimetype)}`;

  const { error } = await supabase().storage.from(bucket).upload(path, image.buffer, {
    cacheControl: "31536000",
    contentType: image.mimetype,
    upsert: false,
  });

  if (error) throw new AppError(`Image upload failed: ${error.message}`, 502);
  return storageRef(bucket, path);
}

export async function signedStorageUrl(ref: string) {
  const parsed = parseStorageRef(ref);
  if (!parsed) throw new AppError("Invalid storage reference.", 400);
  const { data, error } = await supabase()
    .storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, env.SUPABASE_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) throw new AppError("Could not create image access link.", 502);
  return data.signedUrl;
}

export async function downloadStorageObject(ref: string) {
  const parsed = parseStorageRef(ref);
  if (!parsed) throw new AppError("Invalid storage reference.", 400);
  const { data, error } = await supabase().storage.from(parsed.bucket).download(parsed.path);
  if (error || !data) throw new AppError(`Could not download ${ref}: ${error?.message ?? "File unavailable."}`, 502);
  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    contentType: data.type || "application/octet-stream",
  };
}

export async function restoreStorageObject(ref: string, buffer: Buffer, contentType: string) {
  const parsed = parseStorageRef(ref);
  if (!parsed) throw new AppError("Invalid storage reference.", 400);
  const { error } = await supabase().storage.from(parsed.bucket).upload(parsed.path, buffer, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  });
  if (error) throw new AppError(`Could not restore ${ref}: ${error.message}`, 502);
}

export function isStorageRef(value?: string | null) {
  return Boolean(value?.startsWith(STORAGE_REF_PREFIX));
}

export function parseStorageRef(ref: string) {
  if (!ref.startsWith(STORAGE_REF_PREFIX)) return null;
  const withoutPrefix = ref.slice(STORAGE_REF_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf("/");
  if (slashIndex <= 0) return null;
  return {
    bucket: withoutPrefix.slice(0, slashIndex),
    path: withoutPrefix.slice(slashIndex + 1),
  };
}

function storageRef(bucket: string, path: string) {
  return `${STORAGE_REF_PREFIX}${bucket}/${path}`;
}

function supabase() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", 503);
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

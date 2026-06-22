import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { validateImageFile } from "./upload-images";
import {
  isLocalStorageRef,
  readLocalStorageObject,
  restoreLocalStorageObject,
  uploadLocalImage,
} from "./storage.local";
import {
  isSupabaseStorageRef,
  readSupabaseStorageObject,
  restoreSupabaseStorageObject,
  uploadSupabaseImage,
} from "./storage.supabase";

export type StorageObject = {
  buffer: Buffer;
  contentType: string;
};

export async function uploadImageToStorage(
  file: Express.Multer.File | undefined,
  folder: string,
  userId: string,
) {
  const image = validateImageFile(file);
  if (env.STORAGE_DRIVER === "local") {
    return uploadLocalImage(image, folder, userId);
  }
  return uploadSupabaseImage(image, folder, userId);
}

export function readStorageObject(ref: string): Promise<StorageObject> {
  if (isLocalStorageRef(ref)) return readLocalStorageObject(ref);
  if (isSupabaseStorageRef(ref)) return readSupabaseStorageObject(ref);
  throw new AppError("Invalid storage reference.", 400);
}

export function downloadStorageObject(ref: string) {
  return readStorageObject(ref);
}

export function restoreStorageObject(ref: string, buffer: Buffer, contentType: string) {
  if (isLocalStorageRef(ref)) return restoreLocalStorageObject(ref, buffer);
  if (isSupabaseStorageRef(ref)) return restoreSupabaseStorageObject(ref, buffer, contentType);
  throw new AppError("Invalid storage reference.", 400);
}

export function isStorageRef(value?: string | null) {
  return Boolean(value && (isLocalStorageRef(value) || isSupabaseStorageRef(value)));
}

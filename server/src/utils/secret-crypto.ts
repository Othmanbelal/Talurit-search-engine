import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

const prefix = "enc:v1";

function encryptionKey() {
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    prefix,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return "";

  const [marker, version, ivRaw, tagRaw, encryptedRaw] = value.split(":");

  if (marker !== "enc" || version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) {
    return value;
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncryptedSecret(value: string | null | undefined) {
  return Boolean(value?.startsWith(`${prefix}:`));
}

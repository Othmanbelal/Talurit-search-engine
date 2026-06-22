import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  // The session secret acts as a server-side pepper if the session table leaks.
  return createHash("sha256")
    .update(`${token}.${env.SESSION_SECRET}`)
    .digest("hex");
}

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  // Invitation tokens are also peppered so stored hashes are not reusable offline.
  return createHash("sha256")
    .update(`invite.${token}.${env.SESSION_SECRET}`)
    .digest("hex");
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256")
    .update(`password-reset.${token}.${env.SESSION_SECRET}`)
    .digest("hex");
}

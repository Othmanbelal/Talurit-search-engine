ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';

CREATE TABLE "user_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_invitations_tokenHash_key" ON "user_invitations"("tokenHash");
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");
CREATE INDEX "user_invitations_role_idx" ON "user_invitations"("role");
CREATE INDEX "user_invitations_acceptedAt_idx" ON "user_invitations"("acceptedAt");
CREATE INDEX "user_invitations_expiresAt_idx" ON "user_invitations"("expiresAt");

ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

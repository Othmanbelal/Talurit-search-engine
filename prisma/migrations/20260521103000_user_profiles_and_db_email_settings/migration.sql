CREATE TABLE "user_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "profilePictureUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");
CREATE INDEX "user_profiles_lastName_firstName_idx" ON "user_profiles"("lastName", "firstName");

ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_profiles" (
  "id",
  "userId",
  "firstName",
  "lastName",
  "createdAt",
  "updatedAt"
)
SELECT
  'profile_' || "id",
  "id",
  COALESCE(NULLIF(split_part("name", ' ', 1), ''), "email"),
  COALESCE(NULLIF(trim(substr("name", length(split_part("name", ' ', 1)) + 1)), ''), '-'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
ON CONFLICT ("userId") DO NOTHING;

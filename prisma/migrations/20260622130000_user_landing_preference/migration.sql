-- User landing preference (sub-project D)
-- Additive nullable columns; no backfill required.
ALTER TABLE "user_profiles" ADD COLUMN "landingType" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "landingPath" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "landingTargetId" TEXT;

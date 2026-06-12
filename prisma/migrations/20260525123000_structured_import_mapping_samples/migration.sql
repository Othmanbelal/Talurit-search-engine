UPDATE "manufacturers"
SET "normalizedName" = lower(regexp_replace(trim("name"), '\s+', ' ', 'g'))
WHERE "normalizedName" IS NULL;

ALTER TABLE "manufacturers" ALTER COLUMN "normalizedName" SET NOT NULL;

ALTER TABLE "import_column_mappings"
ADD COLUMN "sampleValues" JSONB NOT NULL DEFAULT '[]';

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');
CREATE TYPE "ToolStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'MISSING', 'DAMAGED', 'MAINTENANCE', 'ARCHIVED');
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEWED', 'IMPORTED', 'PARTIAL', 'FAILED');
CREATE TYPE "IssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');
CREATE TYPE "BackupType" AS ENUM ('DATABASE', 'EXCEL');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manufacturers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locations" (
  "id" TEXT NOT NULL,
  "rawLabel" TEXT,
  "shelf" TEXT,
  "drawer" TEXT,
  "compartment" TEXT,
  "mapRow" INTEGER,
  "mapColumn" INTEGER,
  "sourceSheet" TEXT,
  "description" TEXT,
  "rawData" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machines" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_batches" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "sheetName" TEXT,
  "importedByUserId" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0,
  "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEWED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tools" (
  "id" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "manufacturerId" TEXT,
  "articleNumber" TEXT,
  "alternativeArticleNumber" TEXT,
  "grade" TEXT,
  "mounting" TEXT,
  "toolTypeId" TEXT,
  "diameter" TEXT,
  "cuttingLength" TEXT,
  "cuttingSize" TEXT,
  "holder" TEXT,
  "holderSecondary" TEXT,
  "overhang" TEXT,
  "stockRaw" TEXT,
  "quantity" INTEGER,
  "quantitySecondary" INTEGER,
  "countRaw" TEXT,
  "priceRaw" TEXT,
  "totalPriceRaw" TEXT,
  "locationId" TEXT,
  "machineId" TEXT,
  "machineRaw" TEXT,
  "notes" TEXT,
  "status" "ToolStatus" NOT NULL DEFAULT 'AVAILABLE',
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "sourceSheet" TEXT,
  "sourceRowNumber" INTEGER,
  "rawData" JSONB NOT NULL DEFAULT '{}',
  "importBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_tool_slots" (
  "id" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "toolId" TEXT,
  "slotNumber" TEXT,
  "potNumber" TEXT,
  "toolNumberRaw" TEXT,
  "holderRaw" TEXT,
  "productNameRaw" TEXT,
  "articleRaw" TEXT,
  "manufacturerRaw" TEXT,
  "gradeRaw" TEXT,
  "toolTypeRaw" TEXT,
  "diameterRaw" TEXT,
  "lengthRaw" TEXT,
  "locationRaw" TEXT,
  "numericParameters" JSONB NOT NULL DEFAULT '{}',
  "sourceSheet" TEXT,
  "sourceRowNumber" INTEGER,
  "rawData" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "machine_tool_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_history" (
  "id" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fieldName" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tool_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_row_issues" (
  "id" TEXT NOT NULL,
  "importBatchId" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "rowNumber" INTEGER,
  "severity" "IssueSeverity" NOT NULL DEFAULT 'WARNING',
  "message" TEXT NOT NULL,
  "rawData" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_row_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weekly_summary_logs" (
  "id" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "message" TEXT,
  CONSTRAINT "weekly_summary_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_logs" (
  "id" TEXT NOT NULL,
  "type" "BackupType" NOT NULL,
  "fileName" TEXT,
  "filePath" TEXT,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");
CREATE UNIQUE INDEX "tool_types_name_key" ON "tool_types"("name");
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");
CREATE INDEX "locations_rawLabel_idx" ON "locations"("rawLabel");
CREATE INDEX "locations_shelf_compartment_idx" ON "locations"("shelf", "compartment");
CREATE INDEX "locations_sourceSheet_mapRow_mapColumn_idx" ON "locations"("sourceSheet", "mapRow", "mapColumn");
CREATE UNIQUE INDEX "machines_name_key" ON "machines"("name");
CREATE INDEX "import_batches_fileName_idx" ON "import_batches"("fileName");
CREATE INDEX "import_batches_sheetName_idx" ON "import_batches"("sheetName");
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");
CREATE INDEX "tools_articleNumber_idx" ON "tools"("articleNumber");
CREATE INDEX "tools_productName_idx" ON "tools"("productName");
CREATE INDEX "tools_manufacturerId_idx" ON "tools"("manufacturerId");
CREATE INDEX "tools_toolTypeId_idx" ON "tools"("toolTypeId");
CREATE INDEX "tools_locationId_idx" ON "tools"("locationId");
CREATE INDEX "tools_machineId_idx" ON "tools"("machineId");
CREATE INDEX "tools_status_isArchived_idx" ON "tools"("status", "isArchived");
CREATE INDEX "tools_sourceSheet_sourceRowNumber_idx" ON "tools"("sourceSheet", "sourceRowNumber");
CREATE INDEX "machine_tool_slots_machineId_idx" ON "machine_tool_slots"("machineId");
CREATE INDEX "machine_tool_slots_toolId_idx" ON "machine_tool_slots"("toolId");
CREATE INDEX "machine_tool_slots_slotNumber_idx" ON "machine_tool_slots"("slotNumber");
CREATE INDEX "machine_tool_slots_potNumber_idx" ON "machine_tool_slots"("potNumber");
CREATE INDEX "machine_tool_slots_sourceSheet_sourceRowNumber_idx" ON "machine_tool_slots"("sourceSheet", "sourceRowNumber");
CREATE INDEX "tool_history_toolId_idx" ON "tool_history"("toolId");
CREATE INDEX "tool_history_changedByUserId_idx" ON "tool_history"("changedByUserId");
CREATE INDEX "tool_history_action_idx" ON "tool_history"("action");
CREATE INDEX "import_row_issues_importBatchId_idx" ON "import_row_issues"("importBatchId");
CREATE INDEX "import_row_issues_sheetName_rowNumber_idx" ON "import_row_issues"("sheetName", "rowNumber");
CREATE INDEX "import_row_issues_severity_idx" ON "import_row_issues"("severity");
CREATE INDEX "weekly_summary_logs_status_idx" ON "weekly_summary_logs"("status");
CREATE INDEX "weekly_summary_logs_sentAt_idx" ON "weekly_summary_logs"("sentAt");
CREATE INDEX "backup_logs_type_idx" ON "backup_logs"("type");
CREATE INDEX "backup_logs_status_idx" ON "backup_logs"("status");
CREATE INDEX "backup_logs_createdAt_idx" ON "backup_logs"("createdAt");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_importedByUserId_fkey" FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_toolTypeId_fkey" FOREIGN KEY ("toolTypeId") REFERENCES "tool_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "machine_tool_slots" ADD CONSTRAINT "machine_tool_slots_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "machine_tool_slots" ADD CONSTRAINT "machine_tool_slots_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_history" ADD CONSTRAINT "tool_history_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_history" ADD CONSTRAINT "tool_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_row_issues" ADD CONSTRAINT "import_row_issues_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

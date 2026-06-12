ALTER TABLE "manufacturers" ADD COLUMN "normalizedName" TEXT;
CREATE UNIQUE INDEX "manufacturers_normalizedName_key" ON "manufacturers"("normalizedName");

CREATE TABLE "inventory_groups" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_tables" (
  "id" TEXT NOT NULL,
  "groupId" TEXT,
  "name" TEXT NOT NULL,
  "sourceSheetName" TEXT,
  "tableType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "parentCategoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "manufacturerId" TEXT,
  "categoryId" TEXT,
  "grade" TEXT,
  "rawExamples" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_identifiers" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "item_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_attributes" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rawValue" TEXT,
  "numericValue" DECIMAL(65,30),
  "unit" TEXT,
  "sourceColumn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "item_attributes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "storage_locations" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "room" TEXT NOT NULL DEFAULT 'Verktygsrum',
  "locationType" TEXT NOT NULL DEFAULT 'stockroom_position',
  "planNumber" INTEGER,
  "sectionLetter" TEXT,
  "positionNumber" INTEGER,
  "displayName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "location_aliases" (
  "id" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_aliases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_profiles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sheetType" TEXT NOT NULL,
  "headerFingerprint" TEXT,
  "rules" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "import_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_import_batches" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "uploadedByUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "detectedProfileId" TEXT,
  "targetInventoryGroupId" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "readyRows" INTEGER NOT NULL DEFAULT 0,
  "reviewRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "structured_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_import_sheets" (
  "id" TEXT NOT NULL,
  "importBatchId" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "detectedSheetType" TEXT,
  "userSelectedSheetType" TEXT,
  "headerRowNumber" INTEGER,
  "selectedForImport" BOOLEAN NOT NULL DEFAULT false,
  "targetMode" TEXT,
  "targetInventoryGroupId" TEXT,
  "targetInventoryTableId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "structured_import_sheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_column_mappings" (
  "id" TEXT NOT NULL,
  "importProfileId" TEXT,
  "importSheetId" TEXT,
  "excelHeader" TEXT NOT NULL,
  "normalizedExcelHeader" TEXT NOT NULL,
  "columnIndex" INTEGER NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetField" TEXT,
  "attributeName" TEXT,
  "attributeUnit" TEXT,
  "attributeDataType" TEXT,
  "confidence" DECIMAL(65,30),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_column_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_staging_rows" (
  "id" TEXT NOT NULL,
  "importBatchId" TEXT NOT NULL,
  "importSheetId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "rawRow" JSONB NOT NULL,
  "mappedData" JSONB NOT NULL DEFAULT '{}',
  "detectedItemId" TEXT,
  "detectedLocationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "confidence" DECIMAL(65,30),
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_staging_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_balances" (
  "id" TEXT NOT NULL,
  "inventoryTableId" TEXT,
  "itemId" TEXT NOT NULL,
  "locationId" TEXT,
  "compartment" TEXT,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "unitPrice" DECIMAL(65,30),
  "currency" TEXT NOT NULL DEFAULT 'SEK',
  "sourceImportRowId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_movements" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "locationId" TEXT,
  "stockBalanceId" TEXT,
  "movementType" TEXT NOT NULL,
  "quantityChange" DECIMAL(65,30) NOT NULL,
  "quantityBefore" DECIMAL(65,30),
  "quantityAfter" DECIMAL(65,30),
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_groups_name_idx" ON "inventory_groups"("name");
CREATE INDEX "inventory_tables_groupId_idx" ON "inventory_tables"("groupId");
CREATE INDEX "inventory_tables_name_idx" ON "inventory_tables"("name");
CREATE INDEX "inventory_tables_tableType_idx" ON "inventory_tables"("tableType");
CREATE UNIQUE INDEX "tool_categories_normalizedName_key" ON "tool_categories"("normalizedName");
CREATE INDEX "tool_categories_parentCategoryId_idx" ON "tool_categories"("parentCategoryId");
CREATE INDEX "inventory_items_normalizedName_idx" ON "inventory_items"("normalizedName");
CREATE INDEX "inventory_items_manufacturerId_idx" ON "inventory_items"("manufacturerId");
CREATE INDEX "inventory_items_categoryId_idx" ON "inventory_items"("categoryId");
CREATE UNIQUE INDEX "item_identifiers_type_normalizedValue_key" ON "item_identifiers"("type", "normalizedValue");
CREATE INDEX "item_identifiers_itemId_idx" ON "item_identifiers"("itemId");
CREATE INDEX "item_attributes_itemId_idx" ON "item_attributes"("itemId");
CREATE INDEX "item_attributes_name_idx" ON "item_attributes"("name");
CREATE UNIQUE INDEX "storage_locations_normalizedCode_key" ON "storage_locations"("normalizedCode");
CREATE INDEX "storage_locations_code_idx" ON "storage_locations"("code");
CREATE INDEX "storage_locations_room_idx" ON "storage_locations"("room");
CREATE INDEX "storage_locations_isActive_idx" ON "storage_locations"("isActive");
CREATE UNIQUE INDEX "location_aliases_normalizedAlias_key" ON "location_aliases"("normalizedAlias");
CREATE INDEX "location_aliases_locationId_idx" ON "location_aliases"("locationId");
CREATE UNIQUE INDEX "import_profiles_headerFingerprint_key" ON "import_profiles"("headerFingerprint");
CREATE INDEX "import_profiles_name_idx" ON "import_profiles"("name");
CREATE INDEX "import_profiles_sheetType_idx" ON "import_profiles"("sheetType");
CREATE INDEX "structured_import_batches_fileName_idx" ON "structured_import_batches"("fileName");
CREATE INDEX "structured_import_batches_status_idx" ON "structured_import_batches"("status");
CREATE INDEX "structured_import_batches_uploadedByUserId_idx" ON "structured_import_batches"("uploadedByUserId");
CREATE INDEX "structured_import_batches_detectedProfileId_idx" ON "structured_import_batches"("detectedProfileId");
CREATE INDEX "structured_import_batches_targetInventoryGroupId_idx" ON "structured_import_batches"("targetInventoryGroupId");
CREATE INDEX "structured_import_sheets_importBatchId_idx" ON "structured_import_sheets"("importBatchId");
CREATE INDEX "structured_import_sheets_sheetName_idx" ON "structured_import_sheets"("sheetName");
CREATE INDEX "structured_import_sheets_selectedForImport_idx" ON "structured_import_sheets"("selectedForImport");
CREATE INDEX "structured_import_sheets_targetInventoryGroupId_idx" ON "structured_import_sheets"("targetInventoryGroupId");
CREATE INDEX "structured_import_sheets_targetInventoryTableId_idx" ON "structured_import_sheets"("targetInventoryTableId");
CREATE INDEX "import_column_mappings_importProfileId_idx" ON "import_column_mappings"("importProfileId");
CREATE INDEX "import_column_mappings_importSheetId_idx" ON "import_column_mappings"("importSheetId");
CREATE INDEX "import_column_mappings_targetType_idx" ON "import_column_mappings"("targetType");
CREATE UNIQUE INDEX "import_staging_rows_importSheetId_rowNumber_key" ON "import_staging_rows"("importSheetId", "rowNumber");
CREATE INDEX "import_staging_rows_importBatchId_idx" ON "import_staging_rows"("importBatchId");
CREATE INDEX "import_staging_rows_status_idx" ON "import_staging_rows"("status");
CREATE INDEX "import_staging_rows_detectedItemId_idx" ON "import_staging_rows"("detectedItemId");
CREATE INDEX "import_staging_rows_detectedLocationId_idx" ON "import_staging_rows"("detectedLocationId");
CREATE UNIQUE INDEX "stock_balances_table_item_location_compartment_key" ON "stock_balances"("inventoryTableId", "itemId", "locationId", "compartment");
CREATE INDEX "stock_balances_itemId_idx" ON "stock_balances"("itemId");
CREATE INDEX "stock_balances_locationId_idx" ON "stock_balances"("locationId");
CREATE INDEX "stock_balances_inventoryTableId_idx" ON "stock_balances"("inventoryTableId");
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");
CREATE INDEX "stock_movements_locationId_idx" ON "stock_movements"("locationId");
CREATE INDEX "stock_movements_stockBalanceId_idx" ON "stock_movements"("stockBalanceId");
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

ALTER TABLE "inventory_tables" ADD CONSTRAINT "inventory_tables_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "inventory_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_categories" ADD CONSTRAINT "tool_categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "tool_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tool_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item_identifiers" ADD CONSTRAINT "item_identifiers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_attributes" ADD CONSTRAINT "item_attributes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "location_aliases" ADD CONSTRAINT "location_aliases_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_import_batches" ADD CONSTRAINT "structured_import_batches_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "structured_import_batches" ADD CONSTRAINT "structured_import_batches_detectedProfileId_fkey" FOREIGN KEY ("detectedProfileId") REFERENCES "import_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "structured_import_batches" ADD CONSTRAINT "structured_import_batches_targetInventoryGroupId_fkey" FOREIGN KEY ("targetInventoryGroupId") REFERENCES "inventory_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "structured_import_sheets" ADD CONSTRAINT "structured_import_sheets_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "structured_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "structured_import_sheets" ADD CONSTRAINT "structured_import_sheets_targetInventoryGroupId_fkey" FOREIGN KEY ("targetInventoryGroupId") REFERENCES "inventory_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "structured_import_sheets" ADD CONSTRAINT "structured_import_sheets_targetInventoryTableId_fkey" FOREIGN KEY ("targetInventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_column_mappings" ADD CONSTRAINT "import_column_mappings_importProfileId_fkey" FOREIGN KEY ("importProfileId") REFERENCES "import_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_column_mappings" ADD CONSTRAINT "import_column_mappings_importSheetId_fkey" FOREIGN KEY ("importSheetId") REFERENCES "structured_import_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "structured_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_importSheetId_fkey" FOREIGN KEY ("importSheetId") REFERENCES "structured_import_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_detectedItemId_fkey" FOREIGN KEY ("detectedItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_detectedLocationId_fkey" FOREIGN KEY ("detectedLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_inventoryTableId_fkey" FOREIGN KEY ("inventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_sourceImportRowId_fkey" FOREIGN KEY ("sourceImportRowId") REFERENCES "import_staging_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

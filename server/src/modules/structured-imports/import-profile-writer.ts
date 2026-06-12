import type { ImportColumnMapping, Prisma, StructuredImportSheet } from "@prisma/client";
import { headerFingerprint } from "./structured-import.normalizers";

export async function saveImportProfile(args: {
  tx: Prisma.TransactionClient;
  sheet: StructuredImportSheet & { columnMappings: ImportColumnMapping[] };
}) {
  const mappings = args.sheet.columnMappings.sort((a, b) => a.columnIndex - b.columnIndex);
  const fingerprint = headerFingerprint(mappings.map((mapping) => mapping.excelHeader));
  const profile = await args.tx.importProfile.upsert({
    where: { headerFingerprint: fingerprint },
    create: {
      name: `${args.sheet.sheetName} import profile`,
      sheetType: args.sheet.userSelectedSheetType || args.sheet.detectedSheetType || "generic_table",
      headerFingerprint: fingerprint,
      rules: { sourceSheetName: args.sheet.sheetName },
    },
    update: {
      name: `${args.sheet.sheetName} import profile`,
      sheetType: args.sheet.userSelectedSheetType || args.sheet.detectedSheetType || "generic_table",
      rules: { sourceSheetName: args.sheet.sheetName },
    },
  });

  await args.tx.importColumnMapping.deleteMany({ where: { importProfileId: profile.id } });
  for (const mapping of mappings) {
    await args.tx.importColumnMapping.create({ data: profileMapping(profile.id, mapping) });
  }
  return profile;
}

function profileMapping(importProfileId: string, mapping: ImportColumnMapping) {
  return {
    importProfileId,
    excelHeader: mapping.excelHeader,
    normalizedExcelHeader: mapping.normalizedExcelHeader,
    columnIndex: mapping.columnIndex,
    targetType: mapping.targetType,
    targetField: mapping.targetField,
    attributeName: mapping.attributeName,
    attributeUnit: mapping.attributeUnit,
    attributeDataType: mapping.attributeDataType,
    sampleValues: (mapping.sampleValues ?? []) as Prisma.InputJsonValue,
    confidence: mapping.confidence,
  };
}

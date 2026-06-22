import { z } from "zod";

export const updateBackupSettingsSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.coerce.number().int().min(1).max(24 * 31),
  directory: z.string().trim().min(1).max(500),
});

export const restoreBackupSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  confirmation: z.string().trim().min(1).max(255),
});

export type UpdateBackupSettingsInput = z.infer<typeof updateBackupSettingsSchema>;
export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;

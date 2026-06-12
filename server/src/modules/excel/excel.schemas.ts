import { ToolStatus } from "@prisma/client";
import { z } from "zod";

export const exportInventoryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  toolTypeId: z.string().trim().min(1).optional(),
  manufacturerId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  machineId: z.string().trim().min(1).optional(),
  placement: z.enum(["all", "location", "machine", "unassigned"]).default("all"),
  status: z.nativeEnum(ToolStatus).optional(),
  archived: z.enum(["true", "false", "all"]).default("all"),
  sortBy: z
    .enum(["productName", "articleNumber", "manufacturer", "quantity", "updatedAt"])
    .default("productName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

export type ExportInventoryQuery = z.infer<typeof exportInventoryQuerySchema>;

import { z } from "zod";

const requiredName = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1).max(200),
);

const optionalText = z.preprocess(
  (value) => {
    if (value === "") return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z.string().min(1).max(500).nullable().optional(),
);

const optionalNumber = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().min(1).nullable().optional(),
);

export const createNamedMetadataSchema = z.object({
  name: requiredName,
  description: optionalText,
});

export const createManufacturerSchema = z.object({
  name: requiredName,
});

export const createLocationSchema = z.object({
  rawLabel: optionalText,
  shelf: optionalText,
  drawer: optionalText,
  compartment: optionalText,
  mapRow: optionalNumber,
  mapColumn: optionalNumber,
  sourceSheet: optionalText,
  description: optionalText,
});

export const metadataIdParamSchema = z.object({
  id: z.string().min(1),
});

export const linkToolToMachineSchema = z.object({
  toolId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
});

export type CreateNamedMetadataInput = z.infer<typeof createNamedMetadataSchema>;
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type LinkToolToMachineInput = z.infer<typeof linkToolToMachineSchema>;

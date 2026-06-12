import { z } from "zod";

export const resourceTypeValues = ["inventory_table", "inventory_group", "warehouse"] as const;
export type ResourceTypeValue = (typeof resourceTypeValues)[number];

export const AssignResourceManagerSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.enum(resourceTypeValues),
  resourceId: z.string().min(1),
});
export type AssignResourceManagerInput = z.infer<typeof AssignResourceManagerSchema>;

export const ListResourceManagersQuerySchema = z.object({
  resourceType: z.enum(resourceTypeValues).optional(),
  resourceId: z.string().min(1).optional(),
  userId: z.string().optional(),
}).refine(
  (d) => (d.resourceType && d.resourceId) || d.userId,
  { message: "Provide either (resourceType + resourceId) or userId" }
);

import { z } from "zod";
import { LANDING_PAGE_ROUTES } from "./landing";

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    phoneNumber: z.string().max(30).nullable().optional(),
    // Landing preference. `null` clears it (back to dashboard default).
    landingType: z.enum(["page", "group", "table"]).nullable().optional(),
    landingPath: z.enum(LANDING_PAGE_ROUTES).nullable().optional(),
    landingTargetId: z.string().cuid().nullable().optional(),
  })
  .refine(
    (data) => data.landingType !== "page" || isNonNull(data.landingPath),
    { message: "A landing page route is required for type 'page'.", path: ["landingPath"] },
  )
  .refine(
    (data) => data.landingType === "page" || data.landingType == null || isNonNull(data.landingTargetId),
    { message: "A target id is required for a group/table landing.", path: ["landingTargetId"] },
  );

function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

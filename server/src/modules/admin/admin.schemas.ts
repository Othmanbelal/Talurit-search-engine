import { UserRole } from "@prisma/client";
import { z } from "zod";

const roleSchema = z.nativeEnum(UserRole);
const pictureReferenceSchema = z.string().refine((value) => {
  return /^(local|supabase):\/\/[^/]+\/.+/.test(value) || z.string().url().safeParse(value).success;
}, "Profile picture must be an uploaded image reference or valid URL");

export const inviteUserSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
  name: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  role: roleSchema,
});

export const updateUserSchema = z.object({
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  profile: z
    .object({
      firstName: z.string().trim().min(1).max(80).optional(),
      lastName: z.string().trim().min(1).max(80).optional(),
      phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
      profilePictureUrl: pictureReferenceSchema.optional().or(z.literal("")),
    })
    .optional(),
});

export const sendTestEmailSchema = z.object({
  email: z
    .string()
    .email()
    .transform((email) => email.trim().toLowerCase())
    .optional(),
});

export const updateSettingsSchema = z.object({
  weeklySummaryEmail: z
    .string()
    .email()
    .transform((email) => email.trim().toLowerCase())
    .optional()
    .or(z.literal("")),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.coerce.number().int().positive().max(65535).optional(),
  smtpUser: z.string().trim().max(255).optional(),
  smtpPass: z.string().max(500).optional(),
  smtpFrom: z.string().trim().max(255).optional(),
  smtpSecure: z.boolean().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

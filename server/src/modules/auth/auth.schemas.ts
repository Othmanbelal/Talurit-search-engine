import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20, "Invitation token is required"),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
  profilePictureUrl: z.string().url().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Password reset token is required"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

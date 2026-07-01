import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const createBorrowRequestSchema = z.object({
  borrowRecordId: z.string().min(1),
});

export type CreateBorrowRequestInput = z.infer<typeof createBorrowRequestSchema>;

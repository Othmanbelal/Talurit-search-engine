import { z } from "zod";

export const CreateUrgentIssueSchema = z.object({
  tableId: z.string().min(1),
  stockBalanceId: z.string().min(1),
  message: z.string().min(10).max(2000),
});

export type CreateUrgentIssueInput = z.infer<typeof CreateUrgentIssueSchema>;

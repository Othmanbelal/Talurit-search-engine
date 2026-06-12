import { z } from "zod";

export const CreateItemNoteSchema = z.object({
  stockBalanceId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export type CreateItemNoteInput = z.infer<typeof CreateItemNoteSchema>;

export const ListItemNotesQuerySchema = z.object({
  stockBalanceId: z.string().min(1),
});

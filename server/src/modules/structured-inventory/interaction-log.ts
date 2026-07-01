import { prisma } from "../../db/prisma";

export type InteractionAction =
  | "add"
  | "edit"
  | "archive"
  | "restore"
  | "delete"
  | "consume"
  | "borrow"
  | "return"
  | "use_in"
  | "return_used";

export interface LogInteractionArgs {
  action: InteractionAction;
  stockBalanceId?: string | null;
  inventoryTableId?: string | null;
  itemId?: string | null;
  userId?: string | null;
  quantity?: number | string | null;
  notes?: string | null;
  itemName?: string | null;
  tableName?: string | null;
  userName?: string | null;
}

export function logInteraction(args: LogInteractionArgs) {
  return prisma.itemInteractionLog.create({
    data: {
      action: args.action,
      stockBalanceId: args.stockBalanceId ?? null,
      inventoryTableId: args.inventoryTableId ?? null,
      itemId: args.itemId ?? null,
      userId: args.userId ?? null,
      quantity: args.quantity != null ? String(args.quantity) : null,
      notes: args.notes ?? null,
      itemName: args.itemName ?? null,
      tableName: args.tableName ?? null,
      userName: args.userName ?? null,
    },
  });
}

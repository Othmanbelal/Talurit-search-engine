import { AppError } from "../../utils/AppError";
import { prisma } from "../../db/prisma";
import {
  createNote,
  deleteNoteById,
  findNoteById,
  findNotesByStockBalance,
  findRecentNotes,
} from "./item-notes.repository";

export async function listNotesForRow(stockBalanceId: string) {
  return findNotesByStockBalance(stockBalanceId);
}

export async function addNote(stockBalanceId: string, authorId: string, content: string) {
  const rowExists = await prisma.stockBalance.findUnique({
    where: { id: stockBalanceId },
    select: { id: true },
  });
  if (!rowExists) throw new AppError("Stock balance not found", 404);
  return createNote(stockBalanceId, authorId, content);
}

export async function removeNote(noteId: string, userId: string, userRole: string) {
  const note = await findNoteById(noteId);
  if (!note) throw new AppError("Note not found", 404);
  const canDelete =
    userRole === "admin" || userRole === "manager" || note.authorId === userId;
  if (!canDelete) throw new AppError("Cannot delete another user's note", 403);
  await deleteNoteById(noteId);
}

export async function listRecentNotes(tableId: string | undefined, limit: number) {
  return findRecentNotes(tableId, Math.max(1, Math.min(limit, 100)));
}

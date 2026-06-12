import type { Request, Response } from "express";
import { CreateItemNoteSchema, ListItemNotesQuerySchema } from "./item-notes.schemas";
import { addNote, listNotesForRow, listRecentNotes, removeNote } from "./item-notes.service";

export async function listNotesController(req: Request, res: Response) {
  const { stockBalanceId } = ListItemNotesQuerySchema.parse(req.query);
  const notes = await listNotesForRow(stockBalanceId);
  res.json({ success: true, data: notes });
}

export async function createNoteController(req: Request, res: Response) {
  const input = CreateItemNoteSchema.parse(req.body);
  const note = await addNote(input.stockBalanceId, req.user!.id, input.content);
  res.status(201).json({ success: true, data: note });
}

export async function deleteNoteController(req: Request, res: Response) {
  await removeNote(req.params.noteId, req.user!.id, req.user!.role);
  res.status(204).send();
}

export async function recentNotesController(req: Request, res: Response) {
  const tableId = typeof req.query.tableId === "string" ? req.query.tableId : undefined;
  const limit = Number(req.query.limit) || 30;
  const notes = await listRecentNotes(tableId, limit);
  res.json({ success: true, data: notes });
}

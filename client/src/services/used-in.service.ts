import type { UsedInCard, UsedInCardDetails, UsedInCardInput, UsedInCardUpdateInput } from "../types/used-in";
import { apiRequest } from "./http";

export function listUsedInCardsRequest() {
  return apiRequest<{ cards: UsedInCard[] }>("/api/used-in/cards");
}

export function createUsedInCardRequest(input: UsedInCardInput) {
  return apiRequest<{ card: UsedInCard }>("/api/used-in/cards", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUsedInCardRequest(id: string, input: UsedInCardUpdateInput) {
  return apiRequest<{ card: UsedInCard }>(`/api/used-in/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteUsedInCardRequest(id: string) {
  return apiRequest<unknown>(`/api/used-in/cards/${id}`, { method: "DELETE" });
}

export function getUsedInCardRequest(id: string) {
  return apiRequest<{ card: UsedInCardDetails }>(`/api/used-in/cards/${id}`);
}

export function assignRowsToCardRequest(
  cardId: string,
  input: { rowIds: string[]; quantity?: number | null; notes?: string | null },
) {
  return apiRequest<{ result: { count: number } }>(`/api/used-in/cards/${cardId}/assignments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteUsedInAssignmentRequest(id: string) {
  return apiRequest<{ assignment: unknown }>(`/api/used-in/assignments/${id}`, {
    method: "DELETE",
  });
}

export function returnUsedInStockAssignmentRequest(id: string) {
  return apiRequest<unknown>(`/api/used-in/stock-assignments/${id}/return`, { method: "POST" });
}

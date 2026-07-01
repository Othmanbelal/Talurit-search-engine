import { apiRequest } from "./http";

export function createBorrowRequestRequest(borrowRecordId: string) {
  return apiRequest<unknown>("/api/borrow-requests", {
    method: "POST",
    body: JSON.stringify({ borrowRecordId }),
  });
}

export function acceptBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/accept`, { method: "POST" });
}

export function declineBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/decline`, { method: "POST" });
}

export function cancelBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/cancel`, { method: "POST" });
}

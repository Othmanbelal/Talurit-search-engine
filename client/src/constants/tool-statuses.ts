import type { ToolStatus } from "../types/tools";

export const toolStatuses: ToolStatus[] = [
  "AVAILABLE",
  "LOW_STOCK",
  "MISSING",
  "DAMAGED",
  "MAINTENANCE",
  "ARCHIVED",
];

export function formatToolStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

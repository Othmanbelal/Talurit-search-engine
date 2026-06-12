import type { Location, Tool } from "../types/tools";
import { formatLocation } from "./tool-format";

const STORAGE_LABEL_PATTERN = /^[A-Z]+\d+[A-Z]*:\d+$/i;

export type PlacementState = "machine" | "location" | "unassigned" | "review";

export function normalizeStorageLabel(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s*:\s*/g, ":").replace(/\s+/g, "").toUpperCase();
}

export function isValidStorageLocation(location?: Location | null) {
  const label = normalizeStorageLabel(location?.rawLabel ?? location?.shelf);
  return Boolean(label && STORAGE_LABEL_PATTERN.test(label));
}

export function getToolPlacement(tool: Tool): {
  label: string;
  state: PlacementState;
  tone: string;
} {
  if (tool.machine) {
    return {
      label: `In machine: ${tool.machine.name}`,
      state: "machine",
      tone: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    };
  }

  if (isValidStorageLocation(tool.location)) {
    return {
      label: formatLocation(tool.location),
      state: "location",
      tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (tool.location) {
    return {
      label: "Needs location review",
      state: "review",
      tone: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "No assigned location",
    state: "unassigned",
    tone: "border-red-400/30 bg-red-500/10 text-red-100",
  };
}

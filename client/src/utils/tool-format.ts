import type { Location, Tool } from "../types/tools";

export function formatLocation(location?: Location | null) {
  if (!location) return "-";
  if (location.rawLabel && location.compartment) {
    return `${location.rawLabel} / FACK ${location.compartment}`;
  }
  if (location.rawLabel) return location.rawLabel;

  return [location.shelf, location.drawer, location.compartment].filter(Boolean).join(" / ") || "-";
}

export function formatLocationShelf(location?: Location | null) {
  return location?.rawLabel ?? location?.shelf ?? "-";
}

export function formatLocationCompartment(location?: Location | null) {
  return location?.compartment ?? "-";
}

export function formatToolMachine(tool: Tool) {
  return tool.machine?.name ?? tool.machineRaw ?? "-";
}

export function formatNullable(value?: string | number | null) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

import type { Prisma } from "@prisma/client";
import { parseLocation } from "../structured-imports/location-parser";

export type ShelfLocation = {
  code: string;
  normalizedCode: string;
  displayName: string;
  planNumber?: number;
  sectionLetter?: string;
  positionNumber?: number;
};

export function parseShelfLocation(code: string, room = "Verktygsrum"): ShelfLocation {
  const parsed = parseLocation(code, room);
  if (!parsed || !parsed.planNumber || !parsed.sectionLetter || !parsed.positionNumber) {
    throw new Error("Shelf code must use the P10A:1 format.");
  }
  return parsed;
}

export function locationCreateData(location: ShelfLocation, room = "Verktygsrum"): Prisma.StorageLocationCreateInput {
  return {
    code: location.code,
    normalizedCode: location.normalizedCode,
    room,
    locationType: "stockroom_position",
    planNumber: location.planNumber,
    sectionLetter: location.sectionLetter,
    positionNumber: location.positionNumber,
    displayName: location.displayName,
  };
}

export function locationUpdateData(location: ShelfLocation, room = "Verktygsrum"): Prisma.StorageLocationUpdateInput {
  return {
    code: location.code,
    room,
    locationType: "stockroom_position",
    planNumber: location.planNumber,
    sectionLetter: location.sectionLetter,
    positionNumber: location.positionNumber,
    displayName: location.displayName,
    isActive: true,
  };
}

export function compartmentLabel(value: string | number) {
  return String(value).trim();
}

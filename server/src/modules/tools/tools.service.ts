import { ToolStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import {
  isValidStorageLabel,
  normalizeStorageLabel,
} from "../../utils/location-label";
import type {
  CreateToolInput,
  ListToolsQuery,
  ToolPlacementInput,
  UpdateToolInput,
} from "./tools.schemas";
import { buildStateHistory, buildUpdateHistory } from "./tools.history";
import { mapCreateToolInput, mapUpdateToolInput } from "./tools.mapper";
import {
  createToolWithHistory,
  findLocationById,
  findMachineById,
  findOrCreatePlacementLocation,
  findToolById,
  findTools,
  updateToolWithHistory,
} from "./tools.repository";
import { buildToolOrderBy, buildToolWhere } from "./tools.query";

export async function listTools(query: ListToolsQuery) {
  const skip = (query.page - 1) * query.pageSize;
  const where = buildToolWhere(query);
  const orderBy = buildToolOrderBy(query);
  const [total, tools] = await findTools({ where, orderBy, skip, take: query.pageSize });

  return {
    items: tools,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function getTool(id: string) {
  const tool = await findToolById(id);

  if (!tool) {
    throw new AppError("Tool not found", 404);
  }

  return tool;
}

export function createTool(input: CreateToolInput, userId: string) {
  return createToolWithHistory(mapCreateToolInput(input), userId);
}

export async function updateTool(id: string, input: UpdateToolInput, userId: string) {
  const existingTool = await getTool(id);
  const historyEntries = buildUpdateHistory(existingTool, input);

  if (historyEntries.length === 0) {
    return existingTool;
  }

  return updateToolWithHistory({
    id,
    data: mapUpdateToolInput(input),
    historyEntries,
    changedByUserId: userId,
  });
}

export async function archiveTool(id: string, userId: string) {
  const existingTool = await getTool(id);

  if (existingTool.isArchived) {
    return existingTool;
  }

  return updateToolWithHistory({
    id,
    data: { isArchived: true, status: ToolStatus.ARCHIVED },
    historyEntries: buildStateHistory(
      existingTool,
      { isArchived: true, status: ToolStatus.ARCHIVED },
      "ARCHIVE",
    ),
    changedByUserId: userId,
  });
}

export async function restoreTool(id: string, userId: string) {
  const existingTool = await getTool(id);

  if (!existingTool.isArchived) {
    return existingTool;
  }

  return updateToolWithHistory({
    id,
    data: { isArchived: false, status: ToolStatus.AVAILABLE },
    historyEntries: buildStateHistory(
      existingTool,
      { isArchived: false, status: ToolStatus.AVAILABLE },
      "RESTORE",
    ),
    changedByUserId: userId,
  });
}

export async function deleteTool(id: string, userId: string) {
  const existingTool = await getTool(id);

  if (existingTool.isArchived) {
    return existingTool;
  }

  // DELETE is intentionally a soft delete so audit history and imported context survive.
  return updateToolWithHistory({
    id,
    data: { isArchived: true, status: ToolStatus.ARCHIVED },
    historyEntries: buildStateHistory(
      existingTool,
      { isArchived: true, status: ToolStatus.ARCHIVED },
      "DELETE",
    ),
    changedByUserId: userId,
  });
}

export async function updateToolPlacement(
  id: string,
  input: ToolPlacementInput,
  userId: string,
) {
  const existingTool = await getTool(id);
  const placement = await resolvePlacement(input);
  const changes = {
    locationId: placement.locationId,
    machineId: placement.machineId,
  };

  return updateToolWithHistory({
    id,
    data: changes,
    historyEntries: buildStateHistory(existingTool, changes, "MOVE"),
    changedByUserId: userId,
  });
}

async function resolvePlacement(input: ToolPlacementInput) {
  if (input.placement === "machine") {
    const machine = await findMachineById(input.machineId);
    if (!machine) throw new AppError("Machine not found", 404);
    return { locationId: null, machineId: machine.id };
  }

  if (input.placement === "location") {
    const location = await findValidLocation(input.locationId);
    return { locationId: location.id, machineId: null };
  }

  if (input.placement === "newLocation") {
    const location = await createStorageLocation(input);
    return { locationId: location.id, machineId: null };
  }

  return { locationId: null, machineId: null };
}

async function findValidLocation(locationId: string) {
  const location = await findLocationById(locationId);

  if (!location) {
    throw new AppError("Location not found", 404);
  }

  if (!isValidStorageLabel(location.rawLabel ?? location.shelf)) {
    throw new AppError("Selected location is not a valid storage position", 400);
  }

  return location;
}

function createStorageLocation(input: {
  rawLabel: string;
  compartment?: string | null;
  description?: string | null;
}) {
  const rawLabel = normalizeStorageLabel(input.rawLabel);

  if (!rawLabel || !isValidStorageLabel(rawLabel)) {
    throw new AppError("Location must use the shelf form P10A:8", 400);
  }

  return findOrCreatePlacementLocation({
    rawLabel,
    shelf: rawLabel,
    compartment: input.compartment?.trim() || null,
    description: input.description?.trim() || null,
    sourceSheet: "Manual",
    rawData: {
      source: "manual-placement",
      rawLabel,
      compartment: input.compartment ?? null,
    },
  });
}

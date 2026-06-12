import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import {
  isNumericOnlyLocationLabel,
  isValidStorageLabel,
  normalizeStorageLabel,
} from "../../utils/location-label";
import { normalizeLookupKey, normalizeText } from "../../utils/normalize";
import type {
  CreateLocationInput,
  LinkToolToMachineInput,
  CreateManufacturerInput,
  CreateNamedMetadataInput,
} from "./metadata.schemas";
import {
  createLocation,
  createMachine,
  createManufacturer,
  createToolType,
  deleteMachine,
  findMachineById,
  findToolForMachineLink,
  linkToolQuantityToMachine,
  listLocations,
  listMachineTools,
  listMachines,
  listManufacturers,
  listToolTypes,
} from "./metadata.repository";

export const getToolTypes = listToolTypes;
export const getManufacturers = listManufacturers;
export const getLocations = listLocations;
export const getMachines = listMachines;

export async function addToolType(input: CreateNamedMetadataInput) {
  return createUniqueMetadata(() =>
    createToolType({
      name: normalizeText(input.name),
      description: input.description,
    }),
  );
}

export async function addManufacturer(input: CreateManufacturerInput) {
  const name = normalizeText(input.name);

  return createUniqueMetadata(() =>
    createManufacturer({
      name,
      normalizedName: normalizeLookupKey(name),
    }),
  );
}

export function addLocation(input: CreateLocationInput) {
  const rawLabel = normalizeStorageLabel(input.rawLabel ?? input.shelf);

  if (!rawLabel || !isValidStorageLabel(rawLabel) || isNumericOnlyLocationLabel(rawLabel)) {
    throw new AppError("Location must use the shelf form P10A:8", 400);
  }

  return createLocation({
    rawLabel,
    shelf: rawLabel,
    drawer: input.drawer,
    compartment: input.compartment,
    mapRow: input.mapRow,
    mapColumn: input.mapColumn,
    sourceSheet: input.sourceSheet,
    description: input.description,
    rawData: {},
  });
}

export async function addMachine(input: CreateNamedMetadataInput) {
  return createUniqueMetadata(() =>
    createMachine({
      name: normalizeText(input.name),
      description: input.description,
    }),
  );
}

export async function getMachineTools(machineId: string) {
  const machine = await findMachineById(machineId);

  if (!machine) {
    throw new AppError("Machine not found", 404);
  }

  const tools = await listMachineTools(machineId);

  return {
    tools,
    summary: summarizeMachineProducts(tools),
  };
}

export async function linkToolToMachine(
  machineId: string,
  input: LinkToolToMachineInput,
  userId: string,
) {
  const machine = await findMachineById(machineId);

  if (!machine) {
    throw new AppError("Machine not found", 404);
  }

  const sourceTool = await findToolForMachineLink(input.toolId);

  if (!sourceTool || sourceTool.isArchived) {
    throw new AppError("Tool not found", 404);
  }

  if (sourceTool.machine?.id === machineId) {
    throw new AppError("This tool is already assigned to this machine", 400);
  }

  if (sourceTool.quantity === null || sourceTool.quantity === undefined) {
    throw new AppError("Set a quantity on this tool before moving it to a machine", 400);
  }

  if (sourceTool.quantity < input.quantity) {
    throw new AppError("Not enough quantity available to move to this machine", 400);
  }

  const result = await linkToolQuantityToMachine({
    machineId,
    quantity: input.quantity,
    sourceToolId: sourceTool.id,
    userId,
  });

  if (!result) {
    throw new AppError("The tool quantity changed before the move could finish", 409);
  }

  return result;
}

export async function removeMachine(machineId: string) {
  const machine = await findMachineById(machineId);

  if (!machine) {
    throw new AppError("Machine not found", 404);
  }

  return deleteMachine(machineId);
}

async function createUniqueMetadata<T>(factory: () => Promise<T>) {
  try {
    return await factory();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("A record with this name already exists", 409);
    }

    throw error;
  }
}

function summarizeMachineProducts(tools: Awaited<ReturnType<typeof listMachineTools>>) {
  const grouped = new Map<string, {
    productName: string;
    articleNumber: string | null;
    manufacturerName: string | null;
    toolCount: number;
    quantityTotal: number;
  }>();

  for (const tool of tools) {
    const key = [
      tool.productName,
      tool.articleNumber ?? "",
      tool.manufacturer?.name ?? "",
    ].join("|");
    const current = grouped.get(key) ?? {
      productName: tool.productName,
      articleNumber: tool.articleNumber,
      manufacturerName: tool.manufacturer?.name ?? null,
      toolCount: 0,
      quantityTotal: 0,
    };

    current.toolCount += 1;
    current.quantityTotal += tool.quantity ?? 0;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.productName.localeCompare(right.productName),
  );
}

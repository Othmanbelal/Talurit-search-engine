import { ToolStatus, type Prisma, type Tool } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toolInclude } from "../tools/tools.types";

export function listToolTypes() {
  return prisma.toolType.findMany({ orderBy: { name: "asc" } });
}

export function createToolType(data: Prisma.ToolTypeCreateInput) {
  return prisma.toolType.create({ data });
}

export function listManufacturers() {
  return prisma.manufacturer.findMany({ orderBy: { name: "asc" } });
}

export function createManufacturer(data: Prisma.ManufacturerCreateInput) {
  return prisma.manufacturer.create({ data });
}

export function listLocations() {
  return prisma.location.findMany({
    orderBy: [{ rawLabel: "asc" }, { shelf: "asc" }, { compartment: "asc" }],
    include: {
      _count: {
        select: { tools: true },
      },
    },
  });
}

export function createLocation(data: Prisma.LocationCreateInput) {
  return prisma.location.create({ data });
}

export function listMachines() {
  return prisma.machine.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { tools: true },
      },
    },
  });
}

export function createMachine(data: Prisma.MachineCreateInput) {
  return prisma.machine.create({ data });
}

export function listMachineTools(machineId: string) {
  return prisma.tool.findMany({
    where: {
      machineId,
      isArchived: false,
      OR: [{ quantity: null }, { quantity: { gt: 0 } }],
    },
    orderBy: [{ productName: "asc" }, { articleNumber: "asc" }],
    include: {
      manufacturer: true,
      toolType: true,
      location: true,
      machine: true,
    },
  });
}

export function findMachineById(id: string) {
  return prisma.machine.findUnique({ where: { id } });
}

export function findToolForMachineLink(id: string) {
  return prisma.tool.findUnique({
    where: { id },
    include: toolInclude,
  });
}

export function linkToolQuantityToMachine(args: {
  machineId: string;
  quantity: number;
  sourceToolId: string;
  userId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const source = await transaction.tool.findUnique({
      where: { id: args.sourceToolId },
    });
    const machine = await transaction.machine.findUnique({
      where: { id: args.machineId },
    });

    if (
      !source ||
      !machine ||
      source.isArchived ||
      source.machineId === args.machineId ||
      source.quantity === null ||
      source.quantity < args.quantity
    ) {
      return null;
    }

    const nextSourceQuantity = source.quantity - args.quantity;
    const machineTool = await upsertMachineTool(transaction, {
      machineId: args.machineId,
      machineName: machine.name,
      quantity: args.quantity,
      source,
    });
    const sourceTool = await transaction.tool.update({
      where: { id: source.id },
      data: { quantity: nextSourceQuantity },
      include: toolInclude,
    });

    await transaction.toolHistory.createMany({
      data: [
        {
          toolId: source.id,
          action: "MOVE_TO_MACHINE",
          fieldName: "quantity",
          oldValue: String(source.quantity),
          newValue: String(nextSourceQuantity),
          changedByUserId: args.userId,
        },
        {
          toolId: machineTool.id,
          action: "RECEIVE_FROM_INVENTORY",
          fieldName: "quantity",
          oldValue: String((machineTool.quantity ?? 0) - args.quantity),
          newValue: String(machineTool.quantity ?? 0),
          changedByUserId: args.userId,
        },
      ],
    });

    return { machineTool, sourceTool };
  });
}

export function deleteMachine(id: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.tool.updateMany({
      where: { machineId: id },
      data: { machineId: null },
    });

    return transaction.machine.delete({
      where: { id },
    });
  });
}

async function upsertMachineTool(
  transaction: Prisma.TransactionClient,
  args: {
    machineId: string;
    machineName: string;
    quantity: number;
    source: Tool;
  },
) {
  const existing = await transaction.tool.findFirst({
    where: {
      articleNumber: args.source.articleNumber,
      isArchived: false,
      machineId: args.machineId,
      manufacturerId: args.source.manufacturerId,
      productName: args.source.productName,
      toolTypeId: args.source.toolTypeId,
    },
  });

  if (existing) {
    return transaction.tool.update({
      where: { id: existing.id },
      data: { quantity: (existing.quantity ?? 0) + args.quantity },
      include: toolInclude,
    });
  }

  // Machine rows copy the product identity but keep their own machine quantity.
  return transaction.tool.create({
    data: {
      alternativeArticleNumber: args.source.alternativeArticleNumber,
      articleNumber: args.source.articleNumber,
      countRaw: args.source.countRaw,
      cuttingLength: args.source.cuttingLength,
      cuttingSize: args.source.cuttingSize,
      diameter: args.source.diameter,
      grade: args.source.grade,
      holder: args.source.holder,
      holderSecondary: args.source.holderSecondary,
      isArchived: false,
      machineId: args.machineId,
      machineRaw: args.machineName,
      manufacturerId: args.source.manufacturerId,
      mounting: args.source.mounting,
      notes: args.source.notes,
      overhang: args.source.overhang,
      priceRaw: args.source.priceRaw,
      productName: args.source.productName,
      quantity: args.quantity,
      rawData: {
        source: "machine-link",
        sourceToolId: args.source.id,
      },
      status: ToolStatus.AVAILABLE,
      toolTypeId: args.source.toolTypeId,
      totalPriceRaw: args.source.totalPriceRaw,
    },
    include: toolInclude,
  });
}

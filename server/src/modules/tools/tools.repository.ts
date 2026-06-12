import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toolInclude, type ToolHistoryEntry } from "./tools.types";

export function findTools(args: {
  where: Prisma.ToolWhereInput;
  orderBy: Prisma.ToolOrderByWithRelationInput[];
  skip: number;
  take: number;
}) {
  return prisma.$transaction([
    prisma.tool.count({ where: args.where }),
    prisma.tool.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      include: toolInclude,
    }),
  ]);
}

export function findToolById(id: string) {
  return prisma.tool.findUnique({
    where: { id },
    include: toolInclude,
  });
}

export function findLocationById(id: string) {
  return prisma.location.findUnique({ where: { id } });
}

export function findMachineById(id: string) {
  return prisma.machine.findUnique({ where: { id } });
}

export function findManufacturerByName(name: string) {
  return prisma.manufacturer.findUnique({ where: { name } });
}

export function findToolTypeByName(name: string) {
  return prisma.toolType.findUnique({ where: { name } });
}

export function findOrCreatePlacementLocation(
  data: Prisma.LocationCreateInput,
) {
  return prisma.location.findFirst({
    where: {
      rawLabel: data.rawLabel,
      shelf: data.shelf,
      compartment: data.compartment,
    },
  }).then((existing) => existing ?? prisma.location.create({ data }));
}

export function createToolWithHistory(
  data: Prisma.ToolUncheckedCreateInput,
  changedByUserId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const tool = await transaction.tool.create({
      data,
      include: toolInclude,
    });

    await transaction.toolHistory.create({
      data: {
        toolId: tool.id,
        action: "CREATE",
        changedByUserId,
      },
    });

    return tool;
  });
}

export function updateToolWithHistory(args: {
  id: string;
  data: Prisma.ToolUncheckedUpdateInput;
  historyEntries: ToolHistoryEntry[];
  changedByUserId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const tool = await transaction.tool.update({
      where: { id: args.id },
      data: args.data,
      include: toolInclude,
    });

    if (args.historyEntries.length > 0) {
      await transaction.toolHistory.createMany({
        data: args.historyEntries.map((entry) => ({
          toolId: args.id,
          action: entry.action,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          changedByUserId: args.changedByUserId,
        })),
      });
    }

    return tool;
  });
}

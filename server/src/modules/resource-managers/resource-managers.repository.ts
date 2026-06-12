import type { ResourceType } from "@prisma/client";
import { prisma } from "../../db/prisma";

export async function findResourceManagers(resourceType: ResourceType, resourceId: string) {
  return prisma.resourceManager.findMany({
    where: { resourceType, resourceId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, profile: { select: { profilePictureUrl: true } } } },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "asc" },
  });
}

export async function findResourceManagerById(id: string) {
  return prisma.resourceManager.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function findManagedResourcesByUserId(userId: string) {
  return prisma.resourceManager.findMany({
    where: { userId },
    orderBy: { assignedAt: "asc" },
  });
}

export async function isResourceManager(userId: string, resourceType: ResourceType, resourceId: string): Promise<boolean> {
  const row = await prisma.resourceManager.findUnique({
    where: { userId_resourceType_resourceId: { userId, resourceType, resourceId } },
    select: { id: true },
  });
  return row !== null;
}

export async function createResourceManagerAssignment(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  assignedById: string | null
) {
  return prisma.resourceManager.create({
    data: { userId, resourceType, resourceId, assignedById },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
}

export async function deleteResourceManagerAssignment(id: string) {
  return prisma.resourceManager.delete({ where: { id } });
}

export async function deleteAllResourceManagers(resourceType: ResourceType, resourceId: string) {
  return prisma.resourceManager.deleteMany({ where: { resourceType, resourceId } });
}

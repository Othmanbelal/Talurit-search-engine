import { UserRole } from "@prisma/client";
import type { ResourceType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { AssignResourceManagerInput } from "./resource-managers.schemas";
import {
  createResourceManagerAssignment,
  deleteAllResourceManagers,
  deleteResourceManagerAssignment,
  findManagedResourcesByUserId,
  findResourceManagerById,
  findResourceManagers,
  isResourceManager,
} from "./resource-managers.repository";

export async function listResourceManagers(resourceType: ResourceType, resourceId: string) {
  return findResourceManagers(resourceType, resourceId);
}

export async function listMyManagedResources(userId: string) {
  return findManagedResourcesByUserId(userId);
}

export async function assignResourceManager(
  input: AssignResourceManagerInput,
  assignerId: string,
  assignerRole: UserRole
) {
  if (assignerRole !== UserRole.admin && assignerRole !== UserRole.manager) {
    throw new AppError("Only admins and managers can assign resource managers.", 403);
  }

  const resourceType = input.resourceType as ResourceType;

  if (assignerRole === UserRole.manager) {
    const canAssign = await isResourceManager(assignerId, resourceType, input.resourceId);
    if (!canAssign) {
      throw new AppError("You can only assign managers for resources you yourself manage.", 403);
    }
  }

  await validateResourceExists(resourceType, input.resourceId);

  const user = await prisma.user.findUnique({
    where: { id: input.userId, isActive: true },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found or inactive.", 404);

  try {
    return await createResourceManagerAssignment(input.userId, resourceType, input.resourceId, assignerId);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("This user is already a manager of this resource.", 409);
    }
    throw error;
  }
}

export async function unassignResourceManager(assignmentId: string, removerId: string, removerRole: UserRole) {
  const assignment = await findResourceManagerById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);

  if (removerRole !== UserRole.admin) {
    const canRemove = await isResourceManager(removerId, assignment.resourceType, assignment.resourceId);
    if (!canRemove) throw new AppError("You can only remove managers for resources you yourself manage.", 403);
  }

  await deleteResourceManagerAssignment(assignmentId);
}

export async function cleanupResourceManagers(resourceType: ResourceType, resourceId: string) {
  await deleteAllResourceManagers(resourceType, resourceId);
}

async function validateResourceExists(resourceType: ResourceType, resourceId: string) {
  if (resourceType === "inventory_table") {
    const row = await prisma.inventoryTable.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Inventory table not found.", 404);
  } else if (resourceType === "inventory_group") {
    const row = await prisma.inventoryGroup.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Inventory group not found.", 404);
  } else if (resourceType === "warehouse") {
    const row = await prisma.warehouseLayout.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Warehouse not found.", 404);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

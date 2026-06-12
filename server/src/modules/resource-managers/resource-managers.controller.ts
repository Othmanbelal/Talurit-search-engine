import type { Request, Response } from "express";
import type { ResourceType } from "@prisma/client";
import { ListResourceManagersQuerySchema, AssignResourceManagerSchema } from "./resource-managers.schemas";
import {
  assignResourceManager,
  listMyManagedResources,
  listResourceManagers,
  unassignResourceManager,
} from "./resource-managers.service";
import { findManagedResourcesByUserId } from "./resource-managers.repository";

export async function listResourceManagersController(req: Request, res: Response) {
  const query = ListResourceManagersQuerySchema.parse(req.query);
  let data;
  if (query.userId) {
    data = await findManagedResourcesByUserId(query.userId);
  } else {
    data = await listResourceManagers(query.resourceType! as ResourceType, query.resourceId!);
  }
  res.json({ success: true, data });
}

export async function listMyManagedResourcesController(req: Request, res: Response) {
  const data = await listMyManagedResources(req.user!.id);
  res.json({ success: true, data });
}

export async function assignResourceManagerController(req: Request, res: Response) {
  const input = AssignResourceManagerSchema.parse(req.body);
  const assignment = await assignResourceManager(input, req.user!.id, req.user!.role);
  res.status(201).json({ success: true, data: assignment });
}

export async function unassignResourceManagerController(req: Request, res: Response) {
  await unassignResourceManager(req.params.id, req.user!.id, req.user!.role);
  res.status(204).send();
}

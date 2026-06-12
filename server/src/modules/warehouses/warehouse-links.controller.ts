import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  groupLinkParamSchema,
  idParamSchema,
  linkGroupSchema,
  linkTableSchema,
  tableLinkParamSchema,
} from "./warehouse.schemas";
import {
  addGroupLink,
  addTableLink,
  getAvailableInventory,
  getInventoryLinks,
  removeGroupLink,
  removeTableLink,
} from "./warehouse-links.service";

export async function getInventoryLinksController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const links = await getInventoryLinks(id);
  return response.json(successResponse(links));
}

export async function getAvailableInventoryController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const available = await getAvailableInventory(id);
  return response.json(successResponse(available));
}

export async function addGroupLinkController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const { groupId } = linkGroupSchema.parse(request.body);
  const link = await addGroupLink(id, groupId);
  return response.status(201).json(successResponse({ link }));
}

export async function removeGroupLinkController(request: Request, response: Response) {
  const { id, groupId } = groupLinkParamSchema.parse(request.params);
  await removeGroupLink(id, groupId);
  return response.json(successResponse({ removed: true }));
}

export async function addTableLinkController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const { tableId } = linkTableSchema.parse(request.body);
  const link = await addTableLink(id, tableId);
  return response.status(201).json(successResponse({ link }));
}

export async function removeTableLinkController(request: Request, response: Response) {
  const { id, tableId } = tableLinkParamSchema.parse(request.params);
  await removeTableLink(id, tableId);
  return response.json(successResponse({ removed: true }));
}

import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  createLocationSchema,
  linkToolToMachineSchema,
  createManufacturerSchema,
  createNamedMetadataSchema,
  metadataIdParamSchema,
} from "./metadata.schemas";
import {
  addLocation,
  addMachine,
  addManufacturer,
  addToolType,
  getLocations,
  getMachineTools,
  getMachines,
  getManufacturers,
  getToolTypes,
  linkToolToMachine,
  removeMachine,
} from "./metadata.service";

export async function listToolTypesController(_request: Request, response: Response) {
  return response.json(successResponse({ toolTypes: await getToolTypes() }));
}

export async function createToolTypeController(request: Request, response: Response) {
  const toolType = await addToolType(createNamedMetadataSchema.parse(request.body));
  return response.status(201).json(successResponse({ toolType }));
}

export async function listManufacturersController(_request: Request, response: Response) {
  return response.json(successResponse({ manufacturers: await getManufacturers() }));
}

export async function createManufacturerController(request: Request, response: Response) {
  const manufacturer = await addManufacturer(createManufacturerSchema.parse(request.body));
  return response.status(201).json(successResponse({ manufacturer }));
}

export async function listLocationsController(_request: Request, response: Response) {
  return response.json(successResponse({ locations: await getLocations() }));
}

export async function createLocationController(request: Request, response: Response) {
  const location = await addLocation(createLocationSchema.parse(request.body));
  return response.status(201).json(successResponse({ location }));
}

export async function listMachinesController(_request: Request, response: Response) {
  return response.json(successResponse({ machines: await getMachines() }));
}

export async function createMachineController(request: Request, response: Response) {
  const machine = await addMachine(createNamedMetadataSchema.parse(request.body));
  return response.status(201).json(successResponse({ machine }));
}

export async function listMachineToolsController(request: Request, response: Response) {
  const { id } = metadataIdParamSchema.parse(request.params);
  const result = await getMachineTools(id);
  return response.json(successResponse(result));
}

export async function linkToolToMachineController(request: Request, response: Response) {
  const { id } = metadataIdParamSchema.parse(request.params);
  const input = linkToolToMachineSchema.parse(request.body);
  const result = await linkToolToMachine(id, input, request.user!.id);
  return response.status(201).json(successResponse(result));
}

export async function deleteMachineController(request: Request, response: Response) {
  const { id } = metadataIdParamSchema.parse(request.params);
  const machine = await removeMachine(id);
  return response.json(successResponse({ machine }));
}

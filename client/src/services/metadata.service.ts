import type { ToolMetadata } from "../types/metadata";
import type { Location, Machine, MetadataItem } from "../types/tools";
import { apiRequest } from "./http";

export async function getToolMetadataRequest(): Promise<ToolMetadata> {
  const [toolTypes, manufacturers, locations, machines] = await Promise.all([
    apiRequest<{ toolTypes: MetadataItem[] }>("/api/tool-types"),
    apiRequest<{ manufacturers: MetadataItem[] }>("/api/manufacturers"),
    apiRequest<{ locations: Location[] }>("/api/locations"),
    apiRequest<{ machines: Machine[] }>("/api/machines"),
  ]);

  return {
    toolTypes: toolTypes.toolTypes,
    manufacturers: manufacturers.manufacturers,
    locations: locations.locations,
    machines: machines.machines,
  };
}

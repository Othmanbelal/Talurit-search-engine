import type { Location, Machine, MetadataItem } from "./tools";

export type ToolMetadata = {
  toolTypes: MetadataItem[];
  manufacturers: MetadataItem[];
  locations: Location[];
  machines: Machine[];
};

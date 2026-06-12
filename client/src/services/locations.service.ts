import type { Location } from "../types/tools";
import { apiRequest } from "./http";

export function listLocationsRequest() {
  return apiRequest<{ locations: Location[] }>("/api/locations");
}

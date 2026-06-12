import type {
  MachineInventoryTool,
  MachineProductSummary,
  MachineRecord,
} from "../types/machines";
import type { Tool } from "../types/tools";
import { apiRequest } from "./http";

export function listMachinesRequest() {
  return apiRequest<{ machines: MachineRecord[] }>("/api/machines");
}

export function listMachineToolsRequest(machineId: string) {
  return apiRequest<{
    tools: MachineInventoryTool[];
    summary: MachineProductSummary[];
  }>(`/api/machines/${machineId}/tools`);
}

export function createMachineRequest(input: { name: string; description?: string }) {
  return apiRequest<{ machine: MachineRecord }>("/api/machines", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteMachineRequest(machineId: string) {
  return apiRequest<{ machine: MachineRecord }>(`/api/machines/${machineId}`, {
    method: "DELETE",
  });
}

export function linkToolToMachineRequest(
  machineId: string,
  payload: { quantity: number; toolId: string },
) {
  return apiRequest<{ machineTool: Tool; sourceTool: Tool }>(
    `/api/machines/${machineId}/tools/link`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

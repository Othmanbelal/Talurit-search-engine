import { useCallback, useEffect, useMemo, useState } from "react";
import {
  linkToolToMachineRequest,
  listMachinesRequest,
  listMachineToolsRequest,
} from "../services/machines.service";
import { updateToolPlacementRequest } from "../services/tools.service";
import type { MachineInventoryTool } from "../types/machines";
import type { Machine, Tool, ToolPlacementPayload } from "../types/tools";

export function useMachineSlots(machineId?: string) {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [tools, setTools] = useState<MachineInventoryTool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!machineId) return;
    const selectedMachineId = machineId;

    async function loadMachineSlots() {
      setIsLoading(true);

      try {
        const [machineResult, toolResult] = await Promise.all([
          listMachinesRequest(),
          listMachineToolsRequest(selectedMachineId),
        ]);
        if (isMounted) {
          setMachine(machineResult.machines.find((item) => item.id === selectedMachineId) ?? null);
          setTools(toolResult.tools);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Machine inventory unavailable");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMachineSlots();

    return () => {
      isMounted = false;
    };
  }, [machineId, refreshIndex]);

  const linkTool = useCallback(async (toolId: string, quantity: number) => {
    if (!machineId) throw new Error("Machine is missing");
    const result = await linkToolToMachineRequest(machineId, { quantity, toolId });
    setRefreshIndex((value) => value + 1);
    return result.machineTool;
  }, [machineId]);

  const moveTool = useCallback(async (tool: Tool, payload: ToolPlacementPayload) => {
    const result = await updateToolPlacementRequest(tool.id, payload);
    setRefreshIndex((value) => value + 1);
    return result.tool;
  }, []);

  return useMemo(
    () => ({
      error,
      isLoading,
      linkTool,
      machine,
      moveTool,
      tools,
    }),
    [
      error,
      isLoading,
      linkTool,
      machine,
      moveTool,
      tools,
    ],
  );
}

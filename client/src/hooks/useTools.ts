import { useCallback, useEffect, useState } from "react";
import {
  archiveToolRequest,
  createToolRequest,
  deleteToolRequest,
  listToolsRequest,
  restoreToolRequest,
  updateToolRequest,
  updateToolPlacementRequest,
} from "../services/tools.service";
import { linkToolToMachineRequest } from "../services/machines.service";
import type {
  Tool,
  ToolFilters,
  ToolListResponse,
  ToolPayload,
  ToolPlacementPayload,
} from "../types/tools";

export function useTools(filters: ToolFilters) {
  const [data, setData] = useState<ToolListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listToolsRequest(filters)
      .then((result) => {
        if (isMounted) {
          setData(result);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Tools unavailable");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filters, refreshIndex]);

  const createTool = useCallback(
    async (payload: ToolPayload) => {
      const result = await createToolRequest(payload);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  const updateTool = useCallback(
    async (tool: Tool, payload: Partial<ToolPayload>) => {
      const result = await updateToolRequest(tool.id, payload);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  const updatePlacement = useCallback(
    async (tool: Tool, payload: ToolPlacementPayload) => {
      const result = await updateToolPlacementRequest(tool.id, payload);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  const linkToMachine = useCallback(
    async (tool: Tool, machineId: string, quantity: number) => {
      const result = await linkToolToMachineRequest(machineId, {
        quantity,
        toolId: tool.id,
      });
      refresh();
      return result.sourceTool;
    },
    [refresh],
  );

  const archiveTool = useCallback(
    async (tool: Tool) => {
      const result = await archiveToolRequest(tool.id);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  const restoreTool = useCallback(
    async (tool: Tool) => {
      const result = await restoreToolRequest(tool.id);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  const deleteTool = useCallback(
    async (tool: Tool) => {
      const result = await deleteToolRequest(tool.id);
      refresh();
      return result.tool;
    },
    [refresh],
  );

  return {
    archiveTool,
    createTool,
    data,
    deleteTool,
    error,
    isLoading,
    linkToMachine,
    refresh,
    restoreTool,
    updateTool,
    updatePlacement,
  };
}

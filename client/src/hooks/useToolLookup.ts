import { useEffect, useState } from "react";
import { listToolsRequest } from "../services/tools.service";
import type { Tool, ToolFilters } from "../types/tools";

const lookupFilters: ToolFilters = {
  archived: "false",
  locationId: "",
  machineId: "",
  manufacturerId: "",
  page: 1,
  pageSize: 20,
  placement: "all",
  q: "",
  sortBy: "productName",
  sortDirection: "asc",
  status: "",
  toolTypeId: "",
};

export function useToolLookup(query: string) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    let isMounted = true;
    const timeout = window.setTimeout(() => {
      setIsLoading(true);

      listToolsRequest({ ...lookupFilters, q: query.trim() })
        .then((result) => {
          if (isMounted) {
            setTools(result.items);
            setError(null);
          }
        })
        .catch((requestError) => {
          if (isMounted) {
            setError(requestError instanceof Error ? requestError.message : "Tool lookup failed");
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return { error, isLoading, tools };
}

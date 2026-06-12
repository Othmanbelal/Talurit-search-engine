import { useEffect, useState } from "react";
import { getToolMetadataRequest } from "../services/metadata.service";
import type { ToolMetadata } from "../types/metadata";

export function useToolMetadata() {
  const [data, setData] = useState<ToolMetadata>({
    toolTypes: [],
    manufacturers: [],
    locations: [],
    machines: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getToolMetadataRequest()
      .then((metadata) => {
        if (isMounted) setData(metadata);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading };
}

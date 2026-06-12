import { useCallback, useEffect, useMemo, useState } from "react";
import { listLocationsRequest } from "../services/locations.service";
import type { Location } from "../types/tools";

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);

  useEffect(() => {
    let isMounted = true;

    listLocationsRequest()
      .then((result) => {
        if (isMounted) {
          setLocations(result.locations);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Locations unavailable");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  return useMemo(
    () => ({ error, isLoading, locations, refresh }),
    [error, isLoading, locations, refresh],
  );
}

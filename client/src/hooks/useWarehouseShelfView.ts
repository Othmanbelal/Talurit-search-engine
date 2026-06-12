import { useCallback, useEffect, useState } from "react";
import { getShelfViewRequest } from "../services/warehouse.service";
import type { ShelfView } from "../types/warehouse";

export function useWarehouseShelfView(warehouseId: string) {
  const [data, setData] = useState<ShelfView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getShelfViewRequest(warehouseId);
      setData(result);
    } catch {
      setError("Failed to load shelf view.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { void load(); }, [load]);

  return { data, isLoading, error, reload: load };
}

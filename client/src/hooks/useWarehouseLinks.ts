import { useCallback, useEffect, useState } from "react";
import type { AvailableInventory, WarehouseInventoryLinks } from "../types/warehouse";
import {
  addGroupLinkRequest,
  addTableLinkRequest,
  getAvailableInventoryRequest,
  getWarehouseLinksRequest,
  removeGroupLinkRequest,
  removeTableLinkRequest,
} from "../services/warehouse.service";

const emptyLinks: WarehouseInventoryLinks = { groupLinks: [], tableLinks: [] };
const emptyAvailable: AvailableInventory = { groups: [], tables: [] };

export function useWarehouseLinks(warehouseId: string) {
  const [links, setLinks] = useState<WarehouseInventoryLinks>(emptyLinks);
  const [available, setAvailable] = useState<AvailableInventory>(emptyAvailable);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [linksResult, availableResult] = await Promise.all([
        getWarehouseLinksRequest(warehouseId),
        getAvailableInventoryRequest(warehouseId),
      ]);
      setLinks(linksResult);
      setAvailable(availableResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory links.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addGroupLink(groupId: string) {
    await addGroupLinkRequest(warehouseId, groupId);
    await load();
  }

  async function removeGroupLink(groupId: string) {
    await removeGroupLinkRequest(warehouseId, groupId);
    await load();
  }

  async function addTableLink(tableId: string) {
    await addTableLinkRequest(warehouseId, tableId);
    await load();
  }

  async function removeTableLink(tableId: string) {
    await removeTableLinkRequest(warehouseId, tableId);
    await load();
  }

  return { links, available, isLoading, error, load, addGroupLink, removeGroupLink, addTableLink, removeTableLink };
}

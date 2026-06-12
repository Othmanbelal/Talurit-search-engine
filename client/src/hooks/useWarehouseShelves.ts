import { useCallback, useEffect, useState } from "react";
import {
  createWarehouseShelfRequest,
  createWarehouseSlotRequest,
  deleteWarehouseShelfRequest,
  deleteWarehouseSlotRequest,
  generateWarehouseShelvesRequest,
  listWarehouseShelvesRequest,
  updateWarehouseShelfRequest,
  updateWarehouseSlotRequest,
} from "../services/warehouse.service";
import type {
  CreateWarehouseShelfInput,
  CreateWarehouseSlotInput,
  GenerateWarehouseShelvesInput,
  UpdateWarehouseShelfInput,
  UpdateWarehouseSlotInput,
  WarehouseShelf,
} from "../types/warehouse";

export function useWarehouseShelves(warehouseId?: string) {
  const [shelves, setShelves] = useState<WarehouseShelf[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setIsLoading(true);
    try {
      const data = await listWarehouseShelvesRequest(warehouseId);
      setShelves(data.shelves);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load warehouse shelves.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(async (input: GenerateWarehouseShelvesInput) => {
    if (!warehouseId) return;
    try {
      const data = await generateWarehouseShelvesRequest(warehouseId, input);
      setShelves(data.shelves);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not generate warehouse shelves."));
    }
  }, [warehouseId]);

  const createShelf = useCallback(async (input: CreateWarehouseShelfInput) => {
    if (!warehouseId) return;
    try {
      const data = await createWarehouseShelfRequest(warehouseId, input);
      setShelves((current) => upsertShelf(current, data.shelf));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not create warehouse shelf."));
    }
  }, [warehouseId]);

  const updateShelf = useCallback(async (shelfId: string, input: UpdateWarehouseShelfInput) => {
    if (!warehouseId) return;
    try {
      const data = await updateWarehouseShelfRequest(warehouseId, shelfId, input);
      setShelves((current) => upsertShelf(current, data.shelf));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not update warehouse shelf."));
    }
  }, [warehouseId]);

  const deleteShelf = useCallback(async (shelfId: string) => {
    if (!warehouseId) return;
    try {
      await deleteWarehouseShelfRequest(warehouseId, shelfId);
      setShelves((current) => current.filter((shelf) => shelf.id !== shelfId));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not delete warehouse shelf."));
    }
  }, [warehouseId]);

  const createSlot = useCallback(async (shelfId: string, input: CreateWarehouseSlotInput) => {
    if (!warehouseId) return;
    try {
      const data = await createWarehouseSlotRequest(warehouseId, shelfId, input);
      setShelves(data.shelves);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not create warehouse slot."));
    }
  }, [warehouseId]);

  const updateSlot = useCallback(async (slotId: string, input: UpdateWarehouseSlotInput) => {
    if (!warehouseId) return;
    try {
      const data = await updateWarehouseSlotRequest(warehouseId, slotId, input);
      setShelves((current) => upsertShelf(current, data.shelf));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not update warehouse slot."));
    }
  }, [warehouseId]);

  const deleteSlot = useCallback(async (slotId: string) => {
    if (!warehouseId) return;
    try {
      await deleteWarehouseSlotRequest(warehouseId, slotId);
      setShelves((current) => current.map((shelf) => ({ ...shelf, slots: shelf.slots.filter((slot) => slot.id !== slotId) })));
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Could not delete warehouse slot."));
    }
  }, [warehouseId]);

  return { createShelf, createSlot, deleteShelf, deleteSlot, error, generate, isLoading, load, shelves, updateShelf, updateSlot };
}

function upsertShelf(shelves: WarehouseShelf[], shelf: WarehouseShelf) {
  const next = shelves.filter((item) => item.id !== shelf.id);
  return [...next, shelf].sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

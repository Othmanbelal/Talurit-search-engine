import { useCallback, useEffect, useState } from "react";
import {
  generateRackSlotsFromSceneObjectRequest,
  generateShelvesFromSceneObjectRequest,
  listWarehouseSceneObjectsRequest,
  saveRackSlotLayoutFromSceneObjectRequest,
} from "../services/warehouse.service";
import type {
  GenerateRackSlotsFromSceneObjectInput,
  GenerateShelvesFromSceneObjectInput,
  SaveRackSlotLayoutFromSceneObjectInput,
  WarehouseSceneObject,
  WarehouseShelf,
} from "../types/warehouse";

export function useWarehouseSceneObjects(warehouseId?: string) {
  const [sceneObjects, setSceneObjects] = useState<WarehouseSceneObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setIsLoading(true);
    try {
      const data = await listWarehouseSceneObjectsRequest(warehouseId);
      setSceneObjects(data.sceneObjects);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load 3D shelf objects.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateFromObject = useCallback(async (input: GenerateShelvesFromSceneObjectInput) => {
    if (!warehouseId) return null;
    try {
      const data = await generateShelvesFromSceneObjectRequest(warehouseId, input);
      await load();
      setError(null);
      return data.shelves;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate shelves from the 3D object.");
      return null;
    }
  }, [load, warehouseId]);

  const generateRackSlots = useCallback(async (input: GenerateRackSlotsFromSceneObjectInput) => {
    if (!warehouseId) return null;
    try {
      const data = await generateRackSlotsFromSceneObjectRequest(warehouseId, input);
      await load();
      setError(null);
      return data.shelves;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate rack slots from the 3D object.");
      return null;
    }
  }, [load, warehouseId]);

  const saveRackSlotLayout = useCallback(async (input: SaveRackSlotLayoutFromSceneObjectInput) => {
    if (!warehouseId) return null;
    try {
      const data = await saveRackSlotLayoutFromSceneObjectRequest(warehouseId, input);
      await load();
      setError(null);
      return data.shelves;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the rack slot layout.");
      return null;
    }
  }, [load, warehouseId]);

  return { error, generateFromObject, generateRackSlots, isLoading, load, saveRackSlotLayout, sceneObjects };
}

export type SceneObjectGenerationResult = WarehouseShelf[] | null;

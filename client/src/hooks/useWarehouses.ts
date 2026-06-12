import { useCallback, useEffect, useState } from "react";
import {
  archiveWarehouseRequest,
  createWarehouseRequest,
  deleteWarehouseRequest,
  getWarehouseRequest,
  listWarehousesRequest,
  saveWarehouseLayoutRequest,
  updateWarehouseRequest,
} from "../services/warehouse.service";
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  WarehouseArchiveMode,
  WarehouseLayout,
  WarehouseSummary,
} from "../types/warehouse";

export function useWarehouses() {
  const [archiveMode, setArchiveMode] = useState<WarehouseArchiveMode>("active");
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback((mode = archiveMode) => {
    setArchiveMode(mode);
    setIsLoading(true);
    listWarehousesRequest(mode)
      .then((result) => {
        setWarehouses(result.warehouses);
        setError(null);
      })
      .catch((requestError) => setError(errorMessage(requestError, "Warehouses unavailable")))
      .finally(() => setIsLoading(false));
  }, [archiveMode]);

  useEffect(() => load(), [load]);

  async function create(input: CreateWarehouseInput) {
    await createWarehouseRequest(input);
    load("active");
  }

  async function archive(id: string) {
    await archiveWarehouseRequest(id);
    load(archiveMode);
  }

  async function restore(id: string) {
    await updateWarehouseRequest(id, { isArchived: false });
    load(archiveMode);
  }

  async function remove(id: string) {
    await deleteWarehouseRequest(id);
    load(archiveMode);
  }

  return { archive, archiveMode, create, error, isLoading, load, remove, restore, warehouses };
}

export function useWarehouse(id?: string) {
  const [warehouse, setWarehouse] = useState<WarehouseLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    getWarehouseRequest(id)
      .then((result) => {
        setWarehouse(result.warehouse);
        setError(null);
      })
      .catch((requestError) => setError(errorMessage(requestError, "Warehouse unavailable")))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => load(), [load]);

  async function update(input: UpdateWarehouseInput) {
    if (!id) return;
    const result = await updateWarehouseRequest(id, input);
    setWarehouse(result.warehouse);
  }

  async function saveLayout(layoutData: Record<string, unknown>) {
    if (!id) return;
    const result = await saveWarehouseLayoutRequest(id, { layoutData });
    setWarehouse(result.warehouse);
  }

  async function archive() {
    if (!id) return;
    const result = await archiveWarehouseRequest(id);
    setWarehouse(result.warehouse);
  }

  async function restore() {
    await update({ isArchived: false });
  }

  async function remove() {
    if (!id) return;
    await deleteWarehouseRequest(id);
  }

  return { archive, error, isLoading, load, remove, restore, saveLayout, update, warehouse };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

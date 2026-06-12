import { useCallback, useEffect, useState } from "react";
import {
  addStructuredStockRowRequest,
  createStructuredInventoryGroupRequest,
  createStructuredInventoryTableRequest,
  deleteStructuredInventoryGroupRequest,
  deleteStructuredInventoryTableRequest,
  deleteStructuredStockRowRequest,
  getStructuredInventoryGroupRequest,
  getStructuredInventoryTableRequest,
  listStructuredInventoriesRequest,
  listStructuredInventoryRowsRequest,
  archiveStructuredStockRowRequest,
  restoreStructuredStockRowRequest,
  takeStructuredStockRowRequest,
  updateStructuredInventoryColumnsRequest,
  updateStructuredStockRowRequest,
  useStructuredStockRowInCardRequest,
} from "../services/structured-inventory.service";
import type {
  AddStockRowInput,
  ColumnSettingsInput,
  CreateInventoryGroupInput,
  CreateInventoryTableInput,
  StructuredInventoryGroup,
  StructuredInventoryOverview,
  StructuredInventoryTable,
  StructuredStockRowsResponse,
  StructuredTableFilters,
  StockMovementInput,
  UpdateStockRowInput,
  UseInCardInput,
} from "../types/structured-inventory";

export function useStructuredInventoryOverview() {
  const [overview, setOverview] = useState<StructuredInventoryOverview>({ groups: [], ungroupedTables: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(() => {
    setIsLoading(true);
    listStructuredInventoriesRequest()
      .then((result) => {
        setOverview(result.inventories);
        setError(null);
      })
      .catch((requestError) => setError(getErrorMessage(requestError, "Structured inventories unavailable")))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => loadOverview(), [loadOverview]);

  async function createGroup(input: CreateInventoryGroupInput) {
    await createStructuredInventoryGroupRequest(input);
    await loadOverview();
  }

  async function createTable(input: CreateInventoryTableInput) {
    await createStructuredInventoryTableRequest(input);
    await loadOverview();
  }

  async function deleteGroup(id: string) {
    await deleteStructuredInventoryGroupRequest(id);
    await loadOverview();
  }

  async function deleteTable(id: string) {
    await deleteStructuredInventoryTableRequest(id);
    await loadOverview();
  }

  return { createGroup, createTable, deleteGroup, deleteTable, error, isLoading, overview, reload: loadOverview };
}

export function useStructuredInventoryGroup(id?: string) {
  const [group, setGroup] = useState<StructuredInventoryGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGroup = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    getStructuredInventoryGroupRequest(id)
      .then((result) => {
        setGroup(result.group);
        setError(null);
      })
      .catch((requestError) => setError(getErrorMessage(requestError, "Inventory group unavailable")))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => loadGroup(), [loadGroup]);

  async function createTable(input: CreateInventoryTableInput) {
    await createStructuredInventoryTableRequest({ ...input, groupId: id ?? input.groupId });
    await loadGroup();
  }

  async function deleteTable(tableId: string) {
    await deleteStructuredInventoryTableRequest(tableId);
    await loadGroup();
  }

  return { createTable, deleteTable, error, group, isLoading, reload: loadGroup };
}

export function useStructuredInventoryTable(id?: string) {
  const [table, setTable] = useState<StructuredInventoryTable | null>(null);
  const [rows, setRows] = useState<StructuredStockRowsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSearch, setLastSearch] = useState("");
  const [archived, setArchived] = useState<"active" | "archived" | "all">("active");
  const [filters, setFilters] = useState<StructuredTableFilters>({});
  const [page, setPage] = useState(1);

  const loadRows = useCallback((search = lastSearch, archiveMode = archived, nextFilters = filters, nextPage = page): Promise<void> => {
    if (!id) return Promise.resolve();
    setLastSearch(search);
    setArchived(archiveMode);
    setFilters(nextFilters);
    setPage(nextPage);
    setIsLoading(true);
    return Promise.all([getStructuredInventoryTableRequest(id), listStructuredInventoryRowsRequest(id, nextPage, 50, search, archiveMode, nextFilters)])
      .then(([tableResult, rowsResult]) => {
        setTable(tableResult.table);
        setRows(rowsResult);
        setError(null);
      })
      .catch((requestError) => setError(getErrorMessage(requestError, "Inventory table unavailable")))
      .finally(() => setIsLoading(false));
  }, [archived, filters, id, lastSearch, page]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  async function addRow(input: AddStockRowInput) {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await addStructuredStockRowRequest(id, input);
      setRows(result);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not add item"));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateColumns(input: ColumnSettingsInput) {
    if (!id) return;
    const result = await updateStructuredInventoryColumnsRequest(id, input);
    setTable(result.table);
  }

  async function updateRow(rowId: string, input: UpdateStockRowInput) {
    if (!id) return;
    await updateStructuredStockRowRequest(id, rowId, input);
    loadRows();
  }

  async function archiveRow(rowId: string) {
    if (!id) return;
    await archiveStructuredStockRowRequest(id, rowId);
    loadRows();
  }

  async function restoreRow(rowId: string) {
    if (!id) return;
    await restoreStructuredStockRowRequest(id, rowId);
    loadRows();
  }

  async function deleteRow(rowId: string) {
    if (!id) return;
    await deleteStructuredStockRowRequest(id, rowId);
    loadRows();
  }

  async function takeRow(rowId: string, input: StockMovementInput) {
    if (!id) return;
    await takeStructuredStockRowRequest(id, rowId, input);
    await loadRows();
  }

  async function useRowInCard(rowId: string, input: UseInCardInput) {
    if (!id) return;
    await useStructuredStockRowInCardRequest(id, rowId, input);
    await loadRows();
  }

  async function deleteTable() {
    if (!id) return;
    await deleteStructuredInventoryTableRequest(id);
  }

  return { addRow, archiveRow, archived, deleteRow, deleteTable, error, filters, isLoading, loadRows, restoreRow, rows, table, takeRow, updateColumns, updateRow, useRowInCard };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

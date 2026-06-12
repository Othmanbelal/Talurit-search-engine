import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMachineRequest,
  deleteMachineRequest,
  listMachinesRequest,
} from "../services/machines.service";
import type { MachineWithSlotCount } from "../types/machines";

export function useMachines() {
  const [machines, setMachines] = useState<MachineWithSlotCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function loadMachines() {
      setIsLoading(true);

      try {
        const result = await listMachinesRequest();
        const withCounts = result.machines.map((machine) => ({
          ...machine,
          inventoryCount: machine._count?.tools ?? 0,
        }));
        if (isMounted) {
          setMachines(withCounts);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "Machines unavailable");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMachines();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  const createMachine = useCallback(
    async (input: { name: string; description?: string }) => {
      const result = await createMachineRequest(input);
      refresh();
      return result.machine;
    },
    [refresh],
  );

  const deleteMachine = useCallback(
    async (machineId: string) => {
      const result = await deleteMachineRequest(machineId);
      refresh();
      return result.machine;
    },
    [refresh],
  );

  return useMemo(
    () => ({ createMachine, deleteMachine, error, isLoading, machines }),
    [createMachine, deleteMachine, error, isLoading, machines],
  );
}

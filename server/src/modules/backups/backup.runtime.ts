import { AppError } from "../../utils/AppError";

type ActiveOperation = {
  kind: "backup" | "restore";
  startedAt: Date;
};

let activeOperation: ActiveOperation | null = null;
let databaseMaintenance = false;

export function getActiveBackupOperation() {
  return activeOperation;
}

export function isDatabaseMaintenanceActive() {
  return databaseMaintenance;
}

export async function runExclusiveBackupOperation<T>(
  kind: ActiveOperation["kind"],
  operation: () => Promise<T>,
) {
  if (activeOperation) {
    throw new AppError(`A ${activeOperation.kind} operation is already running.`, 409);
  }

  activeOperation = { kind, startedAt: new Date() };
  databaseMaintenance = true;

  try {
    return await operation();
  } finally {
    databaseMaintenance = false;
    activeOperation = null;
  }
}

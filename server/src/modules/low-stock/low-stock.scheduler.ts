import { sweepLowStock } from "./low-stock.service";

// Reconciliation cadence. The sweep only notifies rows not yet notified, so it is
// idempotent and safe to run a few times a day (also lets SMTP recovery retry).
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

let scheduler: NodeJS.Timeout | null = null;

export function startLowStockScheduler() {
  if (scheduler) return;
  // First pass shortly after boot, then on the interval.
  setTimeout(() => void runSweep(), 20_000).unref();
  scheduler = setInterval(() => void runSweep(), SWEEP_INTERVAL_MS);
  scheduler.unref();
}

async function runSweep() {
  try {
    await sweepLowStock();
  } catch (error) {
    console.error("[low-stock] sweep failed:", error instanceof Error ? error.message : error);
  }
}

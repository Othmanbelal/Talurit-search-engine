import type { Unit } from "../types";

export function metersToUnit(value: number, unit: Unit) {
  if (unit === "mm") return value * 1000;
  if (unit === "cm") return value * 100;
  return value;
}

export function unitToMeters(value: number, unit: Unit) {
  if (!Number.isFinite(value)) return 0;
  if (unit === "mm") return value / 1000;
  if (unit === "cm") return value / 100;
  return value;
}

export function formatLength(value: number, unit: Unit, precision = 2) {
  const converted = metersToUnit(value, unit);
  const digits = unit === "m" ? precision : 0;
  return `${converted.toFixed(digits)} ${unit}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundToGrid(value: number, gridSize: number) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

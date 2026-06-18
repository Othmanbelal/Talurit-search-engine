import { Color3, LinesMesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import type { Room } from "../types";
import { WD_TOKENS } from "../theme/designTokens";
import { worldXFromPlan, worldZFromPlan } from "./babylonCore";

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** One LineSystem mesh for the entire faint blueprint grid (single draw call). */
export function createBlueprintGrid(scene: Scene, room: Room, bounds: Bounds): LinesMesh {
  const lines: Vector3[][] = [];
  const y = 0.02;
  for (let x = Math.floor(bounds.minX); x <= bounds.maxX + 0.001; x += 1) {
    lines.push([
      new Vector3(worldXFromPlan(x, room), y, worldZFromPlan(bounds.minY, room)),
      new Vector3(worldXFromPlan(x, room), y, worldZFromPlan(bounds.maxY, room)),
    ]);
  }
  for (let z = Math.floor(bounds.minY); z <= bounds.maxY + 0.001; z += 1) {
    lines.push([
      new Vector3(worldXFromPlan(bounds.minX, room), y, worldZFromPlan(z, room)),
      new Vector3(worldXFromPlan(bounds.maxX, room), y, worldZFromPlan(z, room)),
    ]);
  }
  const grid = MeshBuilder.CreateLineSystem("wd-grid", { lines }, scene);
  grid.color = Color3.FromHexString(WD_TOKENS.grid);
  grid.alpha = 0.7;
  grid.isPickable = false;
  grid.freezeWorldMatrix();
  return grid;
}

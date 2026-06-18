import type { AbstractMesh, Scene, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import {
  createColumnMesh,
  createEuroPalletDetailMesh,
  createNoGoZoneMesh,
  createOpeningMesh,
  createStairMesh,
} from "./objectMeshes";
import { createRackMesh } from "./rackMeshes";

export type CachedNode = { node: TransformNode; hash: string };

// Serialise all fields that affect the rendered mesh so we can skip unchanged objects.
export function objectHash(obj: SceneObject, room: Room): string {
  return [
    obj.position.x, obj.position.y,
    obj.rotation, obj.width, obj.depth, obj.height,
    obj.elevation ?? 0, obj.color ?? "",
    obj.type, room.width, room.depth,
    JSON.stringify(obj.rack ?? null),
    JSON.stringify(obj.stair ?? null),
    JSON.stringify(obj.opening ?? null),
  ].join("|");
}

export function createObjectNode(scene: Scene, room: Room, obj: SceneObject): TransformNode {
  if (obj.type === "column") return createColumnMesh(scene, room, obj);
  if (obj.type === "door" || obj.type === "window") return createOpeningMesh(scene, room, obj);
  if (obj.type === "no-go-zone") return createNoGoZoneMesh(scene, room, obj);
  if (obj.type === "euro-pallet") return createEuroPalletDetailMesh(scene, room, obj);
  if (obj.type === "stair") return createStairMesh(scene, room, obj);
  return createRackMesh(scene, room, obj);
}

export function disposeObjectNode(node: TransformNode): void {
  node.getChildMeshes(false).forEach((m: AbstractMesh) => m.dispose(false, false));
  // Materials are shared scene-lifetime; pass false to avoid destroying the palette.
  (node as unknown as { dispose(a: boolean, b: boolean): void }).dispose(false, false);
}

export function clearObjectCache(cache: Map<string, CachedNode>): void {
  for (const { node } of cache.values()) disposeObjectNode(node);
  cache.clear();
}

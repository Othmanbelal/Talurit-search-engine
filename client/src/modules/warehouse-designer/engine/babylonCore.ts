import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { flatMaterial } from "./materialPalette";

export function hexToColor3(hex: string) {
  return Color3.FromHexString(hex || "#cbd5e1");
}

/** Shared flat material (metallic/roughness args ignored; kept for signature compatibility). */
export function makeMaterial(scene: Scene, name: string, color: string, _metallic = 0.05, _roughness = 0.65) {
  return flatMaterial(scene, name.replace(/[^a-z0-9]/gi, ""), color || "#cbd5e1");
}

export function makeTransparentMaterial(scene: Scene, name: string, color: string, alpha: number) {
  return flatMaterial(scene, `t-${name.replace(/[^a-z0-9]/gi, "")}`, color || "#cbd5e1", alpha);
}

export function setObjectMetadata(mesh: Mesh, object: SceneObject) {
  mesh.metadata = { objectId: object.id };
}

export function worldXFromPlan(x: number, room: Room) {
  return room.width > 0 ? x - room.width / 2 : x;
}

export function worldZFromPlan(y: number, room: Room) {
  return room.depth > 0 ? y - room.depth / 2 : y;
}

export function worldX(object: SceneObject, room: Room) {
  return worldXFromPlan(object.position.x, room);
}

export function worldZ(object: SceneObject, room: Room) {
  return worldZFromPlan(object.position.y, room);
}

export function objectElevation(object: SceneObject) {
  return object.elevation ?? 0;
}

export function createBoxPart(
  scene: Scene,
  parent: TransformNode,
  object: SceneObject,
  name: string,
  size: { width: number; depth: number; height: number },
  local: { x: number; y: number; z: number },
  material: StandardMaterial
) {
  const mesh = MeshBuilder.CreateBox(name, { width: size.width, depth: size.depth, height: size.height }, scene);
  mesh.parent = parent;
  mesh.position = new Vector3(local.x, local.y, local.z);
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}

export const CONTENT_ROOT_NAME = "__warehouseContent";

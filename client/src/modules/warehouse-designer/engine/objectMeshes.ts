import { MeshBuilder, Scene, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import type { AisleGuide } from "../utils/warehouse";
import { polygonBounds, polygonCenter } from "../utils/geometry";
import { objectElevation, setObjectMetadata, worldX, worldXFromPlan, worldZ, worldZFromPlan } from "./babylonCore";
import { flatMaterial, getPalette } from "./materialPalette";
import { finalizeMergedObject } from "./meshMerge";

export function createColumnMesh(scene: Scene, room: Room, object: SceneObject) {
  const material = getPalette(scene).structure;
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height: object.height }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + object.height / 2, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}

export function createWallSegmentMesh(scene: Scene, room: Room, object: SceneObject) {
  const material = flatMaterial(scene, "wallseg", object.color);
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height: object.height }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + object.height / 2, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}

export function createOpeningMesh(scene: Scene, room: Room, object: SceneObject) {
  const isWindow = object.type === "window";
  const material = flatMaterial(scene, isWindow ? "window" : "door", object.color, isWindow ? 0.38 : 0.28);
  const sill = object.opening?.sillHeight ?? 0;
  const height = Math.max(object.height, 0.05);
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + sill + height / 2, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);

  if (object.type === "door" && object.opening?.swingDirection !== "sliding") {
    const swing = MeshBuilder.CreateBox(`${object.id}-swing-line`, { width: object.width, depth: 0.025, height: 0.025 }, scene);
    swing.position.set(worldX(object, room) + Math.cos(object.rotation + Math.PI / 4) * object.width * 0.35, objectElevation(object) + 0.08, worldZ(object, room) + Math.sin(object.rotation + Math.PI / 4) * object.width * 0.35);
    swing.rotation.y = -object.rotation - Math.PI / 4;
    swing.material = material;
    setObjectMetadata(swing, object);
  }

  return mesh;
}

export function createNoGoZoneMesh(scene: Scene, room: Room, object: SceneObject) {
  const material = flatMaterial(scene, "nogo", object.color, 0.38);
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height: 0.05 }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + 0.04, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}

export function createAisleGuideMesh(scene: Scene, room: Room, guide: AisleGuide) {
  const bounds = polygonBounds(guide.points);
  const center = polygonCenter(guide.points);
  const material = flatMaterial(scene, "aisle", guide.ok ? "#8fae93" : "#c19a86", 0.3);
  const mesh = MeshBuilder.CreateBox(guide.id, { width: Math.max(0.02, bounds.maxX - bounds.minX), depth: Math.max(0.02, bounds.maxY - bounds.minY), height: 0.018 }, scene);
  mesh.position.set(worldXFromPlan(center.x, room), 0.055, worldZFromPlan(center.y, room));
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}


function addPalletPart(parent: TransformNode, scene: Scene, object: SceneObject, name: string, size: { width: number; depth: number; height: number }, position: { x: number; y: number; z: number }, material: ReturnType<typeof flatMaterial>) {
  const mesh = MeshBuilder.CreateBox(`${object.id}-${name}`, size, scene);
  mesh.parent = parent;
  mesh.position.set(position.x, position.y, position.z);
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}

export function createEuroPalletDetailMesh(scene: Scene, room: Room, object: SceneObject) {
  const topWood = flatMaterial(scene, "pallet-top", object.color || "#c9955c");
  const sideWood = flatMaterial(scene, "pallet-side", "#b77d46");
  const darkWood = flatMaterial(scene, "pallet-dark", "#8f5f35");
  const root = new TransformNode(`${object.id}__build`, scene);

  const width = object.width;
  const depth = object.depth;
  const height = object.height;
  const boardH = Math.min(0.022, height * 0.18);
  const bearerH = Math.min(0.022, height * 0.16);
  const bottomH = Math.min(0.022, height * 0.16);
  const blockH = Math.max(0.045, height - boardH - bearerH - bottomH);
  const topY = height / 2 - boardH / 2;
  const bearerY = topY - boardH / 2 - bearerH / 2;
  const bottomY = -height / 2 + bottomH / 2;
  const blockY = bottomY + bottomH / 2 + blockH / 2;
  const boardScale = Math.min(width / 0.8, 1.35);
  const boardWidths = [0.145, 0.1, 0.145, 0.1, 0.145].map((value) => value * boardScale);
  const gap = Math.max(0.018, (width - boardWidths.reduce((sum, value) => sum + value, 0)) / 4);
  let cursor = -width / 2;

  boardWidths.forEach((boardWidth, index) => {
    const x = cursor + boardWidth / 2;
    cursor += boardWidth + gap;
    addPalletPart(root, scene, object, `top-board-${index}`, { width: boardWidth, depth: depth * 0.98, height: boardH }, { x, y: topY, z: 0 }, topWood);
  });

  [-0.4, 0, 0.4].forEach((zRatio, index) => {
    addPalletPart(root, scene, object, `cross-bearer-${index}`, { width: width * 0.94, depth: 0.105, height: bearerH }, { x: 0, y: bearerY, z: zRatio * depth }, sideWood);
  });

  [-0.36, 0, 0.36].forEach((xRatio, index) => {
    addPalletPart(root, scene, object, `bottom-runner-${index}`, { width: 0.105, depth: depth * 0.96, height: bottomH }, { x: xRatio * width, y: bottomY, z: 0 }, sideWood);
  });

  [-0.36, 0, 0.36].forEach((xRatio) => {
    [-0.4, 0, 0.4].forEach((zRatio) => {
      addPalletPart(root, scene, object, `block-${xRatio}-${zRatio}`, { width: 0.105, depth: 0.145, height: blockH }, { x: xRatio * width, y: blockY, z: zRatio * depth }, darkWood);
    });
  });

  return finalizeMergedObject(scene, root, object.id, {
    x: worldX(object, room), y: objectElevation(object) + object.height / 2, z: worldZ(object, room), rotationY: -object.rotation,
  });
}

export function createEuroPalletMesh(scene: Scene, room: Room, object: SceneObject) {
  const material = flatMaterial(scene, "pallet-top", object.color || "#c9955c");
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height: object.height }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + object.height / 2, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}


export function createStairMesh(scene: Scene, room: Room, object: SceneObject) {
  const stepMaterial = flatMaterial(scene, "stair", object.color || "#d6a94a");
  const root = new TransformNode(`${object.id}__build`, scene);
  const count = Math.max(3, object.stair?.stepCount ?? Math.ceil(object.height / 0.18));
  const run = Math.max(0.12, object.depth / count);
  const rise = Math.max(0.04, object.height / count);

  for (let i = 0; i < count; i++) {
    const tread = MeshBuilder.CreateBox(`${object.id}-step-${i}`, { width: object.width, depth: run, height: rise }, scene);
    tread.parent = root;
    tread.position.set(0, rise * (i + 0.5), -object.depth / 2 + run * (i + 0.5));
    tread.material = stepMaterial;
    setObjectMetadata(tread, object);
  }

  return finalizeMergedObject(scene, root, object.id, {
    x: worldX(object, room), y: objectElevation(object), z: worldZ(object, room), rotationY: -object.rotation,
  });
}

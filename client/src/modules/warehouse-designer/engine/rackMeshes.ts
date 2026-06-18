import { MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { createBoxPart, objectElevation, setObjectMetadata, worldX, worldZ } from "./babylonCore";
import { flatMaterial, getPalette } from "./materialPalette";
import { finalizeMergedObject } from "./meshMerge";

export function createRackMesh(scene: Scene, room: Room, object: SceneObject) {
  const rack = object.rack;
  const palette = getPalette(scene);
  const root = new TransformNode(`${object.id}__build`, scene); // built at origin

  const isLightShelf = object.type === "storage-shelf";
  const upright = palette.structure;
  // Beam keeps the object's accent color (status/inventory color-coding) but via shared cache.
  const beamMaterial = object.color ? flatMaterial(scene, "beam", object.color) : palette.structureAlt;
  const shelfMaterial = palette.shelf;
  const braceMaterial = palette.structureAlt;
  const footMaterial = palette.structure;

  const t = rack?.uprightThickness ?? (isLightShelf ? 0.035 : 0.06);
  const beam = rack?.beamThickness ?? 0.06;
  const boardH = rack?.shelfBoardThickness ?? 0.04;
  const levels = Math.max(2, rack?.levels ?? 4);
  const halfW = object.width / 2 - t / 2;
  const halfD = object.depth / 2 - t / 2;

  [
    { x: -halfW, z: -halfD }, { x: halfW, z: -halfD },
    { x: -halfW, z: halfD }, { x: halfW, z: halfD },
  ].forEach((position, index) => {
    createBoxPart(scene, root, object, `${object.id}-upright-${index}`, { width: t, depth: t, height: object.height }, { x: position.x, y: object.height / 2, z: position.z }, upright);
    createBoxPart(scene, root, object, `${object.id}-foot-${index}`, { width: t * 3.2, depth: t * 3.2, height: 0.025 }, { x: position.x, y: 0.0125, z: position.z }, footMaterial);
  });

  for (let level = 0; level < levels; level += 1) {
    const y = ((level + 1) / levels) * object.height;
    createShelfDeck(scene, root, object, level, y, boardH, shelfMaterial);
    createBoxPart(scene, root, object, `${object.id}-beam-front-${level}`, { width: object.width, depth: beam, height: beam * 1.45 }, { x: 0, y: y - boardH / 2, z: object.depth / 2 - beam / 2 }, beamMaterial);
    createBoxPart(scene, root, object, `${object.id}-beam-back-${level}`, { width: object.width, depth: beam, height: beam * 1.45 }, { x: 0, y: y - boardH / 2, z: -object.depth / 2 + beam / 2 }, beamMaterial);
  }

  if (!isLightShelf) {
    addSideBracing(scene, root, object, -halfW, t, braceMaterial);
    addSideBracing(scene, root, object, halfW, t, braceMaterial);
  }

  return finalizeMergedObject(scene, root, object.id, {
    x: worldX(object, room), y: objectElevation(object), z: worldZ(object, room), rotationY: -object.rotation,
  });
}

function createShelfDeck(
  scene: Scene,
  parent: TransformNode,
  object: SceneObject,
  level: number,
  y: number,
  boardHeight: number,
  material: StandardMaterial,
) {
  const deckCount = 1;
  const deckWidth = object.width / deckCount;
  for (let deck = 0; deck < deckCount; deck += 1) {
    createBoxPart(scene, parent, object, `${object.id}-deck-${level}-${deck}`, {
      width: deckWidth - 0.018,
      depth: object.depth * 0.9,
      height: boardHeight,
    }, {
      x: -object.width / 2 + deckWidth * (deck + 0.5),
      y,
      z: 0,
    }, material);
  }
}

function addSideBracing(
  scene: Scene,
  parent: TransformNode,
  object: SceneObject,
  x: number,
  thickness: number,
  material: StandardMaterial,
) {
  const sections = Math.max(2, Math.min(3, Math.round(object.height / 1.8)));
  const sectionHeight = object.height / sections;
  for (let index = 0; index < sections; index += 1) {
    const fromZ = index % 2 === 0 ? -object.depth / 2 : object.depth / 2;
    const toZ = -fromZ;
    const dy = sectionHeight;
    const dz = toZ - fromZ;
    const length = Math.hypot(dy, dz);
    const brace = MeshBuilder.CreateBox(`${object.id}-brace-${x}-${index}`, {
      width: thickness * 0.7,
      height: length,
      depth: thickness * 0.55,
    }, scene);
    brace.parent = parent;
    brace.position.set(x, sectionHeight * (index + 0.5), 0);
    brace.rotation.x = Math.atan2(dz, dy);
    brace.material = material;
    setObjectMetadata(brace, object);
  }
}

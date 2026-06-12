import { Scene, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { createBoxPart, makeMaterial, objectElevation, worldX, worldZ } from "./babylonCore";

export function createRackMesh(scene: Scene, room: Room, object: SceneObject) {
  const rack = object.rack;
  const parent = new TransformNode(object.id, scene);
  parent.position.set(worldX(object, room), objectElevation(object), worldZ(object, room));
  parent.rotation.y = -object.rotation;
  parent.metadata = { objectId: object.id };

  const metal = makeMaterial(scene, `${object.id}-metal`, object.color, 0.18, 0.48);
  const board = makeMaterial(scene, `${object.id}-board`, "#cbd5e1", 0.02, 0.72);

  const t = rack?.uprightThickness ?? 0.06;
  const beam = rack?.beamThickness ?? 0.06;
  const boardH = rack?.shelfBoardThickness ?? 0.04;
  const levels = rack?.levels ?? 4;
  const halfW = object.width / 2 - t / 2;
  const halfD = object.depth / 2 - t / 2;

  [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: -halfW, z: halfD },
    { x: halfW, z: halfD }
  ].forEach((pos, index) => {
    createBoxPart(scene, parent, object, `${object.id}-upright-${index}`, { width: t, depth: t, height: object.height }, { x: pos.x, y: object.height / 2, z: pos.z }, metal);
  });

  for (let i = 0; i < levels; i++) {
    const y = ((i + 1) / levels) * object.height;
    createBoxPart(scene, parent, object, `${object.id}-board-${i}`, { width: object.width, depth: object.depth, height: boardH }, { x: 0, y, z: 0 }, board);
    createBoxPart(scene, parent, object, `${object.id}-beam-front-${i}`, { width: object.width, depth: beam, height: beam }, { x: 0, y: y - boardH / 2, z: object.depth / 2 - beam / 2 }, metal);
    createBoxPart(scene, parent, object, `${object.id}-beam-back-${i}`, { width: object.width, depth: beam, height: beam }, { x: 0, y: y - boardH / 2, z: -object.depth / 2 + beam / 2 }, metal);
  }


  return parent;
}

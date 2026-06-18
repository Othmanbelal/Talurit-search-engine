import { MeshBuilder, PBRMaterial, Scene, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { createBoxPart, makeMaterial, objectElevation, setObjectMetadata, worldX, worldZ } from "./babylonCore";

export function createRackMesh(scene: Scene, room: Room, object: SceneObject) {
  const rack = object.rack;
  const parent = new TransformNode(object.id, scene);
  parent.position.set(worldX(object, room), objectElevation(object), worldZ(object, room));
  parent.rotation.y = -object.rotation;
  parent.metadata = { objectId: object.id };

  const isLightShelf = object.type === "storage-shelf";
  const uprightColor = isLightShelf ? "#536875" : "#334b5b";
  const beamColor = object.color || (isLightShelf ? "#5f8ea2" : "#e1a522");
  const upright = makeMaterial(scene, `${object.id}-uprights`, uprightColor, 0.62, 0.32);
  const beamMaterial = makeMaterial(scene, `${object.id}-beams`, beamColor, 0.42, 0.38);
  const shelfMaterial = makeMaterial(scene, `${object.id}-shelves`, "#aeb9bd", 0.48, 0.46);
  const braceMaterial = makeMaterial(scene, `${object.id}-braces`, "#6f8088", 0.58, 0.38);
  const footMaterial = makeMaterial(scene, `${object.id}-feet`, "#202b31", 0.64, 0.34);

  const t = rack?.uprightThickness ?? (isLightShelf ? 0.035 : 0.06);
  const beam = rack?.beamThickness ?? 0.06;
  const boardH = rack?.shelfBoardThickness ?? 0.04;
  const levels = Math.max(2, rack?.levels ?? 4);
  const halfW = object.width / 2 - t / 2;
  const halfD = object.depth / 2 - t / 2;

  [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: -halfW, z: halfD },
    { x: halfW, z: halfD },
  ].forEach((position, index) => {
    createBoxPart(scene, parent, object, `${object.id}-upright-${index}`, {
      width: t,
      depth: t,
      height: object.height,
    }, {
      x: position.x,
      y: object.height / 2,
      z: position.z,
    }, upright);
    createBoxPart(scene, parent, object, `${object.id}-foot-${index}`, {
      width: t * 3.2,
      depth: t * 3.2,
      height: 0.025,
    }, {
      x: position.x,
      y: 0.0125,
      z: position.z,
    }, footMaterial);
  });

  for (let level = 0; level < levels; level += 1) {
    const y = ((level + 1) / levels) * object.height;
    createShelfDeck(scene, parent, object, level, y, boardH, shelfMaterial);
    createBoxPart(scene, parent, object, `${object.id}-beam-front-${level}`, {
      width: object.width,
      depth: beam,
      height: beam * 1.45,
    }, {
      x: 0,
      y: y - boardH / 2,
      z: object.depth / 2 - beam / 2,
    }, beamMaterial);
    createBoxPart(scene, parent, object, `${object.id}-beam-back-${level}`, {
      width: object.width,
      depth: beam,
      height: beam * 1.45,
    }, {
      x: 0,
      y: y - boardH / 2,
      z: -object.depth / 2 + beam / 2,
    }, beamMaterial);
  }

  if (!isLightShelf) {
    addSideBracing(scene, parent, object, -halfW, t, braceMaterial);
    addSideBracing(scene, parent, object, halfW, t, braceMaterial);
  }
  return parent;
}

function createShelfDeck(
  scene: Scene,
  parent: TransformNode,
  object: SceneObject,
  level: number,
  y: number,
  boardHeight: number,
  material: PBRMaterial,
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
  material: PBRMaterial,
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

import {
  Color3,
  DynamicTexture,
  HighlightLayer,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { SceneObject } from "../types";

const LEFT_COLOR = "#f0a500"; // accent — slot 1 side
const RIGHT_COLOR = "#38bdf8"; // cool — last slot side

export function createRackHighlight(scene: Scene): HighlightLayer {
  const layer = new HighlightLayer("rack-highlight", scene);
  layer.innerGlow = false;
  layer.outerGlow = true;
  return layer;
}

/**
 * Premium orientation markers for a hovered/selected rack: a glowing accent bar
 * down each end plus floating "1" (left / slot 1) and "N" (right / last) labels.
 * Returns a node the caller disposes when the hover clears.
 */
export function buildOrientationMarkers(scene: Scene, object: SceneObject, meshes: Mesh[]): TransformNode | null {
  if (meshes.length === 0) return null;
  const root = new TransformNode(`__markers_${object.id}`, scene);

  const center = meshes
    .reduce((sum, mesh) => sum.add(mesh.getBoundingInfo().boundingBox.centerWorld), Vector3.Zero())
    .scale(1 / meshes.length);

  const rotY = -object.rotation;
  const right = new Vector3(Math.cos(rotY), 0, Math.sin(rotY));
  const halfWidth = object.width / 2;
  const height = object.height;

  const leftPos = center.add(right.scale(-halfWidth));
  const rightPos = center.add(right.scale(halfWidth));

  addBar(scene, root, `${object.id}-bar-L`, leftPos, center.y, height, rotY, LEFT_COLOR);
  addBar(scene, root, `${object.id}-bar-R`, rightPos, center.y, height, rotY, RIGHT_COLOR);
  addLabel(scene, root, `${object.id}-lbl-L`, leftPos, center.y + height / 2 + 0.25, "1", LEFT_COLOR);
  addLabel(scene, root, `${object.id}-lbl-R`, rightPos, center.y + height / 2 + 0.25, "N", RIGHT_COLOR);

  return root;
}

function addBar(scene: Scene, parent: TransformNode, name: string, pos: Vector3, centerY: number, height: number, rotY: number, color: string) {
  const bar = MeshBuilder.CreateBox(name, { width: 0.06, depth: 0.06, height: height * 1.02 }, scene);
  bar.parent = parent;
  bar.position.set(pos.x, centerY, pos.z);
  bar.rotation.y = rotY;
  bar.isPickable = false;
  const material = new StandardMaterial(`${name}-mat`, scene);
  const c = Color3.FromHexString(color);
  material.diffuseColor = c;
  material.emissiveColor = c;
  material.disableLighting = true;
  bar.material = material;
}

function addLabel(scene: Scene, parent: TransformNode, name: string, pos: Vector3, y: number, text: string, color: string) {
  const size = 128;
  const texture = new DynamicTexture(`${name}-tex`, size, scene, true);
  texture.hasAlpha = true;
  texture.drawText(text, null, 96, "bold 96px sans-serif", color, "transparent", true);

  const plane = MeshBuilder.CreatePlane(name, { size: 0.4 }, scene);
  plane.parent = parent;
  plane.position.set(pos.x, y, pos.z);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  const material = new StandardMaterial(`${name}-mat`, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = Color3.White();
  material.disableLighting = true;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  plane.material = material;
}

import { Mesh, Scene, TransformNode } from "@babylonjs/core";

export type WorldTransform = { x: number; y: number; z: number; rotationY: number };

/**
 * Merge children of `root` (built at origin, local coords) into one (multi-material)
 * mesh, then place it at `world`. Preserves picking (metadata.objectId) and the
 * exact transform semantics the old parent TransformNode used.
 */
export function finalizeMergedObject(
  scene: Scene,
  root: TransformNode,
  objectId: string,
  world: WorldTransform,
): TransformNode {
  const children = root.getChildMeshes(false).filter((m): m is Mesh => m instanceof Mesh);
  // dispose=true (sources), allow32=true, meshSubclass=undefined,
  // subdivideWithSubMeshes=false, multiMultiMaterials=true (keep distinct materials).
  const merged = children.length ? Mesh.MergeMeshes(children, true, true, undefined, false, true) : null;
  root.dispose();
  if (!merged) {
    const empty = new TransformNode(objectId, scene);
    empty.position.set(world.x, world.y, world.z);
    empty.metadata = { objectId };
    return empty;
  }
  merged.name = objectId;
  merged.position.set(world.x, world.y, world.z);
  merged.rotation.y = world.rotationY;
  merged.metadata = { objectId };
  merged.isPickable = true;
  merged.freezeWorldMatrix();
  return merged as unknown as TransformNode;
}

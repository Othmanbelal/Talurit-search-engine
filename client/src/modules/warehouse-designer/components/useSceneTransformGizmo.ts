import { ArcRotateCamera, GizmoManager, Mesh, Node, Scene, Vector3 } from "@babylonjs/core";
import { useEffect, useRef } from "react";
import type { Room, SceneObject } from "../types";

type Args = {
  canvas: HTMLCanvasElement | null;
  camera: ArcRotateCamera | null;
  objects: SceneObject[];
  room: Room;
  scene: Scene | null;
  selectedId: string | null;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
};

function planXFromWorld(x: number, room: Room) {
  return room.width > 0 ? x + room.width / 2 : x;
}

function planYFromWorld(z: number, room: Room) {
  return room.depth > 0 ? z + room.depth / 2 : z;
}

function elevationFromNode(object: SceneObject, y: number) {
  if (object.type === "pallet-rack" || object.type === "storage-shelf") return y;
  if (object.type === "no-go-zone") return Math.max(0, y - 0.04);
  return Math.max(0, y - object.height / 2);
}

type PositionNode = Node & { position: Vector3 };

function findNode(scene: Scene, objectId: string): PositionNode | null {
  const transform = scene.getTransformNodeByName(objectId);
  if (transform) return transform as PositionNode;
  const exactMesh = scene.getMeshByName(objectId);
  if (exactMesh) return exactMesh as PositionNode;
  return (scene.meshes.find((mesh) => mesh.metadata?.objectId === objectId) as PositionNode | undefined) ?? null;
}

export function useSceneTransformGizmo({ canvas, camera, objects, room, scene, selectedId, updateObject }: Args) {
  const managerRef = useRef<GizmoManager | null>(null);
  const dragNodeRef = useRef<PositionNode | null>(null);
  const selected = objects.find((object) => object.id === selectedId) ?? null;

  useEffect(() => {
    if (!scene) return undefined;
    const manager = new GizmoManager(scene);
    manager.positionGizmoEnabled = true;
    manager.rotationGizmoEnabled = false;
    manager.scaleGizmoEnabled = false;
    manager.boundingBoxGizmoEnabled = false;
    manager.usePointerToAttachGizmos = false;
    manager.gizmos.positionGizmo?.onDragStartObservable.add(() => {
      if (canvas && camera) camera.detachControl();
    });
    manager.gizmos.positionGizmo?.onDragEndObservable.add(() => {
      const node = dragNodeRef.current;
      const object = objects.find((item) => item.id === selectedId);
      if (!node || !object || object.locked) return;
      updateObject(object.id, {
        position: { x: planXFromWorld(node.position.x, room), y: planYFromWorld(node.position.z, room) },
        elevation: elevationFromNode(object, node.position.y)
      });
      if (canvas && camera) camera.attachControl();
    });
    managerRef.current = manager;
    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [camera, canvas, objects, room, scene, selectedId, updateObject]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!scene || !manager || !selected || selected.locked) {
      manager?.attachToNode(null);
      dragNodeRef.current = null;
      return;
    }
    const node = findNode(scene, selected.id);
    manager.attachToNode(node);
    dragNodeRef.current = node;
  }, [scene, selected, objects]);
}

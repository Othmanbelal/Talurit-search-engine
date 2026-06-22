import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Mesh,
  PointerEventTypes,
  Scene,
  TransformNode,
  Vector3,
  Matrix,
} from "@babylonjs/core";
import { useStudioStore } from "../store/useStudioStore";
import {
  createAisleGuideMesh,
  createRoomMeshes
} from "../engine/babylonMeshes";
import {
  type CachedNode,
  createObjectNode,
  disposeObjectNode,
  objectHash,
} from "../engine/objectMeshCache";
import { aisleGuidesForRows } from "../utils/warehouse";
import { activeWarehouseBoundary, objectCorners, polygonBounds } from "../utils/geometry";
import { PlanMenus } from "./PlanMenus";
import type { ContextMenu } from "./planViewHelpers";
import { useSceneTransformGizmo } from "./useSceneTransformGizmo";
import { visibleObjects } from "../utils/levels";
import { resolveStairs } from "../utils/stairs";
import { createWarehouseEngine, applyObjectOutlines } from "../engine/engineSetup";
import { WD_TOKENS } from "../theme/designTokens";

function markSelected(mesh: Mesh) {
  const c = Color3.FromHexString(WD_TOKENS.selection);
  mesh.outlineColor = c;
  mesh.outlineWidth = 0.05;          // emphasised vs the 0.02 default outline
  mesh.renderOutline = true;
}

function clearSelectionStyling(mesh: Mesh) {
  const c = Color3.FromHexString(WD_TOKENS.outline);
  mesh.outlineColor = c;
  mesh.outlineWidth = 0.02;          // back to the default thin outline
}

function clearAllHighlights(scene: Scene) {
  scene.meshes.forEach((mesh) => {
    if (mesh.metadata?.objectId) clearSelectionStyling(mesh as Mesh);
  });
}

function highlightById(scene: Scene, objectId: string | null) {
  clearAllHighlights(scene);
  if (!objectId) return;
  scene.meshes.forEach((mesh) => {
    if (mesh.metadata?.objectId === objectId) markSelected(mesh as Mesh);
  });
}

type Scene3DProps = {
  onEditObject?: () => void;
};

export function Scene3D({ onEditObject }: Scene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<ReturnType<typeof createWarehouseEngine>["engine"] | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const hasFramedSceneRef = useRef(false);
  const lastFrameKeyRef = useRef("");

  const room = useStudioStore((state) => state.room);
  const objects = useStudioStore((state) => state.objects);
  const selectedId = useStudioStore((state) => state.selectedId);
  const settings = useStudioStore((state) => state.settings);
  const spaceNames = useStudioStore((state) => state.spaceNames);
  const selectObject = useStudioStore((state) => state.selectObject);
  const updateObject = useStudioStore((state) => state.updateObject);
  const objectsRef = useRef(objects);
  const roomRef = useRef(room);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    objectsRef.current = objects;
    roomRef.current = room;
    selectedIdRef.current = selectedId;
  }, [objects, room, selectedId]);

  // Incremental 3D scene management
  const objectCacheRef = useRef<Map<string, CachedNode>>(new Map());
  const roomContentRef = useRef<{ meshes: AbstractMesh[]; nodes: TransformNode[] }>({ meshes: [], nodes: [] });
  const prevSceneVersionRef = useRef(0);

  const displayObjects = useMemo(
    () => resolveStairs(visibleObjects(objects, settings), settings),
    [objects, settings]
  );

  const menuObject = menu?.kind === "object" ? objects.find((object) => object.id === menu.objectId) ?? null : null;
  const planPoints = [...activeWarehouseBoundary(room, displayObjects), ...displayObjects.flatMap((object) => objectCorners(object))];
  const sceneBounds = polygonBounds(planPoints);
  const sceneCenter = planPoints.length ? { x: (sceneBounds.minX + sceneBounds.maxX) / 2, y: (sceneBounds.minY + sceneBounds.maxY) / 2 } : { x: 0, y: 0 };
  const sceneSize = Math.max(room.height, sceneBounds.maxX - sceneBounds.minX, sceneBounds.maxY - sceneBounds.minY, 6);

  const screenPointForObject = (objectId: string) => {
    const scene = sceneRef.current;
    const engine = engineRef.current;
    const camera = cameraRef.current;
    const canvas = canvasRef.current;
    const object = objectsRef.current.find((item) => item.id === objectId);
    const roomState = roomRef.current;
    if (!scene || !engine || !camera || !canvas || !object) return null;
    const center = new Vector3(
      roomState.width > 0 ? object.position.x - roomState.width / 2 : object.position.x,
      Math.max(0.35, (object.elevation ?? 0) + object.height * 0.68),
      roomState.depth > 0 ? object.position.y - roomState.depth / 2 : object.position.y
    );
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const projected = Vector3.Project(center, Matrix.Identity(), scene.getTransformMatrix(), viewport);
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.left + projected.x, y: bounds.top + projected.y };
  };

  const applyCameraPreset = (preset: "iso" | "top" | "front" | "side" | "walk") => {
    const camera = cameraRef.current;
    if (!camera) return;
    const target = new Vector3(room.width > 0 ? sceneCenter.x - room.width / 2 : sceneCenter.x, room.height * 0.45, room.depth > 0 ? sceneCenter.y - room.depth / 2 : sceneCenter.y);
    camera.setTarget(target);
    const radius = sceneSize * (preset === "walk" ? 0.8 : 1.48);

    if (preset === "top") {
      camera.alpha = Math.PI / 2;
      camera.beta = 0.08;
      camera.radius = radius * 1.35;
    }
    if (preset === "front") {
      camera.alpha = Math.PI / 2;
      camera.beta = Math.PI / 2.15;
      camera.radius = radius;
    }
    if (preset === "side") {
      camera.alpha = 0;
      camera.beta = Math.PI / 2.15;
      camera.radius = radius;
    }
    if (preset === "walk") {
      camera.alpha = Math.PI / 2.5;
      camera.beta = Math.PI / 2.35;
      camera.radius = Math.max(3, radius * 0.55);
      camera.setTarget(new Vector3(target.x, 1.55, target.z));
    }
    if (preset === "iso") {
      camera.alpha = Math.PI / 4;
      camera.beta = Math.PI / 3.2;
      camera.radius = radius;
    }
  };

  const frameScene = (camera: ArcRotateCamera) => {
    const target = new Vector3(
      room.width > 0 ? sceneCenter.x - room.width / 2 : sceneCenter.x,
      Math.max(1, room.height * 0.28),
      room.depth > 0 ? sceneCenter.y - room.depth / 2 : sceneCenter.y,
    );
    camera.setTarget(target);
    camera.alpha = Math.PI / 4;
    camera.beta = Math.PI / 3.15;
    camera.radius = Math.max(8, sceneSize * 1.75);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { engine, scene, camera } = createWarehouseEngine(canvas);
    cameraRef.current = camera;
    hasFramedSceneRef.current = false;
    lastFrameKeyRef.current = "";

    scene.onPointerObservable.add((event) => {
      if (event.type !== PointerEventTypes.POINTERPICK) return;
      const picked = event.pickInfo?.pickedMesh;
      const objectId = picked?.metadata?.objectId;
      if (typeof objectId === "string") {
        selectObject(objectId);
        const point = screenPointForObject(objectId) ?? { x: event.event.clientX, y: event.event.clientY };
        setMenu({ kind: "object", objectId, x: point.x, y: point.y });
        return;
      }
      selectObject(null);
      setMenu(null);
    });

    const handleResize = () => engine.resize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", handleResize);

    sceneRef.current = scene;
    engineRef.current = engine;
    setSceneVersion((value) => value + 1);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [selectObject]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const engineRestarted = prevSceneVersionRef.current !== sceneVersion;

    if (engineRestarted) {
      // Scene was just created — old mesh refs are invalid. Do NOT call dispose on
      // stale nodes from the previous (already disposed) scene; just clear the refs.
      roomContentRef.current = { meshes: [], nodes: [] };
      objectCacheRef.current.clear();
      prevSceneVersionRef.current = sceneVersion;
    } else {
      // Dispose previous room geometry (walls, floor, grid, labels) only.
      // This is O(constant) — room mesh count doesn't grow with rack count.
      roomContentRef.current.meshes.forEach((m) => m.dispose(false, true));
      roomContentRef.current.nodes.forEach((n) => n.dispose());
    }

    // Snapshot scene node IDs before creating room content so we can identify
    // which meshes/nodes belong to the room (vs. cached object nodes already in scene).
    const beforeMeshIds = new Set(scene.meshes.map((m) => m.uniqueId));
    const beforeNodeIds = new Set(scene.transformNodes.map((n) => n.uniqueId));

    createRoomMeshes(scene, room, displayObjects, spaceNames, null);
    if (settings.showAisleGuides) {
      aisleGuidesForRows(displayObjects, settings).forEach((guide) => createAisleGuideMesh(scene, room, guide));
    }

    roomContentRef.current = {
      meshes: scene.meshes.filter((m) => !beforeMeshIds.has(m.uniqueId)),
      nodes: scene.transformNodes.filter((n) => !beforeNodeIds.has(n.uniqueId)),
    };

    // Incremental object diff — O(delta) instead of O(N) per change.
    // wall-segment geometry is handled by createRoomMeshes above.
    const storageObjects = displayObjects.filter((obj) => obj.type !== "wall-segment");
    const currentIds = new Set(storageObjects.map((o) => o.id));

    for (const [id, cached] of objectCacheRef.current) {
      if (!currentIds.has(id)) {
        disposeObjectNode(cached.node);
        objectCacheRef.current.delete(id);
      }
    }

    for (const obj of storageObjects) {
      const hash = objectHash(obj, room);
      const cached = objectCacheRef.current.get(obj.id);
      if (!cached || cached.hash !== hash) {
        if (cached) {
          disposeObjectNode(cached.node);
          objectCacheRef.current.delete(obj.id);
        }
        const node = createObjectNode(scene, room, obj);
        objectCacheRef.current.set(obj.id, { node, hash });
      }
    }
    applyObjectOutlines(scene);
    highlightById(scene, selectedIdRef.current ?? null);
    const frameKey = `${room.width}|${room.depth}|${room.height}|${sceneBounds.minX}|${sceneBounds.maxX}|${sceneBounds.minY}|${sceneBounds.maxY}`;
    if (!hasFramedSceneRef.current || lastFrameKeyRef.current !== frameKey) {
      frameScene(cameraRef.current!);
      hasFramedSceneRef.current = true;
      lastFrameKeyRef.current = frameKey;
    }
  }, [room, displayObjects, settings, spaceNames, sceneVersion]);

  // Highlight effect: toggles outline accent on the selected mesh without rebuilding the scene.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    highlightById(scene, selectedId ?? null);
  }, [selectedId, sceneVersion]);

  useEffect(() => {
    if (menu?.kind === "object" && !objects.some((object) => object.id === menu.objectId)) setMenu(null);
  }, [menu, objects]);

  useSceneTransformGizmo({
    canvas: canvasRef.current,
    camera: cameraRef.current,
    objects,
    room,
    scene: sceneRef.current,
    selectedId,
    updateObject
  });

  return (
    <div className="scene3d-wrapper">
      <canvas ref={canvasRef} className="scene-canvas" />
      <div className="camera-presets glass-panel" aria-label="Camera presets">
        <button onClick={() => applyCameraPreset("iso")}>Iso</button>
        <button onClick={() => applyCameraPreset("top")}>Top</button>
        <button onClick={() => applyCameraPreset("front")}>Front</button>
        <button onClick={() => applyCameraPreset("side")}>Side</button>
        <button onClick={() => applyCameraPreset("walk")}>Walk</button>
      </div>
      <PlanMenus
        menu={menu}
        menuObject={menuObject}
        hoveredObject={null}
        hoverCard={null}
        createFilter=""
        createCategory="All"
        setCreateFilter={() => undefined}
        setCreateCategory={() => undefined}
        closeMenu={() => setMenu(null)}
        onEditObject={onEditObject}
      />
    </div>
  );
}

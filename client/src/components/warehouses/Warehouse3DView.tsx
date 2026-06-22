import { useEffect, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  PBRMaterial,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import {
  createBoxMesh,
  createColumnMesh,
  createEuroPalletDetailMesh,
  createNoGoZoneMesh,
  createOpeningMesh,
  createRackMesh,
  createRoomMeshes,
  createStairMesh,
  createWallSegmentMesh,
} from "../../modules/warehouse-designer/engine/babylonMeshes";
import { hexToColor3 } from "../../modules/warehouse-designer/engine/babylonCore";
import type { ProjectData, Room, SceneObject } from "../../modules/warehouse-designer/types";

type Props = {
  focusObjectId?: string;
  height?: number;
  layout: Record<string, unknown> | null | undefined;
  onRackClick?: (id: string) => void;
  rackIds?: Set<string>;
};

export function Warehouse3DView({ focusObjectId, height = 520, layout, onRackClick, rackIds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const onRackClickRef = useRef(onRackClick);
  const rackIdsRef = useRef(rackIds);
  useEffect(() => { onRackClickRef.current = onRackClick; }, [onRackClick]);
  useEffect(() => { rackIdsRef.current = rackIds; }, [rackIds]);
  // Resize Babylon when canvas height changes (expand/collapse)
  useEffect(() => { engineRef.current?.resize(); }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const project = parseLayout(layout);
    const { room } = project;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.02, 0.04, 0.08, 1);

    // Camera
    const diagonal = Math.sqrt(room.width * room.width + room.depth * room.depth);
    const radius = diagonal * 1.4;
    const camera = new ArcRotateCamera("cam", -Math.PI / 4, Math.PI / 3.2, radius, new Vector3(0, room.height * 0.4, 0), scene);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = diagonal * 4;
    camera.wheelPrecision = 20;
    camera.attachControl(canvas, true);

    // Lighting — cool overhead + warm directional for industrial drama
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5;
    hemi.diffuse = new Color3(0.72, 0.80, 1.0);
    hemi.groundColor = new Color3(0.18, 0.26, 0.38);
    const sun = new DirectionalLight("sun", new Vector3(-1, -2.5, -1), scene);
    sun.intensity = 1.6;
    sun.diffuse = new Color3(1.0, 0.94, 0.84);

    // Build scene
    createRoomMeshes(scene, project.room, project.objects);
    for (const obj of project.objects) {
      const beforeCount = scene.meshes.length;
      buildObjectMesh(scene, project.room, obj);
      if (obj.type === "pallet-rack" || obj.type === "storage-shelf") {
        for (let i = beforeCount; i < scene.meshes.length; i++) {
          scene.meshes[i].metadata = { objectId: obj.id };
        }
      }
    }

    // Override the designer's light-beige room materials with dark industrial theme
    applyDarkTheme(scene);
    if (focusObjectId) focusObject(scene, camera, focusObjectId);

    // Click: distinguish click from camera drag
    let downX = 0, downY = 0;
    scene.onPointerObservable.add((pi) => {
      if (pi.type === PointerEventTypes.POINTERDOWN) { downX = scene.pointerX; downY = scene.pointerY; }
      else if (pi.type === PointerEventTypes.POINTERUP) {
        if (Math.hypot(scene.pointerX - downX, scene.pointerY - downY) > 8) return;
        const oid = pi.pickInfo?.pickedMesh?.metadata?.objectId as string | undefined;
        if (oid && rackIdsRef.current?.has(oid)) onRackClickRef.current?.(oid);
      }
    });

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
    };
  }, [focusObjectId, layout]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, display: "block", borderRadius: "0.75rem", outline: "none" }}
    />
  );
}

function focusObject(scene: Scene, camera: ArcRotateCamera, objectId: string) {
  // Match the slot's container(s): a single-item slot uses the exact id, while a
  // multi-FACK slot suffixes each container with "__<index>".
  const meshes = scene.meshes.filter((mesh) => {
    const id = mesh.metadata?.objectId as string | undefined;
    return id === objectId || (typeof id === "string" && id.startsWith(`${objectId}__`));
  });
  if (meshes.length === 0) return;
  const center = meshes.reduce((sum, mesh) => sum.add(mesh.getBoundingInfo().boundingBox.centerWorld), Vector3.Zero()).scale(1 / meshes.length);
  camera.setTarget(center);
  camera.radius = Math.max(2.2, Math.min(camera.radius, 4.5));
  for (const mesh of meshes) {
    if (mesh.material instanceof StandardMaterial) {
      const material = mesh.material.clone(`${mesh.material.name}-focus`);
      material.emissiveColor = new Color3(0.15, 0.55, 0.25);
      mesh.material = material;
    } else if (mesh.material instanceof PBRMaterial) {
      const material = mesh.material.clone(`${mesh.material.name}-focus`);
      material.emissiveColor = new Color3(0.12, 0.48, 0.22);
      mesh.material = material;
    }
  }
}

/** Override the designer's light beige room materials for a dark premium look. */
function applyDarkTheme(scene: Scene) {
  const pbr: Record<string, { color: string; metallic: number; roughness: number }> = {
    "warehouse-floor-material": { color: "#0c1520", metallic: 0.08, roughness: 0.96 },
    "internal-room-floor-material": { color: "#0f1d2c", metallic: 0.08, roughness: 0.92 },
    "wall-material": { color: "#1c2c3e", metallic: 0.14, roughness: 0.76 },
  };
  for (const [name, opts] of Object.entries(pbr)) {
    const mat = scene.getMaterialByName(name) as PBRMaterial | null;
    if (!mat) continue;
    mat.albedoColor = hexToColor3(opts.color);
    mat.metallic = opts.metallic;
    mat.roughness = opts.roughness;
  }
  // Make the reference grid amber and slightly brighter
  const grid = scene.getMaterialByName("grid-material") as StandardMaterial | null;
  if (grid) { grid.diffuseColor = new Color3(0.86, 0.65, 0.22); grid.alpha = 0.2; }
}

function buildObjectMesh(scene: Scene, room: Room, obj: SceneObject) {
  try {
    switch (obj.type) {
      case "pallet-rack": case "storage-shelf": createRackMesh(scene, room, obj); break;
      case "euro-pallet": createEuroPalletDetailMesh(scene, room, obj); break;
      case "box": createBoxMesh(scene, room, obj); break;
      case "column": createColumnMesh(scene, room, obj); break;
      case "no-go-zone": createNoGoZoneMesh(scene, room, obj); break;
      case "door": case "window": createOpeningMesh(scene, room, obj); break;
      case "stair": createStairMesh(scene, room, obj); break;
      case "wall-segment": createWallSegmentMesh(scene, room, obj); break;
    }
  } catch { /* skip objects that fail to render */ }
}

function parseLayout(layout: Record<string, unknown> | null | undefined): ProjectData {
  if (layout && typeof layout === "object" && layout.room && Array.isArray(layout.objects)) {
    return layout as unknown as ProjectData;
  }
  return { version: 23, name: "", room: { width: 12, depth: 8, height: 4.2, wallThickness: 0.2 }, objects: [], settings: {} as ProjectData["settings"], spaceNames: {} };
}

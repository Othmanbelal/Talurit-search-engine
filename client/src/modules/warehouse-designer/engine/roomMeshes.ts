import { Color3, Color4, DynamicTexture, Mesh, MeshBuilder, PBRMaterial, Scene, StandardMaterial, VertexData } from "@babylonjs/core";
import type { Room, SceneObject, Vec2 } from "../types";
import { objectCorners, polygonBounds, polygonCenter, wallCenterlineEndpoints } from "../utils/geometry";
import { detectRoomLoops } from "../utils/roomDetection";
import { makeMaterial, objectElevation, setObjectMetadata, worldXFromPlan, worldZFromPlan } from "./babylonCore";

function createPolygonSlab(scene: Scene, room: Room, name: string, boundary: Vec2[], material: PBRMaterial, y = 0, thickness = 0.16) {
  const mesh = new Mesh(name, scene);
  const center = polygonCenter(boundary);
  const bounds = polygonBounds(boundary);
  const safeW = Math.max(0.001, bounds.maxX - bounds.minX);
  const safeD = Math.max(0.001, bounds.maxY - bounds.minY);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const addVertex = (point: Vec2, py: number, normal: number[]) => {
    positions.push(worldXFromPlan(point.x, room), py, worldZFromPlan(point.y, room));
    normals.push(...normal);
    uvs.push((point.x - bounds.minX) / safeW, (point.y - bounds.minY) / safeD);
    return positions.length / 3 - 1;
  };
  const topCenter = addVertex(center, y, [0, 1, 0]);
  const top = boundary.map((point) => addVertex(point, y, [0, 1, 0]));
  top.forEach((_, i) => indices.push(topCenter, top[(i + 1) % top.length], top[i]));
  const bottomCenter = addVertex(center, y - thickness, [0, -1, 0]);
  const bottom = boundary.map((point) => addVertex(point, y - thickness, [0, -1, 0]));
  bottom.forEach((_, i) => indices.push(bottomCenter, bottom[i], bottom[(i + 1) % bottom.length]));
  boundary.forEach((point, i) => {
    const next = boundary[(i + 1) % boundary.length];
    const a = addVertex(point, y, [0, 0, 1]);
    const b = addVertex(next, y, [0, 0, 1]);
    const c = addVertex(next, y - thickness, [0, 0, 1]);
    const d = addVertex(point, y - thickness, [0, 0, 1]);
    indices.push(a, b, c, a, c, d);
  });
  const vertexData = new VertexData();
  vertexData.positions = positions; vertexData.indices = indices; vertexData.normals = normals; vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.material = material;
  mesh.isPickable = false;
}

function createRectSlabPiece(scene: Scene, room: Room, name: string, bounds: { minX: number; maxX: number; minY: number; maxY: number }, material: PBRMaterial, y: number, thickness: number) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxY - bounds.minY;
  if (width < 0.05 || depth < 0.05) return;
  const mesh = MeshBuilder.CreateBox(name, { width, depth, height: thickness }, scene);
  mesh.position.set(worldXFromPlan((bounds.minX + bounds.maxX) / 2, room), y - thickness / 2, worldZFromPlan((bounds.minY + bounds.maxY) / 2, room));
  mesh.material = material;
  mesh.isPickable = false;
}

function stairOpeningForLoop(loop: ReturnType<typeof detectRoomLoops>[number], stairs: SceneObject[]) {
  const loopBounds = polygonBounds(loop.points);
  const stair = stairs.find((item) => {
    const base = objectElevation(item);
    const top = base + item.height;
    const centerInside = item.position.x > loopBounds.minX && item.position.x < loopBounds.maxX && item.position.y > loopBounds.minY && item.position.y < loopBounds.maxY;
    return centerInside && base < loop.elevation - 0.05 && top >= loop.elevation - 0.08;
  });
  if (!stair) return null;
  const bounds = polygonBounds(objectCorners(stair));
  const margin = 0.18;
  return {
    minX: Math.max(loopBounds.minX + 0.05, bounds.minX - margin),
    maxX: Math.min(loopBounds.maxX - 0.05, bounds.maxX + margin),
    minY: Math.max(loopBounds.minY + 0.05, bounds.minY - margin),
    maxY: Math.min(loopBounds.maxY - 0.05, bounds.maxY + margin)
  };
}

function createSlabWithOptionalOpening(scene: Scene, room: Room, loop: ReturnType<typeof detectRoomLoops>[number], material: PBRMaterial, stairs: SceneObject[]) {
  const y = loop.elevation + (loop.type === "warehouse" ? 0 : 0.018);
  const hole = stairOpeningForLoop(loop, stairs);
  if (!hole) return createPolygonSlab(scene, room, `${loop.id}-floor-slab`, loop.points, material, y, loop.floorThickness);
  const bounds = polygonBounds(loop.points);
  const pieces = [
    { minX: bounds.minX, maxX: hole.minX, minY: bounds.minY, maxY: bounds.maxY },
    { minX: hole.maxX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY },
    { minX: hole.minX, maxX: hole.maxX, minY: bounds.minY, maxY: hole.minY },
    { minX: hole.minX, maxX: hole.maxX, minY: hole.maxY, maxY: bounds.maxY }
  ];
  pieces.forEach((piece, index) => createRectSlabPiece(scene, room, `${loop.id}-floor-slab-${index}`, piece, material, y, loop.floorThickness));
}

function wallBox(scene: Scene, room: Room, wall: SceneObject, a: Vec2, b: Vec2, height: number, y: number, name: string, material: PBRMaterial, selectedId?: string | null) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.04 || height < 0.04) return;
  const mesh = MeshBuilder.CreateBox(name, { width: length, depth: wall.depth, height }, scene);
  mesh.position.set(worldXFromPlan((a.x + b.x) / 2, room), y + height / 2, worldZFromPlan((a.y + b.y) / 2, room));
  mesh.rotation.y = -Math.atan2(dy, dx);
  mesh.material = material;
  setObjectMetadata(mesh, wall);
  if (wall.id === selectedId) {
    mesh.enableEdgesRendering();
    mesh.edgesWidth = 8;
    mesh.edgesColor = new Color4(0.26, 0.85, 1, 1);
  }
}

function openingsOnWall(a: Vec2, b: Vec2, openings: SceneObject[], thickness: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / length, y: dy / length };
  const normal = { x: -dir.y, y: dir.x };
  const angle = Math.atan2(dy, dx);
  return openings.flatMap((opening) => {
    const rel = { x: opening.position.x - a.x, y: opening.position.y - a.y };
    const t = rel.x * dir.x + rel.y * dir.y;
    const dist = Math.abs(rel.x * normal.x + rel.y * normal.y);
    const aligned = Math.abs(Math.sin(opening.rotation - angle)) < 0.35;
    if (t <= 0 || t >= length || dist > thickness * 3 || !aligned) return [];
    return [{ start: Math.max(0, t - opening.width / 2), end: Math.min(length, t + opening.width / 2), opening }];
  }).sort((left, right) => left.start - right.start);
}

function createWallWithOpenings(scene: Scene, room: Room, wall: SceneObject, index: number, material: PBRMaterial, openings: SceneObject[], selectedId?: string | null) {
  const [a, b] = wallCenterlineEndpoints(wall);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const pointAt = (distance: number) => ({ x: a.x + ((b.x - a.x) * distance) / length, y: a.y + ((b.y - a.y) * distance) / length });
  let cursor = 0;
  openingsOnWall(a, b, openings, wall.depth).forEach((cut, cutIndex) => {
    wallBox(scene, room, wall, pointAt(cursor), pointAt(cut.start), wall.height, objectElevation(wall), `${wall.id}-${index}-left-${cutIndex}`, material, selectedId);
    if (cut.opening.type === "window") {
      const sill = cut.opening.opening?.sillHeight ?? 0.9;
      wallBox(scene, room, wall, pointAt(cut.start), pointAt(cut.end), sill, objectElevation(wall), `${wall.id}-sill-${cutIndex}`, material, selectedId);
      wallBox(scene, room, wall, pointAt(cut.start), pointAt(cut.end), Math.max(0.05, wall.height - sill - cut.opening.height), objectElevation(wall) + sill + cut.opening.height, `${wall.id}-head-${cutIndex}`, material, selectedId);
    } else {
      wallBox(scene, room, wall, pointAt(cut.start), pointAt(cut.end), Math.max(0.05, wall.height - cut.opening.height), objectElevation(wall) + cut.opening.height, `${wall.id}-door-head-${cutIndex}`, material, selectedId);
    }
    cursor = cut.end;
  });
  wallBox(scene, room, wall, pointAt(cursor), b, wall.height, objectElevation(wall), `${wall.id}-${index}-right`, material, selectedId);
}


function spacedName(name: string) {
  return name.toUpperCase().split(" ").map((part) => part.split("").join(" ")).join("   ");
}

function createPlaceLabel(scene: Scene, room: Room, loop: ReturnType<typeof detectRoomLoops>[number]) {
  const center = polygonCenter(loop.points);
  const bounds = polygonBounds(loop.points);
  const width = Math.max(2.2, Math.min(10, (bounds.maxX - bounds.minX) * 0.72));
  const texture = new DynamicTexture(`${loop.id}-label-texture`, { width: 2048, height: 256 }, scene, true);
  const context = texture.getContext() as CanvasRenderingContext2D;
  context.clearRect(0, 0, 2048, 256);
  context.fillStyle = "rgba(255,255,255,0)";
  context.fillRect(0, 0, 2048, 256);
  context.fillStyle = loop.type === "warehouse" ? "rgba(240, 185, 52, 0.42)" : "rgba(210, 224, 230, 0.34)";
  context.strokeStyle = "rgba(10, 16, 20, 0.24)";
  context.lineWidth = 3;
  context.font = loop.type === "warehouse" ? "700 92px Arial" : "700 76px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const label = spacedName(loop.name);
  const levelCaption = loop.levelIndex === 0 ? "GROUND" : `LEVEL ${loop.levelIndex + 1}`;
  context.strokeText(label, 1024, 112);
  context.fillText(label, 1024, 112);
  context.font = "700 30px Arial";
  context.fillStyle = "rgba(225, 235, 238, 0.3)";
  context.fillText(levelCaption, 1024, 196);
  texture.update();

  const mat = new StandardMaterial(`${loop.id}-label-material`, scene);
  mat.diffuseTexture = texture;
  mat.opacityTexture = texture;
  mat.emissiveColor = loop.type === "warehouse" ? new Color3(0.35, 0.26, 0.08) : new Color3(0.18, 0.22, 0.23);
  mat.alpha = 0.52;
  mat.backFaceCulling = false;

  const plane = MeshBuilder.CreatePlane(`${loop.id}-floor-place-label`, { width, height: width / 8 }, scene);
  plane.position.set(worldXFromPlan(center.x, room), loop.elevation + 0.024, worldZFromPlan(center.y, room));
  plane.rotation.x = Math.PI / 2;
  plane.material = mat;
  plane.isPickable = false;
}

function createReferenceGrid(scene: Scene, room: Room, loops: Vec2[][]) {
  const points = loops.flat();
  if (!points.length) return;
  const bounds = polygonBounds(points);
  const gridMaterial = new StandardMaterial("grid-material", scene);
  gridMaterial.diffuseColor = new Color3(0.49, 0.57, 0.59);
  gridMaterial.emissiveColor = new Color3(0.03, 0.04, 0.045);
  gridMaterial.alpha = 0.16;
  for (let x = Math.floor(bounds.minX); x <= bounds.maxX + 0.001; x += 1) {
    const line = MeshBuilder.CreateBox("grid-x", { width: 0.012, depth: Math.max(0.2, bounds.maxY - bounds.minY), height: 0.012 }, scene);
    line.position.set(worldXFromPlan(x, room), 0.018, worldZFromPlan((bounds.minY + bounds.maxY) / 2, room));
    line.material = gridMaterial;
  }
  for (let y = Math.floor(bounds.minY); y <= bounds.maxY + 0.001; y += 1) {
    const line = MeshBuilder.CreateBox("grid-z", { width: Math.max(0.2, bounds.maxX - bounds.minX), depth: 0.012, height: 0.012 }, scene);
    line.position.set(worldXFromPlan((bounds.minX + bounds.maxX) / 2, room), 0.02, worldZFromPlan(y, room));
    line.material = gridMaterial;
  }
}

function createEnvironmentDeck(scene: Scene, room: Room, loops: Vec2[][]) {
  const points = loops.flat();
  if (!points.length) return;
  const bounds = polygonBounds(points);
  const margin = Math.max(7, Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.45);
  const width = bounds.maxX - bounds.minX + margin * 2;
  const depth = bounds.maxY - bounds.minY + margin * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const material = makeMaterial(scene, "environment-deck-material", "#20272b", 0.02, 0.96);
  const deck = MeshBuilder.CreateBox("environment-deck", { width, depth, height: 0.18 }, scene);
  deck.position.set(worldXFromPlan(centerX, room), -0.17, worldZFromPlan(centerY, room));
  deck.material = material;
  deck.isPickable = false;
}

function createPerimeterMarkings(scene: Scene, room: Room, loops: ReturnType<typeof detectRoomLoops>) {
  const marking = makeMaterial(scene, "perimeter-marking-material", "#eab52f", 0.03, 0.72);
  loops.filter((loop) => loop.type === "warehouse" && !loop.synthetic).forEach((loop) => {
    loop.points.forEach((point, index) => {
      const next = loop.points[(index + 1) % loop.points.length];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.05) return;
      const line = MeshBuilder.CreateBox(`${loop.id}-perimeter-marking-${index}`, {
        width: length,
        depth: 0.055,
        height: 0.012,
      }, scene);
      line.position.set(
        worldXFromPlan((point.x + next.x) / 2, room),
        loop.elevation + 0.033,
        worldZFromPlan((point.y + next.y) / 2, room),
      );
      line.rotation.y = -Math.atan2(dy, dx);
      line.material = marking;
      line.isPickable = false;
    });
  });
}

export function createRoomMeshes(scene: Scene, room: Room, objects: SceneObject[] = [], spaceNames: Record<string, string> = {}, selectedId?: string | null) {
  const loops = detectRoomLoops(objects, spaceNames);
  const floorMaterial = makeMaterial(scene, "warehouse-floor-material", "#778187", 0.02, 0.92);
  const roomFloorMaterial = makeMaterial(scene, "internal-room-floor-material", "#939da2", 0.02, 0.9);
  const wallMaterial = makeMaterial(scene, "wall-material", "#d4dade", 0.01, 0.78);
  const stairs = objects.filter((object) => object.type === "stair");
  createEnvironmentDeck(scene, room, loops.map((loop) => loop.points));
  loops.forEach((loop) => {
    try {
      // Synthetic loops come from the bounding-box fallback (T-junction walls that
      // couldn't form a closed polygon). Skip the floor slab — only render the label.
      if (!loop.synthetic) {
        createSlabWithOptionalOpening(scene, room, loop, loop.type === "warehouse" ? floorMaterial : roomFloorMaterial, stairs);
      }
      createPlaceLabel(scene, room, loop);
    } catch (error) {
      console.warn("Skipped invalid floor loop", loop.id, error);
    }
  });
  const openings = objects.filter((object) => object.type === "door" || object.type === "window");
  objects.filter((object) => object.type === "wall-segment").forEach((wall, index) => createWallWithOpenings(scene, room, wall, index, wallMaterial, openings, selectedId));
  if (loops.length) {
    createReferenceGrid(scene, room, loops.map((loop) => loop.points));
    createPerimeterMarkings(scene, room, loops);
  }
}

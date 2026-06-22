import { Color3, Scene, StandardMaterial } from "@babylonjs/core";
import { WD_TOKENS } from "../theme/designTokens";

export type WarehousePalette = {
  structure: StandardMaterial;
  structureAlt: StandardMaterial;
  shelf: StandardMaterial;
  wall: StandardMaterial;
  floor: StandardMaterial;
  floorRoom: StandardMaterial;
  outline: StandardMaterial;
  statusFree: StandardMaterial;
  statusOccupied: StandardMaterial;
  statusProblem: StandardMaterial;
  glass: StandardMaterial;
  deck: StandardMaterial;
};

const hex = (value: string) => Color3.FromHexString(value);

/** Flat, frozen material: diffuse + small emissive floor so unlit faces aren't black. */
function flat(scene: Scene, name: string, color: string, alpha = 1): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  const c = hex(color);
  m.diffuseColor = c;
  // Flat look without blowing out: a low emissive floor keeps unlit faces from going
  // black, while the hemispheric light supplies the rest. Ambient is zeroed so the
  // scene ambient term doesn't double-add the diffuse color and clamp to white.
  m.emissiveColor = c.scale(0.2);
  m.specularColor = new Color3(0, 0, 0);
  m.ambientColor = new Color3(0, 0, 0);
  if (alpha < 1) {
    m.alpha = alpha;
    m.backFaceCulling = false;
  }
  m.freeze();
  return m;
}

type SceneWithPalette = Scene & {
  metadata?: { wdPalette?: WarehousePalette; wdFlatCache?: Map<string, StandardMaterial> } & Record<string, unknown>;
};

export function getPalette(scene: Scene): WarehousePalette {
  const s = scene as SceneWithPalette;
  if (s.metadata?.wdPalette) return s.metadata.wdPalette;
  const palette: WarehousePalette = {
    structure: flat(scene, "wd-structure", WD_TOKENS.structure),
    structureAlt: flat(scene, "wd-structure-alt", WD_TOKENS.structureAlt),
    shelf: flat(scene, "wd-shelf", WD_TOKENS.shelf),
    wall: flat(scene, "wd-wall", WD_TOKENS.wall),
    floor: flat(scene, "wd-floor", WD_TOKENS.floor),
    floorRoom: flat(scene, "wd-floor-room", WD_TOKENS.floorRoom),
    outline: flat(scene, "wd-outline", WD_TOKENS.outline),
    statusFree: flat(scene, "wd-status-free", WD_TOKENS.statusFree),
    statusOccupied: flat(scene, "wd-status-occupied", WD_TOKENS.statusOccupied),
    statusProblem: flat(scene, "wd-status-problem", WD_TOKENS.statusProblem),
    glass: flat(scene, "wd-glass", WD_TOKENS.wall, 0.32),
    deck: flat(scene, "wd-deck", WD_TOKENS.canvasDeck),
  };
  s.metadata = { ...(s.metadata ?? {}), wdPalette: palette };
  return palette;
}

export function statusMaterial(scene: Scene, status: "free" | "occupied" | "problem"): StandardMaterial {
  const palette = getPalette(scene);
  if (status === "occupied") return palette.statusOccupied;
  if (status === "problem") return palette.statusProblem;
  return palette.statusFree;
}

/** Shared, cached flat material for ad-hoc colors so callers never allocate per object. */
export function flatMaterial(scene: Scene, key: string, color: string, alpha = 1): StandardMaterial {
  const s = scene as SceneWithPalette;
  const cache = s.metadata?.wdFlatCache ?? new Map<string, StandardMaterial>();
  const cacheKey = `${key}|${color}|${alpha}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const material = flat(scene, `wd-flat-${cacheKey}`, color, alpha);
  cache.set(cacheKey, material);
  s.metadata = { ...(s.metadata ?? {}), wdFlatCache: cache };
  return material;
}

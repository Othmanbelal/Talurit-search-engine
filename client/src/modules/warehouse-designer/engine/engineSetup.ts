// client/src/modules/warehouse-designer/engine/engineSetup.ts
import { ArcRotateCamera, Color3, Engine, Scene, Vector3 } from "@babylonjs/core";
import { FxaaPostProcess } from "@babylonjs/core/PostProcesses/fxaaPostProcess";
import { configureSceneEnvironment } from "./sceneEnvironment";
import { WD_TOKENS } from "../theme/designTokens";

export type WarehouseEngine = { engine: Engine; scene: Scene; camera: ArcRotateCamera };

export function createWarehouseEngine(canvas: HTMLCanvasElement): WarehouseEngine {
  // antialias off at the engine level; we use cheap FXAA + DPR cap instead of MSAA.
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: false });
  engine.setHardwareScalingLevel(Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5)) / (window.devicePixelRatio || 1));

  const scene = new Scene(engine);
  const camera = new ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3.2, 15, new Vector3(0, 1.5, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 120;
  camera.wheelPrecision = 45;
  camera.panningSensibility = 120;

  configureSceneEnvironment(scene, camera);
  new FxaaPostProcess("wd-fxaa", 1.0, camera);

  scene.skipPointerMovePicking = true;
  scene.blockMaterialDirtyMechanism = true;
  scene.autoClear = true;

  // Adaptive resolution: if the frame time is heavy, render at lower internal res.
  let scaling = engine.getHardwareScalingLevel();
  scene.onAfterRenderObservable.add(() => {
    const fps = engine.getFps();
    if (fps < 45 && scaling < 2) { scaling = Math.min(2, scaling + 0.15); engine.setHardwareScalingLevel(scaling); }
    else if (fps > 58 && scaling > 0.75) { scaling = Math.max(0.75, scaling - 0.05); engine.setHardwareScalingLevel(scaling); }
  });

  engine.runRenderLoop(() => scene.render());
  return { engine, scene, camera };
}

/** Thin blueprint outline on every object mesh (merged → cheap). */
export function applyObjectOutlines(scene: Scene): void {
  const color = Color3.FromHexString(WD_TOKENS.outline);
  scene.meshes.forEach((mesh) => {
    if (!mesh.metadata?.objectId) return;
    mesh.renderOutline = true;
    mesh.outlineColor = color;
    mesh.outlineWidth = 0.02;
  });
}

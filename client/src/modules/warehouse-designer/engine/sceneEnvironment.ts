import { ArcRotateCamera, Color3, Color4, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { WD_TOKENS } from "../theme/designTokens";

/** Flat-schematic light: soft off-white backdrop, one gentle hemispheric light,
 *  no fog, no real-time shadows, neutral tone mapping. */
export function configureSceneEnvironment(scene: Scene, camera: ArcRotateCamera): void {
  const canvas = Color3.FromHexString(WD_TOKENS.canvas);
  scene.clearColor = new Color4(canvas.r, canvas.g, canvas.b, 1);
  // Low scene ambient: materials carry their own small emissive floor, so a strong
  // ambient here would wash everything to white.
  scene.ambientColor = new Color3(0.12, 0.12, 0.13);
  scene.fogMode = Scene.FOGMODE_NONE;

  // Neutral image processing so flat colors stay true (no heavy ACES/contrast).
  scene.imageProcessingConfiguration.toneMappingEnabled = false;
  scene.imageProcessingConfiguration.contrast = 1.0;
  scene.imageProcessingConfiguration.exposure = 1.0;

  camera.fov = 0.7;
  camera.minZ = 0.08;
  camera.inertia = 0.78;
  camera.panningInertia = 0.75;
  camera.angularSensibilityX = 950;
  camera.angularSensibilityY = 950;

  const ambient = new HemisphericLight("wd-ambient", new Vector3(0.2, 1, 0.15), scene);
  ambient.intensity = 0.82;
  ambient.diffuse = new Color3(1, 1, 1);
  ambient.groundColor = new Color3(0.7, 0.74, 0.78);
  ambient.specular = new Color3(0, 0, 0);
}

import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  ImageProcessingConfiguration,
  Scene,
  ShadowGenerator,
  Vector3,
} from "@babylonjs/core";

export function configureSceneEnvironment(scene: Scene, camera: ArcRotateCamera) {
  scene.clearColor = new Color4(0.055, 0.072, 0.083, 1);
  scene.ambientColor = new Color3(0.22, 0.25, 0.27);
  scene.environmentIntensity = 0.65;
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0045;
  scene.fogColor = new Color3(0.09, 0.115, 0.125);

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.08;
  scene.imageProcessingConfiguration.contrast = 1.18;

  camera.fov = 0.72;
  camera.minZ = 0.08;
  camera.inertia = 0.78;
  camera.panningInertia = 0.75;
  camera.angularSensibilityX = 950;
  camera.angularSensibilityY = 950;

  const ambient = new HemisphericLight("warehouse-ambient", new Vector3(0.15, 1, 0.1), scene);
  ambient.intensity = 0.72;
  ambient.diffuse = new Color3(0.74, 0.82, 0.85);
  ambient.groundColor = new Color3(0.12, 0.15, 0.16);

  const sun = new DirectionalLight("warehouse-key", new Vector3(-0.55, -1, -0.32), scene);
  sun.position = new Vector3(12, 18, 10);
  sun.intensity = 2.15;
  sun.diffuse = new Color3(1, 0.91, 0.76);
  sun.specular = new Color3(0.8, 0.86, 0.88);

  const fill = new DirectionalLight("warehouse-fill", new Vector3(0.65, -0.72, 0.5), scene);
  fill.position = new Vector3(-10, 12, -8);
  fill.intensity = 0.48;
  fill.diffuse = new Color3(0.48, 0.69, 0.78);

  const shadows = new ShadowGenerator(2048, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 28;
  shadows.bias = 0.0008;
  shadows.normalBias = 0.025;
  shadows.darkness = 0.28;
  return shadows;
}

export function syncSceneShadows(scene: Scene, shadows: ShadowGenerator | null) {
  if (!shadows) return;
  const receivers = scene.meshes.filter((mesh) => mesh.isVisible);
  receivers.forEach((mesh) => {
    mesh.receiveShadows = true;
  });
  const map = shadows.getShadowMap();
  if (!map) return;
  const candidates = receivers.filter((mesh) => {
    const name = mesh.name.toLowerCase();
    return !name.includes("floor") &&
      !name.includes("grid") &&
      !name.includes("environment-deck") &&
      !name.includes("place-label") &&
      !name.includes("perimeter-marking");
  });
  map.renderList = candidates.length <= 1200 ? candidates : [];
  shadows.setDarkness(candidates.length <= 1200 ? 0.28 : 1);
}

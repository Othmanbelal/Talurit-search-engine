const SHELF_OBJECT_TYPES = new Set(["pallet-rack", "storage-shelf"]);

export type SceneShelfObject = {
  externalObjectId: string;
  name: string;
  objectType: string;
  positionX: number;
  positionY: number;
  elevation: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  color?: string | null;
  locked: boolean;
  metadata: Record<string, unknown>;
};

export function extractShelfSceneObjects(layoutData: unknown): SceneShelfObject[] {
  const objects = sceneObjectArray(layoutData);
  return objects.map(sceneShelfObject).filter((object): object is SceneShelfObject => Boolean(object));
}

function sceneObjectArray(layoutData: unknown) {
  if (!layoutData || typeof layoutData !== "object") return [];
  const objects = (layoutData as { objects?: unknown }).objects;
  return Array.isArray(objects) ? objects : [];
}

function sceneShelfObject(value: unknown): SceneShelfObject | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const id = text(object.id);
  const objectType = text(object.type);
  if (!id || !objectType || !SHELF_OBJECT_TYPES.has(objectType)) return null;
  const position = object.position && typeof object.position === "object" ? object.position as Record<string, unknown> : {};
  return {
    externalObjectId: id,
    name: text(object.name) || objectType,
    objectType,
    positionX: numberValue(position.x),
    positionY: numberValue(position.y),
    elevation: numberValue(object.elevation),
    rotation: numberValue(object.rotation),
    width: numberValue(object.width),
    depth: numberValue(object.depth),
    height: numberValue(object.height),
    color: text(object.color),
    locked: Boolean(object.locked),
    metadata: object,
  };
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

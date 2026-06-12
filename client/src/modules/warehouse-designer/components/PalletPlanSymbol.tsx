import type { SceneObject } from "../types";
import { localToWorld, polygonPoints } from "./planViewHelpers";

const TOP_BOARD_WIDTHS = [0.145, 0.1, 0.145, 0.1, 0.145];
const SUPPORT_ROWS = [-0.4, 0, 0.4];
const BLOCK_X = [-0.36, 0, 0.36];

function rectPoints(object: SceneObject, x: number, y: number, width: number, depth: number) {
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - depth / 2;
  const bottom = y + depth / 2;
  return polygonPoints([
    localToWorld(object, left, top),
    localToWorld(object, right, top),
    localToWorld(object, right, bottom),
    localToWorld(object, left, bottom)
  ]);
}

function scaledBoardWidths(object: SceneObject) {
  const total = TOP_BOARD_WIDTHS.reduce((sum, value) => sum + value, 0);
  const scale = Math.min(1, object.width / 0.8);
  const gap = Math.max(0.018, (object.width - total * scale) / 4);
  let cursor = -object.width / 2;
  return TOP_BOARD_WIDTHS.map((raw) => {
    const width = raw * scale;
    const center = cursor + width / 2;
    cursor += width + gap;
    return { center, width };
  });
}

export function PalletPlanSymbol({ object }: { object: SceneObject }) {
  const boards = scaledBoardWidths(object);
  const boardDepth = object.depth * 0.96;
  const bearerDepth = Math.min(0.105, object.depth * 0.1);
  const blockW = Math.min(0.105, object.width * 0.14);
  const blockD = Math.min(0.145, object.depth * 0.13);

  return (
    <g className="pallet-plan-symbol">
      {boards.map((board, index) => (
        <polygon key={`top-${index}`} points={rectPoints(object, board.center, 0, board.width, boardDepth)} className="pallet-top-board" />
      ))}
      {SUPPORT_ROWS.map((row) => (
        <polygon key={`bearer-${row}`} points={rectPoints(object, 0, row * object.depth, object.width * 0.94, bearerDepth)} className="pallet-cross-bearer" />
      ))}
      {BLOCK_X.flatMap((x) => SUPPORT_ROWS.map((row) => (
        <polygon key={`block-${x}-${row}`} points={rectPoints(object, x * object.width, row * object.depth, blockW, blockD)} className="pallet-block-plan" />
      )))}
      <polygon points={rectPoints(object, 0, 0, object.width, object.depth)} className="pallet-outline" />
    </g>
  );
}

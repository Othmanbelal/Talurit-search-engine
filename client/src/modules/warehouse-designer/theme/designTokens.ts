/**
 * Canonical flat-schematic light palette. Single source of truth for the 3D
 * engine, the 2D canvas painter, and the chrome (via the matching CSS variables
 * in styles/chunk-23.css — keep the two in sync by name).
 *
 * Status tints are deliberately muted/desaturated: subtle, never loud.
 */
export const WD_TOKENS = {
  // Canvas / backdrop
  canvas: "#eef1f4",       // off-white/light-grey viewport
  canvasDeck: "#e4e8ec",   // ground deck under the layout
  grid: "#d4dade",         // faint blueprint grid
  gridStrong: "#c3cbd1",   // major grid lines

  // Structure (soft greys)
  structure: "#9aa6ad",    // rack uprights / frame
  structureAlt: "#b3bcc2", // beams / secondary frame
  shelf: "#c7cfd4",        // shelf decks
  wall: "#cfd6db",         // walls
  floor: "#dfe4e8",        // warehouse floor slab
  floorRoom: "#e8ecef",    // internal room floor

  // Lines / selection
  outline: "#7c878e",      // thin object outline
  selection: "#2f7df6",    // single accent for selection

  // Inventory status — muted desaturated tints
  statusFree: "#8fae93",     // sage
  statusOccupied: "#7d97b8", // dusty blue
  statusProblem: "#c19a86",  // soft clay

  // Floor labels
  label: "#6b767d",
  labelWarehouse: "#8a7d52",
} as const;

export type WdTokenKey = keyof typeof WD_TOKENS;

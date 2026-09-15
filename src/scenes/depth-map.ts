import { BLEED, CELL, WORLD } from "../map/geo";
import { bleedTerrainAt, terrainAt } from "./terrain";

/**
 * Distancia de cada punto de agua a la tierra más cercana, en unidades de
 * mundo: transformada de distancia (chaflán 1 / √2, dos pasadas) sobre una
 * grilla de CELL que cubre contenido y sangrado. Se calcula una vez, sin rng.
 * La usa el terreno para repartir el agua por profundidad.
 */
const X0 = WORLD.x0 - BLEED.x, Y0 = WORLD.y0 - BLEED.y, X1 = WORLD.x1 + BLEED.x, Y1 = WORLD.y1 + BLEED.y;
const COLS = (X1 - X0) / CELL, ROWS = (Y1 - Y0) / CELL;
const WATER_CONTENT = new Set(["water", "sea", "shore", "abyss"]);
const WATER_BLEED = new Set(["sea", "shore", "abyss", "river"]);

export function isWaterAt(x: number, y: number): boolean {
  if (x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1) return WATER_CONTENT.has(terrainAt(x, y));
  return WATER_BLEED.has(bleedTerrainAt(x, y));
}

let grid: Float32Array | null = null;

function build(): Float32Array {
  const d = new Float32Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) d[j * COLS + i] = isWaterAt(X0 + (i + 0.5) * CELL, Y0 + (j + 0.5) * CELL) ? Infinity : 0;
  const relax = (i: number, j: number, di: number, dj: number, w: number) => {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) return;
    const v = d[nj * COLS + ni]! + w;
    if (v < d[j * COLS + i]!) d[j * COLS + i] = v;
  };
  const R2 = Math.SQRT2;
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { relax(i, j, -1, 0, 1); relax(i, j, 0, -1, 1); relax(i, j, -1, -1, R2); relax(i, j, 1, -1, R2); }
  for (let j = ROWS - 1; j >= 0; j--) for (let i = COLS - 1; i >= 0; i--) { relax(i, j, 1, 0, 1); relax(i, j, 0, 1, 1); relax(i, j, 1, 1, R2); relax(i, j, -1, 1, R2); }
  return d;
}

/** Distancia a tierra en unidades de mundo (0 en tierra o fuera del sangrado). */
export function depthAt(x: number, y: number): number {
  grid ??= build();
  const i = Math.floor((x - X0) / CELL), j = Math.floor((y - Y0) / CELL);
  if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return 0;
  const v = grid[j * COLS + i]!;
  return Number.isFinite(v) ? v * CELL : 0;
}

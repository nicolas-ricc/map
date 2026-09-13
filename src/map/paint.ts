import { MAP_H, MAP_W, RIVER_HALF, coastX, riverCenter } from "./geo";
import { rect, type PixelOp } from "./ops";
import { PALETTE } from "./palette";
import type { Rng } from "./seed";
import { zoneById, type ZoneId } from "./zones";

/** Helpers de pintura compartidos por los pintores de terreno de cada tercio. */

const P = PALETTE;

export interface Box { x0: number; y0: number; x1: number; y1: number }

export const clampRect = (x: number, y: number, w: number, h: number, color: number): PixelOp | null => {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(MAP_W, Math.round(x + w)), y1 = Math.min(MAP_H, Math.round(y + h));
  if (x1 <= x0 || y1 <= y0) return null;
  return rect(x0, y0, x1 - x0, y1 - y0, color);
};

export const push = (out: PixelOp[], op: PixelOp | null): void => { if (op) out.push(op); };

/** Caja con volumen: base, borde superior e izquierdo claros, derecho e inferior oscuros (luz desde el NO). */
export function box(out: PixelOp[], x: number, y: number, w: number, h: number, base: number, light: number, dark: number): void {
  push(out, clampRect(x, y, w, h, base));
  push(out, clampRect(x, y, w, 1, light));
  push(out, clampRect(x, y, 1, h, light));
  push(out, clampRect(x + w - 1, y + 1, 1, h - 1, dark));
  push(out, clampRect(x + 1, y + h - 1, w - 1, 1, dark));
}

export function tree(out: PixelOp[], x: number, y: number, r: number): void {
  push(out, clampRect(x - r, y - r + 1, r * 2, r * 2 - 2, P.leafDark));
  push(out, clampRect(x - r + 1, y - r, r * 2 - 2, r * 2, P.leafDark));
  push(out, clampRect(x - r + 1, y - r + 1, r, r, P.leaf));
}

/** Selva en masas: centros de racimo y 3-7 copas alrededor de cada uno. */
export function paintJungle(out: PixelOp[], rng: Rng, area: Box, clusters: number, avoid: (x: number, y: number) => boolean): void {
  for (let c = 0; c < clusters; c++) {
    const cx = rng.int(area.x0, area.x1), cy = rng.int(area.y0, area.y1);
    if (avoid(cx, cy)) continue;
    const n = rng.int(3, 7);
    for (let i = 0; i < n; i++) {
      const x = cx + rng.int(-10, 10), y = cy + rng.int(-7, 7);
      if (avoid(x, y)) continue;
      tree(out, x, y, rng.int(3, 6));
    }
  }
  for (let i = 0; i < clusters * 2; i++) {
    const x = rng.int(area.x0, area.x1), y = rng.int(area.y0, area.y1);
    if (!avoid(x, y)) push(out, clampRect(x, y, 1, rng.int(3, 9), P.leaf)); // enredaderas
  }
}

export const nearLandmark = (id: ZoneId, r: number) => (x: number, y: number): boolean => {
  const l = zoneById(id).landmark;
  return Math.abs(x - l.x) < r && y > l.y - r * 1.6 && y < l.y + r * 0.5;
};

export const nearWater = (margin: number) => (x: number, y: number): boolean =>
  Math.abs(x - riverCenter(y)) < RIVER_HALF + margin || x > coastX(y) - margin;

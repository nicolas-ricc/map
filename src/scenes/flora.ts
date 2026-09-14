import { v3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";

/** Área de siembra en coordenadas de mundo (no confundir con `city-grid.Rect`, que es x/y/w/d). */
export interface Area { x0: number; x1: number; y0: number; y1: number }

/**
 * Selva compartida por todas las zonas: `n` conos con r 2..4 y h 5..9, 60 % en
 * `leaf` y el resto en `leafDark`, con la base a `z`. El orden de llamadas al
 * rng (material, x, y, r, h) es el que tenía shipyard.ts: no cambia su salida.
 */
export function jungle(out: Solid[], rng: Rng, area: Area, n: number, z = 0.4): void {
  for (let i = 0; i < n; i++) {
    const mat = rng.chance(0.6) ? "leaf" : "leafDark";
    out.push({ kind: "cone", at: v3(rng.int(area.x0, area.x1), rng.int(area.y0, area.y1), z), r: rng.int(2, 4), h: rng.int(5, 9), mat });
  }
}

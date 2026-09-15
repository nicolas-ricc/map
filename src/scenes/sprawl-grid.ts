import { CELL_BLEED, QUAY_X, RIVER_HALF, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, riverCenter } from "../map/geo";
import { estuaryEast } from "./city-grid";

/**
 * Geografía de los márgenes: qué parte del sangrado es tierra construida y de
 * qué zona. Módulo puro y sin rng, como city-grid: lo comparten el terreno
 * (`bleedTerrainAt`) y las escenas del suburbio y del hinterland, así el
 * asfalto y las manzanas no pueden desalinearse.
 * Spec: docs/superpowers/specs/2026-09-15-margenes-urbanos-design.md §3.
 */
export type Built = "industrial" | "urban";

/** Hasta dónde llega la tierra construida desde el borde del contenido, por lado. Múltiplos de CELL_BLEED. */
export const REACH = { n: 8 * CELL_BLEED, w: 8 * CELL_BLEED, s: 16 * CELL_BLEED } as const;
const WOBBLE = 2 * CELL_BLEED;

/** El borde de la tierra construida ondula a lo largo del lado: nunca es una línea recta. */
export function reachAt(side: keyof typeof REACH, along: number): number {
  return REACH[side] + WOBBLE * (0.5 + 0.5 * Math.sin(along / 61 + (side === "s" ? 1.7 : 0.4)));
}

/** Cuánto se aleja el punto del contenido hacia el sur (positivo fuera del contenido). */
const southDist = (y: number): number => y - WORLD.y1;
const westDist = (x: number): number => WORLD.x0 - x;
const northDist = (y: number): number => WORLD.y0 - y;

/** La bahía sigue hacia el norte al este de la orilla oeste del río. */
export const bayWater = (x: number, y: number): boolean => y < WORLD.y0 && x >= riverCenter(y) - RIVER_HALF;
/** Al sur del contenido el estuario sigue hasta juntarse con el mar. */
export const estuaryWater = (x: number, y: number): boolean => y > WORLD.y1 && x >= QUAY_X && x <= estuaryEast(y) && x < ZONE_SPLIT_X;

/**
 * Tierra construida en un punto fuera del contenido, o null si es selva, loma
 * o agua. Industrial al norte y al oeste de Portfolio (`y < ZONE_SPLIT_Y`),
 * urbano al oeste y al sur de Resume. En las esquinas manda el alcance del
 * lado que corresponde a cada eje: la esquina NO es industrial, la SO urbana.
 */
export function builtAt(x: number, y: number): Built | null {
  if (bayWater(x, y) || estuaryWater(x, y) || x > WORLD.x1) return null;
  if (y > WORLD.y1 && x >= QUAY_X) return null; // al sur, desde el muelle hacia el este: estuario, la lengua de selva entre él y el mar, y el mar
  const s = southDist(y), w = westDist(x), n = northDist(y);
  if (s > 0 && s > reachAt("s", x)) return null;
  if (w > 0 && w > reachAt("w", y)) return null;
  if (n > 0 && n > reachAt("n", x)) return null;
  if (s <= 0 && w <= 0 && n <= 0) return null; // adentro del contenido
  return y < ZONE_SPLIT_Y ? "industrial" : "urban";
}

/** Distancia del punto al borde de la tierra construida hacia el norte o el oeste (los lados que quedan detrás de la cámara), 0 sobre ella. */
export function beyondBuilt(x: number, y: number): number {
  const w = westDist(x) - reachAt("w", y), n = northDist(y) - reachAt("n", x);
  return Math.max(0, w, n);
}

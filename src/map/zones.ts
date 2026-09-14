import { MAP_H, MAP_W, pointInPolygon, splitX } from "./geo";
import type { Accent } from "./palette";

export { MAP_H, MAP_W, pointInPolygon };

export type ZoneId = "portfolio" | "cv" | "blog";
export const ZONE_IDS: readonly ZoneId[] = ["portfolio", "cv", "blog"];

export interface ZoneDef {
  id: ZoneId;
  name: string;
  accent: Accent;
  polygon: number[];
  landmark: { x: number; y: number };
  label: { x: number; y: number };
}

/** y donde Portfolio (arriba) y Resume (abajo) se parten, sobre la línea de partición y sobre el borde izquierdo. */
const SPLIT_Y_RIVER = 140;
const SPLIT_Y_LEFT = 144;

/** Vértices sobre la línea de partición entre y0 e y1 (inclusive), cada 20 px más los extremos. */
function splitVertices(y0: number, y1: number): number[] {
  const ys: number[] = [];
  for (let y = y0; y < y1; y += 20) ys.push(y);
  ys.push(y1);
  return ys.flatMap((y) => [splitX(y), y]);
}

function reversePairs(flat: number[]): number[] {
  const out: number[] = [];
  for (let i = flat.length - 2; i >= 0; i -= 2) out.push(flat[i]!, flat[i + 1]!);
  return out;
}

/**
 * Los tres polígonos cubren el lienzo entero sin huecos: comparten exactamente
 * los mismos vértices a lo largo de la línea de partición (izquierda/derecha,
 * a la derecha del río: Blog es la franja más angosta) y de la partición
 * arriba/abajo a la izquierda (Portfolio y Resume, iguales).
 */
export const ZONES: readonly ZoneDef[] = [
  {
    id: "portfolio",
    name: "Portfolio",
    accent: "cyan",
    polygon: [0, 0, ...splitVertices(0, SPLIT_Y_RIVER), 0, SPLIT_Y_LEFT],
    landmark: { x: 196, y: 118 },
    label: { x: 178, y: 126 },
  },
  {
    id: "cv",
    name: "Resume",
    accent: "amber",
    polygon: [0, SPLIT_Y_LEFT, ...splitVertices(SPLIT_Y_RIVER, MAP_H), 0, MAP_H],
    landmark: { x: 130, y: 206 },
    label: { x: 118, y: 214 },
  },
  {
    id: "blog",
    name: "Blog",
    accent: "magenta",
    polygon: [MAP_W, 0, MAP_W, MAP_H, ...reversePairs(splitVertices(0, MAP_H))],
    landmark: { x: 384, y: 120 },
    label: { x: 376, y: 128 },
  },
];

export function zoneById(id: ZoneId): ZoneDef {
  const z = ZONES.find((z) => z.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}

/** Zona a la que pertenece un píxel del lienzo. Fuera del lienzo, la más cercana por landmark. */
export function zoneAt(x: number, y: number): ZoneId {
  const hit = ZONES.find((z) => pointInPolygon(x + 0.5, y + 0.5, z.polygon));
  if (hit) return hit.id;
  return ZONES.reduce((a, b) =>
    Math.hypot(a.landmark.x - x, a.landmark.y - y) < Math.hypot(b.landmark.x - x, b.landmark.y - y) ? a : b).id;
}

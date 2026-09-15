import { v3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { BLEED, BOTTOM, CELL, CELL_BLEED, DOCK, QUAY_X, RIVER_HALF, SHORE_W, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, abyssX, distToHeadland, eastBank, inHeadland, inMouth, riverCenter, shoreWidth, worldZoneAt, type WorldZone } from "../map/geo";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { CITY_EDGE, EAST_RING, estuaryEast, inCrater } from "./city-grid";

/**
 * Terreno de todo el mundo: una grilla facetada de CELL sobre WORLD (el
 * contenido) más una de CELL_BLEED alrededor (el sangrado). Cada zona aporta
 * su clasificador; `terrainAt` despacha por geografía. Una sola malla por
 * grilla garantiza que los vértices en las costuras compartan altura.
 */
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "asphalt" | "sea" | "shore" | "headland" | "reef" | "abyss";
export type BleedTerrain = "jungle" | "sea" | "abyss";

export { CELL };
const WATER_Z = -1;
const REEF_W = 6;

export interface TerrainMesh { ground: Solid[]; bleed: Solid[]; river: Solid; sea: Solid; shore: Solid; abyss: Solid }

export function shipyardTerrainAt(x: number, y: number): Terrain {
  if (x < 0) return y < 110 ? "slab" : "jungle"; // columna oeste: playa de vías y acopios, selva al sur
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab"; // la banda norte (y < 0) es losa de fábrica
  if (x <= eastBank(y) || inMouth(x, y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

export function cityTerrainAt(x: number, y: number): Terrain {
  if (x >= QUAY_X && x <= estuaryEast(y)) return "water";
  if (y < CITY_EDGE.north || y >= CITY_EDGE.south || x < CITY_EDGE.west) return "jungle";
  if (x > QUAY_X && x < EAST_RING.x0) return "jungle";
  if (inCrater(x, y)) return "jungle";
  return "asphalt";
}

export function seaTerrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland";
  const d = distToHeadland(x, y);
  if (d < REEF_W) return "reef";
  if (d < SHORE_W) return "shore";
  if (x < ZONE_SPLIT_X + shoreWidth(y)) return "shore"; // bajío frente a la costa del astillero, la bahía y el malecón
  return x >= abyssX(y) ? "abyss" : "sea";
}

/** Despacha por geografía, no por zona clickeable: el mar y la punta son de seaTerrainAt aunque clickeen Portfolio o Resume. */
export function terrainAt(x: number, y: number): Terrain {
  if (x >= ZONE_SPLIT_X || inHeadland(x, y)) return seaTerrainAt(x, y);
  return y >= ZONE_SPLIT_Y ? cityTerrainAt(x, y) : shipyardTerrainAt(x, y);
}

/** Sangrado: selva al oeste y al sur, selva y bahía al norte (partidas por el río), mar y fosa al este. */
export function bleedTerrainAt(x: number, y: number): BleedTerrain {
  if (x > WORLD.x1) return x >= abyssX(y) ? "abyss" : "sea";
  if (y < WORLD.y0) return x < riverCenter(y) - RIVER_HALF ? "jungle" : "sea";
  return "jungle";
}

const HILL_H = 12, HILL_REACH = 200, HILL_JITTER = 3, ROCK_FROM_Z = 9;
const HILL_TAPER = 72; // las lomas del norte bajan a 0 en las 4 celdas antes del corte selva/bahía, así la selva llega al agua a 0.6 y no hay acantilado sin cara
/** Cuánto se aleja el punto del contenido hacia el norte o el oeste (los lados que quedan detrás de la cámara). */
const behindDist = (x: number, y: number): number => Math.max(0, WORLD.x0 - x, WORLD.y0 - y);
/** Altura base de la selva del sangrado: lomas que suben con la distancia, solo detrás del contenido. Al sur y al este queda chato. */
export function bleedZ(x: number, y: number): number {
  let hill = Math.min(1, behindDist(x, y) / HILL_REACH);
  if (y < WORLD.y0) hill *= Math.min(1, Math.max(0, (riverCenter(y) - RIVER_HALF - x) / HILL_TAPER));
  return 0.6 + HILL_H * hill;
}

const HEADLAND_BASE_Z = 1, HEADLAND_TOP_Z = 7, HEADLAND_RISE_X0 = 330, HEADLAND_RISE_X1 = 355;
/** La punta sube desde su base hasta el faro: rampa en x, con el jitter de `headland` encima. */
export const headlandZ = (x: number): number => {
  const t = Math.min(1, Math.max(0, (x - HEADLAND_RISE_X0) / (HEADLAND_RISE_X1 - HEADLAND_RISE_X0)));
  return HEADLAND_BASE_Z + (HEADLAND_TOP_Z - HEADLAND_BASE_Z) * t;
};

const BASE_Z: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth, asphalt: 0, sea: WATER_Z, shore: WATER_Z, headland: HEADLAND_TOP_Z, reef: 0.5, abyss: WATER_Z };
const JITTER: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0, asphalt: 0.1, sea: 0, shore: 0, headland: 1.5, reef: 0.3, abyss: 0 };
const MAT: Record<Exclude<Terrain, "dock">, Material> = { slab: "slab", water: "water", east: "sand", jungle: "leafDark", asphalt: "asphalt", sea: "waterDeep", shore: "water", headland: "rock", reef: "rock", abyss: "abyss" };
const FLAT = new Set<Terrain>(["water", "sea", "shore", "dock", "abyss"]);
const BLEED_MAT: Record<BleedTerrain, Material> = { jungle: "leafDark", sea: "waterDeep", abyss: "abyss" };

const onSeam = (x: number, y: number): boolean => x === WORLD.x0 || x === WORLD.x1 || y === WORLD.y0 || y === WORLD.y1;
/** z base del contenido en un punto (sin jitter); en la costura las dos grillas usan esto. */
const contentBaseZ = (x: number, y: number): number => {
  const t = terrainAt(Math.min(x, WORLD.x1 - 1), Math.min(y, WORLD.y1 - 1));
  return t === "headland" ? headlandZ(x) : BASE_Z[t];
};

/** Dos triángulos por celda con diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados. */
function cellTris(out: Tri[], x0: number, y0: number, x1: number, y1: number, za: number, zb: number, zc: number, zd: number, flat: number | null, i: number, j: number): void {
  const p = (x: number, y: number, z: number) => v3(x, y, flat ?? z);
  const a = p(x0, y0, za), b = p(x1, y0, zb), c = p(x1, y1, zc), d = p(x0, y1, zd);
  if ((i + j) % 2 === 0) out.push({ pts: [a, b, c] }, { pts: [a, c, d] });
  else out.push({ pts: [a, b, d] }, { pts: [b, c, d] });
}

/** Grilla de CELL_BLEED alrededor de WORLD. Comparte vértices con la de CELL en la costura (lados múltiplos de 18) y ahí no lleva jitter. */
function buildBleed(rng: Rng): Solid[] {
  const bx0 = WORLD.x0 - BLEED.x, by0 = WORLD.y0 - BLEED.y, bx1 = WORLD.x1 + BLEED.x, by1 = WORLD.y1 + BLEED.y;
  const cols = (bx1 - bx0) / CELL_BLEED, rows = (by1 - by0) / CELL_BLEED;
  const inside = (x: number, y: number) => x >= WORLD.x0 && x <= WORLD.x1 && y >= WORLD.y0 && y <= WORLD.y1;
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = bx0 + i * CELL_BLEED, y = by0 + j * CELL_BLEED;
      const r = rng.next() * 2 - 1;
      if (inside(x, y)) { z[j]!.push(onSeam(x, y) ? contentBaseZ(x, y) : 0); continue; } // interior: no se usa; costura: z del contenido
      const t = bleedTerrainAt(x, y);
      if (t !== "jungle") { z[j]!.push(WATER_Z); continue; }
      const base = bleedZ(x, y);
      z[j]!.push(base + r * (base > 0.6 ? HILL_JITTER : JITTER.jungle));
    }
  }
  const tris: Partial<Record<Material, Tri[]>> = { leafDark: [], rock: [], waterDeep: [], abyss: [] };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = bx0 + i * CELL_BLEED, y0 = by0 + j * CELL_BLEED, x1 = x0 + CELL_BLEED, y1 = y0 + CELL_BLEED;
    const cx = x0 + CELL_BLEED / 2, cy = y0 + CELL_BLEED / 2;
    if (inside(cx, cy)) continue;
    const t = bleedTerrainAt(cx, cy);
    const mat: Material = t === "jungle" ? (bleedZ(cx, cy) > ROCK_FROM_Z ? "rock" : "leafDark") : BLEED_MAT[t];
    cellTris(tris[mat]!, x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, t === "jungle" ? null : WATER_Z, i, j);
  }
  return (Object.keys(tris) as Material[]).filter((m) => tris[m]!.length > 0).map((m): Solid => ({ kind: "ground", mat: m, tris: tris[m]! }));
}

/**
 * Grilla de CELL sobre WORLD con alturas por vértice; cada celda son dos
 * triángulos clasificados por su centro. `zones` filtra celdas por zona
 * clickeable (y entonces no hay sangrado: las páginas de zona no lo usan).
 */
export function buildTerrain(rng: Rng, zones?: readonly WorldZone[]): TerrainMesh {
  const cols = (WORLD.x1 - WORLD.x0) / CELL, rows = (WORLD.y1 - WORLD.y0) / CELL;
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = WORLD.x0 + i * CELL, y = WORLD.y0 + j * CELL;
      const t = terrainAt(Math.min(x, WORLD.x1 - 1), Math.min(y, WORLD.y1 - 1));
      const jitter = onSeam(x, y) ? 0 : JITTER[t]; // la costura con el sangrado no lleva jitter: las dos grillas coinciden ahí
      z[j]!.push(contentBaseZ(x, y) + (rng.next() * 2 - 1) * jitter);
    }
  }
  const tris = {} as Record<Terrain, Tri[]>;
  for (const t of Object.keys(BASE_Z) as Terrain[]) tris[t] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = WORLD.x0 + i * CELL, y0 = WORLD.y0 + j * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
    const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
    if (zones && !zones.includes(worldZoneAt(cx, cy))) continue;
    const t = terrainAt(cx, cy);
    if (t === "dock") continue; // el pozo lo amuebla la escena del astillero
    cellTris(tris[t], x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, FLAT.has(t) ? BASE_Z[t] : null, i, j);
  }
  const ground = (t: Exclude<Terrain, "dock">): Solid => ({ kind: "ground", mat: MAT[t], tris: tris[t] });
  return {
    ground: [ground("slab"), ground("east"), ground("jungle"), ground("asphalt"), ground("headland"), ground("reef")],
    bleed: zones ? [] : buildBleed(rng),
    river: ground("water"),
    sea: ground("sea"),
    shore: ground("shore"),
    abyss: ground("abyss"),
  };
}

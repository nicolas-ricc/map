import { v3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { BLEED, BOTTOM, CELL, CELL_BLEED, DOCK, QUAY_X, RIVER_HALF, SHORE_W, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, abyssX, distToHeadland, eastBank, inHeadland, inMouth, riverCenter, shoreWidth, worldZoneAt, type WorldZone } from "../map/geo";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { CITY_EDGE, DISTRICT_BANK_Y, EAST_RING, MALECON_STREET_X, estuaryEast, inCrater } from "./city-grid";
import { depthAt } from "./depth-map";
import { bayWater, beyondBuilt, builtAt, estuaryWater } from "./sprawl-grid";

/**
 * Terreno de todo el mundo: una grilla facetada de CELL sobre WORLD (el
 * contenido) más una de CELL_BLEED alrededor (el sangrado). Cada zona aporta
 * su clasificador; `terrainAt` despacha por geografía. Una sola malla por
 * grilla garantiza que los vértices en las costuras compartan altura. El agua
 * (de contenido y de sangrado) se reparte por profundidad (distancia a
 * tierra) en `TerrainMesh.water`, un `Solid` por `WaterMat` (`shallow`,
 * `water`, `waterDeep`, `abyss`), más `TerrainMesh.foam` junto a la costa;
 * queda estática acá. Un animador de agua futuro reclamará esos `Solid` y les
 * mutará `toneOffset` in place, igual que hoy hace el astillero con sus otros
 * cuerpos animados.
 */
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "asphalt" | "sea" | "shore" | "headland" | "reef" | "abyss";
/** Sangrado: selva y lomas, agua (mar, orilla, fosa, estuario) y tierra construida (industrial de Portfolio, urbana de Resume). */
export type BleedTerrain = "jungle" | "sea" | "shore" | "abyss" | "river" | "industrial" | "urban";

export { CELL };
const WATER_Z = -1;
const REEF_W = 6;

export type WaterMat = "shallow" | "water" | "waterDeep" | "abyss";
export const WATER_MATS: readonly WaterMat[] = ["shallow", "water", "waterDeep", "abyss"];
// FOAM_W = 9 (no el 3 de la spec): la spec mide en unidades finas, pero depthAt cuantiza en la grilla
// de CELL = 6 (más la diagonal, 8.49), así que la primera cadena de celdas de agua junto a tierra ya
// está a 6 u; 9 la cubre sin llegar a la segunda cadena.
export const SHALLOW_D = 12, DEEP_D = 48, FOAM_W = 9, CELL_WATER = 18;
const ABYSS_RAMP = 60;

export interface TerrainMesh { ground: Solid[]; bleed: Solid[]; water: Solid[]; foam: Solid }

export function shipyardTerrainAt(x: number, y: number): Terrain {
  if (x < 0) return y < 110 ? "slab" : "jungle"; // columna oeste: playa de vías y acopios, selva al sur
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab"; // la banda norte (y < 0) es losa de fábrica
  if (x <= eastBank(y) || inMouth(x, y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

export function cityTerrainAt(x: number, y: number): Terrain {
  if (x >= QUAY_X && x <= estuaryEast(y)) return "water";
  if (y < CITY_EDGE.north) return "jungle"; // cinturón de costura con el astillero
  if (y >= DISTRICT_BANK_Y && x > QUAY_X) return x >= MALECON_STREET_X ? "asphalt" : "jungle"; // ribera este del distrito: selva, y la calle del malecón
  if (y >= CITY_EDGE.south || x < CITY_EDGE.west) return "asphalt"; // bordes oeste y sur: el suburbio del sangrado sigue derecho desde el distrito
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

/**
 * Sangrado: mar y fosa al este; al sur, el estuario y el mar siguen hasta
 * juntarse (`seaTerrainAt` clasifica orilla, mar y fosa al este de 344); al
 * norte, la bahía sigue al este del río. La tierra restante es construida
 * (industrial o urbana, `builtAt`) hasta `REACH` y selva con lomas más allá.
 */
export function bleedTerrainAt(x: number, y: number): BleedTerrain {
  if (x > WORLD.x1) return x >= abyssX(y) ? "abyss" : "sea";
  if (y > WORLD.y1 && x >= ZONE_SPLIT_X) { const t = seaTerrainAt(x, y); return t === "abyss" || t === "shore" ? t : "sea"; }
  if (estuaryWater(x, y)) return "river";
  if (bayWater(x, y)) return "sea";
  return builtAt(x, y) ?? "jungle";
}

const HILL_H = 12, HILL_REACH = 180, HILL_JITTER = 3, ROCK_FROM_Z = 9;
const HILL_TAPER = 72; // las lomas del norte bajan a 0 en las 4 celdas antes del corte selva/bahía, así la selva llega al agua a 0.6 y no hay acantilado sin cara
/** Altura base de la selva del sangrado: lomas que suben con la distancia más allá de la tierra construida, solo detrás de ella (norte y oeste). Al sur y al este queda chato. */
export function bleedZ(x: number, y: number): number {
  let hill = Math.min(1, beyondBuilt(x, y) / HILL_REACH);
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
const FLAT = new Set<Terrain>(["dock"]);
const BLEED_MAT: Record<Exclude<BleedTerrain, "sea" | "shore" | "abyss" | "river">, Material> = { jungle: "leafDark", industrial: "slab", urban: "asphalt" };
const WATER_TERRAIN = new Set<Terrain>(["water", "sea", "shore", "abyss"]);
const BLEED_WATER = new Set<BleedTerrain>(["sea", "shore", "abyss", "river"]);
const BLEED_BUILT = new Set<BleedTerrain>(["industrial", "urban"]);

const onSeam = (x: number, y: number): boolean => x === WORLD.x0 || x === WORLD.x1 || y === WORLD.y0 || y === WORLD.y1;
/** z base del contenido en un punto (sin jitter); en la costura las dos grillas usan esto. */
const contentBaseZ = (x: number, y: number): number => {
  const t = terrainAt(Math.min(x, WORLD.x1 - 1), Math.min(y, WORLD.y1 - 1));
  return t === "headland" ? headlandZ(x) : BASE_Z[t];
};

/** Material del agua en un punto por profundidad (distancia a tierra); la fosa manda por geografía. Null en tierra. */
export function waterBand(x: number, y: number): WaterMat | null {
  const inside = x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1;
  const t = inside ? terrainAt(x, y) : bleedTerrainAt(x, y);
  if (inside ? !WATER_TERRAIN.has(t as Terrain) : !BLEED_WATER.has(t as BleedTerrain)) return null;
  if (t === "abyss") return "abyss";
  const d = depthAt(x, y);
  return d < SHALLOW_D ? "shallow" : d <= DEEP_D ? "water" : "waterDeep";
}

/** Posición dentro de la banda, +1 (borde somero, junto a tierra) … −1 (borde profundo), en pasos enteros. */
export function baseToneAt(x: number, y: number, mat: WaterMat): number {
  const d = depthAt(x, y);
  // "shallow" nunca ve d = 0 (depthAt cuantiza en pasos de CELL): la primera celda de agua ya está a
  // CELL de tierra, así que la fracción arranca ahí, no en 0, o toda la banda redondearía a 0.
  const frac = mat === "shallow" ? Math.max(0, (d - CELL) / (SHALLOW_D - CELL)) : mat === "water" ? (d - SHALLOW_D) / (DEEP_D - SHALLOW_D) : mat === "waterDeep" ? Math.min(1, (d - DEEP_D) / DEEP_D) : Math.min(1, Math.max(0, (x - abyssX(y)) / ABYSS_RAMP));
  return Math.max(-1, Math.min(1, Math.round(1 - 2 * frac)));
}

type WaterTris = Record<WaterMat, Tri[]>;
const newWaterTris = (): WaterTris => ({ shallow: [], water: [], waterDeep: [], abyss: [] });

/**
 * Dos triángulos de agua por celda, con `baseTone` por su centro, y copia en
 * `foam` si están a menos de FOAM_W de tierra. `fallback` cubre la subcelda
 * cuyo propio centro clasifica como tierra (agujero de cuarto de celda) pero
 * cuya celda de 18 ya era agua: hereda la banda del centro de esa celda.
 */
function waterCell(w: WaterTris, foam: Tri[], x0: number, y0: number, x1: number, y1: number, i: number, j: number, fallback?: WaterMat): void {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const mat = waterBand(cx, cy) ?? fallback;
  if (!mat) return;
  const tmp: Tri[] = [];
  cellTris(tmp, x0, y0, x1, y1, WATER_Z, WATER_Z, WATER_Z, WATER_Z, WATER_Z, i, j);
  const base = baseToneAt(cx, cy, mat);
  for (const t of tmp) {
    t.baseTone = base;
    w[mat].push(t);
    if (depthAt(cx, cy) < FOAM_W) foam.push({ pts: t.pts });
  }
}

const waterSolids = (w: WaterTris): Solid[] => WATER_MATS.filter((m) => w[m].length > 0).map((m): Solid => ({ kind: "ground", mat: m, tris: w[m] }));

/** Dos triángulos por celda con diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados. */
function cellTris(out: Tri[], x0: number, y0: number, x1: number, y1: number, za: number, zb: number, zc: number, zd: number, flat: number | null, i: number, j: number): void {
  const p = (x: number, y: number, z: number) => v3(x, y, flat ?? z);
  const a = p(x0, y0, za), b = p(x1, y0, zb), c = p(x1, y1, zc), d = p(x0, y1, zd);
  if ((i + j) % 2 === 0) out.push({ pts: [a, b, c] }, { pts: [a, c, d] });
  else out.push({ pts: [a, b, d] }, { pts: [b, c, d] });
}

/** Grilla de CELL_BLEED alrededor de WORLD. Comparte vértices con la de CELL en la costura (lados múltiplos de 18) y ahí no lleva jitter. El agua del sangrado usa celdas de CELL_WATER (= CELL_BLEED: sin subdividir, decisión gateada por medición, ver spec §"Desvíos de la implementación"). */
function buildBleed(rng: Rng, w: WaterTris, foam: Tri[]): Solid[] {
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
      if (BLEED_WATER.has(t)) { z[j]!.push(WATER_Z); continue; }
      if (BLEED_BUILT.has(t)) { z[j]!.push(r * JITTER.asphalt); continue; } // tierra construida: plana como el asfalto del contenido
      const base = bleedZ(x, y);
      z[j]!.push(base + r * (base > 0.6 ? HILL_JITTER : JITTER.jungle));
    }
  }
  const tris: Partial<Record<Material, Tri[]>> = { leafDark: [], rock: [], slab: [], asphalt: [] };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = bx0 + i * CELL_BLEED, y0 = by0 + j * CELL_BLEED, x1 = x0 + CELL_BLEED, y1 = y0 + CELL_BLEED;
    const cx = x0 + CELL_BLEED / 2, cy = y0 + CELL_BLEED / 2;
    if (inside(cx, cy)) continue;
    const t = bleedTerrainAt(cx, cy);
    if (BLEED_WATER.has(t)) { waterCell(w, foam, x0, y0, x1, y1, i, j); continue; }
    const mat: Material = t === "jungle" ? (bleedZ(cx, cy) > ROCK_FROM_Z ? "rock" : "leafDark") : BLEED_MAT[t as "industrial" | "urban"];
    cellTris(tris[mat]!, x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, null, i, j);
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
  const w = newWaterTris(), foam: Tri[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = WORLD.x0 + i * CELL, y0 = WORLD.y0 + j * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
    const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
    if (zones && !zones.includes(worldZoneAt(cx, cy))) continue;
    const t = terrainAt(cx, cy);
    if (t === "dock") continue; // el pozo lo amuebla la escena del astillero
    if (WATER_TERRAIN.has(t)) { waterCell(w, foam, x0, y0, x1, y1, i, j); continue; }
    cellTris(tris[t], x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, FLAT.has(t) ? BASE_Z[t] : null, i, j);
  }
  const ground = (t: Exclude<Terrain, "dock" | "water" | "sea" | "shore" | "abyss">): Solid => ({ kind: "ground", mat: MAT[t], tris: tris[t] });
  return {
    ground: [ground("slab"), ground("east"), ground("jungle"), ground("asphalt"), ground("headland"), ground("reef")],
    bleed: zones ? [] : buildBleed(rng, w, foam),
    water: waterSolids(w),
    foam: { kind: "ground", mat: "foam", tris: foam },
  };
}

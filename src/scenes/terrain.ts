import { v3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { BOTTOM, CELL, DOCK, QUAY_X, WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, distToHeadland, eastBank, inHeadland, inMouth, worldZoneAt, type WorldZone } from "../map/geo";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";

/**
 * Terreno de todo el mundo: una sola grilla facetada de CELL, clasificada
 * por punto. Cada zona aporta su clasificador; `terrainAt` despacha. Una
 * sola malla garantiza que los vértices en las costuras compartan altura.
 */
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "paving" | "sea" | "shore" | "headland" | "reef";

export { CELL };
const WATER_Z = -1;
const JUNGLE_BELT = 12;   // solo del lado ciudad de ZONE_SPLIT_Y; la franja del astillero sale de y >= BOTTOM en shipyardTerrainAt
const SHORE_W = 12;       // agua clara a esta distancia de la tierra
const REEF_W = 6;
const SHORE_WOBBLE = 5;   // amplitud del ondulado del borde exterior de la orilla
/** Ancho de la orilla frente a la costa este, ondulado y determinístico (sin rng: la clasificación es pura). */
const shoreWidth = (y: number): number => SHORE_W + SHORE_WOBBLE * Math.sin(y / 11) + 2 * Math.sin(y / 4.3);

export interface TerrainMesh { ground: Solid[]; river: Solid; sea: Solid; shore: Solid }

export function shipyardTerrainAt(x: number, y: number): Terrain {
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab";
  if (x <= eastBank(y) || inMouth(x, y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

/**
 * La ciudad hereda el canal del astillero y lo abre hacia el sur: en la costura
 * las riberas son exactamente las de la última fila de celdas del astillero.
 * Ruling: el estuario no sigue a `riverCenter` porque el meandro se mueve ~8
 * unidades entre y = 141 y y = 147, o sea más de una celda, y el borde del agua
 * quedaría en distinto lugar de cada lado de la costura: los vértices
 * compartidos tendrían altura plana de un lado y con jitter del otro.
 */
const SEAM_CY = Math.floor(ZONE_SPLIT_Y / CELL) * CELL - CELL / 2; // 141: centro de la última fila de celdas del astillero
const ESTUARY_FLARE = 0.35; // cuánto se abre la ribera este por unidad hacia el sur

const estuaryEast = (y: number): number => eastBank(SEAM_CY) + Math.max(0, y - ZONE_SPLIT_Y) * ESTUARY_FLARE;

export function cityTerrainAt(x: number, y: number): Terrain {
  if (x >= QUAY_X && x <= estuaryEast(y)) return "water";
  if (y < ZONE_SPLIT_Y + JUNGLE_BELT) return "jungle";
  return "paving";
}

export function seaTerrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland";
  const d = distToHeadland(x, y);
  if (d < REEF_W) return "reef";
  if (d < SHORE_W) return "shore";
  // costa del astillero y de la ciudad: agua clara pegada a la tierra. Sigue frente a la bahía
  // (la desembocadura es un bajío) y su borde exterior ondula para que la costa recta del
  // límite de zona no se lea como una raya.
  if (x < ZONE_SPLIT_X + shoreWidth(y)) return "shore";
  return "sea";
}

export function terrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland"; // la base de la punta pisa la zona del astillero
  switch (worldZoneAt(x, y)) {
    case "portfolio": return shipyardTerrainAt(x, y);
    case "cv": return cityTerrainAt(x, y);
    case "blog": return seaTerrainAt(x, y);
  }
}

const HEADLAND_BASE_Z = 1;    // altura de la punta donde nace, junto al muelle de alistamiento
const HEADLAND_TOP_Z = 7;     // altura plena, hacia el faro
const HEADLAND_RISE_X0 = 330; // x donde nace la punta
const HEADLAND_RISE_X1 = 355; // x desde donde tiene altura plena

/** La punta sube desde su base hasta el faro: rampa en x, con el jitter de `headland` encima. */
const headlandZ = (x: number): number => {
  const t = Math.min(1, Math.max(0, (x - HEADLAND_RISE_X0) / (HEADLAND_RISE_X1 - HEADLAND_RISE_X0)));
  return HEADLAND_BASE_Z + (HEADLAND_TOP_Z - HEADLAND_BASE_Z) * t;
};

const BASE_Z: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth, paving: 0, sea: WATER_Z, shore: WATER_Z, headland: HEADLAND_TOP_Z, reef: 0.5 }; // headland: solo referencia; la altura real la da headlandZ(x)
const JITTER: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0, paving: 0.15, sea: 0, shore: 0, headland: 1.5, reef: 0.3 };
const MAT: Record<Exclude<Terrain, "dock">, Material> = { slab: "slab", water: "water", east: "sand", jungle: "leafDark", paving: "paving", sea: "waterDeep", shore: "water", headland: "rock", reef: "rock" };
const FLAT = new Set<Terrain>(["water", "sea", "shore", "dock"]);

/** Grilla de CELL con alturas por vértice; cada celda son dos triángulos clasificados por su centro. `zones` filtra celdas por zona. */
export function buildTerrain(rng: Rng, zones?: readonly WorldZone[]): TerrainMesh {
  const cols = Math.ceil(WORLD_W / CELL), rows = Math.ceil(WORLD_H / CELL);
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = Math.min(i * CELL, WORLD_W - 1), y = Math.min(j * CELL, WORLD_H - 1);
      const t = terrainAt(x, y);
      const base = t === "headland" ? headlandZ(x) : BASE_Z[t];
      z[j]!.push(base + (rng.next() * 2 - 1) * JITTER[t]);
    }
  }
  const tris = {} as Record<Terrain, Tri[]>;
  for (const t of Object.keys(BASE_Z) as Terrain[]) tris[t] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = i * CELL, y0 = j * CELL, x1 = Math.min(x0 + CELL, WORLD_W), y1 = Math.min(y0 + CELL, WORLD_H);
    const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
    if (zones && !zones.includes(worldZoneAt(cx, cy))) continue;
    const t = terrainAt(cx, cy);
    if (t === "dock") continue; // el pozo lo amuebla la escena del astillero
    const p = (x: number, y: number, zz: number) => v3(x, y, FLAT.has(t) ? BASE_Z[t] : zz);
    const a = p(x0, y0, z[j]![i]!), b = p(x1, y0, z[j]![i + 1]!), c = p(x1, y1, z[j + 1]![i + 1]!), d = p(x0, y1, z[j + 1]![i]!);
    // diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados
    if ((i + j) % 2 === 0) tris[t].push({ pts: [a, b, c] }, { pts: [a, c, d] });
    else tris[t].push({ pts: [a, b, d] }, { pts: [b, c, d] });
  }
  const ground = (t: Exclude<Terrain, "dock">): Solid => ({ kind: "ground", mat: MAT[t], tris: tris[t] });
  return {
    ground: [ground("slab"), ground("east"), ground("jungle"), ground("paving"), ground("headland"), ground("reef")],
    river: ground("water"),
    sea: ground("sea"),
    shore: ground("shore"),
  };
}

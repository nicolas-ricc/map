import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { RIVER_HALF, riverCenter } from "../map/geo";
import type { AccentColor } from "../map/palette-iso";
import type { Rng } from "../map/seed";

/**
 * Portfolio: astillero en 2.5D. Mismo plano que terrain-portfolio.ts: línea de
 * producción de oeste a este que termina en el agua (patio de material → nave
 * de montaje → grada → río), calle de transferencia N-S, ribera dragada recta
 * en QUAY_X, dique seco al NE, talleres y playa al SO, muelle de alistamiento
 * del otro lado del río. Coordenadas en unidades del mapa viejo (1 u ≈ 1 px).
 */

export interface Accent { at: Vec3; r: number; color: AccentColor }
export interface Scene {
  ground: Solid[];
  water: Solid[];
  solids: Solid[];
  accents: Accent[];
  trolley: Solid & { kind: "prism" };
  trolleyRange: [number, number];
  weldSpots: Vec3[];
}

export const AREA_W = 344, AREA_H = 146;
// Ruling del controller: 198 (no 200) porque es múltiplo de CELL = 6; con 200
// la celda 198..204 tiene centro 201 (agua) pero vértices en x=198, rompiendo
// la propiedad "todo el agua tiene x >= QUAY_X".
export const QUAY_X = 198, QUAY_W = 4;
export const BOTTOM = 142;
export const CELL = 6;

const STREET_X = 100, STREET_W = 8;
const ROW_Y = [36, 56] as const;
const ROW_H = 16;
const HALL_X = 8, HALL_W = 90, HALL_H = 10;
const SLIP_X = 110;
const GANTRY_X = 150, GANTRY_H = 24;
const DOCK = { x: 120, y: 6, w: 72, d: 24, depth: 6 } as const; // alineado a CELL
const WATER_Z = -1;

type Terrain = "slab" | "water" | "east" | "jungle" | "dock";

const eastBank = (y: number): number => riverCenter(y) + RIVER_HALF;

function terrainAt(x: number, y: number): Terrain {
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab";
  if (x <= eastBank(y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

// ---------------------------------------------------------------- terreno

interface Terrains { ground: Solid[]; water: Solid }

/** Una grilla de CELL con alturas por vértice; cada celda son dos triángulos clasificados por su centro. */
function buildTerrain(rng: Rng): Terrains {
  const cols = Math.ceil(AREA_W / CELL), rows = Math.ceil(AREA_H / CELL);
  const jitter: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0 };
  const base: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth };
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const t = terrainAt(Math.min(i * CELL, AREA_W - 1), Math.min(j * CELL, AREA_H - 1));
      z[j]!.push(base[t] + (rng.next() * 2 - 1) * jitter[t]);
    }
  }
  const tris: Record<Terrain, Tri[]> = { slab: [], water: [], east: [], jungle: [], dock: [] };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = i * CELL, y0 = j * CELL, x1 = Math.min(x0 + CELL, AREA_W), y1 = Math.min(y0 + CELL, AREA_H);
    const t = terrainAt(x0 + CELL / 2, y0 + CELL / 2);
    if (t === "dock") continue; // el pozo se amuebla en Task 9
    const p = (x: number, y: number, zz: number) => v3(x, y, t === "water" ? WATER_Z : zz);
    const a = p(x0, y0, z[j]![i]!), b = p(x1, y0, z[j]![i + 1]!), c = p(x1, y1, z[j + 1]![i + 1]!), d = p(x0, y1, z[j + 1]![i]!);
    // diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados
    if ((i + j) % 2 === 0) tris[t].push({ pts: [a, b, c] }, { pts: [a, c, d] });
    else tris[t].push({ pts: [a, b, d] }, { pts: [b, c, d] });
  }
  return {
    ground: [
      { kind: "ground", mat: "slab", tris: tris.slab },
      { kind: "ground", mat: "sand", tris: tris.east },
      { kind: "ground", mat: "leafDark", tris: tris.jungle },
    ],
    water: { kind: "ground", mat: "water", tris: tris.water },
  };
}

// ---------------------------------------------------------------- piezas

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Solid["mat"], roof?: "flat" | "gable" | "step"): Solid & { kind: "prism" } =>
  roof ? { kind: "prism", at: v3(x, y, z), w, d, h, mat, roof } : { kind: "prism", at: v3(x, y, z), w, d, h, mat };

const strip = (path: Vec2[], width: number, z: number, mat: Solid["mat"]): Solid => ({ kind: "strip", path, width, z, mat });

function quay(out: Solid[]): void {
  out.push(prism(QUAY_X, 0, WATER_Z, QUAY_W, BOTTOM, 1.5, "concrete"));
  for (let y = 6; y < BOTTOM; y += 12) out.push({ kind: "cylinder", at: v3(QUAY_X + 2, y, 0.5), r: 0.7, h: 1, mat: "steel", sides: 6 });
}

function halls(out: Solid[], accents: Accent[]): void {
  for (const y of ROW_Y) {
    out.push(prism(HALL_X, y, 0, HALL_W, ROW_H, HALL_H, "concrete", "gable"));
    for (let x = HALL_X + 6; x < HALL_X + HALL_W - 4; x += 8) accents.push({ at: v3(x, y + ROW_H, 4), r: 1, color: "cyan" }); // ventanas en la pared sur
    accents.push({ at: v3(HALL_X + HALL_W, y + ROW_H / 2, 5), r: 1.6, color: "cyanMid" }); // portón hacia la grada
  }
}

function street(out: Solid[]): void {
  out.push(strip([{ x: STREET_X + STREET_W / 2, y: 0 }, { x: STREET_X + STREET_W / 2, y: BOTTOM }], STREET_W, -0.4, "road"));
  for (const y of ROW_Y) for (const dy of [4, 11]) {
    out.push(strip([{ x: HALL_X + HALL_W, y: y + dy }, { x: SLIP_X, y: y + dy }], 0.5, 0.05, "rail")); // rieles nave → grada
  }
}

function slipways(out: Solid[], weldSpots: Vec3[]): void {
  const w = QUAY_X - SLIP_X, deckZ = 1.5;
  ROW_Y.forEach((y, i) => {
    out.push({ kind: "ramp", at: v3(SLIP_X, y, 0), w, d: ROW_H, h: deckZ, mat: "concrete", dir: "e" });
    const cy = y + ROW_H / 2;
    if (i === 0) {
      // quilla y cuadernas: el casco todavía es un esqueleto
      out.push(prism(SLIP_X + 10, cy - 0.3, deckZ, 70, 0.6, 1, "rust"));
      for (let x = SLIP_X + 12; x < SLIP_X + 80; x += 4) {
        const t = (x - SLIP_X - 12) / 68;
        const half = t > 0.75 ? Math.max(1, 5 * (1 - t) / 0.25) : 5;
        out.push(prism(x, cy - half, deckZ, 0.6, half * 2, 4, "rust"));
        weldSpots.push(v3(x + 0.3, cy - half, deckZ + 4));
        weldSpots.push(v3(x + 0.3, cy + half, deckZ + 4));
      }
    } else {
      out.push({ kind: "hull", at: v3(SLIP_X + 8, cy, deckZ), len: 74, beam: 10, h: 4, mat: "hull" });
      out.push(prism(SLIP_X + 14, cy - 2.5, deckZ + 4, 8, 5, 3, "concrete")); // superestructura en popa
    }
    for (let x = SLIP_X + 6; x < QUAY_X - 8; x += 9) { // andamios
      out.push(prism(x, y + 1, deckZ, 0.6, 0.6, 5, "steel"));
      out.push(prism(x + 4, y + ROW_H - 1.6, deckZ, 0.6, 0.6, 5, "steel"));
    }
  });
}

function gantry(out: Solid[]): { trolley: Solid & { kind: "prism" }; range: [number, number] } {
  const y0 = ROW_Y[0] - 3, y1 = ROW_Y[1] + ROW_H + 1;
  out.push(strip([{ x: SLIP_X, y: y0 + 1.5 }, { x: QUAY_X, y: y0 + 1.5 }], 0.5, 0.05, "rail"));
  out.push(strip([{ x: SLIP_X, y: y1 + 1.5 }, { x: QUAY_X, y: y1 + 1.5 }], 0.5, 0.05, "rail"));
  out.push(prism(GANTRY_X, y0, 0, 3, 3, GANTRY_H, "steel"));
  out.push(prism(GANTRY_X, y1, 0, 3, 3, GANTRY_H, "steel"));
  out.push(prism(GANTRY_X, y0, GANTRY_H, 3, y1 + 3 - y0, 2, "steel")); // viga
  const range: [number, number] = [y0 + 5, y1 - 6];
  const trolley = prism(GANTRY_X - 1, range[0], GANTRY_H + 2, 5, 4, 2, "rust");
  return { trolley, range };
}

export function shipyard(rng: Rng): Scene {
  const terrain = buildTerrain(rng);
  const ground: Solid[] = [...terrain.ground];
  const solids: Solid[] = [];
  const accents: Accent[] = [];
  const weldSpots: Vec3[] = [];
  quay(solids);
  halls(solids, accents);
  street(ground);
  slipways(solids, weldSpots);
  const g = gantry(solids);
  ground.push(...solids.filter((s) => s.kind === "strip"));
  const raised = solids.filter((s) => s.kind !== "strip");
  return { ground, water: [terrain.water], solids: raised, accents, trolley: g.trolley, trolleyRange: g.range, weldSpots };
}

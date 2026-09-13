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
export const STREET_EDGE = STREET_X + STREET_W; // x donde empiezan los faroles
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

// ---------------------------------------------------------------- patio de material (NO)

function materialYard(out: Solid[], rng: Rng): void {
  for (const [x, y] of [[10, 6], [24, 6], [10, 14], [24, 14], [38, 8]] as const) { // chapas apiladas con desfase
    const layers = rng.int(2, 4);
    for (let l = 0; l < layers; l++) out.push(prism(x + l * 0.4, y + l * 0.4, l * 0.5, 10, 2, 0.5, "steel"));
  }
  for (const [x, y] of [[10, 22], [28, 22], [46, 20]] as const) { // mazos de caños
    for (let i = 0; i < 4; i++) out.push(prism(x, y + i * 1.2, 0, 14, 1, 1, "rust"));
  }
  for (let i = 0; i < 6; i++) out.push({ kind: "cylinder", at: v3(55 + (i % 3) * 5, 7 + Math.floor(i / 3) * 5, 0), r: 1.5, h: 1.5, mat: "rust", sides: 8 }); // bobinas
  for (let i = 0; i < 4; i++) out.push(prism(56 + (i % 2) * 12, 18 + Math.floor(i / 2) * 6, 0, 9, 4, 3, "steel", "step")); // secciones de casco
  out.push({ kind: "cylinder", at: v3(80, 10, 0), r: 5, h: 8, mat: "concrete" });
  out.push({ kind: "cylinder", at: v3(92, 22, 0), r: 4, h: 6, mat: "concrete" });
}

// ---------------------------------------------------------------- dique seco (NE)

function dryDock(out: Solid[], ground: Solid[]): void {
  const { x, y, w, d, depth } = DOCK;
  const z = -depth;
  ground.push({ kind: "ground", mat: "concrete", tris: [
    { pts: [v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z)], toneOffset: -1 },
    { pts: [v3(x, y, z), v3(x + w, y + d, z), v3(x, y + d, z)], toneOffset: -1 },
  ] });
  out.push(prism(x - 2, y - 2, z, w + 4, 2, depth, "concrete"));        // muro norte
  out.push(prism(x - 2, y + d, z, w + 4, 2, depth, "concrete"));        // muro sur
  out.push(prism(x - 2, y, z, 2, d, depth, "concrete"));                // muro oeste
  out.push(prism(x + w, y, z, QUAY_X - x - w, d, depth, "concrete"));   // muro este hasta el muelle
  out.push(prism(QUAY_X - 3, y + 2, z, 3, d - 4, depth + 1, "rust"));   // compuerta
  out.push({ kind: "hull", at: v3(x + 6, y + d / 2, z), len: 60, beam: 10, h: 5, mat: "hull" });
  out.push(prism(x + 12, y + d / 2 - 2.5, z + 5, 8, 5, 3, "concrete")); // superestructura
  out.push(prism(x + w - 10, 0, 0, 8, 4, 4, "concrete", "step"));       // casa de bombas (x 182..190, no pisa el muelle en 198..202)
}

// ---------------------------------------------------------------- talleres, playa, vías (SO)

function workshops(out: Solid[], rng: Rng): void {
  for (const x of [46, 74]) {
    out.push(prism(x, 80, 0, 24, 14, 7, "concrete", "step"));
    out.push(prism(x + 3, 83, 7, 2, 2, 1, "steel"));
    out.push(prism(x + 18, 90, 7, 2, 2, 1, "steel"));
  }
  out.push(strip([{ x: 46, y: 113 }, { x: 98, y: 113 }], 26, -0.4, "road")); // playa
  for (let x = 48; x < 98; x += 4) out.push(strip([{ x, y: 102 }, { x, y: 106 }], 0.4, -0.3, "rail")); // líneas
  for (let i = 0; i < 5; i++) {
    const x = 49 + rng.int(0, 11) * 4, y = rng.chance(0.5) ? 102 : 116;
    out.push(prism(x, y, 0, 3, 4, 1.5, rng.chance(0.5) ? "steel" : "rust"));
  }
  for (let i = 0; i < 8; i++) { // secciones prefabricadas entre la calle y el muelle
    if (!rng.chance(0.8)) continue;
    out.push(prism(112 + (i % 4) * 12, 82 + Math.floor(i / 4) * 8, 0, 9, 5, 3, "steel"));
  }
  out.push(strip([{ x: 0, y: 131 }, { x: STREET_X, y: 131 }], 0.5, 0.05, "rail")); // vías
  out.push(strip([{ x: 0, y: 134 }, { x: STREET_X, y: 134 }], 0.5, 0.05, "rail"));
  for (let x = 2; x < STREET_X; x += 4) out.push(prism(x, 130, 0, 1, 5, 0.3, "rust")); // durmientes
}

// ---------------------------------------------------------------- muelle de alistamiento (E)

function fittingOut(out: Solid[], rng: Rng): void {
  for (const x of [304, 316]) out.push(prism(x, 24, 0, 8, 96, 6, "concrete", "gable"));
  out.push({ kind: "cylinder", at: v3(310, 10, 0), r: 4, h: 6, mat: "concrete" });
  for (let i = 0; i < 6; i++) out.push(prism(302 + rng.int(0, 24), 124 + rng.int(0, 10), 0, 3, 2, 1, "rust")); // chatarra
  for (let y = 1; y < AREA_H; y += 3) out.push({ kind: "cone", at: v3(eastBank(y) + 1.5, y, 0), r: 1.6, h: 1.2, mat: "rock", sides: 5 }); // escollera
}

// ---------------------------------------------------------------- selva y faroles

function jungle(out: Solid[], rng: Rng): void {
  const cluster = (x0: number, x1: number, y0: number, y1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const mat = rng.chance(0.6) ? "leaf" : "leafDark";
      out.push({ kind: "cone", at: v3(rng.int(x0, x1), rng.int(y0, y1), 0.4), r: rng.int(2, 4), h: rng.int(5, 9), mat });
    }
  };
  cluster(3, 39, 102, 143, 14);   // SO, bajo las vías
  cluster(332, 340, 2, 143, 10);  // borde este (ruling: 340, no 342: r=4 en x=342 excede AREA_W+1)
  cluster(301, 340, 127, 143, 6); // al sur de los galpones (ruling: 301, no 300: el test exige at.x > 300)
}

function lamps(out: Solid[], accents: Accent[]): void {
  for (const y of [12, 40, 68, 96, 124]) {
    out.push(prism(STREET_EDGE + 0.5, y, 0, 0.6, 0.6, 5, "steel"));
    accents.push({ at: v3(STREET_EDGE + 0.8, y + 0.3, 5), r: 1.2, color: "cyan" });
  }
}

export function shipyard(rng: Rng): Scene {
  const terrain = buildTerrain(rng);
  const ground: Solid[] = [...terrain.ground];
  const solids: Solid[] = [];
  const accents: Accent[] = [];
  const weldSpots: Vec3[] = [];
  quay(solids);
  materialYard(solids, rng);
  dryDock(solids, ground);
  halls(solids, accents);
  street(ground);
  slipways(solids, weldSpots);
  const g = gantry(solids);
  workshops(solids, rng);
  fittingOut(solids, rng);
  jungle(solids, rng);
  lamps(solids, accents);
  ground.push(...solids.filter((s) => s.kind === "strip"));
  const raised = solids.filter((s) => s.kind !== "strip");
  return { ground, water: [terrain.water], solids: raised, accents, trolley: g.trolley, trolleyRange: g.range, weldSpots };
}

import type { Accent } from "../iso/accent";
import { v3, type Vec2 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { WORLD, ZONE_SPLIT_Y } from "../map/geo";
import { BLOCK_W, BOULEVARD, CITY_EDGE, SIDEWALK, WEST_QUAY } from "./city-grid";
import { PLINTH_H, brokenTone, lamp, prism, tiles } from "./city-pieces";
import { jungle } from "./flora";
import { GREEN_BELT, REACH, SUBURB_COLS, suburbBlocks, type SprawlBlock } from "./sprawl-grid";

/**
 * Suburbio de Resume: la ciudad sigue hacia el oeste y el sur del distrito
 * sobre la misma grilla, y se va aflojando con la distancia: manzanas densas
 * de oficinas bajas cerca del contenido, casas en hilera después, baldíos y
 * parques al final. Tres hitos: depósito de agua, estadio e iglesia. Solo
 * existe con el mundo entero (vive sobre el sangrado).
 * Spec: docs/superpowers/specs/2026-09-15-margenes-urbanos-design.md §4.
 */
export interface SuburbScene { ground: Solid[]; solids: Solid[]; accents: Accent[] }

export const DENSE_D = 60, ROWS_D = 160; // distancia al contenido: hasta acá manzanas densas; hasta acá hileras; después baldíos
export const MAX_SUBURB_H = 12;
const HOUSE_MATS: readonly Material[] = ["stone", "office", "officeDark"];
/** Hitos: el depósito de agua al oeste, el estadio y la iglesia al sur. Cada uno reemplaza la manzana que cae en su esquina. */
export const WATER_TOWER = { x: -114, y: 242 } as const;
export const STADIUM = { x: 102, y: 448 } as const;
export const CHURCH = { x: 12, y: 352 } as const;

type Kind = "dense" | "rows" | "park" | "lot" | "waterTower" | "stadium" | "church";

const strip = (path: Vec2[], width: number, z: number, mat: Material): Solid => ({ kind: "strip", path, width, z, mat });

function pickKind(rng: Rng, b: SprawlBlock): Kind {
  if (b.x === WATER_TOWER.x && b.y === WATER_TOWER.y) return "waterTower";
  if (b.x === STADIUM.x && b.y === STADIUM.y) return "stadium";
  if (b.x === CHURCH.x && b.y === CHURCH.y) return "church";
  if (rng.chance(0.12)) return "park";
  if (b.dist < DENSE_D) return "dense";
  if (b.dist < ROWS_D) return rng.chance(0.85) ? "rows" : "lot";
  return rng.chance(0.5) ? "rows" : "lot";
}

/** Dos edificios de oficinas bajos con fachada sobre un zócalo, como la ciudad vieja pero sin torres. */
function dense(out: Solid[], accents: Accent[], rng: Rng, b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK + 1;
  for (const dx of [0, 11]) {
    const h = rng.int(6, MAX_SUBURB_H), mat = rng.pick(HOUSE_MATS);
    out.push(prism(ix + dx, iy, PLINTH_H, 9, 13, h, mat, { facade: { floors: Math.max(2, Math.round(h / 3)), cols: rng.int(2, 3), base: rng.chance(0.5) ? "glass" : "portico" } }));
    out.push(prism(ix + dx - 0.4, iy - 0.4, PLINTH_H + h, 9.8, 13.8, 0.4, mat === "officeDark" ? "office" : "officeDark")); // cornisa
  }
  if (rng.chance(0.5)) lamp(out, accents, b.x + b.w - 1, b.y - 1.5, 0);
}

/** Dos hileras de cuatro casas a dos aguas, con dos árboles en el pasillo del medio. */
function rows(out: Solid[], rng: Rng, b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK;
  for (const dy of [0, 9]) for (let k = 0; k < 4; k++) {
    const mat = HOUSE_MATS[(k + (dy > 0 ? 1 : 0)) % HOUSE_MATS.length]!;
    out.push(prism(ix + k * 5.3, iy + dy, PLINTH_H, 4.6, 6, rng.int(3, 5), mat, { roof: "gable" }));
  }
  for (const dx of [5, 16]) out.push({ kind: "cone", at: v3(ix + dx, iy + 7.5, PLINTH_H), r: 1.2, h: 3, mat: "leaf" });
}

/** Plaza de barrio: suelo de selva facetado, senderos en cruz y conos. */
function park(out: Solid[], ground: Solid[], rng: Rng, b: SprawlBlock): void {
  ground.push(tiles(rng, b, 0.05, "leafDark", brokenTone));
  ground.push(strip([{ x: b.x + b.w / 2, y: b.y }, { x: b.x + b.w / 2, y: b.y + b.d }], 1, 0.08, "paving"));
  ground.push(strip([{ x: b.x, y: b.y + b.d / 2 }, { x: b.x + b.w, y: b.y + b.d / 2 }], 1, 0.08, "paving"));
  jungle(out, rng, { x0: b.x + 2, x1: b.x + b.w - 2, y0: b.y + 2, y1: b.y + b.d - 2 }, rng.int(5, 8), 0.05);
}

/** Baldío: suelo de selva liso (dos triángulos) con una casa suelta o ninguna. */
function lot(out: Solid[], ground: Solid[], rng: Rng, b: SprawlBlock): void {
  const z = 0.05, a = v3(b.x, b.y, z), c = v3(b.x + b.w, b.y, z), d = v3(b.x + b.w, b.y + b.d, z), e = v3(b.x, b.y + b.d, z);
  ground.push({ kind: "ground", mat: "leafDark", tris: [{ pts: [a, c, d], toneOffset: brokenTone(rng) }, { pts: [a, d, e], toneOffset: brokenTone(rng) }] });
  if (rng.chance(0.6)) out.push(prism(b.x + rng.int(2, 12), b.y + rng.int(2, 8), 0.05, 6, 5, rng.int(3, 4), rng.pick(HOUSE_MATS), { roof: "gable" }));
  jungle(out, rng, { x0: b.x + 1, x1: b.x + b.w - 1, y0: b.y + 1, y1: b.y + b.d - 1 }, rng.int(1, 3), 0.05);
}

/** Depósito de agua: tanque de acero sobre cuatro patas, con baliza. */
function waterTower(out: Solid[], accents: Accent[], b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2, legH = 9;
  for (const [dx, dy] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]] as const) out.push(prism(cx + dx - 0.3, cy + dy - 0.3, PLINTH_H, 0.6, 0.6, legH, "steel"));
  out.push({ kind: "cylinder", at: v3(cx, cy, PLINTH_H + legH), r: 3.2, h: 4, mat: "steel", sides: 10 });
  out.push({ kind: "cone", at: v3(cx, cy, PLINTH_H + legH + 4), r: 3.4, h: 1.5, mat: "rust", sides: 10 });
  accents.push({ kind: "dot", at: v3(cx, cy, PLINTH_H + legH + 5.6), r: 0.6, color: "amberMid" });
}

const octagon = (cx: number, cy: number, rx: number, ry: number): Vec2[] => Array.from({ length: 8 }, (_, i) => { const a = ((i + 0.5) / 8) * Math.PI * 2; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });

/** Estadio bajo: anillo octogonal de piedra con el césped encima y cuatro torres de luz. */
function stadium(out: Solid[], accents: Accent[], b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2, h = 5;
  out.push({ kind: "poly", footprint: octagon(cx, cy, 11, 8), z: PLINTH_H, h, mat: "stone" });
  out.push({ kind: "poly", footprint: octagon(cx, cy, 8.5, 5.8), z: PLINTH_H + h, h: 0.3, mat: "leafDark" });
  for (const [dx, dy] of [[-9, -6], [9, -6], [9, 6], [-9, 6]] as const) {
    out.push(prism(cx + dx - 0.3, cy + dy - 0.3, PLINTH_H, 0.6, 0.6, 12, "steel"));
    accents.push({ kind: "dot", at: v3(cx + dx, cy + dy, PLINTH_H + 12), r: 0.9, color: "amber" });
  }
}

/** Iglesia: nave de piedra a dos aguas y torre con chapitel de cobre. */
function church(out: Solid[], accents: Accent[], b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const ix = b.x + SIDEWALK + 2, iy = b.y + SIDEWALK + 2;
  out.push(prism(ix + 4, iy, PLINTH_H, 12, 9, 6, "stone", { roof: "gable" }));
  out.push(prism(ix, iy + 2, PLINTH_H, 4, 5, 12, "stone"));
  out.push({ kind: "cone", at: v3(ix + 2, iy + 4.5, PLINTH_H + 12), r: 2.6, h: 4, mat: "copper", sides: 4 });
  const wx = ix + 10, wy = iy + 9.02; // rosetón encendido en la cara sur de la nave
  accents.push({ kind: "poly", pts: [v3(wx - 1, wy, PLINTH_H + 3), v3(wx + 1, wy, PLINTH_H + 3), v3(wx + 1, wy, PLINTH_H + 5), v3(wx - 1, wy, PLINTH_H + 5)], color: "amberBleed", alpha: 0.9 });
}

/** La avenida del distrito sigue hacia el oeste: cordones, cantero central con árboles y faroles. */
function avenue(ground: Solid[], solids: Solid[], accents: Accent[]): void {
  const x0 = SUBURB_COLS[SUBURB_COLS.length - 1]!, x1 = CITY_EDGE.west;
  for (const y of [BOULEVARD.y0 - 0.3, BOULEVARD.y1 + 0.3]) ground.push(strip([{ x: x0, y }, { x: x1, y }], 0.4, 0.05, "paving"));
  for (const x of SUBURB_COLS) {
    solids.push(prism(x, BOULEVARD.y0, 0, BLOCK_W, BOULEVARD.y1 - BOULEVARD.y0, 0.3, "leafDark"));
    for (const dx of [4, 12, 20]) solids.push({ kind: "cone", at: v3(x + dx, BOULEVARD.y0 + 2, 0.3), r: 1.5, h: 4, mat: "leaf" });
    lamp(solids, accents, x + 12, BOULEVARD.y0 - 5.3, 0);
  }
}

/** El muro de la ribera oeste sigue al sur del distrito hasta donde llega el suburbio. */
function quay(solids: Solid[]): void {
  const { x0, x1 } = WEST_QUAY;
  solids.push(prism(x0, CITY_EDGE.south, -1, x1 - x0, WORLD.y1 + REACH.s - CITY_EDGE.south, 1.6, "plaza"));
  for (let y = CITY_EDGE.south + 8; y < WORLD.y1 + REACH.s; y += 16) solids.push({ kind: "cylinder", at: v3(x0 + 3, y, 0.6), r: 0.4, h: 0.8, mat: "rust", sides: 6 });
}

export function suburb(rng: Rng): SuburbScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  for (const b of suburbBlocks()) {
    switch (pickKind(rng, b)) {
      case "dense": dense(solids, accents, rng, b); break;
      case "rows": rows(solids, rng, b); break;
      case "park": park(solids, ground, rng, b); break;
      case "lot": lot(solids, ground, rng, b); break;
      case "waterTower": waterTower(solids, accents, b); break;
      case "stadium": stadium(solids, accents, b); break;
      case "church": church(solids, accents, b); break;
    }
  }
  avenue(ground, solids, accents);
  quay(solids);
  jungle(solids, rng, { x0: -238, x1: WORLD.x0 - 2, y0: ZONE_SPLIT_Y + 2, y1: GREEN_BELT.y1 - 2 }, 14); // la mitad de Resume del cinturón verde, al oeste del contenido
  return { ground, solids, accents };
}

import type { Accent } from "../iso/accent";
import { facadeAccents, isWall, windowPatches, type Facade } from "../iso/facade";
import { centroid, v3, type Vec3 } from "../iso/geometry";
import { STEP_INSET, STEP_RATIO, tessellate, type Solid, type Tri } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { PLAZA, SIDEWALK, TOWER, blocks, type Block, type Rect } from "./city-grid";
import { jungle } from "./flora";

/**
 * Resume: ciudad de oficinas en grilla, tragada por la selva, partida por el
 * estuario. El terreno (terrain.ts) es el asfalto; acá van los zócalos de cada
 * manzana, los edificios con fachada, la plaza con la torre del piso encendido,
 * y después (segunda tanda) avenida, puente, malecón, derrumbe, autos y selva.
 * Spec: docs/superpowers/specs/2026-09-14-resume-ciudad-design.md.
 */
export const PLINTH_H = 0.3;
export const TOWER_H = 30;
export const MAX_BUILDING_H = 18;
const FLOOR_H = 3;
const TILE = 6; // baldosa de la plaza y del suelo devorado

export interface CityScene {
  ground: Solid[];   // baldosas de la plaza, suelo de manzanas devoradas, carriles
  solids: Solid[];
  accents: Accent[]; // faroles y derrame de luz; las ventanas encendidas y la antena las anima city-anim
  tower: { litWindows: Accent[]; antenna: Vec3; paperWindow: Vec3 };
}

type Prism = Solid & { kind: "prism" };
type Extra = { roof?: "flat" | "gable" | "step"; facade?: Facade };

// ---------------------------------------------------------------- piezas

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, extra: Extra = {}): Prism => {
  const p: Prism = { kind: "prism", at: v3(x, y, z), w, d, h, mat };
  if (extra.roof) p.roof = extra.roof;
  if (extra.facade) p.facade = extra.facade;
  return p;
};

/** Suelo facetado de baldosas: `TILE`×`TILE`, un tercio con toneOffset ±1 (baldosas rotas). */
function tiles(rng: Rng, r: Rect, z: number, mat: Material): Solid {
  const tris: Tri[] = [];
  const off = (): number => (rng.chance(1 / 3) ? rng.pick([-1, 1]) : 0);
  for (let x = r.x; x < r.x + r.w; x += TILE) for (let y = r.y; y < r.y + r.d; y += TILE) {
    const w = Math.min(TILE, r.x + r.w - x), d = Math.min(TILE, r.y + r.d - y);
    const a = v3(x, y, z), b = v3(x + w, y, z), c = v3(x + w, y + d, z), dd = v3(x, y + d, z);
    tris.push({ pts: [a, b, c], toneOffset: off() }, { pts: [a, c, dd], toneOffset: off() });
  }
  return { kind: "ground", mat, tris };
}

function lamp(solids: Solid[], accents: Accent[], x: number, y: number, z: number): void {
  solids.push(prism(x, y, z, 0.6, 0.6, 5, "steel"));
  accents.push({ kind: "dot", at: v3(x + 0.3, y + 0.3, z + 5), r: 0.6, color: "amber" });
}

// ---------------------------------------------------------------- edificios

/**
 * Prisma con fachada, cornisa de material contrario y un detalle de techo.
 * `z` es la base (el zócalo). Ruling del controller: con techo escalonado la
 * cornice y el detalle de techo se apoyan sobre la huella del segundo nivel
 * (retranqueada), no sobre la base completa, porque un elemento de ancho
 * completo quedaría flotando sobre el retranqueo.
 */
function building(out: Solid[], rng: Rng, x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, roof?: "step"): void {
  const facade: Facade = { floors: Math.max(1, Math.round(h / FLOOR_H)), cols: rng.int(2, 4), base: rng.chance(0.5) ? "glass" : "portico" };
  out.push(prism(x, y, z, w, d, h, mat, roof ? { roof, facade } : { facade }));
  const cornice: Material = mat === "office" ? "officeDark" : "office";
  if (roof === "step") {
    const ix = w * STEP_INSET, iy = d * STEP_INSET;
    const top = z + h + h * STEP_RATIO;
    out.push(prism(x + ix - 0.5, y + iy - 0.5, top, w - 2 * ix + 1, d - 2 * iy + 1, 0.4, cornice));
    roofDetail(out, rng, x + ix, y + iy, w - 2 * ix, d - 2 * iy, top + 0.4);
  } else {
    const top = z + h;
    out.push(prism(x - 0.5, y - 0.5, top, w + 1, d + 1, 0.4, cornice));
    roofDetail(out, rng, x, y, w, d, top + 0.4);
  }
}

function roofDetail(out: Solid[], rng: Rng, x: number, y: number, w: number, d: number, z: number): void {
  const cx = x + w / 2, cy = y + d / 2;
  switch (rng.int(0, 3)) {
    case 0: // tanque de agua sobre cuatro postes
      for (const [dx, dy] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]] as const) out.push(prism(cx + dx - 0.15, cy + dy - 0.15, z, 0.3, 0.3, 1.2, "steel"));
      out.push({ kind: "cylinder", at: v3(cx, cy, z + 1.2), r: 1.2, h: 2, mat: "rust", sides: 6 });
      return;
    case 1: out.push(prism(x + 1, y + 1, z, 4, 3, 2, "officeDark")); return; // sala de máquinas
    case 2: out.push({ kind: "cylinder", at: v3(x + w - 1.5, y + 1.5, z), r: 0.2, h: 4, mat: "steel", sides: 4 }); return; // antena
    default: for (const [dx, dy] of [[2, 2], [w - 2, d - 2]] as const) out.push({ kind: "cone", at: v3(x + dx, y + dy, z), r: 1.2, h: 2.5, mat: "leaf" }); // terraza con selva
  }
}

type BlockType = "tower" | "pair" | "low" | "eaten";

function pickType(rng: Rng, maxH: number): BlockType {
  const r = rng.next();
  const t: BlockType = r < 0.3 ? "tower" : r < 0.6 ? "pair" : r < 0.8 ? "low" : "eaten";
  return t === "tower" && maxH < 12 ? "pair" : t;
}

/** Una manzana común: zócalo más contenido por rng. `maxH` topa la altura (fila frente a la torre). */
function block(solids: Solid[], ground: Solid[], rng: Rng, b: Block, maxH: number): void {
  const type = pickType(rng, maxH);
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK, iw = b.w - 2 * SIDEWALK, id = b.d - 2 * SIDEWALK; // huella útil 21×15
  if (type === "eaten") {
    ground.push(tiles(rng, b, 0.05, "leafDark"));
    solids.push(prism(b.x, b.y, 0, 10, 8, PLINTH_H, "paving"), prism(b.x + 14, b.y + 10, 0, 10, 8, PLINTH_H, "paving"));
    if (rng.chance(0.5)) solids.push(prism(b.x, b.y + 12, 0, 8, 6, PLINTH_H, "paving"));
    solids.push(prism(b.x + 12, b.y + 2, 0.05, 5, 4, rng.int(2, 3), "officeDark")); // ruina, sin pisar ninguna de las tres losas
    jungle(solids, rng, { x0: b.x + 2, x1: b.x + b.w - 2, y0: b.y + 2, y1: b.y + b.d - 2 }, rng.int(6, 9), 0.05);
    return;
  }
  solids.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  if (type === "tower") {
    const w = rng.int(12, 14), d = rng.int(10, 12), h = rng.int(12, Math.min(16, maxH));
    building(solids, rng, ix + (iw - w) / 2, iy + (id - d) / 2, PLINTH_H, w, d, h, "office");
  } else if (type === "pair") {
    const y = iy + (id - 13) / 2;
    building(solids, rng, ix, y, PLINTH_H, 9, 13, rng.int(7, Math.min(10, maxH)), "office");
    building(solids, rng, ix + 11, y, PLINTH_H, 9, 13, rng.int(7, Math.min(10, maxH)), rng.chance(0.5) ? "officeDark" : "office");
  } else {
    const h = rng.int(4, 6);
    building(solids, rng, ix, iy, PLINTH_H, iw, 7, h, "office", "step");
    building(solids, rng, ix, iy + 7, PLINTH_H, 7, 8, h, "office");
    for (const [dx, dy] of [[15, 12], [19, 14]] as const) solids.push({ kind: "cone", at: v3(b.x + dx, b.y + dy, PLINTH_H), r: 1.5, h: 3, mat: "leaf" });
  }
}

/** Ruling: frente a la torre (fila sur, x 96..162) nada supera 10 para que sus ventanas encendidas no floten sobre otro edificio. */
const maxHeightFor = (b: Block): number => (b.row === 3 && b.x >= 96 && b.x + b.w <= 162 ? 10 : MAX_BUILDING_H);

// ---------------------------------------------------------------- plaza y torre

function plazaAndTower(solids: Solid[], ground: Solid[], accents: Accent[], rng: Rng): CityScene["tower"] {
  ground.push(tiles(rng, PLAZA, 0.05, "plaza"));
  // cordón: cuatro prismas finos alrededor de la plaza
  solids.push(prism(PLAZA.x, PLAZA.y, 0, PLAZA.w, 0.6, PLINTH_H, "plaza"), prism(PLAZA.x, PLAZA.y + PLAZA.d - 0.6, 0, PLAZA.w, 0.6, PLINTH_H, "plaza"));
  solids.push(prism(PLAZA.x, PLAZA.y, 0, 0.6, PLAZA.d, PLINTH_H, "plaza"), prism(PLAZA.x + PLAZA.w - 0.6, PLAZA.y, 0, 0.6, PLAZA.d, PLINTH_H, "plaza"));

  const facade: Facade = { floors: 8, cols: 4, litFloor: 5, base: "portico" };
  const tower = prism(TOWER.x, TOWER.y, 0, TOWER.w, TOWER.d, TOWER_H, "officeDark", { facade });
  solids.push(tower);
  solids.push(prism(TOWER.x - 0.5, TOWER.y - 0.5, TOWER_H, TOWER.w + 1, TOWER.d + 1, 0.4, "office"));       // cornisa
  solids.push(prism(TOWER.x + 5, TOWER.y + 5, TOWER_H + 0.4, 6, 4, 2.5, "officeDark"));                     // sala de máquinas
  const mast = v3(TOWER.x + 8, TOWER.y + 7, TOWER_H + 2.9);
  solids.push({ kind: "cylinder", at: mast, r: 0.3, h: 5, mat: "steel", sides: 4 });                        // antena
  // selva trepando: conos en la base y dos prismas finos sobre las aristas NO y SE
  for (const [dx, dy] of [[-1.5, -1.5], [TOWER.w + 1.5, -1.5], [TOWER.w + 1.5, TOWER.d + 1.5], [-1.5, TOWER.d + 1.5]] as const) solids.push({ kind: "cone", at: v3(TOWER.x + dx, TOWER.y + dy, 0.05), r: 2.5, h: 6, mat: "leaf" });
  solids.push(prism(TOWER.x - 0.6, TOWER.y - 0.6, 0, 0.6, 0.6, 12, "leaf"), prism(TOWER.x + TOWER.w, TOWER.y + TOWER.d, 0, 0.6, 0.6, 12, "leaf"));
  // ventanas del piso encendido, solo en las paredes que mira la cámara (este y sur)
  const walls = tessellate(tower).filter((f) => isWall(f) && f.mat === "officeDark" && f.toneOffset === 0);
  const litWindows = facadeAccents(walls, facade, "amber");
  const east = walls.find((f) => f.normal.x > 0.5)!;
  const paperWindow = centroid(windowPatches(east, facade, facade.litFloor!)[facade.cols - 1]!);
  // derrame de luz en la plaza, bancos y faroles
  for (const [x, y] of [[TOWER.x - 2.5, TOWER.y - 1.5], [TOWER.x + TOWER.w + 2.5, TOWER.y - 1.5], [TOWER.x + TOWER.w + 2.5, TOWER.y + TOWER.d + 1.5], [TOWER.x - 2.5, TOWER.y + TOWER.d + 1.5]] as const) accents.push({ kind: "dot", at: v3(x, y, 0.1), r: 3, color: "amberBleed" });
  for (const [x, y] of [[PLAZA.x + 4, PLAZA.y + 3], [PLAZA.x + PLAZA.w - 6, PLAZA.y + 3], [PLAZA.x + 4, PLAZA.y + PLAZA.d - 3.6], [PLAZA.x + PLAZA.w - 6, PLAZA.y + PLAZA.d - 3.6]] as const) solids.push(prism(x, y, 0.05, 2, 0.6, 0.5, "paving"));
  lamp(solids, accents, PLAZA.x + 2, PLAZA.y + PLAZA.d / 2, 0.05);
  lamp(solids, accents, PLAZA.x + PLAZA.w - 2.6, PLAZA.y + PLAZA.d / 2, 0.05);
  return { litWindows, antenna: v3(mast.x, mast.y, mast.z + 5), paperWindow };
}

// ---------------------------------------------------------------- escena

export function city(rng: Rng): CityScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  for (const b of blocks()) if (b.kind === "block") block(solids, ground, rng, b, maxHeightFor(b));
  const tower = plazaAndTower(solids, ground, accents, rng);
  return { ground, solids, accents, tower };
}

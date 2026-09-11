import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE, type Accent } from "./palette";
import type { ZoneId } from "./zones";

export const LANDMARK_SIZE = 56;
export const GLOW_W = 64;
export const GLOW_H = 16;

const P = PALETTE;

/** Caja con volumen: base, borde superior e izquierdo claros, derecho e inferior oscuros. */
function box(x: number, y: number, w: number, h: number, base: number, light: number, dark: number): PixelOp[] {
  return [rect(x, y, w, h, base), rect(x, y, w, 1, light), rect(x, y, 1, h, light), rect(x + w - 1, y + 1, 1, h - 1, dark), rect(x + 1, y + h - 1, w - 1, 1, dark)];
}

const RUST = [P.rust, P.rustLight, P.rustDark] as const;
const CONC = [P.concrete, P.concreteLight, P.concreteDark] as const;

/** Container 16x7 con las dos puertas marcadas. */
function container(x: number, y: number, tone: readonly [number, number, number]): PixelOp[] {
  return [...box(x, y, 16, 7, tone[0], tone[1], tone[2]), rect(x + 7, y + 1, 1, 5, tone[2]), rect(x + 9, y + 1, 1, 5, tone[2])];
}

/** Portfolio: torre de containers sobre el muelle, grúa oxidada, taller con la puerta encendida. */
function portfolio(): PixelOp[][] {
  const C = ACCENTS.cyan;
  const base: PixelOp[] = [
    rect(4, 50, 50, 3, P.concreteDark), // sombra sobre el muelle
    // taller
    ...box(1, 33, 16, 17, P.concrete, P.concreteLight, P.concreteDark),
    rect(0, 32, 18, 1, P.concreteLight), rect(3, 35, 12, 1, P.concreteDark), // alero y chapa
    rect(6, 42, 5, 8, C.mid), rect(7, 43, 3, 7, C.core), // puerta encendida
    rect(13, 37, 2, 2, C.mid), // ventanita
    // containers: tres niveles desfasados
    ...container(19, 43, RUST), ...container(36, 43, CONC),
    ...container(23, 36, CONC), ...container(40, 36, RUST),
    ...container(31, 29, RUST),
    // grúa: mástil, pluma, contrapeso, riostras
    rect(51, 6, 3, 44, P.rustDark), rect(51, 6, 1, 44, P.rustLight),
    rect(12, 6, 43, 2, P.rust), rect(12, 6, 43, 1, P.rustLight),
    rect(50, 2, 6, 4, P.concrete), rect(50, 2, 6, 1, P.concreteLight),
    px(48, 9, P.rust), px(46, 11, P.rust), px(44, 13, P.rust), px(42, 15, P.rust),
    rect(20, 8, 1, 9, P.road), // cable
    px(13, 7, C.core), // luz en la punta de la pluma
  ];
  const hookA = [rect(19, 17, 3, 2, P.rustLight)];
  const hookB = [rect(20, 8, 1, 10, P.road), rect(19, 18, 3, 2, P.rustLight)];
  const sparksA = [px(11, 40, C.core), px(13, 38, C.core), px(9, 37, C.mid)];
  const sparksB = [px(12, 39, C.core), px(10, 36, C.mid), px(14, 41, C.core)];
  return [[...base, ...hookA, ...sparksA], [...base, ...hookB, ...sparksB], [...base, ...hookA]];
}

/** CV: torre de oficinas hundida en la selva, un solo piso encendido, papeles volando. */
function cv(): PixelOp[][] {
  const A = ACCENTS.amber;
  const base: PixelOp[] = [
    rect(6, 50, 44, 3, P.leafDark), // sombra
    // cuerpo, con cara derecha en sombra
    ...box(14, 8, 28, 42, P.concrete, P.concreteLight, P.concreteDark),
    rect(40, 9, 2, 41, P.concreteDark),
    rect(13, 7, 30, 1, P.concreteLight), // cornisa
    rect(24, 3, 8, 4, P.concreteDark), rect(24, 3, 8, 1, P.concrete), // sala de máquinas
    rect(28, 0, 1, 3, P.rust), // antena
    // losas entre pisos
    ...[15, 21, 27, 33, 39, 45].map((y) => rect(15, y, 25, 1, P.concreteDark)),
    // ventanas apagadas, 4 columnas x 6 filas
    ...[10, 16, 22, 28, 34, 40].flatMap((y) => [17, 23, 29, 35].map((x) => rect(x, y, 3, 3, P.ground))),
    // el único piso encendido
    rect(17, 28, 3, 3, A.core), rect(23, 28, 3, 3, A.mid), rect(29, 28, 3, 3, A.core), rect(35, 28, 3, 3, A.core),
    rect(15, 27, 25, 1, A.bleed), // derrame en la losa
    // ventanas rotas
    rect(23, 16, 3, 3, P.rock), rect(35, 40, 3, 3, P.rock), px(24, 17, P.ground),
    // selva trepando la fachada y tapando la base
    rect(16, 30, 1, 20, P.leaf), rect(38, 18, 1, 32, P.leafDark), rect(20, 40, 1, 10, P.leaf), rect(33, 36, 1, 14, P.leafDark),
    rect(4, 40, 12, 10, P.leafDark), rect(5, 40, 6, 5, P.leaf),
    rect(38, 42, 16, 8, P.leafDark), rect(39, 42, 7, 4, P.leaf),
    rect(0, 46, 8, 4, P.leafDark), rect(50, 47, 6, 3, P.leafDark),
    rect(12, 44, 32, 6, P.leafDark), rect(13, 44, 10, 3, P.leaf),
  ];
  const lightA = [px(28, 0, A.core)];
  const lightB = [px(28, 0, A.mid), rect(23, 28, 3, 3, A.core)]; // parpadeo del piso
  const papersA = [px(44, 30, A.core), px(47, 33, A.mid), px(43, 36, A.mid)];
  const papersB = [px(45, 32, A.mid), px(48, 29, A.core), px(42, 35, A.core)];
  return [[...base, ...lightA, ...papersA], [...base, ...lightB, ...papersB]];
}

/** Blog: faro sobre las rocas, haz magenta que gira, casa del farero. */
function blog(): PixelOp[][] {
  const M = ACCENTS.magenta;
  const base: PixelOp[] = [
    // rocas de la punta
    rect(6, 46, 44, 7, P.rock), rect(8, 45, 14, 2, P.rockLight), rect(30, 44, 12, 3, P.rockLight),
    rect(2, 49, 8, 4, P.rock), rect(46, 48, 10, 5, P.rock), px(20, 48, P.rockLight), px(44, 50, P.rockLight),
    rect(30, 46, 14, 1, P.ground), // sombra de la torre
    // casa del farero
    rect(37, 34, 18, 2, P.rustDark), rect(38, 33, 16, 1, P.rust), // techo
    ...box(38, 36, 16, 10, P.concrete, P.concreteLight, P.concreteDark),
    rect(43, 41, 3, 5, P.concreteDark), rect(48, 39, 3, 3, M.bleed), // puerta y ventana
    // galería y linterna
    rect(19, 7, 18, 2, P.concreteDark), rect(19, 6, 1, 1, P.rust), rect(36, 6, 1, 1, P.rust), rect(24, 6, 1, 1, P.rust), rect(31, 6, 1, 1, P.rust),
    rect(23, 1, 10, 6, P.road), rect(24, 0, 8, 1, P.rustDark), rect(26, 0, 4, 1, P.rust),
  ];
  // torre cónica a franjas: hormigón y óxido, con luz a la izquierda y sombra a la derecha
  for (let y = 9; y < 46; y++) {
    const w = 8 + Math.floor(((y - 9) / 37) * 6);
    const x = 28 - Math.floor(w / 2);
    const tone = Math.floor((y - 9) / 6) % 2 === 0 ? CONC : RUST;
    base.push(rect(x, y, w, 1, tone[0]), px(x, y, tone[1]), rect(x + w - 2, y, 2, 1, tone[2]));
  }
  const lanternDim = [rect(24, 2, 8, 4, M.mid), rect(27, 2, 2, 4, M.core)];
  const lanternFull = [rect(24, 2, 8, 4, M.core)];
  // el haz se abre a medida que se aleja de la linterna
  const beamLeft = [rect(0, 1, 8, 1, M.bleed), rect(0, 2, 16, 1, M.bleed), rect(0, 3, 24, 1, M.mid), rect(0, 4, 16, 1, M.bleed), rect(0, 5, 8, 1, M.bleed)];
  const beamRight = [rect(48, 1, 8, 1, M.bleed), rect(40, 2, 16, 1, M.bleed), rect(32, 3, 24, 1, M.mid), rect(40, 4, 16, 1, M.bleed), rect(48, 5, 8, 1, M.bleed)];
  return [[...base, ...lanternDim, ...beamLeft], [...base, ...lanternFull], [...base, ...lanternDim, ...beamRight]];
}

export function landmarkFrames(id: ZoneId): PixelOp[][] {
  switch (id) {
    case "portfolio": return portfolio();
    case "cv": return cv();
    case "blog": return blog();
  }
}

export function glowOps(accent: Accent): PixelOp[] {
  const a = ACCENTS[accent];
  const out: PixelOp[] = [];
  const cx = GLOW_W / 2, cy = GLOW_H / 2;
  for (let y = 0; y < GLOW_H; y++) {
    const dy = Math.abs(y - cy) / cy;
    const half = Math.round((1 - dy) * cx);
    if (half <= 0) continue;
    out.push(rect(cx - half, y, half * 2, 1, a.bleed));
    const inner = Math.round(half * 0.45);
    if (inner > 0 && dy < 0.5) out.push(rect(cx - inner, y, inner * 2, 1, a.mid));
  }
  return out;
}

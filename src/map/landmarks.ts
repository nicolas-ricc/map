import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE, type Accent } from "./palette";
import { textOps } from "./pixelfont";
import type { ZoneId } from "./zones";

export const LANDMARK_SIZE = 40;
export const GLOW_W = 48;
export const GLOW_H = 28;

const G = PALETTE.ground, R = PALETTE.rust, C = PALETTE.concrete, RD = PALETTE.road;

/** Portfolio: torre de containers + grúa + taller con chispas. */
function portfolio(): PixelOp[][] {
  const base: PixelOp[] = [
    // containers apilados (3 niveles, desfasados)
    rect(6, 30, 18, 6, R), rect(7, 31, 16, 1, G),
    rect(9, 24, 18, 6, C), rect(10, 25, 16, 1, G),
    rect(5, 18, 18, 6, R), rect(6, 19, 16, 1, G),
    // grúa: mástil y brazo
    rect(28, 6, 2, 30, RD), rect(14, 6, 24, 2, RD), rect(14, 8, 1, 6, RD), // cable
    // taller a la derecha, con puerta iluminada
    rect(26, 28, 12, 8, C), rect(30, 31, 4, 5, ACCENTS.cyan.mid), rect(31, 32, 2, 4, ACCENTS.cyan.core),
    // suelo
    rect(2, 36, 36, 2, RD),
    // luz de la punta de la grúa
    px(37, 6, ACCENTS.cyan.core),
  ];
  const sparksA = [px(29, 26, ACCENTS.cyan.core), px(31, 24, ACCENTS.cyan.core), px(27, 23, ACCENTS.cyan.mid)];
  const sparksB = [px(30, 25, ACCENTS.cyan.core), px(28, 22, ACCENTS.cyan.mid), px(32, 27, ACCENTS.cyan.core)];
  const hookA = [rect(14, 14, 3, 2, RD)];
  const hookB = [rect(14, 15, 3, 2, RD)];
  return [[...base, ...sparksA, ...hookA], [...base, ...sparksB, ...hookB], [...base, ...hookA]];
}

/** CV: edificio de oficinas hundido en la selva, un piso encendido, cartel ABIERTO fallando. */
function cv(): PixelOp[][] {
  const A = ACCENTS.amber;
  const base: PixelOp[] = [
    rect(8, 6, 22, 32, C), rect(8, 6, 22, 1, RD), // edificio
    // ventanas apagadas (4 filas)
    ...[10, 16, 28].flatMap((y) => [rect(11, y, 4, 3, G), rect(17, y, 4, 3, G), rect(23, y, 4, 3, G)]),
    // el único piso encendido
    rect(11, 22, 4, 3, A.core), rect(17, 22, 4, 3, A.mid), rect(23, 22, 4, 3, A.core),
    // selva trepando
    rect(6, 30, 4, 8, PALETTE.leafDark), rect(28, 26, 5, 12, PALETTE.leafDark), rect(29, 27, 2, 3, PALETTE.leaf),
    rect(12, 34, 6, 4, PALETTE.leaf),
    // papeles saliendo por la ventana
    px(31, 23, A.core), px(34, 25, A.mid),
    // suelo
    rect(4, 38, 32, 2, RD),
  ];
  // cartel "ABIERTO" arriba del edificio; en el frame 1 la R se apaga
  const signOn = textOps("ABIERTO", 3, 0, A.core);
  const signFlicker = textOps("ABIE", 3, 0, A.core).concat(textOps("TO", 23, 0, A.core));
  return [[...base, ...signOn], [...base, ...signFlicker]];
}

/** Blog: cartel publicitario gigante sobre pilares, pantalla LED con estática, enredaderas. */
function blog(): PixelOp[][] {
  const M = ACCENTS.magenta;
  const base: PixelOp[] = [
    rect(12, 26, 3, 12, RD), rect(25, 26, 3, 12, RD), // pilares
    rect(4, 8, 32, 18, RD), rect(5, 9, 30, 16, G), // marco y pantalla apagada
    rect(4, 26, 32, 1, C),
    // enredaderas colgando del marco
    rect(6, 26, 1, 6, PALETTE.leaf), rect(33, 26, 1, 9, PALETTE.leaf), rect(20, 26, 1, 4, PALETTE.leafDark),
    rect(0, 36, 40, 2, RD), // autopista debajo
  ];
  const textA = textOps("BLOG", 12, 14, M.core);
  const textB = textOps("BL G", 12, 14, M.core); // glitch: se apaga la O (el cero es idéntico a la O en la fuente)
  const staticA = [px(7, 10, M.mid), px(30, 12, M.bleed), px(9, 22, M.bleed), px(28, 21, M.mid), rect(6, 18, 6, 1, M.bleed)];
  const staticB = [px(8, 11, M.bleed), px(31, 10, M.mid), px(12, 23, M.mid), rect(24, 19, 8, 1, M.bleed)];
  const staticC = [rect(5, 12, 30, 1, M.bleed), px(20, 20, M.mid)];
  return [[...base, ...textA, ...staticA], [...base, ...textB, ...staticB], [...base, ...textA, ...staticC]];
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

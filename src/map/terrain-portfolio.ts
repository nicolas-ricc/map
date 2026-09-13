import { RIVER_HALF, riverCenter } from "./geo";
import type { PixelOp } from "./ops";
import { PALETTE } from "./palette";
import { box, clampRect, nearWater, paintJungle, push, type Box } from "./paint";
import type { Rng } from "./seed";

/**
 * Portfolio: astillero. Línea de producción de oeste a este que termina en el
 * agua: patio de material → nave de montaje → grada → río. Todo lo largo va
 * horizontal (perpendicular a la orilla); lo único norte-sur es la calle de
 * transferencia, la viga de la grúa pórtico y el muelle. El río se draga del
 * lado del astillero: la ribera izquierda es una recta en QUAY_X.
 */

const P = PALETTE;

/** Borde del muelle. De acá hacia el este, hasta la ribera vieja, es agua dragada. */
export const QUAY_X = 200;
export const QUAY_W = 4;
/** Hasta dónde llega el tercio hacia abajo (se recorta por polígono igual). */
const BOTTOM = 142;

const STREET_X = 100, STREET_W = 8; // calle de transferencia N-S
const ROW_Y = [36, 56] as const;     // filas nave → grada
const ROW_H = 16;
const HALL_X = 8, HALL_W = 90;       // naves de montaje
const SLIP_X = 110;                  // gradas, hasta QUAY_X
const GANTRY_X = 150;

// ---------------------------------------------------------------- suelo y agua

/** Losa de hormigón viejo con juntas cada 12 px y charcos. */
function paintSlab(out: PixelOp[], rng: Rng): void {
  push(out, clampRect(0, 0, QUAY_X, BOTTOM, P.road));
  // juntas de dilatación: sutiles, cada 24 px, con tramos que la mugre tapó
  for (let x = 24; x < QUAY_X; x += 24) for (let y = 0; y < BOTTOM; y += 6) if (rng.chance(0.8)) push(out, clampRect(x, y, 1, 6, P.rock));
  for (let y = 24; y < BOTTOM; y += 24) for (let x = 0; x < QUAY_X; x += 6) if (rng.chance(0.8)) push(out, clampRect(x, y, 6, 1, P.rock));
  for (let i = 0; i < 24; i++) push(out, clampRect(rng.int(4, 190), rng.int(2, 136), rng.int(2, 6), rng.int(1, 2), P.waterLight)); // charcos
  for (let i = 0; i < 30; i++) push(out, clampRect(rng.int(4, 190), rng.int(2, 136), rng.int(1, 4), 1, P.rockLight)); // manchas
}

/** Ribera rectificada: agua desde el muelle hasta la ribera vieja del río. */
function dredge(out: PixelOp[]): void {
  for (let y = 0; y < BOTTOM; y++) {
    const bank = riverCenter(y) - RIVER_HALF;
    push(out, clampRect(QUAY_X + QUAY_W, y, bank - QUAY_X - QUAY_W + 1, 1, P.river));
    if (y % 4 !== 1) push(out, clampRect(QUAY_X + QUAY_W, y, 1, 1, P.waterLight)); // espuma contra el muelle
  }
}

function paintQuay(out: PixelOp[], rng: Rng): void {
  push(out, clampRect(QUAY_X, 0, QUAY_W, BOTTOM, P.concrete));
  push(out, clampRect(QUAY_X, 0, 1, BOTTOM, P.concreteLight));
  push(out, clampRect(QUAY_X + QUAY_W - 1, 0, 1, BOTTOM, P.concreteDark));
  for (let y = 6; y < BOTTOM; y += 12) push(out, clampRect(QUAY_X + 2, y, 1, 1, P.rust)); // bolardos
  for (let i = 0; i < 10; i++) push(out, clampRect(QUAY_X + 1, rng.int(2, 138), 2, 1, P.concreteDark)); // grietas
}

// ---------------------------------------------------------------- patio de material (NO)

function tank(out: PixelOp[], cx: number, cy: number, r: number): void {
  push(out, clampRect(cx + 2, cy + 2, r * 2, r * 2 - 2, P.ground)); // sombra al SE
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    push(out, clampRect(cx - half, cy + dy, half * 2 + 1, 1, dy < -r / 2 ? P.concreteLight : dy > r / 2 ? P.concreteDark : P.concrete));
  }
  push(out, clampRect(cx - 1, cy - r + 1, 1, 1, P.concreteLight));
  push(out, clampRect(cx, cy, 1, 1, P.rust)); // boca
}

function paintMaterialYard(out: PixelOp[], rng: Rng): void {
  // chapas apiladas: rectángulos claros desfasados
  for (const [x, y] of [[10, 6], [24, 6], [10, 14], [24, 14], [38, 8]] as [number, number][]) {
    const layers = rng.int(2, 4);
    for (let l = 0; l < layers; l++) push(out, clampRect(x + l, y + l, 10, 2, l === layers - 1 ? P.rockLight : P.rock));
    push(out, clampRect(x + layers, y + layers + 1, 10, 1, P.ground)); // sombra
  }
  // mazos de caños: líneas paralelas
  for (const [x, y] of [[10, 22], [28, 22], [46, 20]] as [number, number][]) {
    for (let i = 0; i < 4; i++) push(out, clampRect(x, y + i, 14, 1, i % 2 === 0 ? P.rustLight : P.rust));
    push(out, clampRect(x + 1, y + 4, 14, 1, P.ground));
  }
  // bobinas de cable
  for (let i = 0; i < 6; i++) {
    const x = 54 + (i % 3) * 5, y = 6 + Math.floor(i / 3) * 5;
    push(out, clampRect(x, y, 3, 3, P.rust));
    push(out, clampRect(x + 1, y + 1, 1, 1, P.rustDark));
    push(out, clampRect(x + 1, y + 3, 3, 1, P.ground));
  }
  // secciones de casco esperando montaje
  for (let i = 0; i < 4; i++) {
    const x = 56 + (i % 2) * 12, y = 18 + Math.floor(i / 2) * 6;
    box(out, x, y, 9, 4, P.rock, P.rockLight, P.ground);
  }
  tank(out, 80, 10, 5);
  tank(out, 92, 22, 4);
}

// ---------------------------------------------------------------- dique seco (NE)

function hull(out: PixelOp[], x0: number, x1: number, cy: number, halfMax: number, opts: { deck: boolean; superstructure: boolean }): void {
  const len = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / len;
    const taper = t > 0.75 ? (1 - t) / 0.25 : t < 0.1 ? 0.6 + t * 4 : 1; // proa a la derecha, popa cuadrada
    const half = Math.max(1, Math.round(halfMax * Math.sqrt(Math.min(1, taper))));
    push(out, clampRect(x, cy - half, 1, half * 2 + 1, opts.deck ? P.rockLight : P.rustDark));
    push(out, clampRect(x, cy - half, 1, 1, P.concreteLight));
    push(out, clampRect(x, cy + half, 1, 1, P.rock));
    push(out, clampRect(x + 1, cy + half + 1, 1, 1, P.ground)); // sombra
  }
  if (opts.deck) push(out, clampRect(x0 + 3, cy, x1 - x0 - 8, 1, P.rock)); // línea de cubierta
  if (opts.superstructure) box(out, x0 + 6, cy - 2, 8, 5, P.concrete, P.concreteLight, P.concreteDark);
}

function paintDryDock(out: PixelOp[]): void {
  const x = 116, y = 6, w = QUAY_X - x, h = 24;
  push(out, clampRect(x, y, w, h, P.concreteLight)); // muro
  push(out, clampRect(x + 2, y + 2, w - 3, h - 4, P.concrete)); // escalón
  push(out, clampRect(x + 3, y + 3, w - 4, h - 6, P.river)); // fondo
  push(out, clampRect(x + 1, y + h - 1, w, 1, P.ground)); // sombra
  // compuerta del lado del río
  push(out, clampRect(QUAY_X - 3, y + 2, 3, h - 4, P.rust));
  push(out, clampRect(QUAY_X - 3, y + 2, 1, h - 4, P.rustLight));
  hull(out, x + 8, x + 74, y + 12, 5, { deck: true, superstructure: true });
  box(out, x + 70, 0, 10, 6, P.concrete, P.concreteLight, P.concreteDark); // casa de bombas
  push(out, clampRect(x + 74, 1, 2, 2, P.rust));
}

// ---------------------------------------------------------------- naves, calle y gradas

function paintHalls(out: PixelOp[], rng: Rng): void {
  for (const y of ROW_Y) {
    box(out, HALL_X, y, HALL_W, ROW_H, P.concrete, P.concreteLight, P.concreteDark);
    for (let sx = HALL_X + 4; sx < HALL_X + HALL_W - 3; sx += 4) push(out, clampRect(sx, y + 2, 1, ROW_H - 4, P.concreteLight)); // claraboyas
    push(out, clampRect(HALL_X + 2, y + ROW_H / 2, HALL_W - 4, 1, P.concreteDark)); // cumbrera
    for (let i = 0; i < 3; i++) push(out, clampRect(HALL_X + rng.int(6, HALL_W - 8), y + rng.int(3, ROW_H - 5), 2, 2, P.rock)); // ventilaciones
    push(out, clampRect(HALL_X + HALL_W - 1, y + 4, 1, ROW_H - 8, P.ground)); // portón hacia la grada
    push(out, clampRect(HALL_X + 1, y + ROW_H, HALL_W, 2, P.ground)); // sombra al sur
    push(out, clampRect(HALL_X + HALL_W, y + 1, 1, ROW_H, P.ground));
    for (let i = 0; i < 4; i++) push(out, clampRect(HALL_X + rng.int(2, HALL_W - 3), y + ROW_H - rng.int(2, 6), 1, rng.int(2, 5), P.leaf)); // enredaderas
  }
}

function paintStreet(out: PixelOp[]): void {
  push(out, clampRect(STREET_X, 0, STREET_W, BOTTOM, P.road));
  for (let y = 2; y < BOTTOM; y += 8) push(out, clampRect(STREET_X + 4, y, 1, 3, P.roadLight));
  for (const y of ROW_Y) {
    // rieles de transferencia nave → grada, cruzando la calle
    push(out, clampRect(HALL_X + HALL_W, y + 4, SLIP_X - HALL_X - HALL_W + 2, 1, P.roadLight));
    push(out, clampRect(HALL_X + HALL_W, y + 11, SLIP_X - HALL_X - HALL_W + 2, 1, P.roadLight));
  }
}

function paintSlipways(out: PixelOp[]): void {
  ROW_Y.forEach((y, i) => {
    const w = QUAY_X - SLIP_X;
    push(out, clampRect(SLIP_X, y, w, ROW_H, P.concrete));
    push(out, clampRect(SLIP_X, y, w, 1, P.concreteLight));
    push(out, clampRect(SLIP_X, y + ROW_H - 1, w, 1, P.concreteDark));
    push(out, clampRect(SLIP_X, y + 4, w + QUAY_W, 1, P.roadLight)); // rieles hasta el borde
    push(out, clampRect(SLIP_X, y + 11, w + QUAY_W, 1, P.roadLight));
    // rampa sumergida
    for (let x = QUAY_X + QUAY_W; x < QUAY_X + QUAY_W + 10; x++) {
      if ((x + y) % 2 === 0) push(out, clampRect(x, y + 3, 1, ROW_H - 6, P.waterLight));
    }
    if (i === 0) {
      // solo quilla y cuadernas
      push(out, clampRect(SLIP_X + 10, y + 7, 70, 1, P.rustLight));
      for (let x = SLIP_X + 12; x < SLIP_X + 80; x += 4) {
        const t = (x - SLIP_X - 12) / 68;
        const half = t > 0.75 ? Math.round(5 * (1 - t) / 0.25) : 5;
        push(out, clampRect(x, y + 7 - half, 1, half * 2 + 1, P.rust));
        push(out, clampRect(x + 1, y + 8 + half, 1, 1, P.ground));
      }
    } else {
      hull(out, SLIP_X + 8, SLIP_X + 82, y + 7, 5, { deck: true, superstructure: false });
      push(out, clampRect(SLIP_X + 12, y + 5, 10, 4, P.rustDark)); // bodega abierta en popa
      push(out, clampRect(SLIP_X + 30, y + 3, 6, 2, P.rustDark));
    }
    // andamios y grúas chicas a los lados
    for (let x = SLIP_X + 6; x < QUAY_X - 8; x += 9) {
      push(out, clampRect(x, y + 1, 1, 1, P.rustLight));
      push(out, clampRect(x + 4, y + ROW_H - 2, 1, 1, P.rustLight));
    }
  });
}

/** Grúa pórtico: viga N-S sobre las dos gradas, rieles E-O. La sombra al SE es lo que la delata desde arriba. */
function paintGantry(out: PixelOp[]): void {
  const y0 = ROW_Y[0] - 2, y1 = ROW_Y[1] + ROW_H + 1;
  push(out, clampRect(SLIP_X, y0, QUAY_X - SLIP_X, 1, P.roadLight));
  push(out, clampRect(SLIP_X, y1, QUAY_X - SLIP_X, 1, P.roadLight));
  // sombra proyectada
  push(out, clampRect(GANTRY_X + 3, y0 + 3, 1, y1 - y0, P.ground));
  push(out, clampRect(GANTRY_X + 3, y0 + 3, 4, 1, P.ground));
  // viga y patas
  push(out, clampRect(GANTRY_X, y0, 3, y1 - y0 + 1, P.rust));
  push(out, clampRect(GANTRY_X, y0, 1, y1 - y0 + 1, P.rustLight));
  push(out, clampRect(GANTRY_X - 1, y0 - 1, 5, 3, P.rustDark));
  push(out, clampRect(GANTRY_X - 1, y1 - 1, 5, 3, P.rustDark));
  push(out, clampRect(GANTRY_X - 1, ROW_Y[1] + 2, 5, 2, P.concreteLight)); // carro
}

// ---------------------------------------------------------------- talleres, playa, vías (SO)

function paintWorkshops(out: PixelOp[], rng: Rng): void {
  for (const x of [46, 74]) {
    box(out, x, 80, 24, 14, P.concrete, P.concreteLight, P.concreteDark);
    push(out, clampRect(x + 4, 87, 16, 1, P.concreteDark));
    push(out, clampRect(x + rng.int(2, 18), 92, 3, 2, P.ground)); // puerta al sur
    push(out, clampRect(x + 1, 94, 24, 1, P.ground));
  }
  // playa de estacionamiento con líneas
  push(out, clampRect(46, 100, 52, 26, P.road));
  for (let x = 48; x < 98; x += 4) { push(out, clampRect(x, 102, 1, 4, P.roadLight)); push(out, clampRect(x, 116, 1, 4, P.roadLight)); }
  for (let i = 0; i < 5; i++) {
    const x = 49 + rng.int(0, 11) * 4, y = rng.chance(0.5) ? 102 : 116;
    push(out, clampRect(x, y, 3, 4, rng.chance(0.5) ? P.concreteLight : P.rustLight));
    push(out, clampRect(x + 1, y + 4, 3, 1, P.ground));
  }
  // secciones prefabricadas apiladas entre la calle y el landmark
  for (let i = 0; i < 8; i++) {
    const x = 112 + (i % 4) * 12, y = 82 + Math.floor(i / 4) * 8;
    if (!rng.chance(0.8)) continue;
    box(out, x, y, 9, 5, P.rock, P.rockLight, P.ground);
  }
  // vías del oeste hasta la calle de transferencia
  for (let x = 0; x < STREET_X; x += 4) push(out, clampRect(x, 130, 1, 6, P.road));
  push(out, clampRect(0, 131, STREET_X, 1, P.roadLight));
  push(out, clampRect(0, 134, STREET_X, 1, P.roadLight));
}

// ---------------------------------------------------------------- muelle de alistamiento (franja al este del río)

function paintFittingOut(out: PixelOp[], rng: Rng): void {
  for (const x of [304, 316]) {
    box(out, x, 24, 8, 96, P.concrete, P.concreteLight, P.concreteDark);
    for (let y = 28; y < 116; y += 4) push(out, clampRect(x + 2, y, 4, 1, P.concreteLight));
    push(out, clampRect(x + 1, 120, 8, 1, P.ground));
  }
  tank(out, 310, 10, 4);
  for (let i = 0; i < 6; i++) push(out, clampRect(302 + rng.int(0, 24), 124 + rng.int(0, 10), 3, 2, P.rust)); // chatarra
  // orilla: escollera de piedra
  for (let y = 0; y < BOTTOM; y++) {
    const bank = riverCenter(y) + RIVER_HALF + 1;
    push(out, clampRect(bank, y, 2, 1, y % 2 === 0 ? P.rock : P.rockLight));
  }
}

export function paintPortfolio(out: PixelOp[], rng: Rng): void {
  paintSlab(out, rng);
  dredge(out);
  paintQuay(out, rng);
  paintMaterialYard(out, rng);
  paintDryDock(out);
  paintHalls(out, rng);
  paintStreet(out);
  paintSlipways(out);
  paintGantry(out);
  paintWorkshops(out, rng);
  paintFittingOut(out, rng);
  const area: Box = { x0: 0, y0: 0, x1: 344, y1: 146 };
  const yard = (x: number, y: number) => x < QUAY_X + QUAY_W && !(x < 42 && y > 100) && !(y < 4);
  const dredged = (x: number, y: number) => x >= QUAY_X && x <= riverCenter(y) - RIVER_HALF + 2;
  const sheds = (x: number, y: number) => x > 298 && x < 328 && y > 4 && y < 124;
  paintJungle(out, rng, area, 22, (x, y) => nearWater(6)(x, y) || yard(x, y) || dredged(x, y) || sheds(x, y));
}

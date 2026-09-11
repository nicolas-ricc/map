import { MAP_H, MAP_W, RIVER_HALF, coastX, isWater, riverCenter } from "./geo";
import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE } from "./palette";
import { createRng, type Rng } from "./seed";
import { ZONES, pointInPolygon, zoneAt, zoneById, type ZoneId } from "./zones";

export const SEED = 20260909;

export interface Terrain {
  /** compartido por los tres tercios: suelo, agua, cables */
  base: PixelOp[];
  /** terreno propio de cada tercio; se renderiza clipeado a su polígono */
  zones: Record<ZoneId, PixelOp[]>;
  river: [PixelOp[], PixelOp[]];
  zoneOverlay: Record<ZoneId, PixelOp[]>;
}

const P = PALETTE;

const clampRect = (x: number, y: number, w: number, h: number, color: number): PixelOp | null => {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(MAP_W, Math.round(x + w)), y1 = Math.min(MAP_H, Math.round(y + h));
  if (x1 <= x0 || y1 <= y0) return null;
  return rect(x0, y0, x1 - x0, y1 - y0, color);
};

const push = (out: PixelOp[], op: PixelOp | null): void => { if (op) out.push(op); };

/** Caja con volumen: base, borde superior claro, borde derecho e inferior oscuros. */
function box(out: PixelOp[], x: number, y: number, w: number, h: number, base: number, light: number, dark: number): void {
  push(out, clampRect(x, y, w, h, base));
  push(out, clampRect(x, y, w, 1, light));
  push(out, clampRect(x, y, 1, h, light));
  push(out, clampRect(x + w - 1, y + 1, 1, h - 1, dark));
  push(out, clampRect(x + 1, y + h - 1, w - 1, 1, dark));
}

function tree(out: PixelOp[], x: number, y: number, r: number): void {
  push(out, clampRect(x - r, y - r + 1, r * 2, r * 2 - 2, P.leafDark));
  push(out, clampRect(x - r + 1, y - r, r * 2 - 2, r * 2, P.leafDark));
  push(out, clampRect(x - r + 1, y - r + 1, r, r, P.leaf));
}

interface Box { x0: number; y0: number; x1: number; y1: number }

/** Selva en masas: centros de racimo y 3-7 copas alrededor de cada uno. */
function paintJungle(out: PixelOp[], rng: Rng, area: Box, clusters: number, avoid: (x: number, y: number) => boolean): void {
  for (let c = 0; c < clusters; c++) {
    const cx = rng.int(area.x0, area.x1), cy = rng.int(area.y0, area.y1);
    if (avoid(cx, cy)) continue;
    const n = rng.int(3, 7);
    for (let i = 0; i < n; i++) {
      const x = cx + rng.int(-10, 10), y = cy + rng.int(-7, 7);
      if (avoid(x, y)) continue;
      tree(out, x, y, rng.int(3, 6));
    }
  }
  for (let i = 0; i < clusters * 2; i++) {
    const x = rng.int(area.x0, area.x1), y = rng.int(area.y0, area.y1);
    if (!avoid(x, y)) push(out, clampRect(x, y, 1, rng.int(3, 9), P.leaf)); // enredaderas
  }
}

const nearLandmark = (id: ZoneId, r: number) => (x: number, y: number): boolean => {
  const l = zoneById(id).landmark;
  return Math.abs(x - l.x) < r && y > l.y - r * 1.6 && y < l.y + r * 0.5;
};

const nearWater = (margin: number) => (x: number, y: number): boolean =>
  Math.abs(x - riverCenter(y)) < RIVER_HALF + margin || x > coastX(y) - margin;

// ---------------------------------------------------------------- compartido

function paintWater(out: PixelOp[]): void {
  for (let y = 0; y < MAP_H; y++) {
    const cx = riverCenter(y);
    push(out, clampRect(cx - RIVER_HALF, y, RIVER_HALF * 2 + 1, 1, P.river));
    push(out, clampRect(cx - RIVER_HALF - 1, y, 1, 1, P.waterLight));
    push(out, clampRect(cx + RIVER_HALF + 1, y, 1, 1, P.waterLight));
    const c = coastX(y);
    push(out, clampRect(c, y, MAP_W - c, 1, P.river));
    if (y % 3 === 0) push(out, clampRect(c, y, 1, 1, P.waterLight));
    if (y % 5 === 0) push(out, clampRect(c + 6 + ((y * 7) % 23), y, 3 + (y % 3), 1, P.waterLight));
    if (y % 7 === 3) push(out, clampRect(c + 20 + ((y * 11) % 31), y, 2, 1, P.waterLight));
    push(out, clampRect(c - 1, y, 1, 1, P.rockLight));
    if (y % 2 === 0) push(out, clampRect(c - 3, y, 2, 1, P.rock));
  }
}

function paintCables(out: PixelOp[]): void {
  // todos los pares no ordenados de zonas: escala a N sin tocar nada más
  const pts = ZONES.map((z) => z.landmark);
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
    const p = pts[a]!, q = pts[b]!;
    const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 3);
    for (let i = 0; i <= steps; i += 2) {
      const t = i / steps;
      const sag = Math.sin(t * Math.PI) * 6;
      push(out, clampRect(Math.round(p.x + (q.x - p.x) * t), Math.round(p.y + (q.y - p.y) * t + sag), 1, 1, P.rust));
    }
    // torre caída a mitad de camino
    const mx = Math.round((p.x + q.x) / 2), my = Math.round((p.y + q.y) / 2);
    push(out, clampRect(mx - 4, my + 4, 9, 1, P.rust));
    push(out, clampRect(mx, my, 1, 5, P.rust));
  }
}

// ---------------------------------------------------------------- autopista (CV → Blog → mar)

const HW_X0 = 150, HW_SEG = 16;
const HW_GAPS = new Set([5, 11]);
const hwY = (x: number): number => Math.round(214 - (x - 250) * 0.36);

/** Autopista elevada: pinta solo los tramos cuyo centro cae en `zone`. Termina rota sobre el mar. */
function paintHighway(out: PixelOp[], zone: ZoneId): void {
  for (let seg = 0; ; seg++) {
    const x = HW_X0 + seg * HW_SEG;
    const y = hwY(x);
    if (x > coastX(y) + 10) break;
    if (zoneAt(x + HW_SEG / 2, y + 5) !== zone) continue;
    if (HW_GAPS.has(seg)) {
      // losa caída al pie de la brecha
      push(out, clampRect(x + 2, y + 13, 7, 3, P.concreteDark));
      push(out, clampRect(x + 8, y + 15, 6, 3, P.concreteDark));
      continue;
    }
    push(out, clampRect(x, y, HW_SEG, 9, P.concrete));
    push(out, clampRect(x, y, HW_SEG, 1, P.concreteLight));
    push(out, clampRect(x, y + 9, HW_SEG, 2, P.concreteDark));
    push(out, clampRect(x, y + 11, HW_SEG, 2, P.ground)); // sombra
    push(out, clampRect(x + 2, y + 4, 5, 1, P.roadLight));
    push(out, clampRect(x + 9, y + 4, 5, 1, P.roadLight));
    if (seg % 3 === 0) {
      push(out, clampRect(x + 7, y + 11, 2, 12, P.rust));
      push(out, clampRect(x + 7, y + 11, 1, 12, P.rustLight));
    }
  }
}

// ---------------------------------------------------------------- Portfolio: puerto

const QUAY_W = 60;

function paintPortfolio(out: PixelOp[], rng: Rng): void {
  const area: Box = { x0: 0, y0: 0, x1: 344, y1: 146 };
  // calles: una avenida horizontal y una vertical
  push(out, clampRect(0, 44, 230, 4, P.road));
  push(out, clampRect(100, 0, 4, 146, P.road));
  for (let x = 2; x < 230; x += 8) push(out, clampRect(x, 45, 3, 1, P.roadLight));
  for (let y = 2; y < 146; y += 8) push(out, clampRect(101, y, 1, 3, P.roadLight));
  // galpones
  const sheds: [number, number, number, number][] = [
    [8, 10, 40, 28], [52, 12, 44, 26], [108, 8, 36, 30], [148, 14, 44, 24],
    [8, 54, 44, 22], [56, 52, 40, 24], [108, 56, 48, 22], [8, 84, 84, 14], [108, 84, 52, 14],
    [8, 110, 40, 26], [52, 112, 44, 24], [108, 112, 60, 22],
    [298, 18, 36, 24], [300, 62, 34, 26], // orilla derecha del río
  ];
  for (const [x, y, w, h] of sheds) {
    box(out, x, y, w, h, P.concrete, P.concreteLight, P.concreteDark);
    push(out, clampRect(x + 3, y + Math.floor(h / 2), w - 6, 1, P.concreteDark)); // cumbrera
    for (let i = 0; i < 3; i++) push(out, clampRect(x + rng.int(2, w - 5), y + rng.int(2, h - 4), rng.int(2, 4), rng.int(1, 2), P.rust));
    if (rng.chance(0.5)) push(out, clampRect(x + rng.int(2, w - 4), y + rng.int(2, h - 3), 2, 2, P.ground)); // claraboya rota
  }
  // vías del tren hacia el muelle
  const railEnd = riverCenter(124) - RIVER_HALF - 2 - QUAY_W - 2;
  for (let x = 0; x < railEnd; x += 4) push(out, clampRect(x, 121, 1, 6, P.road));
  push(out, clampRect(0, 122, railEnd, 1, P.roadLight));
  push(out, clampRect(0, 125, railEnd, 1, P.roadLight));
  // muelle: losa de hormigón pegada a la orilla izquierda del río
  for (let y = 10; y < 136; y++) {
    const x1 = riverCenter(y) - RIVER_HALF - 2, x0 = x1 - QUAY_W;
    push(out, clampRect(x0, y, x1 - x0, 1, y === 10 ? P.concreteLight : P.concrete));
    push(out, clampRect(x1 - 1, y, 1, 1, P.concreteDark));
    if (y % 12 === 4) push(out, clampRect(x1 - 3, y, 1, 1, P.rust)); // bolardos
  }
  for (let i = 0; i < 40; i++) {
    const y = rng.int(12, 134);
    push(out, clampRect(riverCenter(y) - RIVER_HALF - 4 - rng.int(0, QUAY_W - 6), y, rng.int(1, 3), 1, P.concreteDark)); // grietas
  }
  // containers chicos apilados en el muelle, lejos de la torre
  for (const y of [14, 20, 26, 124, 130]) {
    for (let i = 0; i < 4; i++) {
      if (!rng.chance(0.7)) continue;
      const x = riverCenter(y) - RIVER_HALF - QUAY_W + i * 11 + rng.int(0, 2);
      const c = rng.chance(0.5) ? [P.rust, P.rustLight, P.rustDark] : [P.concrete, P.concreteLight, P.concreteDark];
      push(out, clampRect(x, y, 9, 4, c[0]!));
      push(out, clampRect(x, y, 9, 1, c[1]!));
      push(out, clampRect(x + 8, y, 1, 4, c[2]!));
    }
  }
  // grúa portuaria chica al fondo del muelle
  push(out, clampRect(riverCenter(24) - RIVER_HALF - 12, 8, 2, 24, P.rustDark));
  push(out, clampRect(riverCenter(24) - RIVER_HALF - 12, 8, 1, 24, P.rustLight));
  push(out, clampRect(riverCenter(24) - RIVER_HALF - 26, 8, 30, 1, P.rust));
  paintJungle(out, rng, area, 18, (x, y) => nearWater(6)(x, y) || (x > riverCenter(y) - RIVER_HALF - QUAY_W - 4 && y > 8 && y < 138) || nearLandmark("portfolio", 30)(x, y));
}

// ---------------------------------------------------------------- Resume: oficinas

function paintCv(out: PixelOp[], rng: Rng): void {
  const area: Box = { x0: 0, y0: 138, x1: 344, y1: 270 };
  const BLOCK_W = 30, BLOCK_H = 24, STREET = 4;
  for (let bx = 0; bx < 344; bx += BLOCK_W) {
    push(out, clampRect(bx, 138, STREET, 132, P.road));
    for (let y = 140; y < 270; y += 8) push(out, clampRect(bx + 1, y, 1, 3, P.roadLight));
  }
  for (let by = 146; by < 270; by += BLOCK_H) {
    push(out, clampRect(0, by, 344, STREET, P.road));
    if (((by - 146) / BLOCK_H) % 2 === 0) for (let x = 2; x < 344; x += 8) push(out, clampRect(x, by + 1, 3, 1, P.roadLight));
  }
  const skip = nearLandmark("cv", 24);
  for (let bx = 0; bx < 344; bx += BLOCK_W) {
    for (let by = 146; by < 270; by += BLOCK_H) {
      const x = bx + STREET, y = by + STREET, w = BLOCK_W - STREET, h = BLOCK_H - STREET;
      if (nearWater(4)(x + w, y) || nearWater(4)(x, y + h)) continue;
      if (skip(x + w / 2, y + h / 2)) {
        // plaza frente al edificio: baldosas rotas
        push(out, clampRect(x, y, w, h, P.concreteDark));
        for (let i = 0; i < 6; i++) push(out, clampRect(x + rng.int(0, w - 3), y + rng.int(0, h - 2), 3, 2, P.road));
        continue;
      }
      if (rng.chance(0.22)) {
        // manzana tragada por la selva
        push(out, clampRect(x, y, w, h, P.leafDark));
        tree(out, x + rng.int(6, w - 6), y + rng.int(5, h - 5), rng.int(4, 6));
        continue;
      }
      const two = rng.chance(0.6);
      const parts = two ? [[x, y, Math.floor(w / 2) - 1, h], [x + Math.floor(w / 2) + 1, y, Math.ceil(w / 2) - 1, h]] : [[x, y, w, h]];
      for (const [px0, py0, pw, ph] of parts as [number, number, number, number][]) {
        const tall = rng.chance(0.35);
        const base = tall ? P.concreteLight : P.concrete;
        box(out, px0, py0, pw, ph, base, tall ? P.concreteLight : P.concreteLight, P.concreteDark);
        if (tall) push(out, clampRect(px0 + 1, py0 + 1, pw - 2, ph - 2, P.concrete));
        // ventanas apagadas en grilla
        for (let wx = px0 + 2; wx < px0 + pw - 2; wx += 3) for (let wy = py0 + 2; wy < py0 + ph - 2; wy += 3) {
          if (rng.chance(0.75)) push(out, clampRect(wx, wy, 1, 1, P.ground));
        }
        if (rng.chance(0.4)) push(out, clampRect(px0 + rng.int(1, pw - 3), py0 + rng.int(1, ph - 3), 2, 2, P.leaf)); // selva en la terraza
      }
    }
  }
  paintHighway(out, "cv");
  paintJungle(out, rng, area, 40, (x, y) => nearWater(4)(x, y) || nearLandmark("cv", 22)(x, y));
}

// ---------------------------------------------------------------- Blog: costa y descampado

function paintBlog(out: PixelOp[], rng: Rng): void {
  const area: Box = { x0: 200, y0: 0, x1: 480, y1: 270 };
  const dry = (x: number, y: number) => !nearWater(3)(x, y);
  // descampado: manchones de tierra seca y escombros
  for (let i = 0; i < 45; i++) {
    const x = rng.int(220, 470), y = rng.int(0, 270);
    if (dry(x, y)) push(out, clampRect(x, y, rng.int(6, 18), rng.int(2, 5), P.sand));
  }
  for (let i = 0; i < 120; i++) {
    const x = rng.int(220, 475), y = rng.int(0, 270);
    if (dry(x, y)) push(out, clampRect(x, y, rng.int(1, 2), 1, rng.chance(0.5) ? P.rock : P.rockLight));
  }
  for (let i = 0; i < 14; i++) {
    const x = rng.int(230, 460), y = rng.int(0, 262);
    if (dry(x, y)) { push(out, clampRect(x, y, 1, rng.int(4, 8), P.rustDark)); push(out, clampRect(x - 1, y + 2, 3, 1, P.rustDark)); }
  }
  // carteles caídos con el neón muerto
  for (const [x, y] of [[300, 36], [332, 246], [440, 60]] as [number, number][]) {
    push(out, clampRect(x, y, 14, 8, P.road));
    push(out, clampRect(x, y, 14, 1, P.concreteLight));
    push(out, clampRect(x + 13, y, 1, 8, P.concreteDark));
    push(out, clampRect(x + 2, y + 2, 4, 1, P.magentaBleed));
    push(out, clampRect(x + 8, y + 4, 3, 1, P.magentaBleed));
    push(out, clampRect(x + 3, y + 8, 2, 4, P.rust));
  }
  // camino de tierra que baja de la autopista a la costa
  for (let y = 20; y < 250; y += 2) push(out, clampRect(Math.round(340 + 18 * Math.sin(y / 40)), y, 2, 2, P.sand));
  // promontorio del faro: roca sobre el mar
  const l = zoneById("blog").landmark;
  for (let y = l.y - 14; y <= l.y + 12; y++) {
    const dy = (y - (l.y - 1)) / 14;
    const half = Math.round(Math.sqrt(Math.max(0, 1 - dy * dy)) * 36);
    push(out, clampRect(l.x - half, y, half * 2, 1, dy < -0.6 ? P.rockLight : dy > 0.7 ? P.ground : P.rock));
  }
  for (let i = 0; i < 30; i++) push(out, clampRect(l.x - 32 + rng.int(0, 70), l.y - 12 + rng.int(0, 22), rng.int(1, 3), 1, P.rockLight));
  paintHighway(out, "blog");
  paintJungle(out, rng, area, 16, (x, y) => nearWater(14)(x, y) || nearLandmark("blog", 40)(x, y) || Math.abs(y - hwY(x)) < 12);
}

// ---------------------------------------------------------------- reflejos y bleed

function reflections(frame: 0 | 1, rng: Rng): PixelOp[] {
  const out: PixelOp[] = [];
  for (let y = 0; y < MAP_H; y += 3) {
    const cx = riverCenter(y);
    const nearest = ZONES.reduce((a, b) =>
      Math.hypot(a.landmark.x - cx, a.landmark.y - y) < Math.hypot(b.landmark.x - cx, b.landmark.y - y) ? a : b);
    const dx = rng.int(-5, 5);
    if (rng.chance(0.5)) push(out, clampRect(cx + dx + (frame === 1 ? 1 : 0), y + frame, rng.int(1, 3), 1, ACCENTS[nearest.accent].bleed));
    const sx = coastX(y) + rng.int(2, 40);
    if (rng.chance(0.45)) push(out, clampRect(sx + (frame === 1 ? 2 : 0), y + frame, rng.int(2, 5), 1, rng.chance(0.3) ? ACCENTS.magenta.bleed : P.waterLight));
  }
  return out;
}

function zoneBleed(rng: Rng): Record<ZoneId, PixelOp[]> {
  // una entrada por zona de ZONES: agregar una 4ta zona no deja huecos en el record
  const result = {} as Record<ZoneId, PixelOp[]>;
  for (const z of ZONES) {
    const ops: PixelOp[] = [];
    result[z.id] = ops;
    const color = ACCENTS[z.accent].bleed;
    for (let i = 0; i < 200; i++) {
      const ang = rng.next() * Math.PI * 2;
      const dist = 8 + rng.next() * 40;
      const x = Math.round(z.landmark.x + Math.cos(ang) * dist);
      const y = Math.round(z.landmark.y + Math.sin(ang) * dist * 0.6);
      if (!pointInPolygon(x, y, z.polygon) || isWater(x, y)) continue;
      ops.push(px(x, y, color));
    }
  }
  return result;
}

export function buildTerrain(seed: number): Terrain {
  const rng = createRng(seed);
  const base: PixelOp[] = [rect(0, 0, MAP_W, MAP_H, P.ground)];
  paintWater(base);
  paintCables(base);
  const zones = {} as Record<ZoneId, PixelOp[]>;
  for (const z of ZONES) {
    const ops: PixelOp[] = [];
    if (z.id === "portfolio") paintPortfolio(ops, rng);
    else if (z.id === "cv") paintCv(ops, rng);
    else paintBlog(ops, rng);
    zones[z.id] = ops;
  }
  const zoneOverlay = zoneBleed(rng);
  const riverRng = createRng(seed ^ 0x5eed);
  const river: [PixelOp[], PixelOp[]] = [reflections(0, riverRng), reflections(1, riverRng)];
  return { base, zones, river, zoneOverlay };
}

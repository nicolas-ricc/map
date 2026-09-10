import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE } from "./palette";
import { createRng, type Rng } from "./seed";
import { MAP_H, MAP_W, ZONES, pointInPolygon, type ZoneId } from "./zones";

export const SEED = 20260909;

export interface Terrain {
  base: PixelOp[];
  river: [PixelOp[], PixelOp[]];
  zoneOverlay: Record<ZoneId, PixelOp[]>;
}

const clampRect = (x: number, y: number, w: number, h: number, color: number): PixelOp | null => {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(MAP_W, x + w), y1 = Math.min(MAP_H, y + h);
  if (x1 <= x0 || y1 <= y0) return null;
  return rect(x0, y0, x1 - x0, y1 - y0, color);
};

const push = (out: PixelOp[], op: PixelOp | null): void => { if (op) out.push(op); };

/** Camino del río: centro x por cada y, curva suave determinística. */
function riverCenter(y: number): number {
  return Math.round(250 + 26 * Math.sin(y / 38) + 14 * Math.sin(y / 17 + 1.3));
}

function paintGrid(out: PixelOp[], rng: Rng): void {
  const step = 24;
  for (let x = 12; x < MAP_W; x += step) {
    for (let y = 0; y < MAP_H; y += 6) {
      if (rng.chance(0.62)) push(out, clampRect(x, y, 2, 6, PALETTE.road));
    }
  }
  for (let y = 12; y < MAP_H; y += step) {
    for (let x = 0; x < MAP_W; x += 6) {
      if (rng.chance(0.62)) push(out, clampRect(x, y, 6, 2, PALETTE.road));
    }
  }
  // cimientos en las manzanas
  for (let x = 12; x < MAP_W - step; x += step) {
    for (let y = 12; y < MAP_H - step; y += step) {
      if (!rng.chance(0.55)) continue;
      const w = rng.int(6, 14), h = rng.int(6, 14);
      const ox = x + 3 + rng.int(0, step - w - 6), oy = y + 3 + rng.int(0, step - h - 6);
      push(out, clampRect(ox, oy, w, h, PALETTE.concrete));
      push(out, clampRect(ox + 1, oy + h, w, 1, PALETTE.ground)); // sombra
    }
  }
}

function paintRiverBed(out: PixelOp[]): void {
  for (let y = 0; y < MAP_H; y++) {
    const cx = riverCenter(y);
    push(out, clampRect(cx - 7, y, 14, 1, PALETTE.river));
  }
}

function riverReflections(frame: 0 | 1, rng: Rng): PixelOp[] {
  const out: PixelOp[] = [];
  for (let y = 0; y < MAP_H; y += 3) {
    const cx = riverCenter(y);
    const nearest = ZONES.reduce((a, b) =>
      Math.hypot(a.landmark.x - cx, a.landmark.y - y) < Math.hypot(b.landmark.x - cx, b.landmark.y - y) ? a : b);
    const color = ACCENTS[nearest.accent].bleed;
    const dx = rng.int(-5, 5);
    if (rng.chance(0.5)) push(out, clampRect(cx + dx + (frame === 1 ? 1 : 0), y + frame, rng.int(1, 3), 1, color));
  }
  return out;
}

function paintHighway(out: PixelOp[], rng: Rng): void {
  // banda diagonal suave desde la izquierda-abajo hasta el borde derecho (lado Blog)
  const gaps = new Set<number>();
  for (let i = 0; i < 3; i++) gaps.add(rng.int(4, 26));
  for (let seg = 0; seg < 30; seg++) {
    if (gaps.has(seg)) continue;
    const x = seg * 16;
    const y = Math.round(150 - seg * 3.2);
    push(out, clampRect(x, y, 16, 10, PALETTE.concrete));
    push(out, clampRect(x, y + 10, 16, 2, PALETTE.ground));
    push(out, clampRect(x + 2, y + 5, 5, 1, PALETTE.road));
    push(out, clampRect(x + 9, y + 5, 5, 1, PALETTE.road));
    if (seg % 3 === 0) push(out, clampRect(x + 7, y + 10, 2, 8, PALETTE.rust)); // pilar
  }
}

function paintVegetation(out: PixelOp[], rng: Rng): void {
  for (let i = 0; i < 420; i++) {
    const x = rng.int(0, MAP_W), y = rng.int(0, MAP_H);
    if (Math.abs(x - riverCenter(y)) < 10) continue;
    const r = rng.int(3, 7);
    push(out, clampRect(x - r, y - r + 1, r * 2, r * 2 - 2, PALETTE.leafDark));
    push(out, clampRect(x - r + 1, y - r, r * 2 - 2, r * 2, PALETTE.leafDark));
    push(out, clampRect(x - r + 1, y - r + 1, r, r, PALETTE.leaf)); // luz arriba-izquierda
  }
  // enredaderas: líneas verticales finas
  for (let i = 0; i < 90; i++) {
    push(out, clampRect(rng.int(0, MAP_W), rng.int(0, MAP_H), 1, rng.int(3, 9), PALETTE.leaf));
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
      push(out, clampRect(Math.round(p.x + (q.x - p.x) * t), Math.round(p.y + (q.y - p.y) * t + sag), 1, 1, PALETTE.rust));
    }
    // torre caída a mitad de camino
    const mx = Math.round((p.x + q.x) / 2), my = Math.round((p.y + q.y) / 2);
    push(out, clampRect(mx - 4, my + 4, 9, 1, PALETTE.rust));
    push(out, clampRect(mx, my, 1, 5, PALETTE.rust));
  }
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
      if (!pointInPolygon(x, y, z.polygon)) continue;
      ops.push(px(x, y, color));
    }
  }
  return result;
}

export function buildTerrain(seed: number): Terrain {
  const rng = createRng(seed);
  const base: PixelOp[] = [rect(0, 0, MAP_W, MAP_H, PALETTE.ground)];
  paintGrid(base, rng);
  paintRiverBed(base);
  paintHighway(base, rng);
  paintVegetation(base, rng);
  paintCables(base);
  const zoneOverlay = zoneBleed(rng);
  const riverRng = createRng(seed ^ 0x5eed);
  const river: [PixelOp[], PixelOp[]] = [riverReflections(0, riverRng), riverReflections(1, riverRng)];
  return { base, river, zoneOverlay };
}

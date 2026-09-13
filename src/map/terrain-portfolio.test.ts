import { describe, expect, it } from "vitest";
import { opsBounds, type PixelOp } from "./ops";
import { PALETTE } from "./palette";
import { createRng } from "./seed";
import { QUAY_X, QUAY_W, paintPortfolio } from "./terrain-portfolio";
import { MAP_H, MAP_W, pointInPolygon, zoneById } from "./zones";

const build = (seed = 1): PixelOp[] => { const out: PixelOp[] = []; paintPortfolio(out, createRng(seed)); return out; };

/** Color que queda en (x, y) después de aplicar los ops en orden. */
const colorAt = (ops: PixelOp[], x: number, y: number): number | undefined => {
  let c: number | undefined;
  for (const o of ops) if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) c = o.color;
  return c;
};

describe("paintPortfolio (astillero)", () => {
  it("es determinístico y depende de la seed", () => {
    expect(build(7)).toEqual(build(7));
    expect(build(7)).not.toEqual(build(8));
  });

  it("todo cae dentro del lienzo y usa solo la paleta", () => {
    const ops = build();
    const b = opsBounds(ops);
    expect(b.minX >= 0 && b.minY >= 0 && b.maxX <= MAP_W && b.maxY <= MAP_H).toBe(true);
    const allowed = new Set<number>(Object.values(PALETTE));
    for (const o of ops) expect(allowed.has(o.color)).toBe(true);
  });

  it("rectifica la ribera: al este del muelle hay agua dragada y el muelle es hormigón", () => {
    const ops = build();
    for (const y of [10, 50, 100, 130]) {
      expect(colorAt(ops, QUAY_X + 1, y)).toBe(PALETTE.concrete);
      expect(colorAt(ops, QUAY_X + QUAY_W + 6, y)).toBe(PALETTE.river);
    }
  });

  it("las gradas y las naves están alineadas en la misma fila, de la nave al agua", () => {
    const ops = build();
    // fila de la primera grada: nave (x≈50), calle de transferencia (x≈104), grada (x≈150)
    expect(colorAt(ops, 50, 44)).not.toBe(PALETTE.ground);
    expect(colorAt(ops, 104, 44)).toBe(PALETTE.roadLight);
    expect(colorAt(ops, 150, 44)).not.toBe(PALETTE.ground);
  });

  it("el landmark queda sobre tierra, pegado al muelle", () => {
    const l = zoneById("portfolio").landmark;
    expect(pointInPolygon(l.x, l.y, zoneById("portfolio").polygon)).toBe(true);
    expect(l.x).toBeLessThanOrEqual(QUAY_X);
    expect(l.x).toBeGreaterThan(QUAY_X - 12);
  });
});

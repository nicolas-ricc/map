import { describe, expect, it } from "vitest";
import { QUAY_X, ZONE_SPLIT_X, ZONE_SPLIT_Y } from "../map/geo";
import { AVENUE, BLOCK_D, BLOCK_W, BRIDGE, CITY_EDGE, COLLAPSED, CRATERS, EAST_RING, MALECON, PLAZA, ROWS, STREET, TOWER, WEST_QUAY, blocks, estuaryEast, estuaryReaches, inBlock, inCrater } from "./city-grid";

const overlaps = (a: { x: number; y: number; w: number; d: number }, b: { x: number; y: number; w: number; d: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

describe("city-grid", () => {
  it("hay al menos 30 manzanas, una plaza y un derrumbe, y ninguna se pisa con otra", () => {
    const bs = blocks();
    expect(bs.length).toBeGreaterThanOrEqual(30);
    expect(bs.filter((b) => b.kind === "plaza")).toHaveLength(1);
    expect(bs.filter((b) => b.kind === "collapsed")).toHaveLength(1);
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) expect(overlaps(bs[i]!, bs[j]!)).toBe(false);
  });

  it("entre manzanas vecinas queda al menos una calle", () => {
    const bs = blocks();
    for (const a of bs) for (const b of bs) {
      if (a === b) continue;
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gapY = Math.max(b.y - (a.y + a.d), a.y - (b.y + b.d));
      expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(STREET);
    }
  });

  it("toda manzana cae en tierra de la ciudad: lejos del estuario, dentro de los bordes", () => {
    for (const b of blocks()) {
      expect(b.x).toBeGreaterThanOrEqual(CITY_EDGE.west);
      expect(b.y).toBeGreaterThanOrEqual(CITY_EDGE.north + STREET);
      expect(b.y + b.d).toBeLessThanOrEqual(CITY_EDGE.south - 4); // la calle sur es de 4: el borde va alineado a CELL
      if (b.bank === "west") expect(b.x + b.w).toBeLessThanOrEqual(WEST_QUAY.x0 - STREET);
      else {
        expect(b.x + b.w).toBeLessThanOrEqual(MALECON.x0);
        if (b.kind !== "collapsed") expect(b.x).toBeGreaterThanOrEqual(estuaryEast(b.y + b.d) + STREET);
      }
    }
    // el derrumbe es la única manzana que el agua toca
    expect(COLLAPSED.x).toBeLessThan(estuaryEast(COLLAPSED.y + COLLAPSED.d) + STREET);
  });

  it("la avenida separa las filas 2 y 3 y el puente la cruza de muelle a anillo", () => {
    expect(ROWS[1] + BLOCK_D).toBe(AVENUE.y0);
    expect(ROWS[2]).toBe(AVENUE.y1);
    expect(BRIDGE.x0).toBe(WEST_QUAY.x0);
    expect(BRIDGE.x1).toBe(EAST_RING.x1);
    expect(BRIDGE.y0).toBeGreaterThanOrEqual(AVENUE.y0);
    expect(BRIDGE.y1).toBeLessThanOrEqual(AVENUE.y1);
    expect(estuaryEast(BRIDGE.y1)).toBeLessThan(BRIDGE.x1); // el puente llega a tierra
  });

  it("la plaza y la torre están en su lugar y la torre entra en la plaza", () => {
    expect(blocks().find((b) => b.kind === "plaza")).toMatchObject(PLAZA);
    expect(PLAZA.y).toBe(AVENUE.y1);
    expect(overlaps(TOWER, PLAZA)).toBe(true);
    expect(TOWER.x).toBeGreaterThan(PLAZA.x); expect(TOWER.x + TOWER.w).toBeLessThan(PLAZA.x + PLAZA.w);
    expect(TOWER.y).toBeGreaterThan(PLAZA.y); expect(TOWER.y + TOWER.d).toBeLessThan(PLAZA.y + PLAZA.d);
  });

  it("los cráteres están sobre calles, no sobre manzanas", () => {
    expect(CRATERS).toHaveLength(3);
    for (const c of CRATERS) {
      expect(inBlock(c.x, c.y)).toBe(false);
      expect(inCrater(c.x, c.y)).toBe(true);
      expect(inCrater(c.x + c.r + 1, c.y)).toBe(false);
    }
    expect(inBlock(PLAZA.x + 1, PLAZA.y + 1)).toBe(true);
  });

  it("el estuario hereda el canal en la costura y se abre hacia el sur", () => {
    expect(estuaryEast(ZONE_SPLIT_Y)).toBeGreaterThan(QUAY_X + 30);
    expect(estuaryEast(ZONE_SPLIT_Y)).toBeLessThan(QUAY_X + 60);
    expect(estuaryEast(260) - estuaryEast(ZONE_SPLIT_Y)).toBeCloseTo((260 - ZONE_SPLIT_Y) * 0.35, 6);
    expect(estuaryEast(270)).toBeLessThan(ZONE_SPLIT_X - 40);
    expect(estuaryReaches(estuaryEast(240))).toBeCloseTo(240, 6);            // inversa
    expect(estuaryReaches(EAST_RING.x0 + STREET / 2)).toBeGreaterThan(AVENUE.y1); // el eje del anillo pisa agua recién al sur de la avenida
    expect(BLOCK_W).toBe(24);
  });
});

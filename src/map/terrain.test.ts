import { describe, expect, it } from "vitest";
import { opsBounds, type PixelOp } from "./ops";
import { PALETTE } from "./palette";
import { SEED, buildTerrain } from "./terrain";
import { MAP_H, MAP_W, ZONE_IDS } from "./zones";

const inBounds = (ops: PixelOp[]) => {
  const b = opsBounds(ops);
  return b.minX >= 0 && b.minY >= 0 && b.maxX <= MAP_W && b.maxY <= MAP_H;
};

describe("buildTerrain", () => {
  it("es determinístico", () => {
    expect(buildTerrain(SEED)).toEqual(buildTerrain(SEED));
  });

  it("cambia con la seed", () => {
    expect(buildTerrain(1).base).not.toEqual(buildTerrain(2).base);
  });

  it("todo cae dentro del lienzo", () => {
    const t = buildTerrain(SEED);
    expect(inBounds(t.base)).toBe(true);
    expect(inBounds(t.river[0])).toBe(true);
    expect(inBounds(t.river[1])).toBe(true);
    for (const id of ZONE_IDS) expect(inBounds(t.zoneOverlay[id])).toBe(true);
  });

  it("zoneOverlay tiene exactamente las zonas de ZONE_IDS", () => {
    const keys = Object.keys(buildTerrain(SEED).zoneOverlay).sort();
    expect(keys).toEqual([...ZONE_IDS].sort());
  });

  it("el primer op es el suelo completo", () => {
    const first = buildTerrain(SEED).base[0];
    expect(first).toEqual({ x: 0, y: 0, w: MAP_W, h: MAP_H, color: PALETTE.ground });
  });

  it("usa solo colores de la paleta", () => {
    const allowed = new Set<number>(Object.values(PALETTE));
    const t = buildTerrain(SEED);
    const all = [...t.base, ...t.river[0], ...t.river[1], ...ZONE_IDS.flatMap((id) => t.zoneOverlay[id])];
    for (const o of all) expect(allowed.has(o.color)).toBe(true);
  });

  it("tiene densidad razonable y los dos frames de río difieren", () => {
    const t = buildTerrain(SEED);
    expect(t.base.length).toBeGreaterThan(500);
    expect(t.river[0]).not.toEqual(t.river[1]);
    for (const id of ZONE_IDS) expect(t.zoneOverlay[id].length).toBeGreaterThan(10);
  });
});

import { describe, expect, it } from "vitest";
import { opsBounds, type PixelOp } from "./ops";
import { PALETTE } from "./palette";
import { SEED, buildTerrain } from "./terrain";
import { MAP_H, MAP_W, ZONE_IDS } from "./zones";

const inBounds = (ops: PixelOp[]) => {
  const b = opsBounds(ops);
  return b.minX >= 0 && b.minY >= 0 && b.maxX <= MAP_W && b.maxY <= MAP_H;
};

const allOps = (t: ReturnType<typeof buildTerrain>) =>
  [...t.base, ...t.river[0], ...t.river[1], ...ZONE_IDS.flatMap((id) => [...t.zones[id], ...t.zoneOverlay[id]])];

describe("buildTerrain", () => {
  it("es determinístico", () => {
    expect(buildTerrain(SEED)).toEqual(buildTerrain(SEED));
  });

  it("cambia con la seed", () => {
    expect(buildTerrain(1).zones.cv).not.toEqual(buildTerrain(2).zones.cv);
  });

  it("todo cae dentro del lienzo", () => {
    const t = buildTerrain(SEED);
    expect(inBounds(allOps(t))).toBe(true);
  });

  it("zones y zoneOverlay tienen exactamente las zonas de ZONE_IDS", () => {
    const t = buildTerrain(SEED);
    expect(Object.keys(t.zones).sort()).toEqual([...ZONE_IDS].sort());
    expect(Object.keys(t.zoneOverlay).sort()).toEqual([...ZONE_IDS].sort());
  });

  it("el primer op de la base es el suelo completo", () => {
    const first = buildTerrain(SEED).base[0];
    expect(first).toEqual({ x: 0, y: 0, w: MAP_W, h: MAP_H, color: PALETTE.ground });
  });

  it("usa solo colores de la paleta", () => {
    const allowed = new Set<number>(Object.values(PALETTE));
    for (const o of allOps(buildTerrain(SEED))) expect(allowed.has(o.color)).toBe(true);
  });

  it("cada tercio tiene terreno propio y los dos frames de agua difieren", () => {
    const t = buildTerrain(SEED);
    for (const id of ZONE_IDS) {
      expect(t.zones[id].length).toBeGreaterThan(200);
      expect(t.zoneOverlay[id].length).toBeGreaterThan(10);
    }
    expect(t.river[0]).not.toEqual(t.river[1]);
  });
});

import { describe, expect, it } from "vitest";
import { GLOW_H, GLOW_W, LANDMARK_SIZE, glowOps, landmarkFrames } from "./landmarks";
import { opsBounds } from "./ops";
import { PALETTE } from "./palette";
import { ZONE_IDS } from "./zones";

describe("landmarks", () => {
  const allowed = new Set<number>(Object.values(PALETTE));

  for (const id of ZONE_IDS) {
    it(`${id}: 2-3 frames, dentro de ${LANDMARK_SIZE}x${LANDMARK_SIZE}, colores de paleta, frames distintos`, () => {
      const frames = landmarkFrames(id);
      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames.length).toBeLessThanOrEqual(3);
      for (const f of frames) {
        const b = opsBounds(f);
        expect(b.minX).toBeGreaterThanOrEqual(0);
        expect(b.minY).toBeGreaterThanOrEqual(0);
        expect(b.maxX).toBeLessThanOrEqual(LANDMARK_SIZE);
        expect(b.maxY).toBeLessThanOrEqual(LANDMARK_SIZE);
        for (const o of f) expect(allowed.has(o.color)).toBe(true);
      }
      expect(frames[0]).not.toEqual(frames[1]);
    });
  }

  it("glow cabe en GLOW_W x GLOW_H y usa mid y bleed", () => {
    const ops = glowOps("cyan");
    const b = opsBounds(ops);
    expect(b.maxX).toBeLessThanOrEqual(GLOW_W);
    expect(b.maxY).toBeLessThanOrEqual(GLOW_H);
    const colors = new Set(ops.map((o) => o.color));
    expect(colors.has(PALETTE.cyanMid)).toBe(true);
    expect(colors.has(PALETTE.cyanBleed)).toBe(true);
  });
});

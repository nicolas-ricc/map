import { describe, expect, it } from "vitest";
import type { Tri } from "../iso/solids";
import { v3 } from "../iso/geometry";
import { createRng } from "../map/seed";
import { buildTerrain } from "./terrain";
import { BANDS, WATER_STEP_MS, WAVE_LAMBDA, WAVE_T_MS, createWaterAnim, triHash, waveTone } from "./water-anim";

const tri = (x: number, y: number, base = 0): Tri => ({ pts: [v3(x, y, -1), v3(x + 6, y, -1), v3(x + 6, y + 6, -1)], baseTone: base });
const tris = (s: { kind: string; tris?: Tri[] }) => (s.kind === "ground" ? s.tris! : []);

describe("water-anim", () => {
  it("la ola es periódica, viaja hacia el noroeste y nunca sale de [−2, 2]", () => {
    for (let k = 0; k < 200; k++) {
      const t = tri(k * 3, (k * 7) % 100, (k % 3) - 1);
      expect(waveTone(t, "water", 1234)).toBe(waveTone(t, "water", 1234 + WAVE_T_MS));
      for (let c = 0; c < WAVE_T_MS; c += 250) expect(Math.abs(waveTone(t, "water", c))).toBeLessThanOrEqual(2);
    }
    let towardNW = 0, towardSE = 0; // la cresta en s a t está en s − λ/4 a t + T/4 (s = x + 0.5 y)
    for (let x = 0; x < 400; x += 6) {
      const a = waveTone(tri(x, 0), "water", 0);
      towardNW += Math.abs(waveTone(tri(x - WAVE_LAMBDA / 4, 0), "water", WAVE_T_MS / 4) - a);
      towardSE += Math.abs(waveTone(tri(x + WAVE_LAMBDA / 4, 0), "water", WAVE_T_MS / 4) - a);
    }
    expect(towardNW).toBeLessThan(towardSE);
  });
  it("el destello (+2) solo aparece en triángulos con hash 0; en promedio la ola respeta el baseTone", () => {
    for (let k = 0; k < 300; k++) {
      const t = tri(k * 5, k * 2, 1);
      let sum = 0, n = 0;
      for (let c = 0; c < WAVE_T_MS; c += 50) { const v = waveTone(t, "water", c); if (v === 2) expect(triHash(t)).toBe(0); sum += v; n++; }
      expect(Math.abs(sum / n - 1)).toBeLessThan(0.6);
    }
  });
  it("reparte el agua en cuatro bandas parejas, pinta una por paso en ronda y alterna la espuma", () => {
    const terrain = buildTerrain(createRng(7));
    const a = createWaterAnim(terrain, { reducedMotion: false });
    const sizes = Array.from({ length: BANDS }, (_, k) => a.band(k).reduce((n, s) => n + tris(s).length, 0));
    const total = terrain.water.reduce((n, s) => n + tris(s).length, 0);
    expect(sizes.reduce((x, y) => x + y, 0)).toBe(total);
    expect(Math.max(...sizes)).toBeLessThan(2 * Math.min(...sizes));
    expect(a.band(0).some((s) => tris(s).some((t) => (t.toneOffset ?? 0) !== 0))).toBe(true);
    const c1 = a.tick(WATER_STEP_MS), c2 = a.tick(WATER_STEP_MS), c3 = a.tick(WATER_STEP_MS), c4 = a.tick(WATER_STEP_MS);
    expect([c1, c2, c3, c4].map((c) => [...c.bands])).toEqual([[1], [2], [3], [0]]);
    expect(a.tick(500).foam).toBe(true);
    expect(a.foam()[0]!.mat).toBe("foam");
  });
  it("triHash reparte parejo mod 4 sobre la grilla y no queda en franjas diagonales", () => {
    const terrain = buildTerrain(createRng(7));
    const all = terrain.water.flatMap((s) => tris(s));
    const counts = [0, 0, 0, 0];
    for (const t of all) counts[triHash(t)]!++;
    for (const n of counts) {
      const share = n / all.length;
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.35);
    }
    let sameAsNeighbor = 0, checked = 0;
    for (let k = 0; k < 300; k++) {
      const a = tri(k * 6, 0), b = tri((k + 1) * 6, 6); // vecinos a lo largo de una diagonal de pantalla
      if (triHash(a) === triHash(b)) sameAsNeighbor++;
      checked++;
    }
    expect(sameAsNeighbor).toBeLessThan(checked); // no todos iguales en la diagonal
  });
  it("con reduced-motion no cambia nada", () => {
    const a = createWaterAnim(buildTerrain(createRng(7)), { reducedMotion: true });
    expect(a.tick(1000)).toEqual({ bands: new Set(), foam: false });
  });
});

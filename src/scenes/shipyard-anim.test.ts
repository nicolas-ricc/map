import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { shipyard } from "./shipyard";
import { TROLLEY_CYCLE_MS, TROLLEY_PAUSE_MS, WATER_CYCLE_MS, createShipyardAnim } from "./shipyard-anim";

const setup = (reducedMotion = false) => {
  const scene = shipyard(createRng(7));
  return { scene, anim: createShipyardAnim(scene, createRng(3), { reducedMotion }) };
};

describe("shipyard-anim", () => {
  it("el carro nunca sale de la viga y vuelve al inicio tras un ciclo", () => {
    const { scene, anim } = setup();
    const [y0, y1] = scene.trolleyRange;
    for (let t = 0; t < TROLLEY_CYCLE_MS; t += 33) {
      anim.tick(33);
      expect(scene.trolley.at.y).toBeGreaterThanOrEqual(y0 - 1e-9);
      expect(scene.trolley.at.y).toBeLessThanOrEqual(y1 + 1e-9);
    }
    anim.tick(TROLLEY_CYCLE_MS - (Math.floor(TROLLEY_CYCLE_MS / 33) * 33));
    expect(scene.trolley.at.y).toBeCloseTo(y0, 3);
  });

  it("durante la pausa inicial el carro no se mueve y tick no reporta cambio", () => {
    const { scene, anim } = setup();
    const y = scene.trolley.at.y;
    const c = anim.tick(TROLLEY_PAUSE_MS / 2);
    expect(scene.trolley.at.y).toBe(y);
    expect(c.trolley).toBe(false);
  });

  it("a mitad de ciclo el carro está en el otro extremo", () => {
    const { scene, anim } = setup();
    anim.tick(TROLLEY_CYCLE_MS / 2);
    expect(scene.trolley.at.y).toBeCloseTo(scene.trolleyRange[1], 3);
    expect(anim.trolleyLamp().at.y).toBeCloseTo(scene.trolleyRange[1] + 2, 3);
    expect(anim.trolleyLamp().at.z).toBeLessThan(scene.trolley.at.z);
  });

  it("el agua cambia de tono por ondas y vuelve a fase tras un ciclo", () => {
    const { scene, anim } = setup();
    const tris = scene.water[0]!.kind === "ground" ? scene.water[0]!.tris : [];
    const c = anim.tick(100);
    expect(c.water).toBe(true);
    const offsets = tris.map((t) => t.toneOffset ?? 0);
    expect(offsets.some((o) => o !== 0)).toBe(true);
    expect(offsets.every((o) => o === -1 || o === 0 || o === 1)).toBe(true);
    // Ruling: 20 ticks de 100ms tras el primero (clock=100→2100) para volver a la misma fase.
    for (let t = 0; t < WATER_CYCLE_MS; t += 100) anim.tick(100);
    expect(tris.map((t) => t.toneOffset ?? 0)).toEqual(offsets);
  });

  it("las chispas aparecen en una cuaderna, duran tres frames y desaparecen", () => {
    const { scene, anim } = setup();
    let seen = 0, maxFrames = 0, run = 0;
    let runSpot: { x: number; y: number } | null = null;
    for (let t = 0; t < 20000; t += 100) {
      anim.tick(100);
      const s = anim.sparks();
      if (s.length > 0) {
        seen++; run++; maxFrames = Math.max(maxFrames, run);
        expect(s.length).toBeGreaterThanOrEqual(4);
        expect(s.length).toBeLessThanOrEqual(6);
        expect(scene.weldSpots.some((w) => Math.abs(w.x - s[0]!.at.x) < 3 && Math.abs(w.y - s[0]!.at.y) < 3)).toBe(true);
        if (run === 1) {
          // primera frame del evento: fija la cuaderna que todo el flicker debe respetar.
          // Se promedia la frame para cancelar el jitter y se toma la cuaderna más
          // cercana (no la primera que matchee un umbral, porque hay varias a <3u).
          const cx = s.reduce((sum, a) => sum + a.at.x, 0) / s.length;
          const cy = s.reduce((sum, a) => sum + a.at.y, 0) / s.length;
          runSpot = scene.weldSpots.reduce((best, w) => {
            const d = Math.hypot(w.x - cx, w.y - cy);
            return d < best.d ? { w, d } : best;
          }, { w: scene.weldSpots[0]!, d: Infinity }).w;
        } else if (runSpot) {
          // frames siguientes del mismo evento: todas las chispas cerca de la MISMA cuaderna
          for (const a of s) {
            expect(Math.abs(a.at.x - runSpot.x)).toBeLessThan(3);
            expect(Math.abs(a.at.y - runSpot.y)).toBeLessThan(3);
          }
        }
      } else { run = 0; runSpot = null; }
    }
    expect(seen).toBeGreaterThan(5);
    expect(maxFrames).toBeLessThanOrEqual(3);
  });

  it("con reduced-motion nada cambia nunca", () => {
    const { scene, anim } = setup(true);
    const y = scene.trolley.at.y;
    for (let i = 0; i < 100; i++) {
      const c = anim.tick(200);
      expect(c).toEqual({ trolley: false, water: false, sparks: false });
    }
    expect(scene.trolley.at.y).toBe(y);
    expect(anim.sparks()).toEqual([]);
  });
});

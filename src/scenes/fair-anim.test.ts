import { describe, expect, it } from "vitest";
import { bounds } from "../iso/solids";
import { createRng } from "../map/seed";
import { DROP, coasterAt, coasterLength, fair } from "./fair";
import { DROP_CYCLE_MS, WHEEL_PERIOD_MS, WHEEL_STEP_MS, createFairAnim } from "./fair-anim";

const setup = (reducedMotion = false) => createFairAnim(fair(createRng(7)), { reducedMotion });

describe("fair-anim", () => {
  it("la rueda da una vuelta en 40 s y se redibuja cada 250 ms; cuatro luces de la llanta encendidas a la vez", () => {
    const a = setup();
    expect(a.angle()).toBe(0);
    expect(a.tick(WHEEL_STEP_MS).wheel).toBe(true); expect(a.tick(50).wheel).toBe(false);
    // El reloj queda entre 300 ms y 40 000 ms: nunca llega a completar la vuelta.
    for (let t = WHEEL_STEP_MS + 50; t + 500 < WHEEL_PERIOD_MS; t += 500) a.tick(500);
    expect(a.angle()).toBeGreaterThan(6.2); expect(a.angle()).toBeLessThan(2 * Math.PI);
    expect(a.wheelLights()).toHaveLength(4);
    expect(a.wheel()[0]!.kind).toBe("wheel");
  });
  it("el tren nunca sale de la vía, sube despacio y baja rápido", () => {
    const a = setup();
    const L = coasterLength();
    let prev = a.trainDist(), prevSeg = coasterAt(prev).seg;
    for (let t = 0; t < 60; t++) {
      a.tick(1000);
      const d = a.trainDist(), p = coasterAt(d);
      const moved = ((d - prev) % L + L) % L; prev = d;
      expect(moved).toBeGreaterThan(0); expect(moved).toBeLessThanOrEqual(9.01);
      if (prevSeg < 6 && p.seg < 6) expect(moved).toBeLessThanOrEqual(3.01); // la velocidad se decide al arrancar el tick
      prevSeg = p.seg;
      // El perfil real llega a 4.16 (vía + 1.45 del asiento) entre el auto de punta y el de cola (5.2 atrás) en la bajada más brusca: 3 no alcanza.
      for (const s of a.train()) { const b = bounds(s); expect(Math.abs((b.min.z + b.max.z) / 2 - p.z)).toBeLessThan(4.2); }
    }
  });
  it("la góndola sube 6 s, espera 1 s, cae en 0.6 s y vuelve a la base al final del ciclo", () => {
    const a = setup();
    expect(a.dropZ()).toBe(1);
    for (let t = 0; t < 6000; t += 100) a.tick(100);
    expect(a.dropZ()).toBeCloseTo(DROP.h - 3, 1);
    a.tick(1000); expect(a.dropZ()).toBeCloseTo(DROP.h - 3, 1);
    a.tick(600); expect(a.dropZ()).toBeCloseTo(1, 1);
    a.tick(DROP_CYCLE_MS - 7600); expect(a.dropZ()).toBeCloseTo(1, 1);
    expect(a.drop()).toHaveLength(9);
  });
  it("los carteles del salón alternan cada 500 ms; con reduced-motion nada cambia y la rueda tiene sus 4 luces fijas", () => {
    const a = setup();
    const s0 = a.signs()[0]!.color; a.tick(500); expect(a.signs()[0]!.color).not.toBe(s0);
    const r = setup(true);
    expect(r.tick(1000)).toEqual({ wheel: false, lights: false, train: false, drop: false, signs: false });
    expect(r.wheelLights()).toHaveLength(4); expect(r.angle()).toBe(0);
  });
});

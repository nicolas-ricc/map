import { describe, expect, it } from "vitest";
import type { Accent } from "../iso/accent";
import { createRng } from "../map/seed";
import { city } from "./city";
import { ANTENNA_STEP_MS, PAPER_RANGE, createCityAnim } from "./city-anim";

const setup = (reducedMotion = false) => {
  const tower = city(createRng(7), createRng(8)).tower;
  return { tower, anim: createCityAnim(tower, createRng(3), { reducedMotion }) };
};
const dot = (a: Accent): Extract<Accent, { kind: "dot" }> => { if (a.kind !== "dot") throw new Error("se esperaba dot"); return a; };

describe("city-anim", () => {
  it("frame 0: piso encendido, papeles escalonados desde la ventana, antena a radio 1.1", () => {
    const { tower, anim } = setup();
    const w = tower.paperWindow;
    expect(anim.lit()).toEqual(tower.litWindows);
    expect(anim.papers().length).toBeGreaterThanOrEqual(5);
    expect(anim.papers().length).toBeLessThanOrEqual(8);
    // el reguero arranca en la ventana y se estira: uno está exactamente ahí y ninguno pasa PAPER_RANGE
    expect(anim.papers().some((p) => dot(p).at.x === w.x && dot(p).at.y === w.y && dot(p).at.z === w.z)).toBe(true);
    for (const p of anim.papers()) {
      const d = dot(p);
      expect(Math.hypot(d.at.x - w.x, d.at.y - w.y)).toBeLessThanOrEqual(PAPER_RANGE + 2);
      expect(d.r).toBeGreaterThanOrEqual(0.12 - 1e-6);
      expect(d.r).toBeLessThanOrEqual(0.4 + 1e-6);
    }
    expect(dot(anim.antenna()).r).toBeCloseTo(1.1, 6);
    expect(dot(anim.antenna()).color).toBe("amberMid");
  });

  it("el piso se apaga de a un tick, nunca dos seguidos, y se apaga al menos 5 veces en 60 s", () => {
    const { anim } = setup();
    let offs = 0, prevOff = false;
    for (let t = 0; t < 60000; t += 33) {
      anim.tick(33);
      const off = anim.lit().length === 0;
      expect(off && prevOff).toBe(false);
      if (off) offs++;
      prevOff = off;
    }
    expect(offs).toBeGreaterThanOrEqual(5);
    expect(offs).toBeLessThanOrEqual(16);
  });

  it("los papeles nunca se alejan más de PAPER_RANGE de la ventana y derivan al NNE", () => {
    const { tower, anim } = setup();
    let driftedNNE = false;
    for (let t = 0; t < 20000; t += 33) {
      const c = anim.tick(33);
      expect(c.papers).toBe(true);
      for (const p of anim.papers()) {
        const d = dot(p);
        expect(Math.hypot(d.at.x - tower.paperWindow.x, d.at.y - tower.paperWindow.y)).toBeLessThanOrEqual(PAPER_RANGE + 2);
        expect(d.at.y).toBeLessThanOrEqual(tower.paperWindow.y + 2); // nunca baja hacia el sur
        expect(d.r).toBeGreaterThanOrEqual(0.12 - 1e-6);
        expect(d.r).toBeLessThanOrEqual(0.4 + 1e-6);
        if (d.at.x > tower.paperWindow.x + 10 && d.at.y < tower.paperWindow.y - 10) driftedNNE = true;
      }
    }
    expect(driftedNNE).toBe(true);
  });

  it("la antena pulsa entre 0.8 y 1.4 y solo reporta cambio cada ANTENNA_STEP_MS", () => {
    const { anim } = setup();
    let changes = 0;
    for (let t = 0; t < 10000; t += 33) {
      if (anim.tick(33).antenna) changes++;
      const r = dot(anim.antenna()).r;
      expect(r).toBeGreaterThanOrEqual(0.8 - 1e-6); expect(r).toBeLessThanOrEqual(1.4 + 1e-6);
    }
    expect(changes).toBeGreaterThan(10000 / ANTENNA_STEP_MS - 5);
    expect(changes).toBeLessThanOrEqual(10000 / ANTENNA_STEP_MS + 1);
  });

  it("con reduced-motion nada cambia", () => {
    const { tower, anim } = setup(true);
    const before = JSON.stringify(anim.papers());
    for (let t = 0; t < 5000; t += 33) expect(anim.tick(33)).toEqual({ lit: false, papers: false, antenna: false });
    expect(anim.lit()).toEqual(tower.litWindows);
    expect(JSON.stringify(anim.papers())).toBe(before); // el reguero queda congelado donde arrancó
  });
});

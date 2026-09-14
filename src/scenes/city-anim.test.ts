import { describe, expect, it } from "vitest";
import type { Accent } from "../iso/accent";
import { createRng } from "../map/seed";
import { city } from "./city";
import { ANTENNA_STEP_MS, PAPER_RANGE, createCityAnim } from "./city-anim";

const setup = (reducedMotion = false) => {
  const tower = city(createRng(7)).tower;
  return { tower, anim: createCityAnim(tower, createRng(3), { reducedMotion }) };
};
const dot = (a: Accent): Extract<Accent, { kind: "dot" }> => { if (a.kind !== "dot") throw new Error("se esperaba dot"); return a; };

describe("city-anim", () => {
  it("frame 0: piso encendido, papeles en la ventana, antena a radio 1.1", () => {
    const { tower, anim } = setup();
    expect(anim.lit()).toEqual(tower.litWindows);
    expect(anim.papers().length).toBeGreaterThanOrEqual(5);
    expect(anim.papers().length).toBeLessThanOrEqual(8);
    for (const p of anim.papers()) expect(dot(p).at).toEqual(tower.paperWindow);
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

  it("los papeles nunca se alejan más de PAPER_RANGE de la ventana y derivan al ENE", () => {
    const { tower, anim } = setup();
    let movedEast = false;
    for (let t = 0; t < 20000; t += 33) {
      const c = anim.tick(33);
      expect(c.papers).toBe(true);
      for (const p of anim.papers()) {
        const d = dot(p).at;
        expect(Math.hypot(d.x - tower.paperWindow.x, d.y - tower.paperWindow.y)).toBeLessThanOrEqual(PAPER_RANGE + 1e-6);
        expect(d.x).toBeGreaterThanOrEqual(tower.paperWindow.x - 1e-6);
        expect(d.y).toBeLessThanOrEqual(tower.paperWindow.y + 1e-6);
        if (d.x > tower.paperWindow.x + 10) movedEast = true;
      }
    }
    expect(movedEast).toBe(true);
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
    for (let t = 0; t < 5000; t += 33) expect(anim.tick(33)).toEqual({ lit: false, papers: false, antenna: false });
    expect(anim.lit()).toEqual(tower.litWindows);
    for (const p of anim.papers()) expect(dot(p).at).toEqual(tower.paperWindow);
  });
});

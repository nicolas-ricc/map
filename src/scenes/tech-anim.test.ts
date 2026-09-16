import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { tech } from "./tech";
import { SIGN_PERIOD_MS, SIGN_STEP_MS, TECH_BLINK_GAP_MS, createTechAnim } from "./tech-anim";

const setup = (reducedMotion = false) => { const scene = tech(createRng(7)); return { scene, anim: createTechAnim(scene, createRng(3), { reducedMotion }) }; };

describe("tech-anim", () => {
  it("frame 0: cada torre tiene un piso encendido (ventanas ámbar en sus caras visibles), carteles a alpha 1, luz de telecom", () => {
    const { scene, anim } = setup();
    const w = anim.windows();
    expect(w.length).toBeGreaterThanOrEqual(scene.towers.length);
    for (const a of w) expect(a).toMatchObject({ kind: "poly", color: "amber" });
    expect(anim.signs().every((a) => a.kind === "poly" && a.alpha === 1)).toBe(true);
    expect(anim.telecom()).toMatchObject({ kind: "dot", color: "amber" });
  });
  it("cada 4..9 s una torre cambia o apaga su piso; los carteles pulsan con período 3 s; la luz pulsa cada 100 ms", () => {
    const { anim } = setup();
    const before = JSON.stringify(anim.windows());
    let changed = false;
    for (let t = 0; t < TECH_BLINK_GAP_MS[1] + 100; t += 100) if (anim.tick(100).windows) changed = true;
    expect(changed).toBe(true);
    expect(JSON.stringify(anim.windows())).not.toBe(before);
    const s0 = anim.signs()[0]!;
    const a0 = s0.kind === "poly" ? s0.alpha : 1;
    anim.tick(SIGN_PERIOD_MS / 2);
    const s1 = anim.signs()[0]!;
    const a1 = s1.kind === "poly" ? s1.alpha : 1;
    expect(a1).not.toBe(a0);
    expect(anim.tick(SIGN_STEP_MS).signs).toBe(true);
    expect(anim.tick(100).telecom).toBe(true);
  });
  it("con reduced-motion no cambia nada", () => {
    const { anim } = setup(true);
    for (let i = 0; i < 100; i++) expect(anim.tick(100)).toEqual({ windows: false, signs: false, telecom: false });
  });
});

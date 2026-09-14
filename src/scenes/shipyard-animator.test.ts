import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { shipyard } from "./shipyard";
import { TROLLEY_CYCLE_MS } from "./shipyard-anim";
import { shipyardAnimator } from "./shipyard-animator";
import { buildTerrain } from "./terrain";

const setup = (reducedMotion = false) => {
  const scene = shipyard(createRng(7));
  const water = [buildTerrain(createRng(7), ["portfolio"]).river];
  return { scene, anim: shipyardAnimator(scene, water, createRng(3), { reducedMotion }) };
};

describe("shipyardAnimator", () => {
  it("expone cuatro capas con nombre y del tipo correcto", () => {
    const { scene, anim } = setup();
    expect([...anim.ids].sort()).toEqual(["sparks", "trolley", "trolleyLamp", "water"]);
    expect(anim.layer("water").kind).toBe("water");
    const t = anim.layer("trolley");
    expect(t.kind === "solid" && t.solids).toEqual([scene.trolley]);
    expect(anim.layer("trolleyLamp").kind).toBe("accent");
    expect(anim.layer("sparks").kind).toBe("accent");
  });

  it("cuando el carro se mueve cambian carro y lámpara; el agua cambia cada 100 ms", () => {
    const { anim } = setup();
    const c = anim.tick(TROLLEY_CYCLE_MS / 2);
    expect(c.has("trolley")).toBe(true);
    expect(c.has("trolleyLamp")).toBe(true);
    expect(c.has("water")).toBe(true);
  });

  it("con reduced-motion no cambia nada", () => {
    const { anim } = setup(true);
    expect(anim.tick(500).size).toBe(0);
  });
});

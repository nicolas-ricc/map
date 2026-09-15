import { describe, expect, it } from "vitest";
import { seaAnimator } from "./sea-animator";
import { world } from "./world";

describe("seaAnimator", () => {
  it("expone las capas del mar (barcos, haz, boyas) y con reduced-motion no devuelve ids", () => {
    const w = world(7);
    const a = seaAnimator(w.sea!, { reducedMotion: false });
    expect(a.ids).toEqual(expect.arrayContaining(["sea.ship0", "sea.wake2", "sea.lights1", "sea.beam", "sea.buoys"]));
    expect(a.layer("sea.ship0").kind).toBe("solid");
    expect(a.layer("sea.wake0")).toMatchObject({ kind: "water", alpha: 0 }); // fase 0: en la bahía, aún invisible: no hace falta redibujarlo
    const ids = a.tick(100);
    expect(ids.has("sea.ship0")).toBe(true); expect(ids.has("sea.beam")).toBe(true);
    const r = seaAnimator(w.sea!, { reducedMotion: true });
    expect(r.tick(1000).size).toBe(0);
  });
});

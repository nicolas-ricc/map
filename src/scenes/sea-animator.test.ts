import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { seaAnimator } from "./sea-animator";
import { world } from "./world";

describe("seaAnimator", () => {
  it("expone las capas del mar, reclama los tres cuerpos de agua y con reduced-motion no devuelve ids", () => {
    const w = world(7);
    const a = seaAnimator(w.sea!, w.terrain, createRng(3), { reducedMotion: false });
    expect(a.ids).toEqual(expect.arrayContaining(["sea.band0", "sea.band1", "sea.band2", "sea.abyss", "sea.ship0", "sea.wake2", "sea.lights1", "sea.beam", "sea.buoys"]));
    expect(a.claims).toEqual([w.terrain.sea, w.terrain.shore, w.terrain.abyss]);
    expect(a.layer("sea.ship0").kind).toBe("solid");
    expect(a.layer("sea.wake0")).toMatchObject({ kind: "water", alpha: 0 }); // fase 0: en la bahía, aún invisible
    const ids = a.tick(100);
    expect(ids.has("sea.ship0")).toBe(true); expect(ids.has("sea.beam")).toBe(true);
    expect([...ids].filter((id) => id.startsWith("sea.band")).length).toBeLessThanOrEqual(2); // una banda por paso (más la espuma)
    const r = seaAnimator(w.sea!, w.terrain, createRng(3), { reducedMotion: true });
    expect(r.tick(1000).size).toBe(0);
  });
});

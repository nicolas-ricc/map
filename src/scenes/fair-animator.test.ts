import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { fair } from "./fair";
import { fairAnimator } from "./fair-animator";

describe("fairAnimator", () => {
  it("expone rueda, luces, tren, torre y carteles; con reduced-motion no devuelve ids", () => {
    const a = fairAnimator(fair(createRng(7)), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["fair.drop", "fair.signs", "fair.train", "fair.wheel", "fair.wheelLights"]);
    expect(a.layer("fair.wheel").kind).toBe("solid"); expect(a.layer("fair.wheelLights").kind).toBe("accent");
    expect(a.tick(250).has("fair.wheel")).toBe(true);
    expect(fairAnimator(fair(createRng(7)), { reducedMotion: true }).tick(1000).size).toBe(0);
  });
});

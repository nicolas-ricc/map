import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { tech } from "./tech";
import { techAnimator } from "./tech-animator";

describe("techAnimator", () => {
  it("expone ventanas, carteles y telecom; con reduced-motion no devuelve ids", () => {
    const a = techAnimator(tech(createRng(7)), createRng(3), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["tech.signs", "tech.telecom", "tech.windows"]);
    expect(a.layer("tech.windows").kind).toBe("accent");
    expect(techAnimator(tech(createRng(7)), createRng(3), { reducedMotion: true }).tick(1000).size).toBe(0);
  });
});

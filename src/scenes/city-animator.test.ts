import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { city } from "./city";
import { cityAnimator } from "./city-animator";

describe("city-animator", () => {
  it("expone tres capas de acentos y solo devuelve las que cambiaron", () => {
    const a = cityAnimator(city(createRng(7), createRng(8)), createRng(3), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["city.antenna", "city.lit", "city.papers"]);
    for (const id of a.ids) expect(a.layer(id).kind).toBe("accent");
    const changed = a.tick(33);
    expect(changed.has("city.papers")).toBe(true);
    expect(changed.has("city.lit")).toBe(false); // primer tick: todavía encendido
  });
  it("con reduced-motion no devuelve ids", () => {
    const a = cityAnimator(city(createRng(7), createRng(8)), createRng(3), { reducedMotion: true });
    expect(a.tick(1000).size).toBe(0);
  });
});

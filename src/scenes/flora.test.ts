import { describe, expect, it } from "vitest";
import type { Solid } from "../iso/solids";
import { createRng } from "../map/seed";
import { jungle } from "./flora";

describe("flora", () => {
  it("pone n conos de selva dentro del rectángulo, a la altura pedida", () => {
    const out: Solid[] = [];
    jungle(out, createRng(7), { x0: 10, x1: 20, y0: 30, y1: 40 }, 8, 0.2);
    expect(out).toHaveLength(8);
    for (const s of out) {
      expect(s.kind).toBe("cone");
      if (s.kind !== "cone") continue;
      expect(["leaf", "leafDark"]).toContain(s.mat);
      expect(s.at.x).toBeGreaterThanOrEqual(10); expect(s.at.x).toBeLessThanOrEqual(20);
      expect(s.at.y).toBeGreaterThanOrEqual(30); expect(s.at.y).toBeLessThanOrEqual(40);
      expect(s.at.z).toBe(0.2);
      expect(s.r).toBeGreaterThanOrEqual(2); expect(s.r).toBeLessThanOrEqual(4);
      expect(s.h).toBeGreaterThanOrEqual(5); expect(s.h).toBeLessThanOrEqual(9);
    }
  });
  it("es determinística y por defecto apoya a z 0.4", () => {
    const a: Solid[] = [], b: Solid[] = [];
    jungle(a, createRng(3), { x0: 0, x1: 5, y0: 0, y1: 5 }, 3);
    jungle(b, createRng(3), { x0: 0, x1: 5, y0: 0, y1: 5 }, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.every((s) => s.kind === "cone" && s.at.z === 0.4)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createRng } from "./seed";

describe("createRng", () => {
  it("es determinístico para la misma seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("cambia con la seed", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("next está en [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int es inclusivo en ambos extremos", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(0, 2));
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it("pick devuelve un elemento del array", () => {
    const rng = createRng(9);
    expect(["a", "b", "c"]).toContain(rng.pick(["a", "b", "c"]));
  });
});

import { describe, expect, it } from "vitest";
import { fitTransform } from "./draw";

describe("fitTransform", () => {
  it("escala para que el bounding box entre con margen y quede centrado", () => {
    const items = [{ layer: "ground" as const, pts: [0, 0, 100, 0, 100, 50, 0, 50], color: 0 }];
    const f = fitTransform(items, 1000, 1000, 0.1);
    expect(f.scale).toBeCloseTo(8); // 800 / 100
    expect(f.x).toBeCloseTo(100);
    expect(f.y).toBeCloseTo(500 - 25 * 8);
  });
  it("con la lista vacía no explota", () => {
    expect(fitTransform([], 100, 100)).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

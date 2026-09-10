import { describe, expect, it } from "vitest";
import { opsBounds, px, rect } from "./ops";

describe("ops", () => {
  it("px es un rect de 1x1", () => {
    expect(px(3, 4, 0xff)).toEqual({ x: 3, y: 4, w: 1, h: 1, color: 0xff });
  });
  it("opsBounds cubre todos los rects", () => {
    const b = opsBounds([rect(2, 3, 4, 5, 1), px(10, 1, 1)]);
    expect(b).toEqual({ minX: 2, minY: 1, maxX: 11, maxY: 8 });
  });
  it("opsBounds de lista vacía es cero", () => {
    expect(opsBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});

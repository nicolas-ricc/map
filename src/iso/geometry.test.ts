import { describe, expect, it } from "vitest";
import { centroid, convexHull, dot, normalize, polygonNormal, v3 } from "./geometry";

describe("geometry", () => {
  it("polygonNormal de un cuadrado horizontal apunta en z", () => {
    const n = polygonNormal([v3(0, 0, 0), v3(1, 0, 0), v3(1, 1, 0), v3(0, 1, 0)]);
    expect(Math.abs(n.z)).toBeCloseTo(1, 6);
    expect(n.x).toBeCloseTo(0, 6);
  });

  it("polygonNormal de una pared este apunta en x", () => {
    const n = polygonNormal([v3(1, 0, 0), v3(1, 1, 0), v3(1, 1, 2), v3(1, 0, 2)]);
    expect(Math.abs(n.x)).toBeCloseTo(1, 6);
  });

  it("normalize y dot", () => {
    const n = normalize(v3(3, 0, 4));
    expect(n).toEqual({ x: 0.6, y: 0, z: 0.8 });
    expect(dot(n, v3(0, 0, 1))).toBeCloseTo(0.8);
    expect(normalize(v3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("centroid promedia", () => {
    expect(centroid([v3(0, 0, 0), v3(2, 0, 0), v3(2, 2, 4)])).toEqual({ x: 4 / 3, y: 2 / 3, z: 4 / 3 });
  });

  it("convexHull descarta puntos interiores y colineales", () => {
    const hull = convexHull([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }]);
    expect(hull).toHaveLength(4);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 2, y: 2 });
    expect(hull).not.toContainEqual({ x: 1, y: 1 });
  });

  it("convexHull de menos de tres puntos devuelve lo que hay", () => {
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });
});

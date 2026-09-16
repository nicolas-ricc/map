import { describe, expect, it } from "vitest";
import { centroid, convexHull, dot, normalize, polygonNormal, polyline, v3 } from "./geometry";

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

describe("polyline", () => {
  const line = polyline([v3(0, 0, 0), v3(3, 4, 10), v3(3, 14, 20)]);

  it("arma los tramos con largo en planta, rumbo y largo total", () => {
    expect(line.segs.map((s) => s.len)).toEqual([5, 10]);
    expect(line.length).toBe(15);
    expect(line.segs[0]!.heading).toBeCloseTo(Math.atan2(4, 3));
    expect(line.segs[1]!.heading).toBeCloseTo(Math.PI / 2);
  });

  it("interpola posición, z y rumbo en el medio del segundo tramo", () => {
    const p = line.at(10);
    expect(p.x).toBeCloseTo(3); expect(p.y).toBeCloseTo(9); expect(p.z).toBeCloseTo(15);
    expect(p.heading).toBeCloseTo(Math.PI / 2);
    expect(p.seg).toBe(1);
  });

  it("en el límite entre dos tramos manda el anterior", () => {
    const p = line.at(5);
    expect(p.seg).toBe(0);
    expect(p.x).toBeCloseTo(3); expect(p.y).toBeCloseTo(4); expect(p.z).toBeCloseTo(10);
    expect(p.heading).toBeCloseTo(line.segs[0]!.heading);
    expect(line.at(5.0001).seg).toBe(1);
  });

  it("recorta la distancia a [0, length] y pone z 0 con puntos planos", () => {
    expect(line.at(-7)).toEqual({ x: 0, y: 0, z: 0, heading: line.segs[0]!.heading, seg: 0 });
    const end = line.at(99);
    expect(end.x).toBeCloseTo(3); expect(end.y).toBeCloseTo(14); expect(end.z).toBeCloseTo(20);
    const flat = polyline([{ x: 0, y: 0 }, { x: 8, y: 0 }]);
    expect(flat.length).toBe(8);
    expect(flat.at(4)).toEqual({ x: 4, y: 0, z: 0, heading: 0, seg: 0 });
  });
});

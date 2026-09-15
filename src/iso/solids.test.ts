// src/iso/solids.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { bounds, isFlat, tessellate, tessellateAll, type Solid } from "./solids";

const prism: Solid = { kind: "prism", at: v3(0, 0, 0), w: 2, d: 3, h: 4, mat: "concrete" };

describe("tessellate", () => {
  it("un prisma emite 6 caras en total y 3 visibles: techo, sur, este", () => {
    expect(tessellateAll(prism)).toHaveLength(6);
    const vis = tessellate(prism);
    expect(vis.map((f) => f.tone).sort()).toEqual(["lit", "shade", "top"]);
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts.every((p) => p.z === 4)).toBe(true);
    const south = vis.find((f) => f.tone === "lit")!;
    expect(south.pts.every((p) => p.y === 3)).toBe(true);
    const east = vis.find((f) => f.tone === "shade")!;
    expect(east.pts.every((p) => p.x === 2)).toBe(true);
    expect(vis.every((f) => f.mat === "concrete" && f.toneOffset === 0)).toBe(true);
  });

  it("las normales apuntan hacia afuera sin importar el orden de los vértices", () => {
    for (const f of tessellateAll(prism)) {
      const c = { x: 1, y: 1.5, z: 2 };
      const fc = { x: f.pts.reduce((s, p) => s + p.x, 0) / f.pts.length, y: f.pts.reduce((s, p) => s + p.y, 0) / f.pts.length, z: f.pts.reduce((s, p) => s + p.z, 0) / f.pts.length };
      expect(f.normal.x * (fc.x - c.x) + f.normal.y * (fc.y - c.y) + f.normal.z * (fc.z - c.z)).toBeGreaterThan(0);
    }
  });

  it("techo a dos aguas: dos vertientes (up/down) y los hastiales como pentágonos", () => {
    const vis = tessellate({ ...prism, w: 10, d: 4, roof: "gable" });
    expect(vis.map((f) => f.tone)).toContain("up");
    expect(vis.map((f) => f.tone)).toContain("down");
    const east = vis.find((f) => f.pts.every((p) => p.x === 10))!;
    expect(east.pts).toHaveLength(5);
    expect(Math.max(...east.pts.map((p) => p.z))).toBeCloseTo(4 + 0.35 * 4);
  });

  it("techo escalonado: la caja más un segundo nivel más chico encima", () => {
    const all = tessellateAll({ ...prism, w: 10, d: 10, roof: "step" });
    expect(all).toHaveLength(12);
    const tops = all.filter((f) => f.tone === "top").map((f) => f.pts[0]!.z).sort();
    expect(tops).toEqual([4, 4 + 4 * 0.35]);
  });

  it("rampa hacia el este: el techo baja de oeste a este", () => {
    const vis = tessellate({ kind: "ramp", at: v3(0, 0, 0), w: 10, d: 4, h: 2, mat: "concrete", dir: "e" });
    const top = vis.find((f) => f.normal.z > 0.5)!;
    const west = top.pts.filter((p) => p.x === 0), east = top.pts.filter((p) => p.x === 10);
    expect(west.every((p) => p.z === 2)).toBe(true);
    expect(east.every((p) => p.z === 0)).toBe(true);
  });

  it("poly: prisma sobre una huella de 5 vértices, techo + 5 lados, solo los visibles", () => {
    const footprint = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 8, y: 3 }, { x: 4, y: 6 }, { x: 0, y: 4 }];
    const s: Solid = { kind: "poly", footprint, z: 1, h: 3, mat: "rock" };
    expect(tessellateAll(s)).toHaveLength(7);
    const vis = tessellate(s);
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(5);
    expect(top.pts.every((p) => p.z === 4)).toBe(true);
    expect(vis.length).toBeGreaterThanOrEqual(3);
    expect(vis.length).toBeLessThanOrEqual(5);
    expect(bounds(s)).toEqual({ min: { x: 0, y: 0, z: 1 }, max: { x: 8, y: 6, z: 4 } });
  });

  it("rampa hacia el sur: alto al norte, bajo al sur; hacia el norte, al revés", () => {
    const top = (dir: "n" | "s") => tessellate({ kind: "ramp", at: v3(0, 0, 0), w: 4, d: 10, h: 2, mat: "concrete", dir }).find((f) => f.normal.z > 0.5)!;
    const south = top("s");
    expect(south.pts.filter((p) => p.y === 0).every((p) => p.z === 2)).toBe(true);
    expect(south.pts.filter((p) => p.y === 10).every((p) => p.z === 0)).toBe(true);
    const north = top("n");
    expect(north.pts.filter((p) => p.y === 0).every((p) => p.z === 0)).toBe(true);
    expect(north.pts.filter((p) => p.y === 10).every((p) => p.z === 2)).toBe(true);
  });

  it("cilindro de 8 lados: techo octogonal y solo los lados que miran a la cámara", () => {
    const vis = tessellate({ kind: "cylinder", at: v3(0, 0, 0), r: 2, h: 5, mat: "steel" });
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(8);
    const sides = vis.filter((f) => f.tone !== "top");
    expect(sides.length).toBeGreaterThanOrEqual(3);
    expect(sides.length).toBeLessThanOrEqual(5);
    expect(tessellateAll({ kind: "cylinder", at: v3(0, 0, 0), r: 2, h: 5, mat: "steel" })).toHaveLength(10);
  });

  it("cono de 6 lados: triángulos al ápice, sin techo", () => {
    const all = tessellateAll({ kind: "cone", at: v3(0, 0, 0), r: 2, h: 5, mat: "leaf" });
    expect(all).toHaveLength(7); // base + 6 lados
    expect(all.filter((f) => f.pts.length === 3)).toHaveLength(6);
    const vis = tessellate({ kind: "cone", at: v3(0, 0, 0), r: 2, h: 5, mat: "leaf" });
    expect(vis.every((f) => f.pts.length === 3)).toBe(true);
    expect(vis.some((f) => f.tone === "up")).toBe(true);
    expect(vis.some((f) => f.tone === "down")).toBe(true);
  });

  it("casco: popa cuadrada, proa en punta al este", () => {
    const all = tessellateAll({ kind: "hull", at: v3(0, 0, 0), len: 20, beam: 4, h: 2, mat: "hull" });
    const top = all.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(5);
    expect(top.pts).toContainEqual({ x: 20, y: 0, z: 2 });
    expect(top.pts).toContainEqual({ x: 0, y: -2, z: 2 });
  });

  it("hull con heading π/2 tiene la proa al sur (+y) y gira alrededor de la popa", () => {
    const pts = tessellateAll({ kind: "hull", at: v3(10, 20, 0), len: 20, beam: 4, h: 2, mat: "hull", heading: Math.PI / 2 }).flatMap((f) => f.pts);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(40, 6);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(20, 6);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(8, 6);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(12, 6);
  });

  it("franja: un cuadrilátero horizontal por segmento, sin descarte", () => {
    const s: Solid = { kind: "strip", path: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], width: 2, z: -0.4, mat: "road" };
    const vis = tessellate(s);
    expect(vis).toHaveLength(2);
    expect(vis[0]!.pts).toHaveLength(4);
    expect(vis[0]!.pts.every((p) => p.z === -0.4)).toBe(true);
    expect(vis[0]!.tone).toBe("top");
    expect(isFlat(s)).toBe(true);
  });

  it("suelo: cada triángulo con su tono por inclinación y su offset", () => {
    const s: Solid = {
      kind: "ground", mat: "slab",
      tris: [
        { pts: [v3(0, 0, 0), v3(6, 0, 0), v3(0, 6, 0)] },
        { pts: [v3(6, 0, 0), v3(6, 6, 2), v3(0, 6, 0)], toneOffset: 1 },
      ],
    };
    const vis = tessellate(s);
    expect(vis).toHaveLength(2);
    expect(vis[0]!.tone).toBe("top");
    expect(vis[0]!.toneOffset).toBe(0);
    expect(vis[1]!.tone).not.toBe("top");
    expect(vis[1]!.toneOffset).toBe(1);
    expect(vis.every((f) => f.normal.z > 0)).toBe(true);
  });
});

describe("bounds", () => {
  it("AABB de un prisma", () => {
    expect(bounds({ kind: "prism", at: v3(1, 2, 3), w: 4, d: 5, h: 6, mat: "steel" })).toEqual({ min: { x: 1, y: 2, z: 3 }, max: { x: 5, y: 7, z: 9 } });
  });
  it("AABB de un gable incluye la cumbrera", () => {
    expect(bounds({ kind: "prism", at: v3(0, 0, 0), w: 10, d: 4, h: 4, mat: "steel", roof: "gable" }).max.z).toBeCloseTo(5.4);
  });
  it("AABB de un suelo", () => {
    const b = bounds({ kind: "ground", mat: "slab", tris: [{ pts: [v3(0, 0, -1), v3(6, 0, 0), v3(0, 6, 1)] }] });
    expect(b).toEqual({ min: { x: 0, y: 0, z: -1 }, max: { x: 6, y: 6, z: 1 } });
  });
});

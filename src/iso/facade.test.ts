import { describe, expect, it } from "vitest";
import { facadeAccents, facadeFaces, isWall, windowPatches, type Facade } from "./facade";
import { v3 } from "./geometry";
import { tessellate, tessellateAll, type Face, type Solid } from "./solids";

const tower: Solid & { kind: "prism" } = { kind: "prism", at: v3(0, 0, 0), w: 4, d: 4, h: 6, mat: "office", facade: { floors: 3, cols: 2 } };

describe("fachada", () => {
  it("por cada pared visible: la pared, luego 6 ventanas de vidrio y 3 losas oscuras", () => {
    const vis = tessellate(tower);
    const walls = vis.filter(isWall).filter((f) => f.mat === "office" && f.toneOffset === 0);
    expect(walls).toHaveLength(2);
    expect(vis).toHaveLength(3 + 2 * 9);
    for (const wall of walls) {
      const i = vis.indexOf(wall);
      const after = vis.slice(i + 1, i + 10);
      expect(after.filter((f) => f.mat === "glass")).toHaveLength(6);
      expect(after.filter((f) => f.mat === "office" && f.toneOffset === -1)).toHaveLength(3);
      for (const f of after) expect(f.normal).toEqual(wall.normal); // coplanares: se pintan encima
    }
  });

  it("las ventanas quedan dentro de su piso y las losas arriba de cada piso", () => {
    const wall = tessellateAll(tower).find((f) => isWall(f) && f.pts.every((p) => p.y === 4))!; // pared sur
    const faces = facadeFaces(wall, tower.facade!);
    const windows = faces.filter((f) => f.mat === "glass");
    expect(windows.every((f) => f.pts.every((p) => p.y === 4))).toBe(true);
    const floor1 = windowPatches(wall, tower.facade!, 1);
    expect(floor1).toHaveLength(2);
    for (const w of floor1) {
      expect(Math.min(...w.map((p) => p.z))).toBeCloseTo(2.5);
      expect(Math.max(...w.map((p) => p.z))).toBeCloseTo(3.5);
    }
    const slabs = faces.filter((f) => f.toneOffset === -1);
    expect(slabs.map((f) => Math.max(...f.pts.map((p) => p.z))).sort()).toEqual([2, 4, 6]);
  });

  it("planta baja con vidriera: una sola banda de vidrio en el piso 0", () => {
    const f: Facade = { floors: 2, cols: 3, base: "glass" };
    const wall = tessellateAll({ ...tower, facade: f }).find(isWall)!;
    const glass = facadeFaces(wall, f).filter((x) => x.mat === "glass");
    expect(glass).toHaveLength(1 + 3);
  });

  it("pórtico: banda dos tonos más oscura del material del edificio", () => {
    const f: Facade = { floors: 2, cols: 3, base: "portico" };
    const wall = tessellateAll({ ...tower, facade: f }).find(isWall)!;
    const faces = facadeFaces(wall, f);
    expect(faces.some((x) => x.mat === "office" && x.toneOffset === -2)).toBe(true);
    expect(faces.filter((x) => x.mat === "glass")).toHaveLength(3);
  });

  it("el piso encendido sale como acentos poligonales, uno por ventana visible", () => {
    const f: Facade = { floors: 3, cols: 2, litFloor: 1 };
    const walls = tessellate({ ...tower, facade: f }).filter(isWall).filter((x) => x.toneOffset === 0 && x.mat === "office");
    const acc = facadeAccents(walls, f, "amber");
    expect(acc).toHaveLength(4);
    for (const a of acc) {
      expect(a.kind).toBe("poly");
      if (a.kind === "poly") expect(a.pts.every((p) => p.z >= 2.5 && p.z <= 3.5)).toBe(true);
      expect(a.color).toBe("amber");
    }
    expect(facadeAccents(walls, { floors: 3, cols: 2 }, "amber")).toEqual([]);
  });

  it("gable ignora la fachada; techo escalonado la aplica solo a la caja", () => {
    const gable = tessellateAll({ ...tower, roof: "gable" });
    expect(gable.every((x) => x.mat === "office" && x.toneOffset === 0)).toBe(true);
    const step = tessellateAll({ ...tower, roof: "step" });
    expect(step.filter((x) => x.mat === "glass")).toHaveLength(4 * 6);
  });

  it("window ancha y alta: muro cortina", () => {
    const wall = tessellateAll(tower).find((f) => isWall(f) && f.pts.every((p) => p.y === 4))!;
    const wide = windowPatches(wall, { floors: 3, cols: 2, window: { w: 0.85, h: 0.8 } }, 1)[0]!;
    const normal = windowPatches(wall, { floors: 3, cols: 2 }, 1)[0]!;
    const width = (p: typeof wide) => Math.abs(p[1]!.x - p[0]!.x), height = (p: typeof wide) => p[2]!.z - p[0]!.z;
    expect(width(wide)).toBeCloseTo(0.85 * 2, 6);
    expect(width(normal)).toBeCloseTo(0.5 * 2, 6);
    expect(height(wide)).toBeCloseTo(0.8 * 2, 6);
  });

  it("isWall: normal horizontal", () => {
    const wall: Face = { pts: [], normal: v3(0, 1, 0), mat: "office", tone: "lit", toneOffset: 0 };
    expect(isWall(wall)).toBe(true);
    expect(isWall({ ...wall, normal: v3(0, 0, 1) })).toBe(false);
  });
});

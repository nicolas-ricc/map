import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { isBehind, screenBounds, sortByDepth } from "./depth";
import { bounds, type Solid } from "./solids";

const box = (x: number, y: number, z: number, w = 2, d = 2, h = 2): Solid => ({ kind: "prism", at: v3(x, y, z), w, d, h, mat: "steel" });

describe("depth", () => {
  it("screenBounds proyecta las 8 esquinas", () => {
    const sb = screenBounds(bounds(box(0, 0, 0, 2, 2, 2)));
    expect(sb).toEqual({ minX: -2, minY: -2.8, maxX: 2, maxY: 2 });
  });

  it("isBehind: separación en x, y o z", () => {
    expect(isBehind(bounds(box(0, 0, 0)), bounds(box(5, 0, 0)))).toBe(true);  // a al oeste
    expect(isBehind(bounds(box(5, 0, 0)), bounds(box(0, 0, 0)))).toBe(false);
    expect(isBehind(bounds(box(0, 0, 0)), bounds(box(0, 5, 0)))).toBe(true);  // a al norte
    expect(isBehind(bounds(box(0, 0, -6)), bounds(box(0, 0, 0)))).toBe(true); // a hundido
  });

  it("ordena de atrás hacia adelante en diagonal", () => {
    const far = box(0, 0, 0), mid = box(3, 3, 0), near = box(6, 6, 0);
    expect(sortByDepth([near, far, mid])).toEqual([far, mid, near]);
  });

  it("un objeto chico delante de una nave larga se dibuja después", () => {
    const hall = box(0, 0, 0, 90, 16, 10);
    const car = box(40, 20, 0, 3, 4, 1.5);
    expect(sortByDepth([car, hall])).toEqual([hall, car]);
  });

  it("un objeto chico detrás de una nave larga se dibuja antes", () => {
    const hall = box(0, 20, 0, 90, 16, 10);
    const car = box(40, 10, 0, 3, 4, 1.5);
    expect(sortByDepth([hall, car])).toEqual([car, hall]);
  });

  it("lo hundido va antes que lo apoyado en la misma celda", () => {
    const pit = box(0, 0, -6, 10, 10, 6);
    const crate = box(2, 2, 0, 2, 2, 2);
    expect(sortByDepth([crate, pit])).toEqual([pit, crate]);
  });

  it("no muta la entrada y conserva todos los elementos", () => {
    const input = [box(6, 6, 0), box(0, 0, 0)];
    const snapshot = [...input];
    const out = sortByDepth(input);
    expect(input).toEqual(snapshot);        // mismo contenido y orden
    expect(out).not.toBe(input);            // array nuevo
    expect(out).toHaveLength(2);
    expect(out).toEqual([input[1], input[0]]); // ordenado de atrás hacia adelante
  });
});

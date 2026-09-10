import { describe, expect, it } from "vitest";
import { opsBounds } from "./ops";
import { GLYPH_H, GLYPH_W, textOps, textWidth } from "./pixelfont";

describe("pixelfont", () => {
  it("ancho: 3 px por glifo más 1 de separación", () => {
    expect(textWidth("A")).toBe(3);
    expect(textWidth("AB")).toBe(7);
    expect(textWidth("")).toBe(0);
  });

  it("todos los glifos caben en 3x5", () => {
    const ops = textOps("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-!", 0, 0, 1);
    const b = opsBounds(ops);
    expect(b.minX).toBeGreaterThanOrEqual(0);
    expect(b.minY).toBeGreaterThanOrEqual(0);
    expect(b.maxY).toBeLessThanOrEqual(GLYPH_H);
    expect(b.maxX).toBeLessThanOrEqual(textWidth("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-!"));
  });

  it("se desplaza según x, y", () => {
    const b = opsBounds(textOps("I", 10, 20, 1));
    expect(b.minX).toBe(11); // la I ocupa la columna central
    expect(b.minY).toBe(20);
  });

  it("normaliza minúsculas y tildes", () => {
    expect(textOps("currículum", 0, 0, 1)).toEqual(textOps("CURRICULUM", 0, 0, 1));
  });

  it("la letra A tiene la forma esperada", () => {
    const ops = textOps("A", 0, 0, 1).map((o) => `${o.x},${o.y}`).sort();
    expect(ops).toEqual(["0,1", "0,2", "0,3", "0,4", "1,0", "1,2", "2,1", "2,2", "2,3", "2,4"].sort());
  });

  it("dimensiones exportadas", () => {
    expect(GLYPH_W).toBe(3);
    expect(GLYPH_H).toBe(5);
  });
});

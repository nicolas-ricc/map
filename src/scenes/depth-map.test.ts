import { describe, expect, it } from "vitest";
import { depthAt } from "./depth-map";

describe("depth-map", () => {
  it("es 0 en tierra y crece al alejarse de la costa", () => {
    expect(depthAt(100, 100)).toBe(0);           // astillero
    expect(depthAt(150, -300)).toBe(0);          // sangrado norte (selva o construido)
    expect(depthAt(400, 60)).toBeGreaterThan(0);
    expect(depthAt(400, 60)).toBeLessThan(depthAt(480, 60));
    expect(depthAt(480, 60)).toBeLessThan(depthAt(560, 60));
    expect(depthAt(200, 300)).toBeLessThan(depthAt(240, 300)); // orilla vs centro del estuario
  });
  it("es una distancia en unidades de mundo, no en celdas", () => {
    expect(depthAt(560, 60)).toBeGreaterThan(60);
    expect(depthAt(900, 300)).toBeGreaterThan(200); // mar del sangrado, lejos de todo
  });
});

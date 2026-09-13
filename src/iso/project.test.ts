import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { VIEW_DIR, Z_SCALE, project } from "./project";

describe("project (dimétrica 2:1)", () => {
  it("el origen va al origen", () => {
    expect(project(v3(0, 0, 0))).toEqual({ x: 0, y: 0 });
  });
  it("+x va a la derecha y abajo; +y a la izquierda y abajo, simétricos", () => {
    expect(project(v3(10, 0, 0))).toEqual({ x: 10, y: 5 });
    expect(project(v3(0, 10, 0))).toEqual({ x: -10, y: 5 });
  });
  it("z solo mueve en y, escalado", () => {
    expect(Z_SCALE).toBe(1.4);
    expect(project(v3(0, 0, 10))).toEqual({ x: 0, y: -14 });
  });
  it("VIEW_DIR apunta al SE y arriba", () => {
    expect(VIEW_DIR.x).toBeGreaterThan(0);
    expect(VIEW_DIR.y).toBeGreaterThan(0);
    expect(VIEW_DIR.z).toBeGreaterThan(0);
  });
});

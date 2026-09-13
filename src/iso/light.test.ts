import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { SHADOW_DIR, SHADOW_PER_UNIT, TO_SUN, shadeTone, shadowPoint } from "./light";

describe("light", () => {
  it("el sol está bajo, al oeste-sudoeste", () => {
    expect(TO_SUN.x).toBeLessThan(0);
    expect(TO_SUN.y).toBeGreaterThan(0);
    expect(TO_SUN.z).toBeCloseTo(Math.sin((25 * Math.PI) / 180), 3);
  });

  it("las tres caras visibles reciben tres tonos distintos", () => {
    expect(shadeTone(v3(0, 0, 1))).toBe("top");   // techo
    expect(shadeTone(v3(0, 1, 0))).toBe("lit");   // pared sur
    expect(shadeTone(v3(1, 0, 0))).toBe("shade"); // pared este
  });

  it("una vertiente hacia el sol sube, una en contra baja", () => {
    expect(shadeTone(v3(0, 0.6, 0.8))).toBe("up");
    expect(shadeTone(v3(0, -0.6, 0.8))).toBe("down");
  });

  it("un plano casi horizontal sigue siendo techo", () => {
    expect(shadeTone(v3(0.02, 0, 0.9998))).toBe("top");
  });

  it("la sombra cae al ENE con longitud proporcional a la altura", () => {
    const p = shadowPoint(v3(0, 0, 2));
    expect(p.x).toBeCloseTo(SHADOW_DIR.x * SHADOW_PER_UNIT * 2, 6);
    expect(p.y).toBeCloseTo(SHADOW_DIR.y * SHADOW_PER_UNIT * 2, 6);
    expect(SHADOW_PER_UNIT).toBeCloseTo(1.4 / Math.tan((25 * Math.PI) / 180), 6);
  });

  it("bajo el suelo no hay sombra: el punto queda donde está", () => {
    expect(shadowPoint(v3(3, 4, -2))).toEqual({ x: 3, y: 4 });
  });
});

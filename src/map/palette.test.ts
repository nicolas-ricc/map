import { describe, expect, it } from "vitest";
import { ACCENTS, PALETTE } from "./palette";

describe("PALETTE", () => {
  it("tiene exactamente 25 colores", () => {
    expect(Object.keys(PALETTE)).toHaveLength(25);
  });
  it("no repite colores", () => {
    const values = Object.values(PALETTE);
    expect(new Set(values).size).toBe(values.length);
  });
  it("cada acento tiene core, mid y bleed dentro de la paleta", () => {
    const all = new Set(Object.values(PALETTE));
    for (const accent of Object.values(ACCENTS)) {
      expect(all.has(accent.core)).toBe(true);
      expect(all.has(accent.mid)).toBe(true);
      expect(all.has(accent.bleed)).toBe(true);
    }
  });
});

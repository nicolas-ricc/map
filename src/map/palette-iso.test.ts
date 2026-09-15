import { describe, expect, it } from "vitest";
import { ACCENT_COLORS, ISO_COLORS, ISO_TONES, TONE_LADDER, allIsoColors, stepTone, toneColor, type Material } from "./palette-iso";

const lum = (c: number): number => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;

describe("paleta isométrica", () => {
  it("cada material tiene cinco tonos ordenados de oscuro a claro", () => {
    for (const mat of Object.keys(ISO_TONES) as Material[]) {
      const t = ISO_TONES[mat];
      expect(lum(t.shade)).toBeLessThan(lum(t.lit));
      expect(lum(t.lit)).toBeLessThan(lum(t.down));
      expect(lum(t.down)).toBeLessThan(lum(t.top));
      expect(lum(t.top)).toBeLessThan(lum(t.up));
    }
  });

  it("la sombra es más azul que roja (luz cálida, sombra fría)", () => {
    for (const mat of Object.keys(ISO_TONES) as Material[]) {
      const s = ISO_TONES[mat].shade, top = ISO_TONES[mat].top;
      const blueShare = (c: number) => (c & 255) / (((c >> 16) & 255) + (c & 255) + 1);
      expect(blueShare(s)).toBeGreaterThanOrEqual(blueShare(top));
    }
  });

  it("stepTone sube y baja por la escalera y se clampea", () => {
    expect(TONE_LADDER).toEqual(["shade", "lit", "down", "top", "up"]);
    expect(stepTone("top", 1)).toBe("up");
    expect(stepTone("top", -1)).toBe("down");
    expect(stepTone("up", 3)).toBe("up");
    expect(stepTone("shade", -1)).toBe("shade");
    expect(stepTone("lit", 0)).toBe("lit");
  });

  it("toneColor y allIsoColors coinciden", () => {
    expect(toneColor("slab", "top")).toBe(ISO_TONES.slab.top);
    const all = allIsoColors();
    expect(all.has(ISO_TONES.rust.shade)).toBe(true);
    expect(all.has(ISO_COLORS.shadow)).toBe(true);
    expect(all.has(ISO_COLORS.cyan)).toBe(true);
  });

  it("materiales exclusivos de ciudad y costa", () => {
    for (const m of ["office", "officeDark", "glass", "asphalt", "paving", "plaza", "curtain", "stone", "copper", "whitewash", "foam", "abyss"] as const) {
      expect(Object.keys(ISO_TONES[m]).sort()).toEqual(["down", "lit", "shade", "top", "up"]);
    }
  });

  it("agua: cuatro profundidades que se oscurecen, seno frío y cresta cálida (el atardecer)", () => {
    const rgb = (c: number) => [c >> 16, (c >> 8) & 255, c & 255] as const;
    const warmth = (c: number) => rgb(c)[0] - rgb(c)[2];
    const blueShare = (c: number) => rgb(c)[2] / (rgb(c)[0] + rgb(c)[1] + rgb(c)[2]);
    const mats = ["shallow", "water", "waterDeep", "abyss"] as const;
    for (let i = 1; i < mats.length; i++) expect(lum(ISO_TONES[mats[i]!].top)).toBeLessThan(lum(ISO_TONES[mats[i - 1]!].top));
    for (const m of mats) {
      expect(warmth(ISO_TONES[m].up)).toBeGreaterThan(warmth(ISO_TONES[m].top) + 40);
      expect(blueShare(ISO_TONES[m].lit)).toBeGreaterThan(blueShare(ISO_TONES[m].top));
      expect(lum(ISO_TONES[m].lit)).toBeLessThan(lum(ISO_TONES[m].down));
      expect(lum(ISO_TONES[m].down)).toBeLessThan(lum(ISO_TONES[m].top));
    }
    expect(Object.keys(ISO_TONES.hullBlue).sort()).toEqual(["down", "lit", "shade", "top", "up"]);
  });

  it("tríadas de acento por zona: cian, ámbar y magenta, todas en el atlas", () => {
    expect(ACCENT_COLORS).toEqual(["cyan", "cyanMid", "cyanBleed", "amber", "amberMid", "amberBleed", "magenta", "magentaMid", "magentaBleed"]);
    const all = allIsoColors();
    for (const c of ACCENT_COLORS) expect(all.has(ISO_COLORS[c])).toBe(true);
    // el núcleo es más claro que el medio y el medio que el sangrado
    for (const base of ["cyan", "amber", "magenta"] as const) {
      expect(lum(ISO_COLORS[base])).toBeGreaterThan(lum(ISO_COLORS[`${base}Mid`]));
      expect(lum(ISO_COLORS[`${base}Mid`])).toBeGreaterThan(lum(ISO_COLORS[`${base}Bleed`]));
    }
  });
});

import { describe, expect, it } from "vitest";
import { DIM_BRIGHTNESS, IDLE_BRIGHTNESS, brightnessTint, flickerBrightness } from "./brightness";

describe("brightness", () => {
  it("brightnessTint produce gris uniforme y acota", () => {
    expect(brightnessTint(1)).toBe(0xffffff);
    expect(brightnessTint(0)).toBe(0x000000);
    expect(brightnessTint(0.5)).toBe(0x808080);
    expect(brightnessTint(2)).toBe(0xffffff);
  });
  it("flickerBrightness alterna al principio y se fija en 1", () => {
    expect(flickerBrightness(0)).toBe(1);
    expect(flickerBrightness(60)).toBe(0.55);
    expect(flickerBrightness(120)).toBe(1);
    expect(flickerBrightness(300)).toBe(1);
    expect(flickerBrightness(5000)).toBe(1);
  });
  it("constantes", () => {
    expect(IDLE_BRIGHTNESS).toBe(0.6);
    expect(DIM_BRIGHTNESS).toBe(0.35);
  });
});

export const IDLE_BRIGHTNESS = 0.6;
export const DIM_BRIGHTNESS = 0.35;
export const FLICKER_MS = 250;

export function brightnessTint(b: number): number {
  const v = Math.round(255 * Math.min(1, Math.max(0, b)));
  return (v << 16) | (v << 8) | v;
}

export function flickerBrightness(elapsedMs: number): number {
  if (elapsedMs >= FLICKER_MS) return 1;
  return Math.floor(elapsedMs / 50) % 2 === 0 ? 1 : 0.55;
}

/**
 * Atlas de la escena isométrica: atardecer rasante. Cinco tonos por material,
 * generados una vez (lit = top×0.80 +azul, shade = top×0.52 +más azul,
 * up = top×1.10, down = top×0.90 +azul) y pegados como literales para que el
 * guard de colores los vea. No calcular colores en runtime.
 */
export const ISO_TONES = {
  slab:      { top: 0xb7a58a, lit: 0x8e8476, shade: 0x56565a, up: 0xc9b698, down: 0xa39580 },
  concrete:  { top: 0xc9bca5, lit: 0x9d968c, shade: 0x606268, up: 0xddcfb6, down: 0xb3a999 },
  rust:      { top: 0x9c5a32, lit: 0x794830, shade: 0x482f2c, up: 0xac6337, down: 0x8a5131 },
  steel:     { top: 0x8e939c, lit: 0x6e7685, shade: 0x414c63, up: 0x9ca2ac, down: 0x7e8490 },
  road:      { top: 0x6b6a6e, lit: 0x525560, shade: 0x2f374b, up: 0x767579, down: 0x5e5f67 },
  rail:      { top: 0xd3c9b2, lit: 0xa5a196, shade: 0x65696f, up: 0xe8ddc4, down: 0xbcb5a4 },
  water:     { top: 0x2f5f66, lit: 0x224c5a, shade: 0x0f3147, up: 0x346970, down: 0x285660 },
  waterDeep: { top: 0x244b52, lit: 0x193c4a, shade: 0x0a273d, up: 0x28535a, down: 0x1e444e },
  leaf:      { top: 0x4d7a3a, lit: 0x3a6236, shade: 0x1f3f30, up: 0x558640, down: 0x436e38 },
  leafDark:  { top: 0x35592a, lit: 0x26472a, shade: 0x132e28, up: 0x3a622e, down: 0x2e502a },
  rock:      { top: 0x7d7468, lit: 0x605d5b, shade: 0x383c48, up: 0x8a8072, down: 0x6f6862 },
  sand:      { top: 0xc7b48b, lit: 0x9b9077, shade: 0x5e5e5a, up: 0xdbc699, down: 0xb1a281 },
  hull:      { top: 0x7a3b2a, lit: 0x5e2f2a, shade: 0x361f28, up: 0x86412e, down: 0x6c352a },
  deck:      { top: 0xb59a6e, lit: 0x8d7b60, shade: 0x55504b, up: 0xc7a979, down: 0xa18b67 },
} as const;

export const ISO_COLORS = {
  shadow: 0x1c2438,
  sky: 0x141a26,
  cyan: 0x7cf5ff,
  cyanMid: 0x27b3c9,
  cyanBleed: 0x134a52,
} as const;

export type Material = keyof typeof ISO_TONES;
export type Tone = "shade" | "lit" | "down" | "top" | "up";
export type AccentColor = "cyan" | "cyanMid" | "cyanBleed";

/** De oscuro a claro. `stepTone` se mueve por acá. */
export const TONE_LADDER: readonly Tone[] = ["shade", "lit", "down", "top", "up"];

export function stepTone(tone: Tone, offset: number): Tone {
  const i = Math.max(0, Math.min(TONE_LADDER.length - 1, TONE_LADDER.indexOf(tone) + offset));
  return TONE_LADDER[i]!;
}

export function toneColor(mat: Material, tone: Tone): number {
  return ISO_TONES[mat][tone];
}

export function allIsoColors(): Set<number> {
  const out = new Set<number>(Object.values(ISO_COLORS));
  for (const tones of Object.values(ISO_TONES)) for (const c of Object.values(tones)) out.add(c);
  return out;
}

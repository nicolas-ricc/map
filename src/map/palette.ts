export const PALETTE = {
  ground: 0x0b1620,
  road: 0x2a2f3a,
  concrete: 0x3b3550,
  leaf: 0x0f2a1c,
  leafDark: 0x081a12,
  river: 0x060c14,
  rust: 0x5a3320,
  cyan: 0x7cf5ff,
  cyanMid: 0x27b3c9,
  cyanBleed: 0x134a52,
  amber: 0xffc857,
  amberMid: 0xc98a1f,
  amberBleed: 0x4a3a12,
  magenta: 0xff5cd6,
  magentaMid: 0xb8288f,
  magentaBleed: 0x4a1440,
} as const;

export type PaletteName = keyof typeof PALETTE;
export type Accent = "cyan" | "amber" | "magenta";

export const ACCENTS: Record<Accent, { core: number; mid: number; bleed: number }> = {
  cyan: { core: PALETTE.cyan, mid: PALETTE.cyanMid, bleed: PALETTE.cyanBleed },
  amber: { core: PALETTE.amber, mid: PALETTE.amberMid, bleed: PALETTE.amberBleed },
  magenta: { core: PALETTE.magenta, mid: PALETTE.magentaMid, bleed: PALETTE.magentaBleed },
};

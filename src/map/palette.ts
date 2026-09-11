export const PALETTE = {
  ground: 0x0b1620,
  road: 0x2a2f3a,
  roadLight: 0x3d4452,
  concrete: 0x3b3550,
  concreteLight: 0x554d70,
  concreteDark: 0x272238,
  leaf: 0x0f2a1c,
  leafDark: 0x081a12,
  river: 0x060c14,
  waterLight: 0x0e1d2e,
  rust: 0x5a3320,
  rustLight: 0x8a5a36,
  rustDark: 0x3a1f12,
  rock: 0x1c2229,
  rockLight: 0x2d353f,
  sand: 0x2b2a24,
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

export const ACCENTS = {
  cyan: { core: PALETTE.cyan, mid: PALETTE.cyanMid, bleed: PALETTE.cyanBleed },
  amber: { core: PALETTE.amber, mid: PALETTE.amberMid, bleed: PALETTE.amberBleed },
  magenta: { core: PALETTE.magenta, mid: PALETTE.magentaMid, bleed: PALETTE.magentaBleed },
} as const satisfies Record<Accent, { core: number; mid: number; bleed: number }>;

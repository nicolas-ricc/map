import type { Solid, Tri } from "../iso/solids";
import { WATER_MATS, type TerrainMesh, type WaterMat } from "./terrain";

/**
 * Material dinámico del agua, sin Pixi: una ola direccional que viaja hacia
 * el noroeste (hacia las costas del astillero y de la ciudad) suma ±1..2 al
 * `baseTone` de profundidad de cada triángulo; el +2 (tono `up`, la cresta
 * que refleja el sol) solo sobrevive en un cuarto de los triángulos, así son
 * destellos y no una franja. La espuma de costa alterna. El agua entera se
 * reparte en BANDS bandas por x de pantalla y cada paso repinta una.
 */
export const WATER_STEP_MS = 150, WAVE_T_MS = 4000, WAVE_LAMBDA = 10, ABYSS_T_MS = 8000, ABYSS_LAMBDA = 14, FOAM_STEP_MS = 500, BANDS = 4;
const WAVE_AMP = 1.2, ABYSS_AMP = 0.6, RIPPLE_AMP = 0.35;

const cx = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
const cy = (t: Tri): number => (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;

/** Hash fijo por triángulo, 0..3. */
export const triHash = (t: Tri): number => Math.abs(Math.floor(cx(t) * 7 + cy(t) * 13)) % 4;

export function waveTone(t: Tri, mat: WaterMat, clockMs: number): number {
  const abyss = mat === "abyss";
  const lam = abyss ? ABYSS_LAMBDA : WAVE_LAMBDA, T = abyss ? ABYSS_T_MS : WAVE_T_MS, amp = abyss ? ABYSS_AMP : WAVE_AMP;
  const phi = (cx(t) + 0.5 * cy(t)) / lam + (2 * Math.PI * (clockMs % T)) / T;
  const crest = Math.round(amp * Math.sin(phi) + RIPPLE_AMP * Math.sin(2.3 * phi + triHash(t)));
  let tone = Math.max(-2, Math.min(2, (t.baseTone ?? 0) + crest));
  if (tone === 2 && triHash(t) !== 0) tone = 1;
  return tone;
}

export interface WaterChanges { bands: Set<number>; foam: boolean }
export interface WaterAnim { band(k: number): Solid[]; foam(): Solid[]; tick(dtMs: number): WaterChanges }

export function createWaterAnim(terrain: TerrainMesh, opts: { reducedMotion: boolean }): WaterAnim {
  const all = terrain.water.flatMap((s) => (s.kind === "ground" ? s.tris.map((t) => ({ t, mat: s.mat as WaterMat })) : []));
  const sx = (t: Tri) => cx(t) - cy(t);
  const sorted = all.map(({ t }) => sx(t)).sort((a, b) => a - b);
  const cuts = Array.from({ length: BANDS - 1 }, (_, k) => sorted[Math.floor(((k + 1) * sorted.length) / BANDS)]!); // cuantiles: bandas parejas
  const bandOf = (t: Tri) => cuts.findIndex((c) => sx(t) < c) === -1 ? BANDS - 1 : cuts.findIndex((c) => sx(t) < c);
  const bands: { mat: WaterMat; tris: Tri[] }[][] = Array.from({ length: BANDS }, () => WATER_MATS.map((mat) => ({ mat, tris: [] })));
  for (const { t, mat } of all) bands[bandOf(t)]![WATER_MATS.indexOf(mat)]!.tris.push(t);
  const bandSolids: Solid[][] = bands.map((b) => b.filter((x) => x.tris.length > 0).map((x): Solid => ({ kind: "ground", mat: x.mat, tris: x.tris })));
  const foamTris = terrain.foam.kind === "ground" ? terrain.foam.tris : [];

  let clock = 0, step = 0, foamStep = 0;
  const paintBand = (k: number): void => { for (const b of bands[k]!) for (const t of b.tris) t.toneOffset = waveTone(t, b.mat, clock); };
  const paintFoam = (): void => { for (const t of foamTris) t.toneOffset = foamStep % 2 === 0 ? 0 : -1; };
  for (let k = 0; k < BANDS; k++) paintBand(k);
  paintFoam();

  return {
    band: (k) => bandSolids[k]!,
    foam: () => [terrain.foam],
    tick(dtMs) {
      const c: WaterChanges = { bands: new Set(), foam: false };
      if (opts.reducedMotion || dtMs <= 0) return c;
      clock += dtMs;
      const s = Math.floor(clock / WATER_STEP_MS);
      if (s !== step) { step = s; c.bands.add(s % BANDS); }
      for (const k of c.bands) paintBand(k);
      const fs = Math.floor(clock / FOAM_STEP_MS);
      if (fs !== foamStep) { foamStep = fs; c.foam = true; paintFoam(); }
      return c;
    },
  };
}

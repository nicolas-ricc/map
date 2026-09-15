import type { Solid, Tri } from "../iso/solids";
import { WATER_MATS, type TerrainMesh, type WaterMat } from "./terrain";

/**
 * Material dinámico del agua, sin Pixi: una ola direccional que viaja hacia
 * el noroeste (hacia las costas del astillero y de la ciudad) suma ±1..2 al
 * `baseTone` de profundidad de cada triángulo; el +2 (tono `up`, la cresta
 * que refleja el sol) solo sobrevive en un cuarto de los triángulos, así son
 * destellos y no una franja. La espuma de costa alterna. El agua entera se
 * reparte en BANDS bandas por x de pantalla y cada paso repinta una.
 *
 * `TONE_LADDER` (`palette-iso.ts`) es `["shade", "lit", "down", "top", "up"]`
 * y la cara plana del agua parte de `top`: solo hay un escalón por encima
 * (`up`). Por eso `waveTone` (la ola en −2..2, con su propio contrato y
 * tests) no se escribe directamente como `toneOffset`: `waveOffset` la
 * aplana para la escalera real, donde +1 se queda en `top` (no hay escalón
 * intermedio que pintarlo de durazno) y solo el +2 filtrado por hash llega a
 * `up`.
 */
export const WATER_STEP_MS = 150, WAVE_T_MS = 4000, WAVE_LAMBDA = 10, ABYSS_T_MS = 8000, ABYSS_LAMBDA = 14, FOAM_STEP_MS = 500, BANDS = 6;
const WAVE_AMP = 1.2, ABYSS_AMP = 0.6, RIPPLE_AMP = 0.35;

const cx = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
const cy = (t: Tri): number => (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;

/**
 * Hash fijo por triángulo, 0..3. Los centroides caen en una grilla de 6 u
 * (cx/cy = 6a+2 o 6a+4): una combinación lineal simple de cx/cy solo toma dos
 * residuos mod 4 y correlaciona con la paridad de a+b, es decir con las
 * diagonales de pantalla (destellos en franjas, no dispersos). Este mixing de
 * enteros (splitmix-like) rompe esa correlación.
 */
export const triHash = (t: Tri): number => {
  let h = (Math.floor(cx(t)) * 374761393 + Math.floor(cy(t)) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 4;
};

export function waveTone(t: Tri, mat: WaterMat, clockMs: number): number {
  const abyss = mat === "abyss";
  const lam = abyss ? ABYSS_LAMBDA : WAVE_LAMBDA, T = abyss ? ABYSS_T_MS : WAVE_T_MS, amp = abyss ? ABYSS_AMP : WAVE_AMP;
  const phi = (cx(t) + 0.5 * cy(t)) / lam + (2 * Math.PI * (clockMs % T)) / T;
  const crest = Math.round(amp * Math.sin(phi) + RIPPLE_AMP * Math.sin(2.3 * phi + triHash(t)));
  let tone = Math.max(-2, Math.min(2, (t.baseTone ?? 0) + crest));
  if (tone === 2 && triHash(t) !== 0) tone = 1;
  return tone;
}

/** Aplana el −2..2 de `waveTone` a la escalera real: −2→lit, −1→down, 0 y 1→top, 2→up. */
export const waveOffset = (v: number): number => (v === 2 ? 1 : Math.min(v, 0));

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
  const paintBand = (k: number): void => { for (const b of bands[k]!) for (const t of b.tris) t.toneOffset = waveOffset(waveTone(t, b.mat, clock)); };
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

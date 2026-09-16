import { v3, type Vec3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { WATER_MATS, type TerrainMesh, type WaterMat } from "./terrain";

/**
 * Material dinámico del agua, sin Pixi. Dos trenes de olas cruzados (un mar
 * de fondo largo desde el sudeste y un oleaje más corto desde el sur), más un
 * ruido fijo por triángulo, dan una altura continua `waveField`; redondeada y
 * sumada al `baseTone` de profundidad es el tono entero del triángulo
 * (`waveTone`, −2..1: lit, down, top, up). La interferencia de los dos trenes
 * parte las crestas en parches cortos: una sola ola plana daba rectas de
 * pantalla (toda ola que viaja al noroeste tiene la cresta horizontal en
 * pantalla) y se leía como una franja que se corre.
 *
 * El sol no se refleja en la cara del agua sino en `glints`: donde la altura
 * supera GLINT_H, uno de cada GLINT_PICK triángulos recibe un rombo chico
 * (material `glint`, coral del atardecer) alargado en la horizontal de
 * pantalla, que es la dirección mundo (1, −1). Así los destellos son formas
 * pequeñas y no triángulos enteros del color del suelo.
 *
 * Coste: el agua se reparte en BANDS bandas por hash (entrelazadas, no por x
 * de pantalla) y cada paso repinta una. Cada triángulo se refresca cada
 * BANDS × WATER_STEP_MS; como los vecinos se refrescan en pasos distintos,
 * un cambio de tono se disuelve grano a grano en vez de saltar por franjas
 * (con bandas por x de pantalla la costura entre bandas mostraba dos fases).
 * La espuma de costa lame en vez de parpadear: una onda lenta a lo largo de
 * la costa, con fase propia por triángulo.
 */
export const WATER_STEP_MS = 150, BANDS = 6, FOAM_STEP_MS = 250;
export const SWELL = { k: { x: 0.8, y: 0.6 }, lambda: 34, T: 9000, amp: 0.65 };
export const CHOP = { k: { x: 0.3, y: 0.95 }, lambda: 21, T: 5500, amp: 0.45 };
export const ABYSS = { lambda: 1.6, T: 1.5, amp: 0.6, jitter: 2.2 }; // factores sobre SWELL/CHOP para la fosa: olas más largas, lentas y bajas, más rotas
export const BASE_W = 0.75; // peso del baseTone de profundidad (continuo, −1..1) frente a la ola
export const NOISE_AMP = 0.2, PHASE_JITTER = 0.45;
export const GLINT_H = 0.85, GLINT_PICK = 2;
const GLINT_LONG = [1.4, 2.2], GLINT_HALF_W = 0.6;
const FOAM_T_MS = 5200, FOAM_LAMBDA = 24, FOAM_GAP = -0.35;

const cx = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
const cy = (t: Tri): number => (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;
const cz = (t: Tri): number => (t.pts[0].z + t.pts[1].z + t.pts[2].z) / 3;

/**
 * Hash entero fijo por triángulo y sal. Los centroides caen en una grilla de
 * 6 u (cx/cy = 6a+2 o 6a+4): una combinación lineal simple de cx/cy solo toma
 * dos residuos mod 4 y correlaciona con la paridad de a+b, es decir con las
 * diagonales de pantalla (destellos en franjas, no dispersos). Este mixing de
 * enteros (splitmix-like) rompe esa correlación; la sal da hashes
 * independientes para banda, ruido y destello.
 */
export const triMix = (t: Tri, salt = 0): number => {
  let h = (Math.floor(cx(t)) * 374761393 + Math.floor(cy(t)) * 668265263 + salt * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};
export const triHash = (t: Tri, n = 4): number => triMix(t) % n;
/** Ruido fijo por triángulo en [−1, 1). */
export const triNoise = (t: Tri): number => (triMix(t, 1) / 4294967296) * 2 - 1;

/** Altura continua de la ola en el centro del triángulo, en tonos (≈ −1.75..1.75). */
export function waveField(t: Tri, mat: WaterMat, clockMs: number): number {
  const x = cx(t), y = cy(t), n = triNoise(t), abyss = mat === "abyss";
  const lamF = abyss ? ABYSS.lambda : 1, tF = abyss ? ABYSS.T : 1, ampF = abyss ? ABYSS.amp : 1, jit = PHASE_JITTER * (abyss ? ABYSS.jitter : 1);
  const tau = Math.PI * 2;
  const phase = (w: typeof SWELL): number => (tau * (w.k.x * x + w.k.y * y)) / (w.lambda * lamF) + (tau * (clockMs % (w.T * tF))) / (w.T * tF);
  const swell = SWELL.amp * ampF * Math.sin(phase(SWELL) + jit * n);
  const chop = CHOP.amp * ampF * Math.sin(phase(CHOP) - jit * n);
  return swell + chop + NOISE_AMP * n;
}

/** Tono entero del triángulo: `baseTone` de profundidad (× BASE_W) más la ola, redondeados juntos, en −2..1 (lit, down, top, up). */
export function waveTone(t: Tri, mat: WaterMat, clockMs: number): number {
  return Math.max(-2, Math.min(1, Math.round(BASE_W * (t.baseTone ?? 0) + waveField(t, mat, clockMs))));
}

/** Rombo chico centrado en el triángulo, alargado en la horizontal de pantalla (mundo (1, −1)); dos triángulos. */
export function glintShape(t: Tri, long: number): [Tri, Tri] {
  const x = cx(t), y = cy(t), z = cz(t);
  const a = long / Math.SQRT2, b = GLINT_HALF_W / Math.SQRT2; // (1,−1)/√2 y (1,1)/√2
  const e: Vec3 = v3(x + a, y - a, z), w: Vec3 = v3(x - a, y + a, z), s: Vec3 = v3(x + b, y + b, z), n: Vec3 = v3(x - b, y - b, z);
  return [{ pts: [w, n, e] }, { pts: [w, e, s] }];
}

/** Destellos de un triángulo en este instante: ninguno, o el rombo (tamaño y brillo por hash). */
export function glints(t: Tri, mat: WaterMat, clockMs: number): Tri[] {
  if (waveField(t, mat, clockMs) < GLINT_H) return [];
  const h = triMix(t, 2);
  if (h % GLINT_PICK !== 0) return [];
  const long = GLINT_LONG[(h >>> 3) % GLINT_LONG.length]!, bright = (h >>> 5) % 3 === 0 ? 1 : 0;
  return glintShape(t, long).map((g) => ({ ...g, toneOffset: bright }));
}

/** Espuma: una onda lenta a lo largo de la costa; `false` en los huecos (tono `down`), que se corren y lamen. */
export function foamOn(t: Tri, clockMs: number): boolean {
  const phase = (Math.PI * 2 * (cx(t) + cy(t))) / FOAM_LAMBDA + (Math.PI * 2 * (clockMs % FOAM_T_MS)) / FOAM_T_MS + PHASE_JITTER * triNoise(t);
  return Math.sin(phase) > FOAM_GAP;
}

export interface WaterChanges { bands: Set<number>; foam: boolean }
export interface WaterAnim { band(k: number): Solid[]; foam(): Solid[]; tick(dtMs: number): WaterChanges }

export function createWaterAnim(terrain: TerrainMesh, opts: { reducedMotion: boolean }): WaterAnim {
  const all = terrain.water.flatMap((s) => (s.kind === "ground" ? s.tris.map((t) => ({ t, mat: s.mat as WaterMat })) : []));
  const bandOf = (t: Tri): number => triMix(t, 3) % BANDS; // entrelazadas: vecinos en bandas distintas
  const bands: { mat: WaterMat; tris: Tri[] }[][] = Array.from({ length: BANDS }, () => WATER_MATS.map((mat) => ({ mat, tris: [] })));
  for (const { t, mat } of all) bands[bandOf(t)]![WATER_MATS.indexOf(mat)]!.tris.push(t);
  const glintSolids: (Solid & { kind: "ground" })[] = bands.map(() => ({ kind: "ground", mat: "glint", tris: [] }));
  const bandSolids: Solid[][] = bands.map((b, k) => [...b.filter((x) => x.tris.length > 0).map((x): Solid => ({ kind: "ground", mat: x.mat, tris: x.tris })), glintSolids[k]!]);
  const foamTris = terrain.foam.kind === "ground" ? terrain.foam.tris : [];

  let clock = 0, step = 0, foamStep = 0;
  const paintBand = (k: number): void => {
    const out: Tri[] = [];
    for (const b of bands[k]!) for (const t of b.tris) { t.toneOffset = waveTone(t, b.mat, clock); out.push(...glints(t, b.mat, clock)); }
    glintSolids[k]!.tris = out;
  };
  const paintFoam = (): void => { for (const t of foamTris) t.toneOffset = foamOn(t, clock) ? 0 : -1; };
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

import type { Accent } from "../iso/accent";
import { facadeAccents } from "../iso/facade";
import { v3 } from "../iso/geometry";
import { tessellate } from "../iso/solids";
import type { Rng } from "../map/seed";
import type { TechScene } from "./tech";

/**
 * El distrito tecnológico de noche, sin Pixi: cada torre tiene un piso
 * encendido y cada 4..9 s una torre al azar lo cambia de piso o lo apaga;
 * los carteles ámbar pulsan (alpha 0.6..1, período 3 s) y la luz de la torre
 * de telecomunicaciones respira. Frame 0 = todo encendido y quieto.
 */
export const TECH_BLINK_GAP_MS: [number, number] = [4000, 9000];
export const SIGN_PERIOD_MS = 3000, SIGN_STEP_MS = 150, TELECOM_STEP_MS = 100;
const TELECOM_R = 0.8, TELECOM_PULSE = 0.3, TELECOM_PERIOD = 1200;

export interface TechAnimChanges { windows: boolean; signs: boolean; telecom: boolean }
export interface TechAnim { windows(): Accent[]; signs(): Accent[]; telecom(): Accent; tick(dtMs: number): TechAnimChanges }

export function createTechAnim(scene: TechScene, rng: Rng, opts: { reducedMotion: boolean }): TechAnim {
  const walls = scene.towers.map((t) => tessellate(t.box).filter((f) => Math.abs(f.normal.z) < 1e-6 && f.mat === "curtain" && f.toneOffset === 0)); // paredes visibles, sin las caras de fachada
  const lit: (number | null)[] = scene.towers.map((t) => rng.int(1, t.facade.floors - 1));
  const nextGap = () => rng.int(TECH_BLINK_GAP_MS[0], TECH_BLINK_GAP_MS[1]);
  let clock = 0, blinkTimer = nextGap(), signStep = 0, telecomStep = 0;
  const signAlpha = () => 0.8 + 0.2 * Math.cos((2 * Math.PI * (clock % SIGN_PERIOD_MS)) / SIGN_PERIOD_MS); // clock 0 → alpha 1 (frame 0 quieto y encendido)
  return {
    windows: () => scene.towers.flatMap((t, k) => (lit[k] === null ? [] : facadeAccents(walls[k]!, { ...t.facade, litFloor: lit[k]! }, "amber"))),
    signs: () => scene.signs.map((a) => (a.kind === "poly" ? { ...a, alpha: opts.reducedMotion ? 1 : signAlpha() } : a)),
    telecom: () => ({ kind: "dot", at: v3(scene.telecom.x, scene.telecom.y, scene.telecom.z), r: TELECOM_R + TELECOM_PULSE * (1 + Math.sin(clock / TELECOM_PERIOD)), color: "amber" }),
    tick(dtMs) {
      const c: TechAnimChanges = { windows: false, signs: false, telecom: false };
      if (opts.reducedMotion || dtMs <= 0 || scene.towers.length === 0) return c;
      clock += dtMs;
      blinkTimer -= dtMs;
      if (blinkTimer <= 0) {
        blinkTimer = nextGap();
        const k = rng.int(0, scene.towers.length - 1), floors = scene.towers[k]!.facade.floors;
        const old = lit[k];
        if (rng.chance(0.3)) lit[k] = null;
        else { let nv = rng.int(1, floors - 1); if (nv === old && floors > 2) nv = nv === floors - 1 ? nv - 1 : nv + 1; lit[k] = nv; } // siempre cambia el piso si hay más de una opción
        c.windows = true;
      }
      const ss = Math.floor(clock / SIGN_STEP_MS); if (ss !== signStep) { signStep = ss; c.signs = true; }
      const ts = Math.floor(clock / TELECOM_STEP_MS); if (ts !== telecomStep) { telecomStep = ts; c.telecom = true; }
      return c;
    },
  };
}

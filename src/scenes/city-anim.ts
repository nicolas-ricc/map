import type { Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import type { Rng } from "../map/seed";
import type { CityScene } from "./city";

/**
 * Las tres animaciones de la ciudad, sin Pixi y con estado propio: el piso
 * encendido parpadea (se apaga un tick cada 4..9 s), papeles salen volando de
 * una ventana hacia el ENE y la luz de la antena pulsa. Frame 0 = todo quieto
 * y encendido; con reduced-motion se queda ahí.
 */
export const BLINK_GAP_MS: [number, number] = [4000, 9000];
export const PAPER_SPEED = 4 / 1000; // u por ms
export const PAPER_RANGE = 30;
export const PAPER_AMP = 1.5;
export const PAPER_PERIOD_MS = 2000;
export const ANTENNA_STEP_MS = 100;
const ANTENNA_BASE_R = 0.8, ANTENNA_PULSE_R = 0.3, ANTENNA_PERIOD = 1200; // r = 0.8 + 0.3·(1 + sin(t / 1200))
const ENE = { x: 0.92, y: -0.38 }; // unidad: este-noreste (y crece al sur)

export interface CityAnimChanges { lit: boolean; papers: boolean; antenna: boolean }
export interface CityAnim { lit(): Accent[]; papers(): Accent[]; antenna(): Accent; tick(dtMs: number): CityAnimChanges }

const NONE: CityAnimChanges = { lit: false, papers: false, antenna: false };

export function createCityAnim(tower: CityScene["tower"], rng: Rng, opts: { reducedMotion: boolean }): CityAnim {
  const w = tower.paperWindow;
  const nextGap = (): number => rng.int(BLINK_GAP_MS[0], BLINK_GAP_MS[1]);

  let clock = 0;
  let off = false;
  let blinkTimer = nextGap();
  let antennaStep = 0;
  const papers = Array.from({ length: rng.int(5, 8) }, () => ({ dist: 0, phase: rng.next() * Math.PI * 2 }));

  const paperAt = (p: { dist: number; phase: number }): Accent => ({
    kind: "dot",
    at: v3(w.x + ENE.x * p.dist, w.y + ENE.y * p.dist, w.z + (p.dist === 0 ? 0 : PAPER_AMP * Math.sin((clock / PAPER_PERIOD_MS) * Math.PI * 2 + p.phase))),
    r: 0.4,
    color: "amberMid",
  });
  const antennaR = (): number => ANTENNA_BASE_R + ANTENNA_PULSE_R * (1 + Math.sin((antennaStep * ANTENNA_STEP_MS) / ANTENNA_PERIOD));

  return {
    lit: () => (off ? [] : tower.litWindows),
    papers: () => papers.map(paperAt),
    antenna: () => ({ kind: "dot", at: tower.antenna, r: antennaR(), color: "amberMid" }),
    tick(dtMs) {
      if (opts.reducedMotion || dtMs <= 0) return NONE;
      clock += dtMs;
      const c: CityAnimChanges = { lit: false, papers: true, antenna: false };

      // parpadeo: un tick apagado, después una pausa nueva
      if (off) { off = false; blinkTimer = nextGap(); c.lit = true; }
      else { blinkTimer -= dtMs; if (blinkTimer <= 0) { off = true; c.lit = true; } }

      for (const p of papers) {
        p.dist += PAPER_SPEED * dtMs;
        if (p.dist >= PAPER_RANGE) { p.dist = 0; p.phase = rng.next() * Math.PI * 2; }
      }

      const step = Math.floor(clock / ANTENNA_STEP_MS);
      if (step !== antennaStep) { antennaStep = step; c.antenna = true; }
      return c;
    },
  };
}

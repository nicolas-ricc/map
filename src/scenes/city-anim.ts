import type { Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import type { Rng } from "../map/seed";
import type { CityScene } from "./city";

/**
 * Las tres animaciones de la ciudad, sin Pixi y con estado propio: el piso
 * encendido parpadea (se apaga un tick cada 4..9 s), papeles salen volando de
 * una ventana hacia el NNE y la luz de la antena pulsa. Frame 0 = todo quieto
 * y encendido; con reduced-motion se queda ahí.
 */
export const BLINK_GAP_MS: [number, number] = [4000, 9000];
export const PAPER_SPEED = 4 / 1000; // u por ms
export const PAPER_RANGE = 30;
export const PAPER_AMP = 1.5;
export const PAPER_PERIOD_MS = 2000;
export const ANTENNA_STEP_MS = 100;
export const PAPER_R = 0.4, PAPER_R_END = 0.12; // el papel se afina en el último tercio, así no hay "pop" al reciclar
export const PAPER_FADE_FROM = 2 / 3; // fracción de PAPER_RANGE donde empieza a afinarse
export const PAPER_LIFT = 0.15; // z que gana por unidad recorrida (el viento lo levanta)
export const PAPER_SIDE = 1.5; // desvío lateral máximo, perpendicular a la deriva
export const PAPER_SIDE_RAMP = 5; // en cuántas unidades entra del todo el desvío
const ANTENNA_BASE_R = 0.8, ANTENNA_PULSE_R = 0.3, ANTENNA_PERIOD = 1200; // r = 0.8 + 0.3·(1 + sin(t / 1200))
const NNE = { x: 0.45, y: -0.893 }; // unidad: nor-noreste (y crece al sur); en pantalla sube a la derecha
const PERP = { x: -NNE.y, y: NNE.x }; // perpendicular a la deriva: abre el abanico

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
  interface Paper { dist: number; phase: number; side: number; speed: number }
  const respawn = (p: Paper): void => {
    p.dist = 0;
    p.phase = rng.next() * Math.PI * 2;
    p.side = (rng.next() * 2 - 1) * PAPER_SIDE;
    p.speed = 0.8 + rng.next() * 0.4;
  };
  // escalonados de arranque: el papel i nace ya a (i / n)·PAPER_RANGE de la
  // ventana, así el frame 0 (y reduced-motion) muestra un reguero y no un punto.
  const n = rng.int(5, 8);
  const papers: Paper[] = Array.from({ length: n }, (_, i) => {
    const p: Paper = { dist: 0, phase: 0, side: 0, speed: 1 };
    respawn(p);
    p.dist = (i / n) * PAPER_RANGE;
    return p;
  });

  const paperAt = (p: Paper): Accent => {
    const lateral = p.side * Math.min(1, p.dist / PAPER_SIDE_RAMP);
    const wave = p.dist === 0 ? 0 : PAPER_AMP * Math.sin((clock / PAPER_PERIOD_MS) * Math.PI * 2 + p.phase);
    const fade = Math.max(0, p.dist / PAPER_RANGE - PAPER_FADE_FROM) / (1 - PAPER_FADE_FROM);
    return {
      kind: "dot",
      at: v3(w.x + NNE.x * p.dist + PERP.x * lateral, w.y + NNE.y * p.dist + PERP.y * lateral, w.z + wave + p.dist * PAPER_LIFT),
      r: PAPER_R + (PAPER_R_END - PAPER_R) * Math.min(1, fade),
      color: "amberMid",
    };
  };
  const antennaR = (): number => ANTENNA_BASE_R + ANTENNA_PULSE_R * (1 + Math.sin((antennaStep * ANTENNA_STEP_MS) / ANTENNA_PERIOD));

  return {
    lit: () => (off ? [] : [...tower.litWindows]), // copia: el consumidor no puede tocar la escena
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
        p.dist += PAPER_SPEED * p.speed * dtMs;
        if (p.dist >= PAPER_RANGE) respawn(p);
      }

      const step = Math.floor(clock / ANTENNA_STEP_MS);
      if (step !== antennaStep) { antennaStep = step; c.antenna = true; }
      return c;
    },
  };
}

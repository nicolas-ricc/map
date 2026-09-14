import type { Accent } from "../iso/accent";
import { v3, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";
import type { Scene } from "./shipyard";

export interface AnimChanges { trolley: boolean; water: boolean; sparks: boolean }
export interface ShipyardAnim {
  tick(dtMs: number): AnimChanges;
  sparks(): Accent[];
  trolleyLamp(): Accent;
}

export const TROLLEY_CYCLE_MS = 14000;
export const TROLLEY_PAUSE_MS = 2000;
export const WATER_STEP_MS = 100;
export const WATER_CYCLE_MS = 2000;
const SPARK_FRAME_MS = 100;
const SPARK_FRAMES = 3;
const SPARK_GAP_MS: [number, number] = [1000, 3000];

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Posición 0..1 del carro dentro del ciclo: pausa, ida, pausa, vuelta. */
function trolleyPhase(ms: number): number {
  const move = (TROLLEY_CYCLE_MS - 2 * TROLLEY_PAUSE_MS) / 2;
  const t = ms % TROLLEY_CYCLE_MS;
  if (t < TROLLEY_PAUSE_MS) return 0;
  if (t < TROLLEY_PAUSE_MS + move) return easeInOut((t - TROLLEY_PAUSE_MS) / move);
  if (t < 2 * TROLLEY_PAUSE_MS + move) return 1;
  return 1 - easeInOut((t - 2 * TROLLEY_PAUSE_MS - move) / move);
}

export function createShipyardAnim(scene: Scene, water: Solid[], rng: Rng, opts: { reducedMotion: boolean }): ShipyardAnim {
  const [y0, y1] = scene.trolleyRange;
  const tris = water.flatMap((w) => (w.kind === "ground" ? w.tris : []));
  const centers = tris.map((t) => (t.pts[0].x + t.pts[1].x + t.pts[2].x + t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3);

  const nextGap = () => rng.int(SPARK_GAP_MS[0], SPARK_GAP_MS[1]);

  let clock = 0;
  let waterStep = -1;
  let sparkTimer = nextGap();
  let sparkFrame = -1;
  let spot: Vec3 | null = null;
  let live: Accent[] = [];

  const trolleyLamp = (): Accent => ({ kind: "dot", at: v3(scene.trolley.at.x + 2.5, scene.trolley.at.y + 2, scene.trolley.at.z - 1), r: 1.4, color: "cyanMid" });

  // Reutiliza `spot` (fijado al arrancar el evento) para las 3 frames del flicker:
  // solo el jitter alrededor se re-randomiza, la cuaderna elegida es la misma.
  const burst = (): void => {
    const s = spot!;
    live = [];
    const n = rng.int(4, 6);
    for (let i = 0; i < n; i++) {
      live.push({ kind: "dot", at: v3(s.x + (rng.next() * 2 - 1) * 1.5, s.y + (rng.next() * 2 - 1) * 1.5, s.z + rng.next() * 1.5), r: 0.6, color: rng.chance(0.6) ? "cyan" : "cyanMid" });
    }
  };

  return {
    trolleyLamp,
    sparks: () => live,
    tick(dtMs) {
      if (opts.reducedMotion) return { trolley: false, water: false, sparks: false };
      clock += dtMs;
      const changes: AnimChanges = { trolley: false, water: false, sparks: false };

      const y = y0 + (y1 - y0) * trolleyPhase(clock);
      if (y !== scene.trolley.at.y) { scene.trolley.at.y = y; changes.trolley = true; }

      const step = Math.floor(clock / WATER_STEP_MS);
      if (step !== waterStep) {
        waterStep = step;
        const phase = ((clock % WATER_CYCLE_MS) / WATER_CYCLE_MS) * Math.PI * 2;
        for (let i = 0; i < tris.length; i++) tris[i]!.toneOffset = Math.round(Math.sin(centers[i]! / 8 - phase));
        changes.water = true;
      }

      if (sparkFrame >= 0) {
        sparkTimer -= dtMs;
        if (sparkTimer <= 0) {
          sparkFrame++;
          if (sparkFrame >= SPARK_FRAMES) { sparkFrame = -1; spot = null; live = []; sparkTimer = nextGap(); }
          else { sparkTimer = SPARK_FRAME_MS; burst(); }
          changes.sparks = true;
        }
      } else {
        sparkTimer -= dtMs;
        if (sparkTimer <= 0) { sparkFrame = 0; sparkTimer = SPARK_FRAME_MS; spot = rng.pick(scene.weldSpots); burst(); changes.sparks = true; }
      }
      return changes;
    },
  };
}

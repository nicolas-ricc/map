import type { Accent } from "../iso/accent";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { SeaScene } from "./sea";
import { ship as buildShip, wake, type ShipKind } from "./ships";

/**
 * Blog animado, sin Pixi: tres barcos que salen de la bahía, rodean la punta
 * por el este, cruzan la fosa y se desvanecen en el sangrado, sus estelas y
 * luces, el haz del faro y las dos boyas. El agua en sí (repartida por
 * profundidad en `terrain.ts`) queda estática: la anima Task 3/4. Spec §7.
 */
// Nace en (326, -24), no más al oeste ni al sur: en la bahía el barco tiene max.y < 24 y quedaría detrás (isBehind por y) de los
// galpones del muelle de alistamiento (x 304..324, y ≥ 24) y de su selva (x 332..340, y ≥ 26) si se superpusiera con ellos en pantalla.
//
// Desvío de la Task 6 respecto del trazado original de la brief: el carguero mide 60 u de eslora, y su
// caja de alineación (la que usa el test de profundidad) es mucho más ancha en pantalla que su silueta
// real cuando la proa apunta en diagonal (35°..55°). Un trazado que sale de la bahía en diagonal directa
// hacia el este de la punta cruza en pantalla, en algún tramo, la boya BUOYS[0] (420,80) o el arrecife
// (conos de roca cerca de 405,111) aunque el barco esté a decenas de unidades de distancia en el mundo:
// son falsos positivos del bounding-box del test, no una superposición real, y no hay forma de
// evitarlos cambiando iso/depth.ts (fuera del alcance de esta tarea). La salida se aplanó (tramo
// (350,10)→(500,20), casi puro este) para que el barco, casi horizontal en ese tramo, tenga una caja
// angosta en y y no la levante por encima de la boya ni del arrecife; recién gira hacia el sur en
// x ≥ 500, lejos de ambos. El resto del trazado (fosa y pecio) también se corrió al este por la misma
// razón. Ver el informe de la Task 6 para el detalle (además se corrió `cluster(332,340,26,94,6)` a
// `cluster(332,340,50,94,6)` en shipyard.ts: un árbol de esa selva quedaba en el mismo tipo de conflicto
// con la salida de la bahía, y ROUTE[0] y el heading inicial están fijados por el test, sin margen).
export const ROUTE: Vec2[] = [{ x: 326, y: -24 }, { x: 350, y: 10 }, { x: 500, y: 20 }, { x: 510, y: 118 }, { x: 520, y: 172 }, { x: 545, y: 224 }, { x: 610, y: 260 }];
export const SHIPS: readonly { kind: ShipKind; speed: number; phase: number }[] = [{ kind: "cargo", speed: 1.2, phase: 0 }, { kind: "tug", speed: 2, phase: 0.4 }, { kind: "barge", speed: 0.8, phase: 0.75 }];
export const FADE_U = 30, TURN_U = 20;
export const BEAM_PERIOD_MS = 8000, BEAM_LEN = 24, BEAM_INNER = 12, BEAM_HALF = (7 * Math.PI) / 180;
export const BUOY_PERIOD_MS = 2000;

const seg = ROUTE.slice(1).map((b, i) => { const a = ROUTE[i]!; const len = Math.hypot(b.x - a.x, b.y - a.y); return { a, b, len, heading: Math.atan2(b.y - a.y, b.x - a.x) }; });
const cum = seg.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s.len], [0]);
export const routeLength = (): number => cum[cum.length - 1]!;

const lerpAngle = (a: number, b: number, t: number): number => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

/** Punto y rumbo a `dist` unidades del inicio; el rumbo se interpola en los TURN_U alrededor de cada vértice. */
export function routeAt(dist: number): { x: number; y: number; heading: number } {
  const d = Math.max(0, Math.min(routeLength(), dist));
  let i = 0;
  while (i < seg.length - 1 && d > cum[i + 1]!) i++;
  const s = seg[i]!, local = d - cum[i]!, t = local / s.len;
  let heading = s.heading;
  if (local < TURN_U / 2 && i > 0) heading = lerpAngle(seg[i - 1]!.heading, s.heading, 0.5 + local / TURN_U);
  else if (s.len - local < TURN_U / 2 && i < seg.length - 1) heading = lerpAngle(s.heading, seg[i + 1]!.heading, (TURN_U / 2 - (s.len - local)) / TURN_U);
  return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, heading };
}

export interface ShipFrame { solids: Solid[]; lights: Accent[]; wake: Solid[]; alpha: number }
export interface SeaChanges { ships: boolean; beam: boolean; buoys: boolean }
export interface SeaAnim {
  ship(k: number): ShipFrame;
  dist(k: number): number;
  alphaAt(dist: number): number;
  beam(): Accent[];
  buoys(): Accent[];
  tick(dtMs: number): SeaChanges;
}

export function createSeaAnim(scene: SeaScene, opts: { reducedMotion: boolean }): SeaAnim {
  let clock = 0, buoyStep = 0;
  const L = routeLength();
  const dists = SHIPS.map((s) => s.phase * L);
  const alphaAt = (d: number): number => Math.max(0, Math.min(1, d / FADE_U, (L - d) / FADE_U));

  const shipFrame = (k: number): ShipFrame => {
    const p = routeAt(dists[k]!), alpha = alphaAt(dists[k]!);
    const built = buildShip(SHIPS[k]!.kind, p, p.heading);
    const wakeTris = wake(SHIPS[k]!.kind, p, p.heading);
    return { solids: built.solids, lights: built.lights, wake: [{ kind: "ground", mat: "foam", tris: wakeTris }], alpha };
  };

  const beamAngle = (): number => (opts.reducedMotion ? 0 : ((clock % BEAM_PERIOD_MS) / BEAM_PERIOD_MS) * Math.PI * 2);
  const wedge = (len: number, color: Accent["color"], alpha: number): Accent => {
    const a = beamAngle(), o: Vec3 = scene.lantern;
    return { kind: "poly", pts: [o, v3(o.x + len * Math.cos(a - BEAM_HALF), o.y + len * Math.sin(a - BEAM_HALF), o.z), v3(o.x + len * Math.cos(a + BEAM_HALF), o.y + len * Math.sin(a + BEAM_HALF), o.z)], color, alpha };
  };

  const buoyOn = (k: number): boolean => Math.floor((clock + k * (BUOY_PERIOD_MS / 2)) / (BUOY_PERIOD_MS / 2)) % 2 === 0;

  return {
    ship: shipFrame,
    dist: (k) => dists[k]!,
    alphaAt,
    beam: () => [wedge(BEAM_LEN, "magentaBleed", 0.5), wedge(BEAM_INNER, "magenta", 0.6)],
    buoys: () => scene.buoys.flatMap((b, k) => (buoyOn(k) ? [{ kind: "dot" as const, at: v3(b.x, b.y, b.z + 0.3), r: 0.8, color: "magentaMid" as const }] : [])),
    tick(dtMs) {
      const none: SeaChanges = { ships: false, beam: false, buoys: false };
      if (opts.reducedMotion || dtMs <= 0) return none;
      clock += dtMs;
      const c: SeaChanges = { ships: true, beam: true, buoys: false };
      for (let k = 0; k < SHIPS.length; k++) { dists[k] = dists[k]! + (SHIPS[k]!.speed * dtMs) / 1000; if (dists[k]! >= L) dists[k] = dists[k]! - L; }
      const bs = Math.floor(clock / (BUOY_PERIOD_MS / 2));
      if (bs !== buoyStep) { buoyStep = bs; c.buoys = true; }
      return c;
    },
  };
}

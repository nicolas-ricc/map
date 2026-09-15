import type { WorldZone } from "../map/geo";
import { createRng } from "../map/seed";
import type { Animator } from "../scenes/animator";
import { cityAnimator } from "../scenes/city-animator";
import { factoryAnimator } from "../scenes/factory-animator";
import { seaAnimator } from "../scenes/sea-animator";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { world } from "../scenes/world";
import type { LabFrame } from "./draw";
import { bootLab } from "./runtime";

const SEED = 7;

/** Una página del laboratorio: el mundo (o algunas zonas), sus animadores y el encuadre inicial. */
export function bootWorldPage(zones: readonly WorldZone[] | undefined, frame: LabFrame): void {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = world(SEED, zones ? { zones } : {});
  const animators: Animator[] = [];
  if (scene.shipyard) animators.push(shipyardAnimator(scene.shipyard, [scene.terrain.river], createRng(SEED + 1), { reducedMotion }));
  if (scene.city) animators.push(cityAnimator(scene.city, createRng(SEED + 2), { reducedMotion }));
  if (scene.factory) animators.push(factoryAnimator(scene.factory, createRng(SEED + 4), { reducedMotion }));
  if (scene.sea) animators.push(seaAnimator(scene.sea, scene.terrain, { reducedMotion }));
  void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV, frame });
}

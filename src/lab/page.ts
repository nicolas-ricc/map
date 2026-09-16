import { assembleWorld } from "../world/assemble";
import type { Frame } from "../world/frame";
import type { WorldZone } from "../map/geo";
import { bootLab } from "./runtime";

/** Una página del laboratorio: el mundo (o algunas zonas), sus animadores y el encuadre inicial. */
export function bootWorldPage(zones: readonly WorldZone[] | undefined, frame: Frame): void {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { scene, animators } = assembleWorld(zones, { reducedMotion });
  void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV, frame });
}

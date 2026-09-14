import { createRng } from "../map/seed";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { world } from "../scenes/world";
import { bootLab } from "./runtime";

const SEED = 7;
const host = document.getElementById("lab-host") as HTMLDivElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = world(SEED);
const animators = scene.shipyard ? [shipyardAnimator(scene.shipyard, [scene.terrain.river], createRng(SEED + 1), { reducedMotion })] : [];
void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV });

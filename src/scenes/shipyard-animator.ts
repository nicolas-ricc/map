import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { Scene } from "./shipyard";
import { createShipyardAnim } from "./shipyard-anim";

/** Adapta las tres animaciones del astillero al contrato `Animator`. */
export function shipyardAnimator(scene: Scene, water: Solid[], rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createShipyardAnim(scene, water, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    water: () => ({ kind: "water", water }),
    trolley: () => ({ kind: "solid", solids: [scene.trolley] }),
    trolleyLamp: () => ({ kind: "accent", accents: [anim.trolleyLamp()] }),
    sparks: () => ({ kind: "accent", accents: anim.sparks() }),
  };
  return {
    ids: Object.keys(layers),
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs);
      const out = new Set<string>();
      if (c.water) out.add("water");
      if (c.trolley) { out.add("trolley"); out.add("trolleyLamp"); }
      if (c.sparks) out.add("sparks");
      return out;
    },
  };
}

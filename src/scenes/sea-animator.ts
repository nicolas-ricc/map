import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { SeaScene } from "./sea";
import { SHIPS, createSeaAnim } from "./sea-anim";
import type { TerrainMesh } from "./terrain";

/** Adapta el mar al contrato `Animator`. Reclama mar, orilla y fosa del terreno: los dibuja partidos en bandas. */
export function seaAnimator(scene: SeaScene, terrain: TerrainMesh, rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createSeaAnim(scene, terrain, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    "sea.band0": () => ({ kind: "water", water: anim.band(0) }),
    "sea.band1": () => ({ kind: "water", water: anim.band(1) }),
    "sea.band2": () => ({ kind: "water", water: anim.band(2) }),
    "sea.abyss": () => ({ kind: "water", water: anim.abyss() }),
    "sea.beam": () => ({ kind: "accent", accents: anim.beam() }),
    "sea.buoys": () => ({ kind: "accent", accents: anim.buoys() }),
  };
  SHIPS.forEach((_, k) => {
    layers[`sea.ship${k}`] = () => { const f = anim.ship(k); return { kind: "solid", solids: f.solids, alpha: f.alpha }; };
    layers[`sea.wake${k}`] = () => { const f = anim.ship(k); return { kind: "water", water: f.wake, alpha: f.alpha }; };
    layers[`sea.lights${k}`] = () => { const f = anim.ship(k); return { kind: "accent", accents: f.lights, alpha: f.alpha }; };
  });
  return {
    ids: Object.keys(layers),
    claims: [terrain.sea, terrain.shore, terrain.abyss],
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs);
      const out = new Set<string>();
      for (const k of c.bands) out.add(`sea.band${k}`);
      if (c.abyss) out.add("sea.abyss");
      if (c.ships) SHIPS.forEach((_, k) => { out.add(`sea.ship${k}`); out.add(`sea.wake${k}`); out.add(`sea.lights${k}`); });
      if (c.beam) out.add("sea.beam");
      if (c.buoys) out.add("sea.buoys");
      return out;
    },
  };
}

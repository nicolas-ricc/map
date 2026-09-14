import type { Accent } from "../iso/accent";
import { v3, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { WorldZone } from "../map/geo";
import { createRng, type Rng } from "../map/seed";
import { city, type CityScene } from "./city";
import { shipyard, type Scene } from "./shipyard";
import { buildTerrain, type TerrainMesh } from "./terrain";

/**
 * El mundo entero: terreno compartido más una escena por zona. Cada escena
 * recibe su propio Rng derivado del seed, así retocar una no reordena las otras.
 * Blog se enchufa acá cuando exista (plan 3).
 */
export interface WorldScene {
  terrain: TerrainMesh;
  ground: Solid[];
  solids: Solid[];
  accents: Accent[];
  landmarks: Record<WorldZone, Vec3>;
  shipyard: Scene | null;
  city: CityScene | null;
}

const ALL_ZONES: readonly WorldZone[] = ["portfolio", "cv", "blog"];
const ZONE_INDEX: Record<WorldZone, number> = { portfolio: 1, cv: 2, blog: 3 };

/** Grúa pórtico, torre de oficinas, faro. Coordenadas de mundo; la reintegración proyecta con project(). */
export const LANDMARKS: Record<WorldZone, Vec3> = {
  portfolio: v3(150, 50, 0),
  cv: v3(129, 227, 0),
  blog: v3(396, 118, 0),
};

export function zoneRng(seed: number, zone: WorldZone): Rng {
  return createRng(seed * 31 + ZONE_INDEX[zone]);
}

export function world(seed: number, opts: { zones?: readonly WorldZone[] } = {}): WorldScene {
  const zones = opts.zones ?? ALL_ZONES;
  const terrain = buildTerrain(createRng(seed), zones);
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  let sy: Scene | null = null, ct: CityScene | null = null;
  if (zones.includes("portfolio")) {
    sy = shipyard(zoneRng(seed, "portfolio"));
    ground.push(...sy.ground); solids.push(...sy.solids); accents.push(...sy.accents);
  }
  if (zones.includes("cv")) {
    ct = city(zoneRng(seed, "cv"));
    ground.push(...ct.ground); solids.push(...ct.solids); accents.push(...ct.accents);
  }
  return { terrain, ground, solids, accents, landmarks: LANDMARKS, shipyard: sy, city: ct };
}

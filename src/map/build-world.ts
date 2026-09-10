import { Container, Sprite, type Renderer, type Ticker } from "pixi.js";
import { titleSignOps } from "../title-sign";
import { opsToTexture } from "./canvas";
import { GLOW_H, GLOW_W, LANDMARK_SIZE, glowOps, landmarkFrames } from "./landmarks";
import { ACCENTS } from "./palette";
import { textOps, textWidth, GLYPH_H } from "./pixelfont";
import { SEED, buildTerrain } from "./terrain";
import { ZoneNode } from "./zone-node";
import { MAP_H, MAP_W, ZONES, pointInPolygon, type ZoneId } from "./zones";

export interface World {
  container: Container;
  zones: Record<ZoneId, ZoneNode>;
  river: [Sprite, Sprite];
  tick(ticker: Ticker): void;
}

interface BoxHitArea { x: number; y: number; width: number; height: number; contains(x: number, y: number): boolean }

function polygonHitArea(points: number[]): BoxHitArea {
  const xs = points.filter((_, i) => i % 2 === 0);
  const ys = points.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {
    x, y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
    contains: (px, py) => pointInPolygon(px, py, points),
  };
}

export function buildWorld(renderer: Renderer, onSelect: (id: ZoneId) => void): World {
  const terrain = buildTerrain(SEED);
  const container = new Container();

  container.addChild(new Sprite(opsToTexture(renderer, terrain.base, MAP_W, MAP_H)));
  const river: [Sprite, Sprite] = [
    new Sprite(opsToTexture(renderer, terrain.river[0], MAP_W, MAP_H)),
    new Sprite(opsToTexture(renderer, terrain.river[1], MAP_W, MAP_H)),
  ];
  river[1].visible = false;
  container.addChild(...river);
  container.addChild(new Sprite(opsToTexture(renderer, titleSignOps(), MAP_W, MAP_H)));

  const zones = {} as Record<ZoneId, ZoneNode>;
  for (const def of ZONES) {
    const frames = landmarkFrames(def.id).map((f) => opsToTexture(renderer, f, LANDMARK_SIZE, LANDMARK_SIZE));
    const glow = opsToTexture(renderer, glowOps(def.accent), GLOW_W, GLOW_H);
    const labelOps = textOps(def.name, 0, 0, ACCENTS[def.accent].core);
    const label = opsToTexture(renderer, labelOps, textWidth(def.name), GLYPH_H);
    const overlay = opsToTexture(renderer, terrain.zoneOverlay[def.id], MAP_W, MAP_H);
    const node = new ZoneNode(def, { frames, glow, label, overlay }, onSelect);
    // tabIndex positivo: los 1..n van antes que cualquier tabindex=0, así el orden
    // de tabulación es portfolio, cv, blog (spec §5).
    node.tabIndex = ZONES.indexOf(def) + 1;
    // los divs de accesibilidad viven sobre el canvas: que no coman el hover del mouse
    node.accessiblePointerEvents = "none";
    // hitArea con contains() poligonal + bounding box: Pixi usa contains() para el
    // puntero y x/y/width/height para ubicar el div de accesibilidad. Un Polygon
    // no expone esos campos (y leerlos dispara deprecations en 8.20).
    node.hitArea = polygonHitArea(def.polygon);
    zones[def.id] = node;
    container.addChild(node);
  }

  let riverClock = 0;
  return {
    container,
    zones,
    river,
    tick(ticker) {
      riverClock += ticker.deltaMS;
      if (riverClock > 400) {
        riverClock = 0;
        river[0].visible = !river[0].visible;
        river[1].visible = !river[0].visible;
      }
      for (const id of Object.keys(zones) as ZoneId[]) zones[id].tick(ticker);
    },
  };
}

import { Container, Sprite, type Renderer, type Ticker } from "pixi.js";
import { titleSignOps } from "../title-sign";
import { Fireflies } from "./ambient";
import { opsToTexture } from "./canvas";
import { GLOW_H, GLOW_W, LANDMARK_SIZE, glowOps, landmarkFrames } from "./landmarks";
import { ACCENTS } from "./palette";
import { textOps, textWidth, GLYPH_H } from "./pixelfont";
import { SEED, buildTerrain } from "./terrain";
import { ZoneNode, type ZoneState } from "./zone-node";
import { MAP_H, MAP_W, ZONES, type ZoneId } from "./zones";

export interface World {
  container: Container;
  zones: Record<ZoneId, ZoneNode>;
  river: [Sprite, Sprite];
  tick(ticker: Ticker): void;
}

export function buildWorld(renderer: Renderer, onSelect: (id: ZoneId) => void): World {
  const terrain = buildTerrain(SEED);
  const container = new Container();

  const zones = {} as Record<ZoneId, ZoneNode>;
  for (const def of ZONES) {
    // cada tercio lleva su propio terreno (base compartida + lo suyo) recortado a su polígono
    const zoneTerrain = opsToTexture(renderer, [...terrain.base, ...terrain.zones[def.id]], MAP_W, MAP_H, def.polygon);
    const frames = landmarkFrames(def.id).map((f) => opsToTexture(renderer, f, LANDMARK_SIZE, LANDMARK_SIZE));
    const glow = opsToTexture(renderer, glowOps(def.accent), GLOW_W, GLOW_H);
    const labelOps = textOps(def.name, 0, 0, ACCENTS[def.accent].core);
    const label = opsToTexture(renderer, labelOps, textWidth(def.name), GLYPH_H);
    const overlay = opsToTexture(renderer, terrain.zoneOverlay[def.id], MAP_W, MAP_H);
    const node = new ZoneNode(def, { terrain: zoneTerrain, frames, glow, label, overlay }, onSelect);
    // tabIndex 0: los divs de accesibilidad se agregan en orden de escena (portfolio,
    // cv, blog), así que el orden del DOM ya alcanza. Un tabindex positivo se saltearía
    // el resto de la página.
    node.tabIndex = 0;
    // los divs de accesibilidad viven sobre el canvas: que no coman el hover del mouse
    node.accessiblePointerEvents = "none";
    zones[def.id] = node;
    container.addChild(node);
  }

  const river: [Sprite, Sprite] = [
    new Sprite(opsToTexture(renderer, terrain.river[0], MAP_W, MAP_H)),
    new Sprite(opsToTexture(renderer, terrain.river[1], MAP_W, MAP_H)),
  ];
  river[1].visible = false;
  container.addChild(...river);
  container.addChild(new Sprite(opsToTexture(renderer, titleSignOps(), MAP_W, MAP_H)));

  const fireflies = new Fireflies();
  container.addChild(fireflies);

  const ids = Object.keys(zones) as ZoneId[];
  /** estado visual: un tercio en reposo se ve apagado mientras otro tiene el hover */
  const visualState = (id: ZoneId, focus: ZoneId | null): ZoneState =>
    zones[id].state === "idle" && focus !== null && focus !== id ? "dim" : zones[id].state;

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
      const focus = ids.find((id) => zones[id].state === "hot") ?? null;
      for (const id of ids) zones[id].tick(ticker, focus !== null && focus !== id);
      fireflies.tick(ticker, (id) => visualState(id, focus));
    },
  };
}

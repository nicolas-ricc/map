import { ISO_COLORS, stepTone, toneColor } from "../map/palette-iso";
import { sortByDepth } from "./depth";
import { v3, type Vec3 } from "./geometry";
import { shadowPolygon } from "./light";
import { project } from "./project";
import { isFlat, tessellate, type Face, type Solid } from "./solids";

export type Layer = "ground" | "shadow" | "solid";
export interface RenderItem { layer: Layer; pts: number[]; color: number }

/**
 * Alpha con que el runtime dibuja la capa de sombras entera (una sola
 * Graphics: las superposiciones no se oscurecen dos veces). Ruling del
 * controller: 0.55 es punto de partida para la ronda de estilo, no el valor
 * final.
 */
export const SHADOW_ALPHA = 0.55;

const flatten = (pts: Vec3[]): number[] => pts.flatMap((p) => { const s = project(p); return [s.x, s.y]; });

const faceItem = (layer: Layer, f: Face): RenderItem => ({ layer, pts: flatten(f.pts), color: toneColor(f.mat, stepTone(f.tone, f.toneOffset)) });

export function buildRenderList(solids: Solid[]): RenderItem[] {
  const ground: RenderItem[] = [], shadow: RenderItem[] = [], solid: RenderItem[] = [];
  const raised: Solid[] = [];
  // El suelo se pinta en orden de inserción, sin ordenar por profundidad: el
  // suelo hundido (dique seco) tiene que quedar tapado por un muro sólido que
  // se dibuje después.
  for (const s of solids) {
    if (isFlat(s)) for (const f of tessellate(s)) ground.push(faceItem("ground", f));
    else raised.push(s);
  }
  for (const s of raised) {
    const poly = shadowPolygon(s);
    if (poly) shadow.push({ layer: "shadow", pts: flatten(poly.map((p) => v3(p.x, p.y, 0))), color: ISO_COLORS.shadow });
  }
  for (const s of sortByDepth(raised)) for (const f of tessellate(s)) solid.push(faceItem("solid", f));
  return [...ground, ...shadow, ...solid];
}

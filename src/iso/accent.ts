import { ISO_COLORS, type AccentColor } from "../map/palette-iso";
import type { Vec3 } from "./geometry";
import { project } from "./project";

/** Luz artificial: se dibuja arriba de todo con blend "add". Un punto (farol, chispa) o un polígono (ventana encendida, haz). */
export type Accent =
  | { kind: "dot"; at: Vec3; r: number; color: AccentColor }
  | { kind: "poly"; pts: Vec3[]; color: AccentColor; alpha?: number };

export type AccentItem =
  | { kind: "dot"; x: number; y: number; r: number; color: number }
  | { kind: "poly"; pts: number[]; color: number; alpha: number };

export function accentItem(a: Accent): AccentItem {
  if (a.kind === "dot") {
    const p = project(a.at);
    return { kind: "dot", x: p.x, y: p.y, r: a.r, color: ISO_COLORS[a.color] };
  }
  return { kind: "poly", pts: a.pts.flatMap((v) => { const s = project(v); return [s.x, s.y]; }), color: ISO_COLORS[a.color], alpha: a.alpha ?? 1 };
}

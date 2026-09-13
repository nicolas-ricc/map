import type { Graphics } from "pixi.js";
import { project } from "../iso/project";
import type { Layer, RenderItem } from "../iso/render-list";
import { ISO_COLORS } from "../map/palette-iso";
import type { Accent } from "../scenes/shipyard";

export interface Fit { x: number; y: number; scale: number }

/** Escala y desplazamiento para que todos los puntos entren en width×height con un margen relativo. */
export function fitTransform(items: RenderItem[], width: number, height: number, margin = 0.04): Fit {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) for (let i = 0; i < it.pts.length; i += 2) {
    minX = Math.min(minX, it.pts[i]!); maxX = Math.max(maxX, it.pts[i]!);
    minY = Math.min(minY, it.pts[i + 1]!); maxY = Math.max(maxY, it.pts[i + 1]!);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, scale: 1 };
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const scale = Math.min((width * (1 - 2 * margin)) / w, (height * (1 - 2 * margin)) / h);
  return { x: (width - w * scale) / 2 - minX * scale, y: (height - h * scale) / 2 - minY * scale, scale };
}

export function accentCircle(a: Accent): { x: number; y: number; r: number; color: number } {
  const p = project(a.at);
  return { x: p.x, y: p.y, r: a.r, color: ISO_COLORS[a.color] };
}

export function drawLayer(g: Graphics, items: RenderItem[], layer: Layer): void {
  g.clear();
  for (const it of items) if (it.layer === layer) g.poly(it.pts, true).fill(it.color);
}

export function drawAccents(g: Graphics, accents: Accent[]): void {
  g.clear();
  for (const a of accents) {
    const c = accentCircle(a);
    g.circle(c.x, c.y, c.r * 2.2).fill({ color: c.color, alpha: 0.18 }); // halo
    g.circle(c.x, c.y, c.r).fill(c.color);
  }
}

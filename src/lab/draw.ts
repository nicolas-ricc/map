import type { Graphics } from "pixi.js";
import { accentItem, type Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import { project } from "../iso/project";
import type { Layer, RenderItem } from "../iso/render-list";
import { WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, type WorldZone } from "../map/geo";

const FRAME_H = 30; // alto de referencia para que entren los landmarks

/** Caja de una zona (o del mundo) proyectada, como un RenderItem para fitTransform. */
export function zoneFrame(zone: WorldZone | "all"): RenderItem[] {
  const box = { all: [0, 0, WORLD_W, WORLD_H], portfolio: [0, 0, ZONE_SPLIT_X, ZONE_SPLIT_Y], cv: [0, ZONE_SPLIT_Y, ZONE_SPLIT_X, WORLD_H], blog: [ZONE_SPLIT_X, 0, WORLD_W, WORLD_H] }[zone];
  const [x0, y0, x1, y1] = box as [number, number, number, number];
  const pts: number[] = [];
  for (const [x, y, z] of [[x0, y0, FRAME_H], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]] as const) { const p = project(v3(x, y, z)); pts.push(p.x, p.y); }
  return [{ layer: "ground", pts, color: 0 }];
}

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

export function drawLayer(g: Graphics, items: RenderItem[], layer: Layer): void {
  g.clear();
  for (const it of items) if (it.layer === layer) g.poly(it.pts, true).fill(it.color);
}

export function drawAccents(g: Graphics, accents: Accent[]): void {
  g.clear();
  for (const a of accents) {
    const it = accentItem(a);
    if (it.kind === "dot") {
      g.circle(it.x, it.y, it.r * 2.2).fill({ color: it.color, alpha: 0.18 }); // halo
      g.circle(it.x, it.y, it.r).fill(it.color);
    } else {
      g.poly(it.pts, true).fill({ color: it.color, alpha: it.alpha });
    }
  }
}

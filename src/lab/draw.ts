import type { Graphics } from "pixi.js";
import { accentItem, type Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import { project } from "../iso/project";
import type { Layer, RenderItem } from "../iso/render-list";
import { BLEED, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, type WorldZone } from "../map/geo";

const FRAME_H = 30; // alto de referencia para que entren los landmarks

export type LabFrame = WorldZone | "all" | "cover";

/** Caja de una zona (o del mundo) proyectada, como un RenderItem para fitTransform. `cover` es el rectángulo 16:9 inscripto en el rombo del sangrado. */
export function zoneFrame(frame: LabFrame): RenderItem[] {
  if (frame === "cover") return coverFrame(16 / 9);
  const box = {
    all: [WORLD.x0, WORLD.y0, WORLD.x1, WORLD.y1],
    portfolio: [WORLD.x0, WORLD.y0, ZONE_SPLIT_X, ZONE_SPLIT_Y],
    cv: [WORLD.x0, ZONE_SPLIT_Y, ZONE_SPLIT_X, WORLD.y1],
    blog: [ZONE_SPLIT_X, WORLD.y0, WORLD.x1, WORLD.y1],
  }[frame];
  const [x0, y0, x1, y1] = box as [number, number, number, number];
  const pts: number[] = [];
  for (const [x, y, z] of [[x0, y0, FRAME_H], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]] as const) { const p = project(v3(x, y, z)); pts.push(p.x, p.y); }
  return [{ layer: "ground", pts, color: 0 }];
}

/**
 * Rectángulo de aspecto `aspect` inscripto en el rombo del terreno con
 * sangrado, centrado en él: lo que la cámara cover del sitio podrá mostrar sin
 * cielo. Rombo de semidiagonales a (horizontal) y a/2: el rectángulo inscripto
 * mide u = aspect·a/(aspect+2) de semiancho y v = a/(aspect+2) de semialto.
 */
export function coverFrame(aspect: number): RenderItem[] {
  const x0 = WORLD.x0 - BLEED.x, y0 = WORLD.y0 - BLEED.y, x1 = WORLD.x1 + BLEED.x, y1 = WORLD.y1 + BLEED.y;
  const c = project(v3((x0 + x1) / 2, (y0 + y1) / 2, 0));
  const a = (x1 - x0 + y1 - y0) / 2;
  const v = a / (aspect + 2), u = aspect * v;
  return [{ layer: "ground", pts: [c.x - u, c.y - v, c.x + u, c.y - v, c.x + u, c.y + v, c.x - u, c.y + v], color: 0 }];
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

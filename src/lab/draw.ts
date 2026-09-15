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

const COVER_INSET = 3; // el borde del terreno está a z −1 (agua) o 0.6 ± 0.8 (selva), ±1.4 px respecto del paralelogramo a z 0

/**
 * Rectángulo de aspecto `aspect` inscripto en el terreno con sangrado
 * proyectado: lo que la cámara cover del sitio podrá mostrar sin cielo.
 * Un rectángulo Wx×Wy se proyecta como paralelogramo de lados con pendiente
 * ±1/2 (rombo solo si Wx = Wy). El rectángulo inscripto más grande cumple
 * h + w/2 = min(Wx, Wy); se centra en x y queda apoyado en el borde inferior
 * del rango factible (v0 = |Wx − Wy|/4 + w/4 bajo el vértice superior). El
 * paralelogramo asume z = 0 en el borde, pero el terreno real ondula
 * (agua a z −1, selva a 0.6 ± 0.8): se retrae `COVER_INSET` hacia el centro
 * para no exponer cielo en las esquinas donde el rectángulo es tangente.
 */
export function coverFrame(aspect: number): RenderItem[] {
  const x0 = WORLD.x0 - BLEED.x, y0 = WORLD.y0 - BLEED.y, x1 = WORLD.x1 + BLEED.x, y1 = WORLD.y1 + BLEED.y;
  const wx = x1 - x0, wy = y1 - y0;
  const h = (2 * Math.min(wx, wy)) / (aspect + 2), w = aspect * h;
  const top = project(v3(x0, y0, 0));
  const u0 = top.x + (wx - wy) / 2 - w / 2;
  const v0 = top.y + Math.abs(wx - wy) / 4 + w / 4;
  const h2 = h - 2 * COVER_INSET, w2 = aspect * h2, u = u0 + (w - w2) / 2, v = v0 + COVER_INSET;
  return [{ layer: "ground", pts: [u, v, u + w2, v, u + w2, v + h2, u, v + h2], color: 0 }];
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

import { BLEED, WORLD, type WorldZone } from "../map/geo";
import { coverFrame, fitTransform, zoneFrame } from "./frame";

/** Estado de cámara del contenedor del mundo: `pantalla = mundo_proyectado × scale + (x, y)`. Igual a CameraState. */
export interface View { x: number; y: number; scale: number }

/** Unidades de mundo que el viewport se queda adentro del rectángulo del sangrado: el borde del terreno está a z −1 (agua) o 0.6 ± 0.8 (lomas), ±1.4 px respecto del paralelogramo a z 0. */
export const VIEW_INSET = 3;
/** zoneView nunca baja de coverView × esto: con el inset, un viewport exactamente a escala cover no cabe. */
export const ZONE_MIN_ZOOM = 1.01;

const X0 = WORLD.x0 - BLEED.x + VIEW_INSET, X1 = WORLD.x1 + BLEED.x - VIEW_INSET;
const Y0 = WORLD.y0 - BLEED.y + VIEW_INSET, Y1 = WORLD.y1 + BLEED.y - VIEW_INSET;

/** Inversa de project() a z 0 (la misma que usa coverQuad). */
export function unproject(sx: number, sy: number): { x: number; y: number } {
  return { x: sx / 2 + sy, y: sy - sx / 2 };
}

/** Punto del host (px desde la esquina del canvas) → mundo a z 0, con la cámara. */
export function pointerToWorld(v: View, px: number, py: number): { x: number; y: number } {
  return unproject((px - v.x) / v.scale, (py - v.y) / v.scale);
}

export function viewCorners(v: View, w: number, h: number): { x: number; y: number }[] {
  return [[0, 0], [w, 0], [w, h], [0, h]].map(([px, py]) => pointerToWorld(v, px!, py!));
}

/** Encuadre cover: el rectángulo del aspecto del host inscripto en el sangrado (coverQuad) llena el host exacto. Sin cielo. */
export function coverView(w: number, h: number): View {
  return fitTransform(coverFrame(w / h), w, h, 0);
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Corre la vista lo mínimo para que las cuatro esquinas del viewport queden
 * dentro del rectángulo del sangrado (con VIEW_INSET). Como unproject es
 * lineal, la x de mundo de cada esquina es `cX − a` y la y es `cY − b`, con
 * `a = (v.x/2 + v.y)/s`, `b = (v.y − v.x/2)/s` y (cX, cY) fijos por esquina:
 * las restricciones son dos intervalos independientes sobre a y b. Si un
 * intervalo es vacío el viewport no cabe a esa escala y se devuelve coverView.
 */
export function clampToBleed(v: View, w: number, h: number): View {
  const s = v.scale;
  const aMin = (w / 2 + h) / s - X1, aMax = -X0;
  const bMin = h / s - Y1, bMax = -w / (2 * s) - Y0;
  if (aMin > aMax || bMin > bMax) return coverView(w, h);
  const a = clamp((v.x / 2 + v.y) / s, aMin, aMax), b = clamp((v.y - v.x / 2) / s, bMin, bMax);
  const x = s * (a - b), y = (s * (a + b)) / 2;
  // sin ruido de coma flotante cuando ya estaba adentro
  return Math.abs(x - v.x) < 1e-9 && Math.abs(y - v.y) < 1e-9 ? { ...v } : { x, y, scale: s };
}

function frameCenter(zone: WorldZone): { x: number; y: number } {
  const pts = zoneFrame(zone)[0]!.pts;
  const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** La caja de la zona encajada con margen 4 %; si eso queda por debajo de cover × ZONE_MIN_ZOOM, esa escala centrada en la caja. Siempre dentro del sangrado. */
export function zoneView(zone: WorldZone, w: number, h: number): View {
  const floor = coverView(w, h).scale * ZONE_MIN_ZOOM;
  const fit = fitTransform(zoneFrame(zone), w, h, 0.04);
  if (fit.scale >= floor) return clampToBleed(fit, w, h);
  const c = frameCenter(zone);
  return clampToBleed({ x: w / 2 - c.x * floor, y: h / 2 - c.y * floor, scale: floor }, w, h);
}

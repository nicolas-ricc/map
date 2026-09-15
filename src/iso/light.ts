import type { Tone } from "../map/palette-iso";
import { convexHull, dot, normalize, type Vec2, type Vec3 } from "./geometry";
import { Z_SCALE } from "./project";
import { isFlat, tessellateAll, type Solid } from "./solids";

export const SUN_ELEVATION = (25 * Math.PI) / 180;

/** Unitario hacia el sol: oeste-sudoeste y bajo. Así la pared sur queda iluminada y la este en sombra. */
export const TO_SUN: Vec3 = normalize({
  x: -0.894 * Math.cos(SUN_ELEVATION),
  y: 0.447 * Math.cos(SUN_ELEVATION),
  z: Math.sin(SUN_ELEVATION),
});

/** Hacia dónde cae la sombra en el plano (ENE). */
export const SHADOW_DIR: Vec2 = { x: 0.894, y: -0.447 };

/** Unidades de sombra por unidad de altura (la altura exagerada también alarga la sombra). */
export const SHADOW_PER_UNIT = Z_SCALE / Math.tan(SUN_ELEVATION);

const TOP_MIN_Z = 0.997;   // por encima: techo plano
const SLOPE_MIN_Z = 0.3;   // entre esto y TOP_MIN_Z: vertiente

/** Cinco tonos según la normal: techo, vertiente a favor/en contra del sol, pared iluminada/en sombra. */
export function shadeTone(n: Vec3): Tone {
  if (n.z > TOP_MIN_Z) return "top";
  if (n.z > SLOPE_MIN_Z) return dot(n, TO_SUN) > TO_SUN.z ? "up" : "down";
  return dot(n, TO_SUN) > 0 ? "lit" : "shade";
}

/** Altura máxima que proyecta sombra: una torre de 30 sombrea como una de 18 y no cruza tres manzanas. */
export const SHADOW_MAX_H = 18;
/** Tope del núcleo: la mitad inferior del sólido proyecta la banda densa; la punta queda solo con la banda suave. */
export const SHADOW_CORE_H = 9;

/** Dónde toca el suelo (z = 0) el rayo que pasa por p, con la altura recortada a `maxH`. */
export function shadowPoint(p: Vec3, maxH = SHADOW_MAX_H): Vec2 {
  const len = Math.min(Math.max(0, p.z), maxH) * SHADOW_PER_UNIT;
  return { x: p.x + SHADOW_DIR.x * len, y: p.y + SHADOW_DIR.y * len };
}

/**
 * Sombra al suelo: casco convexo de todos los vértices proyectados por el sol.
 * Los vértices bajo el suelo se quedan donde están (la parte hundida no tapa luz).
 * Sólidos planos o enteramente hundidos no proyectan. Con `maxH` menor sale el núcleo.
 */
export function shadowPolygon(s: Solid, maxH = SHADOW_MAX_H): Vec2[] | null {
  if (isFlat(s)) return null;
  const pts: Vec2[] = [];
  let above = false;
  for (const f of tessellateAll(s)) for (const p of f.pts) {
    if (p.z > 0) above = true;
    pts.push(shadowPoint(p, maxH));
  }
  if (!above) return null;
  return convexHull(pts);
}

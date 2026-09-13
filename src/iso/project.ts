import { normalize, v3, type Vec2, type Vec3 } from "./geometry";

/** Exageración vertical: los edificios se estiran para que proyecten perfil. */
export const Z_SCALE = 1.4;

/**
 * Dirección hacia la cámara: la misma que `project()` colapsa al proyectar
 * (mismos coeficientes que la fórmula de abajo), normalizada. Para descartar
 * caras ocultas.
 */
export const VIEW_DIR: Vec3 = normalize(v3(Z_SCALE, Z_SCALE, 1));

/** Mundo (x este, y sur, z arriba) → pantalla. */
export function project(v: Vec3): Vec2 {
  return { x: v.x - v.y, y: (v.x + v.y) / 2 - v.z * Z_SCALE };
}

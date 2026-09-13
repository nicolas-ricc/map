import type { Vec2, Vec3 } from "./geometry";

/** Exageración vertical: los edificios se estiran para que proyecten perfil. */
export const Z_SCALE = 1.4;

/** Dirección hacia la cámara (dimétrica 2:1: elevación ≈ 30° desde el SE). Para descartar caras ocultas. */
export const VIEW_DIR: Vec3 = { x: 0.61, y: 0.61, z: 0.5 };

/** Mundo (x este, y sur, z arriba) → pantalla. */
export function project(v: Vec3): Vec2 {
  return { x: v.x - v.y, y: (v.x + v.y) / 2 - v.z * Z_SCALE };
}

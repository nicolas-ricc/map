/**
 * Geografía del lienzo: río y costa. Viven acá (y no en terrain.ts) porque las
 * zonas se parten a lo largo del río, así que zones.ts las necesita y terrain.ts
 * importa zones.ts.
 */
export const MAP_W = 480;
export const MAP_H = 270;

export const RIVER_HALF = 7;

/** Centro x del río para cada y: curva suave determinística, corre de arriba a abajo. */
export function riverCenter(y: number): number {
  return Math.round(250 + 26 * Math.sin(y / 38) + 14 * Math.sin(y / 17 + 1.3));
}

/** x donde empieza el mar para cada y. Una punta (el promontorio del faro) alrededor de y=118. */
export function coastX(y: number): number {
  const head = Math.exp(-(((y - 118) / 26) ** 2));
  return Math.round(418 + 20 * head + 6 * Math.sin(y / 23) + 3 * Math.sin(y / 9 + 2));
}

export function isWater(x: number, y: number): boolean {
  return Math.abs(x - riverCenter(y)) <= RIVER_HALF || x >= coastX(y);
}

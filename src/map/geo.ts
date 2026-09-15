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

/** x donde termina la mitad izquierda (Portfolio arriba, Resume abajo) y empieza Blog. A la derecha del río. */
export function splitX(y: number): number {
  return Math.round(336 + 6 * Math.sin(y / 30) + 3 * Math.sin(y / 11));
}

export function isWater(x: number, y: number): boolean {
  return Math.abs(x - riverCenter(y)) <= RIVER_HALF || x >= coastX(y);
}

// ---------------------------------------------------------------- mundo isométrico

/**
 * Contenido del mundo iso: las tres zonas. Origen negativo porque la fábrica
 * (norte y oeste del astillero) y el distrito (oeste y sur de la ciudad)
 * crecieron hacia afuera sin mover lo ya hecho. Lados múltiplos de 18 para que
 * la grilla del sangrado (CELL_BLEED) comparta vértices con la del contenido.
 */
export const WORLD = { x0: -60, y0: -60, x1: 570, y1: 336 } as const;
/**
 * Sangrado: terreno de relleno alrededor del contenido, para que la cámara
 * cover del sitio no muestre cielo. Múltiplos de CELL_BLEED. El contenido +
 * sangrado proyecta como un paralelogramo (rombo solo si Wx = Wy), así que el
 * rectángulo inscripto más grande queda acotado por el lado corto (y):
 * Wy = 396 + 2·378 = 1152, ≥ 1128 que necesita la caja del contenido con la
 * torre, que no está centrada (FRAME_H levanta solo la esquina NO).
 */
export const BLEED = { x: 342, y: 378 } as const;
export const CELL_BLEED = 18;
/** Blog es todo lo que está al este de ZONE_SPLIT_X (visualmente); Resume, lo que está al sur de ZONE_SPLIT_Y del lado oeste. */
export const ZONE_SPLIT_X = 344;
export const ZONE_SPLIT_Y = 146;
/** Agua clara a esta distancia de la tierra. */
export const SHORE_W = 12;
const SHORE_WOBBLE = 5;
/** Ancho de la orilla frente a la costa del corte x = 344, ondulado y determinístico. Mínimo 5. */
export const shoreWidth = (y: number): number => SHORE_W + SHORE_WOBBLE * Math.sin(y / 11) + 2 * Math.sin(y / 4.3);
/** x donde empieza la fosa (agua profunda): talud diagonal NE-SO que se abre hacia el este. */
export const abyssX = (y: number): number => 392 + 0.25 * (y + 60) + 6 * Math.sin(y / 17);

export type WorldZone = "portfolio" | "cv" | "blog";

/**
 * Zona clickeable (hover y click del sitio), por geografía y no por corte:
 * la punta, el arrecife y su orilla son Portfolio (el faro remata el
 * astillero), la orilla del malecón es Resume y Blog es solo el mar abierto.
 * El terreno visual (terrain.ts) no usa esto para clasificar el mar.
 */
export function worldZoneAt(x: number, y: number): WorldZone {
  if (inHeadland(x, y) || distToHeadland(x, y) < SHORE_W) return "portfolio";
  if (x < ZONE_SPLIT_X + shoreWidth(y)) return y >= ZONE_SPLIT_Y ? "cv" : "portfolio";
  return "blog";
}

/**
 * Desembocadura: en el mapa viejo el río corría de norte a sur sin tocar el
 * mar. Ahora, por encima de MOUTH_Y, todo lo que hay al este de la orilla
 * oeste del río es una bahía que abre al mar. Es la única salida de los barcos.
 */
export const MOUTH_Y = 24;

export function inMouth(x: number, y: number): boolean {
  return y < MOUTH_Y && x >= riverCenter(y) - RIVER_HALF;
}

/** Punta del faro: nace en el muelle de alistamiento (x 330..344) y se adelgaza hasta x = 400. Sentido horario. */
export const HEADLAND: readonly [number, number][] = [
  [330, 100], [344, 97], [372, 104], [400, 114], [400, 122], [372, 132], [344, 134], [330, 130],
];
const HEADLAND_FLAT = HEADLAND.flat();

export function inHeadland(x: number, y: number): boolean {
  return pointInPolygon(x, y, HEADLAND_FLAT);
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Distancia al borde de la punta; 0 adentro. Para clasificar arrecife y orilla. */
export function distToHeadland(x: number, y: number): number {
  if (inHeadland(x, y)) return 0;
  let best = Infinity;
  for (let i = 0; i < HEADLAND.length; i++) {
    const [ax, ay] = HEADLAND[i]!, [bx, by] = HEADLAND[(i + 1) % HEADLAND.length]!;
    best = Math.min(best, distToSegment(x, y, ax, ay, bx, by));
  }
  return best;
}

export function pointInPolygon(x: number, y: number, polygon: number[]): boolean {
  let inside = false;
  const n = polygon.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i * 2]!, yi = polygon[i * 2 + 1]!;
    const xj = polygon[j * 2]!, yj = polygon[j * 2 + 1]!;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- astillero (lo comparte el terreno)

/** Lado de la grilla de terreno. Vive acá para que city-grid.ts y terrain.ts lo compartan sin importarse. */
export const CELL = 6;
// Ruling del controller: 198 (no 200) porque es múltiplo de CELL = 6; con 200
// la celda 198..204 tiene centro 201 (agua) pero vértices en x=198, rompiendo
// la propiedad "todo el agua tiene x >= QUAY_X".
export const QUAY_X = 198, QUAY_W = 4;
export const BOTTOM = 142;
export const DOCK = { x: 120, y: 6, w: 72, d: 24, depth: 6 } as const; // alineado a CELL
export const eastBank = (y: number): number => riverCenter(y) + RIVER_HALF;

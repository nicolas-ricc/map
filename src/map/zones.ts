import type { Accent } from "./palette";

export const MAP_W = 480;
export const MAP_H = 270;

export type ZoneId = "portfolio" | "cv" | "blog";
export const ZONE_IDS: readonly ZoneId[] = ["portfolio", "cv", "blog"];

export interface ZoneDef {
  id: ZoneId;
  name: string;
  accent: Accent;
  polygon: number[];
  landmark: { x: number; y: number };
  label: { x: number; y: number };
}

export const ZONES: readonly ZoneDef[] = [
  {
    id: "portfolio",
    name: "Portfolio",
    accent: "cyan",
    polygon: [30, 30, 210, 24, 222, 128, 40, 136],
    landmark: { x: 120, y: 78 },
    label: { x: 92, y: 112 },
  },
  {
    id: "cv",
    name: "Currículum",
    accent: "amber",
    polygon: [36, 152, 226, 146, 232, 252, 44, 258],
    landmark: { x: 130, y: 196 },
    label: { x: 92, y: 236 },
  },
  {
    id: "blog",
    name: "Blog",
    accent: "magenta",
    polygon: [292, 40, 470, 34, 474, 236, 300, 244],
    landmark: { x: 384, y: 128 },
    label: { x: 368, y: 172 },
  },
];

export function zoneById(id: ZoneId): ZoneDef {
  const z = ZONES.find((z) => z.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
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

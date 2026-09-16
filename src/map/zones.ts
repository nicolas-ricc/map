export type ZoneId = "portfolio" | "cv" | "blog";
export const ZONE_IDS: readonly ZoneId[] = ["portfolio", "cv", "blog"];

/** Color de luz artificial de una zona (los `core` de ISO_COLORS; en CSS, los rótulos). */
export type Accent = "cyan" | "amber" | "magenta";

export interface ZoneDef {
  id: ZoneId;
  name: string;
  accent: Accent;
}

/** Las tres zonas en orden de tab. La geografía (qué punto es de qué zona) vive en geo.ts (worldZoneAt). */
export const ZONES: readonly ZoneDef[] = [
  { id: "portfolio", name: "Portfolio", accent: "cyan" },
  { id: "cv", name: "Resume", accent: "amber" },
  { id: "blog", name: "Blog", accent: "magenta" },
];

export function zoneById(id: ZoneId): ZoneDef {
  const z = ZONES.find((z) => z.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}

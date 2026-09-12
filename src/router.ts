import { ZONE_IDS, type ZoneId } from "./map/zones";

/** Prefijo bajo el que vive el sitio (Vite lo toma de `base`): "/map/" en producción. */
export const BASE = import.meta.env.BASE_URL;

export function zoneFromPath(pathname: string, base: string = BASE): ZoneId | null {
  const clean = pathname.split(/[?#]/)[0] ?? "";
  if (!clean.startsWith(base)) return null; // fuera del prefijo no es nuestro
  const rest = clean.slice(base.length);
  const first = rest.split("/").filter(Boolean)[0];
  if (!first) return null;
  return (ZONE_IDS as readonly string[]).includes(first) ? (first as ZoneId) : null;
}

export function pathForZone(id: ZoneId | null, base: string = BASE): string {
  return id ? `${base}${id}/` : base;
}

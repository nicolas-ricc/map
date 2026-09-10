import { ZONE_IDS, type ZoneId } from "./map/zones";

export function zoneFromPath(pathname: string): ZoneId | null {
  const clean = pathname.split(/[?#]/)[0] ?? "";
  const first = clean.split("/").filter(Boolean)[0];
  if (!first) return null;
  return (ZONE_IDS as readonly string[]).includes(first) ? (first as ZoneId) : null;
}

export function pathForZone(id: ZoneId | null): string {
  return id ? `/${id}/` : "/";
}

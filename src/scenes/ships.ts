import type { Accent } from "../iso/accent";
import { v3, type Vec2 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";

/**
 * Barcos hechos con las piezas del astillero: `hull` con heading, cajas como
 * `poly` con huella rotada, chimeneas como cilindros. Popa en `at`, sobre el
 * agua (z -1). Luces: mástil magentaMid, babor magenta, estribor cyanMid.
 */
export type ShipKind = "cargo" | "tug" | "barge";
export interface ShipSpec { len: number; beam: number; h: number }
export const SHIP_SPECS: Record<ShipKind, ShipSpec> = { cargo: { len: 60, beam: 10, h: 5 }, tug: { len: 18, beam: 6, h: 3 }, barge: { len: 40, beam: 9, h: 2 } };
const WATER_Z = -1;

export function ship(kind: ShipKind, at: Vec2, heading: number): { solids: Solid[]; lights: Accent[] } {
  const spec = SHIP_SPECS[kind];
  const c = Math.cos(heading), s = Math.sin(heading);
  const local = (dx: number, dy: number) => ({ x: at.x + dx * c - dy * s, y: at.y + dx * s + dy * c });
  const box = (dx: number, dy: number, w: number, d: number, z: number, h: number, mat: Material): Solid => ({ kind: "poly", footprint: [local(dx, dy), local(dx + w, dy), local(dx + w, dy + d), local(dx, dy + d)], z, h, mat });
  const cyl = (dx: number, dy: number, z: number, r: number, h: number, mat: Material): Solid => { const p = local(dx, dy); return { kind: "cylinder", at: v3(p.x, p.y, z), r, h, mat, sides: 8 }; };
  const dot = (dx: number, dy: number, z: number, r: number, color: Accent["color"]): Accent => { const p = local(dx, dy); return { kind: "dot", at: v3(p.x, p.y, z), r, color }; };
  const solids: Solid[] = [{ kind: "hull", at: v3(at.x, at.y, WATER_Z), len: spec.len, beam: spec.beam, h: spec.h, mat: "hull", heading }];
  const deck = WATER_Z + spec.h;
  const lights: Accent[] = [];
  if (kind === "cargo") {
    solids.push(box(4, -4, 10, 8, deck, 6, "steel"), cyl(8, 0, deck + 6, 1.2, 3, "rust"));
    solids.push(box(34, -0.5, 1, 1, deck, 8, "steel"), box(34, -0.5, 6, 1, deck + 7, 0.8, "steel")); // grúa de cubierta
    lights.push(dot(9, 0, deck + 9.5, 0.7, "magentaMid"));
    lights.push(dot(30, -5, deck, 0.4, "magenta"), dot(30, 5, deck, 0.4, "cyanMid"));
  } else if (kind === "tug") {
    solids.push(box(3, -2, 5, 4, deck, 3, "steel"));
    lights.push(dot(5, 0, deck + 3.5, 0.7, "magentaMid"));
    lights.push(dot(12, -3, deck, 0.4, "magenta"), dot(12, 3, deck, 0.4, "cyanMid"));
  } else {
    for (let i = 0; i < 6; i++) solids.push(box(4 + i * 6, -1.2, 5.5, 2.4, deck, 2.4, i % 2 === 0 ? "rust" : "steel"));
    lights.push(dot(1, 0, deck + 4, 0.7, "magentaMid"));
    lights.push(dot(30, -4.5, deck, 0.4, "magenta"), dot(30, 4.5, deck, 0.4, "cyanMid"));
  }
  return { solids, lights };
}

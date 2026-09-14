import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds } from "../iso/solids";
import { WORLD_H, WORLD_W, worldZoneAt } from "../map/geo";
import { allIsoColors } from "../map/palette-iso";
import { LANDMARKS, world, zoneRng } from "./world";

describe("world", () => {
  it("es determinístico y cada zona tiene su propio stream de azar", () => {
    expect(JSON.stringify(world(7))).toBe(JSON.stringify(world(7)));
    expect(zoneRng(7, "portfolio").next()).not.toBe(zoneRng(7, "cv").next());
    expect(zoneRng(7, "portfolio").next()).toBe(zoneRng(7, "portfolio").next());
  });

  it("con todas las zonas trae el astillero y el terreno completo", () => {
    const w = world(7);
    expect(w.shipyard).not.toBeNull();
    expect(w.solids.length).toBeGreaterThan(250);
    expect(w.terrain.sea.kind === "ground" && w.terrain.sea.tris.length).toBeGreaterThan(600);
    for (const s of w.solids) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1); expect(b.max.x).toBeLessThanOrEqual(WORLD_W + 1);
      expect(b.min.y).toBeGreaterThanOrEqual(-1); expect(b.max.y).toBeLessThanOrEqual(WORLD_H + 1);
    }
  });

  it("filtrar por zona deja fuera lo demás", () => {
    const w = world(7, { zones: ["cv"] });
    expect(w.shipyard).toBeNull();
    expect(w.solids).toEqual([]);
    expect(w.terrain.sea.kind === "ground" && w.terrain.sea.tris).toEqual([]);
  });

  it("los landmarks caen en su zona", () => {
    for (const z of ["portfolio", "cv", "blog"] as const) expect(worldZoneAt(LANDMARKS[z].x, LANDMARKS[z].y)).toBe(z);
  });

  it("todo el render usa colores del atlas", () => {
    const w = world(7);
    const colors = allIsoColors();
    for (const i of buildRenderList([...w.terrain.ground, w.terrain.river, w.terrain.sea, w.terrain.shore, ...w.ground, ...w.solids])) expect(colors.has(i.color)).toBe(true);
  });
});

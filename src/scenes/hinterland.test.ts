import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { WORLD, ZONE_SPLIT_Y, worldZoneAt } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { PYLON_N, SILOS, TANKS, hinterland } from "./hinterland";
import { GREEN_BELT } from "./sprawl-grid";
import { bleedTerrainAt, terrainAt } from "./terrain";

const PORTFOLIO_MATS: readonly Material[] = ["slab", "concrete", "rust", "steel", "road", "rail", "sand", "brick", "leaf", "leafDark"];
const scene = () => hinterland(createRng(7));
const groundAt = (x: number, y: number) => (x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1 ? terrainAt(x, y) : bleedTerrainAt(x, y));
const slender = (s: Solid) => (s.kind === "cylinder" && s.r <= 3) || (s.kind === "prism" && ((s.w <= 3 && s.d <= 3) || s.h <= 1));

describe("hinterland", () => {
  it("es determinístico, cae en Portfolio con materiales de Portfolio y dentro del presupuesto", () => {
    expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    const s = scene();
    const raised = s.solids.filter((x) => !isFlat(x));
    expect(raised.length).toBeGreaterThan(200); expect(raised.length).toBeLessThan(600);
    for (const x of s.solids) {
      const b = bounds(x);
      expect(b.max.y).toBeLessThanOrEqual(ZONE_SPLIT_Y);
      expect(worldZoneAt(b.min.x, b.min.y)).toBe("portfolio");
      expect(PORTFOLIO_MATS).toContain(x.mat);
    }
  });

  it("nada apoya en agua ni en loma; solo silos, torres y pórticos superan 18, y son esbeltos", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (x.kind !== "cone") {
        const g = groundAt(b.min.x, b.min.y);
        if (!(x.kind === "prism" && x.mat === "concrete" && x.at.z === -1)) expect(["water", "river", "sea", "shore", "abyss"]).not.toContain(g); // salvo el muelle, que nace en el agua
        if (b.min.x < WORLD.x0 || b.min.y < WORLD.y0) expect(g === "industrial" || (g === "jungle" && b.min.y >= GREEN_BELT.y0)).toBe(true);
      }
      if (b.max.z > 18) expect(slender(x)).toBe(true);
    }
  });

  it("playa de maniobras con vagones, galpones, tanques, silos, torres con cables, contenedores apilados y selva en el cinturón", () => {
    const s = scene();
    expect(s.ground.filter((g) => g.kind === "strip" && g.mat === "rail").length).toBeGreaterThanOrEqual(14); // 5 vías E-O y 2 N-S, de a dos rieles
    expect(s.solids.filter((x) => x.kind === "prism" && x.w === 8 && x.d === 2.4 && x.h === 3).length).toBeGreaterThanOrEqual(12); // vagones
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "gable" && x.mat === "concrete").length).toBeGreaterThanOrEqual(3);
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.r >= 7 && x.sides === 12)).toHaveLength(TANKS.length);
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.mat === "concrete" && x.h === SILOS.h)).toHaveLength(SILOS.cols * SILOS.rows);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 14 && x.w === 1)).toHaveLength(PYLON_N);
    expect(s.solids.filter((x) => x.kind === "prism" && x.d === 0.24).length).toBeGreaterThanOrEqual(2 * (PYLON_N - 2)); // cables
    expect(s.solids.filter((x) => x.kind === "prism" && x.w === 6 && x.d === 2.4 && x.h === 2.6 && x.at.z > 0).length).toBeGreaterThan(20); // contenedores apilados
    const belt = s.solids.filter((x) => x.kind === "cone" && (x.mat === "leaf" || x.mat === "leafDark") && x.at.y >= GREEN_BELT.y0 && x.at.y < GREEN_BELT.y1 && x.at.x < WORLD.x0);
    expect(belt.length).toBeGreaterThanOrEqual(30);
  });

  it("acentos cian y colores del atlas", () => {
    const s = scene();
    expect(s.accents.length).toBeGreaterThanOrEqual(8);
    expect(s.accents.every((a) => a.kind === "dot" && a.color.startsWith("cyan"))).toBe(true);
    const colors = allIsoColors();
    for (const i of buildRenderList([...s.ground, ...s.solids])) expect(colors.has(i.color)).toBe(true);
  });
});

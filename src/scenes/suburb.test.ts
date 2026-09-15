import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { ZONE_SPLIT_Y, worldZoneAt } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { suburbBlocks } from "./sprawl-grid";
import { CHURCH, STADIUM, WATER_TOWER, suburb } from "./suburb";
import { bleedTerrainAt, terrainAt } from "./terrain";
import { WORLD } from "../map/geo";

const SUBURB_MATS: readonly Material[] = ["office", "officeDark", "glass", "paving", "plaza", "stone", "copper", "curtain", "leaf", "leafDark", "steel", "rust"];
const scene = () => suburb(createRng(7));
const groundAt = (x: number, y: number) => (x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1 ? terrainAt(x, y) : bleedTerrainAt(x, y));

describe("suburb", () => {
  it("es determinístico, cae en Resume con materiales del suburbio y dentro del presupuesto", () => {
    expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    const s = scene();
    const raised = s.solids.filter((x) => !isFlat(x));
    expect(raised.length).toBeGreaterThan(400); expect(raised.length).toBeLessThan(1000);
    for (const x of s.solids) {
      const b = bounds(x);
      expect(b.min.y).toBeGreaterThanOrEqual(ZONE_SPLIT_Y);
      expect(worldZoneAt(b.min.x, b.min.y)).toBe("cv");
      expect(SUBURB_MATS).toContain(x.mat);
    }
  });

  it("nada apoya en agua y nada supera 17 (el chapitel de la iglesia es lo más alto)", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (x.kind !== "cone") expect(["water", "river", "sea", "shore", "abyss"]).not.toContain(groundAt(b.min.x, b.min.y));
      expect(b.max.z).toBeLessThanOrEqual(17);
    }
  });

  it("hitos: depósito de agua, estadio con césped y torres de luz, iglesia con chapitel de cobre; avenida y muro de ribera", () => {
    const s = scene();
    const inBlock = (x: Solid, b: { x: number; y: number }) => { const bb = bounds(x); return bb.min.x >= b.x && bb.max.x <= b.x + 24 && bb.min.y >= b.y && bb.max.y <= b.y + 18; };
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "steel" && x.h === 4 && inBlock(x, WATER_TOWER))).toBe(true);
    expect(s.solids.some((x) => x.kind === "poly" && x.mat === "stone" && inBlock(x, STADIUM))).toBe(true);
    expect(s.solids.some((x) => x.kind === "poly" && x.mat === "leafDark" && inBlock(x, STADIUM))).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 12 && x.mat === "steel" && inBlock(x, STADIUM))).toHaveLength(4);
    expect(s.solids.some((x) => x.kind === "cone" && x.mat === "copper" && inBlock(x, CHURCH))).toBe(true);
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "plaza" && x.at.z === -1 && x.d > 200)).toBe(true); // muro de ribera al sur
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "leafDark" && x.h === 0.3 && x.w === 24).length).toBeGreaterThanOrEqual(5); // canteros de la avenida
    expect(suburbBlocks().some((b) => b.x === STADIUM.x && b.y === STADIUM.y)).toBe(true);
  });

  it("mezcla: manzanas densas con fachada, hileras a dos aguas, parques y baldíos; acentos ámbar; colores del atlas", () => {
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "prism" && x.facade).length).toBeGreaterThan(20);
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "gable").length).toBeGreaterThan(200);
    expect(s.ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThan(10);
    expect(s.accents.length).toBeGreaterThan(10);
    expect(s.accents.every((a) => a.color.startsWith("amber"))).toBe(true);
    const colors = allIsoColors();
    for (const i of buildRenderList([...s.ground, ...s.solids])) expect(colors.has(i.color)).toBe(true);
  });
});

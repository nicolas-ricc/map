import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, type Solid } from "../iso/solids";
import { ZONE_SPLIT_X, ZONE_SPLIT_Y, WORLD_H } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { PLAZA, TOWER, blocks, inBlock, inCrater } from "./city-grid";
import { MAX_BUILDING_H, PLINTH_H, TOWER_H, city, type CityScene } from "./city";

const scene = (): CityScene => city(createRng(7));
const all = (s: CityScene): Solid[] => [...s.ground, ...s.solids];
const inRect = (b: { min: { x: number; y: number }; max: { x: number; y: number } }, r: { x: number; y: number; w: number; d: number }) =>
  b.min.x >= r.x - 1e-6 && b.max.x <= r.x + r.w + 1e-6 && b.min.y >= r.y - 1e-6 && b.max.y <= r.y + r.d + 1e-6;
const isTowerPiece = (s: Solid) => { const b = bounds(s); return b.min.x >= TOWER.x - 2 && b.max.x <= TOWER.x + TOWER.w + 2 && b.min.y >= TOWER.y - 2 && b.max.y <= TOWER.y + TOWER.d + 2; };

const CITY_MATS: readonly Material[] = ["office", "officeDark", "glass", "asphalt", "paving", "plaza", "leaf", "leafDark", "water", "steel", "rust"];

describe("city", () => {
  it("es determinística por seed", () => {
    expect(JSON.stringify(city(createRng(7)))).toBe(JSON.stringify(city(createRng(7))));
    expect(JSON.stringify(city(createRng(7)))).not.toBe(JSON.stringify(city(createRng(8))));
  });

  it("todo cae en la zona Resume salvo la selva del cinturón, y usa solo materiales de la ciudad", () => {
    for (const s of all(scene())) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1); expect(b.max.x).toBeLessThanOrEqual(ZONE_SPLIT_X + 1);
      expect(b.max.y).toBeLessThanOrEqual(WORLD_H + 1);
      if (s.kind !== "cone") expect(b.min.y).toBeGreaterThanOrEqual(ZONE_SPLIT_Y - 1);
      expect(CITY_MATS).toContain(s.mat);
      if (s.mat === "steel" || s.mat === "rust") expect(["prism", "cylinder"]).toContain(s.kind); // solo mobiliario y autos
    }
  });

  it("hay un zócalo por manzana construida y los edificios apoyan sobre él", () => {
    const s = scene();
    const plinths = s.solids.filter((x) => x.kind === "prism" && x.mat === "paving" && x.h === PLINTH_H && x.at.z === 0);
    expect(plinths.length).toBeGreaterThanOrEqual(25);
    const buildings = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.facade !== undefined);
    expect(buildings.length).toBeGreaterThanOrEqual(25);
    for (const b of buildings) {
      if (isTowerPiece(b)) continue;
      expect(b.at.z).toBe(PLINTH_H);
      expect(b.h).toBeLessThanOrEqual(MAX_BUILDING_H);
      expect(b.h).toBeGreaterThanOrEqual(4);
      expect(blocks().some((blk) => inRect(bounds(b), blk))).toBe(true); // dentro de una manzana
    }
  });

  it("la torre mide 30 sobre la plaza, tiene fachada 8×4 con el piso 5 encendido, y nada más supera 21", () => {
    const s = scene();
    const tower = s.solids.find((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.h === TOWER_H)!;
    expect(tower).toBeDefined();
    expect(tower.mat).toBe("officeDark");
    expect(tower.facade).toMatchObject({ floors: 8, cols: 4, litFloor: 5, base: "portico" });
    expect(inRect(bounds(tower), PLAZA)).toBe(true);
    expect(s.tower.litWindows.length).toBe(8); // 4 columnas × 2 paredes visibles
    expect(s.tower.litWindows.every((a) => a.kind === "poly" && a.color === "amber")).toBe(true);
    expect(s.tower.antenna.z).toBeGreaterThan(TOWER_H + 5);
    expect(s.tower.paperWindow.x).toBeCloseTo(TOWER.x + TOWER.w, 6); // pared este
    for (const x of s.solids) if (!isTowerPiece(x)) expect(bounds(x).max.z).toBeLessThanOrEqual(21);
  });

  it("frente a la torre ningún edificio supera 10 ni nada llega a 15 (las ventanas encendidas se pintan arriba de todo)", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (!(b.min.y >= 242 && b.min.x >= 96 && b.max.x <= 162)) continue;
      if (x.kind === "prism" && x.facade) expect(x.h).toBeLessThanOrEqual(10);
      expect(b.max.z).toBeLessThanOrEqual(15);
    }
  });

  it("la plaza tiene baldosas rotas y las manzanas devoradas, selva sobre su suelo", () => {
    const s = scene();
    const plaza = s.ground.filter((g) => g.kind === "ground" && g.mat === "plaza");
    expect(plaza).toHaveLength(1);
    const tris = plaza[0]!.kind === "ground" ? plaza[0]!.tris : [];
    expect(tris.length).toBe((PLAZA.w / 6) * (PLAZA.d / 6) * 2);
    expect(tris.some((t) => (t.toneOffset ?? 0) !== 0)).toBe(true);
    expect(s.ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThanOrEqual(3);
  });

  it("ningún cono pisa asfalto fuera de cráteres, manzanas y la ribera; los acentos son ámbar", () => {
    const s = scene();
    for (const c of s.solids) {
      if (c.kind !== "cone") continue;
      const onCity = c.at.x >= 12 && c.at.x < 334 && c.at.y >= 158 && c.at.y < 264 && !(c.at.x > 198 && c.at.x < 270);
      if (onCity) expect(inBlock(c.at.x, c.at.y) || inCrater(c.at.x, c.at.y) || (c.at.y >= 210 && c.at.y <= 214)).toBe(true);
    }
    expect(s.accents.length).toBeGreaterThanOrEqual(6); // umbral temporal: sin boulevard/derrumbe la Task 5 lo vuelve a > 6
    expect(s.accents.every((a) => a.color.startsWith("amber"))).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList(all(s))) expect(colors.has(i.color)).toBe(true);
  });
});

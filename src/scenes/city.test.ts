import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, type Solid } from "../iso/solids";
import { QUAY_X, ZONE_SPLIT_X, ZONE_SPLIT_Y, WORLD_H } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { CRATERS, MALECON, PLAZA, TOWER, blocks, estuaryEast, inBlock, inCrater } from "./city-grid";
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
    expect(s.accents.length).toBeGreaterThan(6);
    expect(s.accents.every((a) => a.color.startsWith("amber"))).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList(all(s))) expect(colors.has(i.color)).toBe(true);
  });

  it("avenida: boulevard, carriles, sendas y semáforos; faroles solo en avenida, puente, plaza y malecón", () => {
    const s = scene();
    const strips = s.ground.filter((g) => g.kind === "strip");
    expect(strips.length).toBeGreaterThan(60);
    expect(strips.every((g) => g.kind === "strip" && g.mat === "paving" && g.z > 0 && g.z < 0.1)).toBe(true);
    // ninguna raya pisa el estuario (el suelo se dibuja encima del agua): el anillo este se corta donde entra el agua
    for (const g of strips) if (g.kind === "strip") for (const p of g.path) expect(p.x <= QUAY_X || p.x > estuaryEast(p.y)).toBe(true);
    const boulevard = s.solids.filter((x) => x.kind === "prism" && x.mat === "leafDark");
    expect(boulevard.length).toBeGreaterThanOrEqual(8);
    expect(boulevard.every((x) => bounds(x).min.y >= 210 && bounds(x).max.y <= 214)).toBe(true);
    const lamps = s.accents.filter((a) => a.kind === "dot" && a.color === "amber");
    expect(lamps.length).toBeGreaterThanOrEqual(20);
    for (const l of lamps) {
      if (l.kind !== "dot") continue;
      const onAvenue = l.at.y >= 203 && l.at.y <= 221, onMalecon = l.at.x >= 334, onPlaza = inRect({ min: l.at, max: l.at }, PLAZA);
      expect(onAvenue || onMalecon || onPlaza).toBe(true);
    }
  });

  it("puente: tablero sobre el agua de muelle a anillo, pilotes hasta el fondo, rampas en las cabeceras", () => {
    const s = scene();
    const deck = s.solids.find((x) => x.kind === "prism" && x.mat === "asphalt" && x.w > 60)!;
    expect(deck.kind === "prism" && deck.at.x).toBe(192);
    expect(deck.kind === "prism" && deck.at.x + deck.w).toBe(276);
    expect(deck.kind === "prism" && deck.at.z).toBe(1.2);
    const piers = s.solids.filter((x) => x.kind === "prism" && x.mat === "plaza" && x.at.z === -1 && x.at.y === 207);
    expect(piers).toHaveLength(4);
    const ramps = s.solids.filter((x) => x.kind === "ramp" && x.mat === "asphalt" && x.at.y === 207);
    expect(ramps.map((r) => r.kind === "ramp" && r.dir).sort()).toEqual(["e", "w"]);
  });

  it("muelle oeste y malecón: muros desde el agua, parapeto, escaleras dentro de la zona", () => {
    const s = scene();
    const walls = s.solids.filter((x) => x.kind === "prism" && x.at.z === -1 && x.d > 30);
    expect(walls.length).toBeGreaterThanOrEqual(4); // dos tramos por lado
    expect(walls.some((x) => x.kind === "prism" && x.mat === "plaza" && x.at.x === 192)).toBe(true);
    expect(walls.some((x) => x.kind === "prism" && x.mat === "paving" && x.at.x === 334)).toBe(true);
    const parapet = s.solids.filter((x) => x.kind === "prism" && x.at.x >= 342 && x.h === 0.8);
    expect(parapet.length).toBeGreaterThanOrEqual(2);
    const stairs = s.solids.filter((x) => x.kind === "ramp" && x.at.z === -1);
    expect(stairs.length).toBeGreaterThanOrEqual(2);
    for (const st of stairs) expect(bounds(st).max.x).toBeLessThanOrEqual(ZONE_SPLIT_X);
  });

  it("derrumbe: rampa al agua, bloques hundidos y el cuarto caído en la calle frente al malecón", () => {
    const s = scene();
    const sunk = s.solids.filter((x) => x.kind === "prism" && x.mat === "officeDark" && x.at.z < 0);
    expect(sunk.length).toBeGreaterThanOrEqual(3);
    for (const b of sunk) expect(b.kind === "prism" && b.at.y).toBeGreaterThanOrEqual(240);
    // el cuarto bloque, caído en la calle frente al malecón (la spec lo pide; el mar frente al malecón ya es zona Blog)
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "officeDark" && x.at.z === 0 && x.h <= 1 && x.at.x >= MALECON.x0 - 10 && x.at.x + x.w <= MALECON.x0)).toBe(true);
    expect(s.solids.some((x) => x.kind === "ramp" && x.mat === "asphalt" && x.dir === "w" && x.at.y === 242)).toBe(true);
  });

  it("autos: no caen en manzana ni cráter, y ninguno se superpone con otro", () => {
    const s = scene();
    const cars = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && (x.mat === "steel" || x.mat === "rust") && x.h === 1.2);
    expect(cars.length).toBeGreaterThanOrEqual(20);
    for (const c of cars) {
      expect(inBlock(c.at.x + 1.5, c.at.y + 0.75)).toBe(false);
      expect(inCrater(c.at.x + 1.5, c.at.y + 0.75)).toBe(false);
    }
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i]!, b = cars[j]!;
      const overlap = a.at.x < b.at.x + b.w && a.at.x + a.w > b.at.x && a.at.y < b.at.y + b.d && a.at.y + a.d > b.at.y;
      expect(overlap).toBe(false);
    }
  });

  it("selva: cinturón norte, bordes oeste y sur, ribera este y cráteres, más de 60 conos", () => {
    const s = scene();
    const cones = s.solids.filter((x) => x.kind === "cone" && (x.mat === "leaf" || x.mat === "leafDark"));
    expect(cones.length).toBeGreaterThan(60);
    expect(cones.some((c) => c.kind === "cone" && c.at.y < 158)).toBe(true);           // cinturón
    expect(cones.some((c) => c.kind === "cone" && c.at.x < 12)).toBe(true);            // borde oeste
    expect(cones.some((c) => c.kind === "cone" && c.at.x > 198 && c.at.x < 270)).toBe(true); // ribera este
    for (const cr of CRATERS) expect(cones.some((c) => c.kind === "cone" && inCrater(c.at.x, c.at.y) && Math.hypot(c.at.x - cr.x, c.at.y - cr.y) <= cr.r)).toBe(true);
  });
});

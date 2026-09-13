import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, type Solid } from "../iso/solids";
import { allIsoColors } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { AREA_H, AREA_W, QUAY_X, STREET_EDGE, shipyard, type Scene } from "./shipyard";

const scene = (): Scene => shipyard(createRng(7));
const all = (s: Scene): Solid[] => [...s.ground, ...s.water, ...s.solids, s.trolley];

describe("shipyard", () => {
  it("es determinística por seed", () => {
    expect(JSON.stringify(shipyard(createRng(7)))).toBe(JSON.stringify(shipyard(createRng(7))));
    expect(JSON.stringify(shipyard(createRng(7)))).not.toBe(JSON.stringify(shipyard(createRng(8))));
  });

  it("todo cae dentro del área", () => {
    for (const s of all(scene())) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1);
      expect(b.min.y).toBeGreaterThanOrEqual(-1);
      expect(b.max.x).toBeLessThanOrEqual(AREA_W + 1);
      expect(b.max.y).toBeLessThanOrEqual(AREA_H + 1);
    }
  });

  it("el agua es un solo suelo, hundido, con offset de tono en cero", () => {
    const s = scene();
    expect(s.water).toHaveLength(1);
    const w = s.water[0]!;
    expect(w.kind).toBe("ground");
    if (w.kind !== "ground") return;
    expect(w.tris.length).toBeGreaterThan(200);
    expect(w.tris.every((t) => t.pts.every((p) => p.z === -1) && (t.toneOffset ?? 0) === 0)).toBe(true);
    expect(w.tris.every((t) => t.pts.every((p) => p.x >= QUAY_X))).toBe(true);
  });

  it("hay naves a dos aguas, gradas en rampa, un casco, cuadernas y una grúa", () => {
    const s = scene();
    const kinds = (k: Solid["kind"]) => s.solids.filter((x) => x.kind === k);
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "gable").length).toBeGreaterThanOrEqual(2);
    expect(kinds("ramp")).toHaveLength(2);
    expect(kinds("hull").length).toBeGreaterThanOrEqual(1);
    expect(s.weldSpots.length).toBeGreaterThan(10);
    const tall = s.solids.filter((x) => bounds(x).max.z >= 24);
    expect(tall.length).toBeGreaterThanOrEqual(3); // dos patas y la viga
  });

  it("el carro está sobre la viga y su rango cabe entre las gradas", () => {
    const s = scene();
    expect(s.trolley.at.z).toBeGreaterThanOrEqual(24);
    expect(s.trolleyRange[0]).toBeLessThan(s.trolleyRange[1]);
    expect(s.trolley.at.y).toBe(s.trolleyRange[0]);
  });

  it("los acentos son cian y están a la altura de las paredes", () => {
    const s = scene();
    expect(s.accents.length).toBeGreaterThan(8);
    expect(s.accents.every((a) => a.color.startsWith("cyan") && a.at.z > 0)).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList(all(s))) expect(colors.has(i.color)).toBe(true);
  });
});

describe("shipyard parte 2", () => {
  it("dique seco: pozo con paredes, compuerta y un casco hundido", () => {
    const s = scene();
    const sunk = s.solids.filter((x) => bounds(x).min.z <= -5);
    expect(sunk.length).toBeGreaterThanOrEqual(6); // 4 paredes + compuerta + casco
    expect(sunk.some((x) => x.kind === "hull")).toBe(true);
    expect(s.ground.some((g) => g.kind === "ground" && g.tris.length > 0 && g.tris.every((t) => t.pts.every((p) => p.z === -6)))).toBe(true);
  });

  it("patio de material: tanques cilíndricos y pilas apiladas", () => {
    const s = scene();
    const tanks = s.solids.filter((x) => x.kind === "cylinder" && x.r >= 4);
    expect(tanks.length).toBeGreaterThanOrEqual(3); // dos en el patio, uno en alistamiento
    const stacked = s.solids.filter((x) => x.kind === "prism" && x.at.z > 0 && x.at.z < 3 && x.h <= 1);
    expect(stacked.length).toBeGreaterThanOrEqual(5);
  });

  it("talleres con techo escalonado y unidades en el techo, autos en la playa", () => {
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "step").length).toBeGreaterThanOrEqual(2);
    const hvac = s.solids.filter((x) => x.kind === "prism" && x.at.z === 7 && x.h === 1);
    expect(hvac.length).toBeGreaterThanOrEqual(4);
    const cars = s.solids.filter((x) => x.kind === "prism" && x.h === 1.5 && x.w === 3);
    expect(cars.length).toBeGreaterThanOrEqual(3);
  });

  it("selva: conos en el SO y en la franja este, nunca sobre la losa", () => {
    const s = scene();
    const cones = s.solids.filter((x): x is Solid & { kind: "cone" } => x.kind === "cone" && (x.mat === "leaf" || x.mat === "leafDark"));
    expect(cones.length).toBeGreaterThanOrEqual(20);
    for (const c of cones) expect(c.at.x < 42 || c.at.x > 300).toBe(true);
  });

  it("muelle de alistamiento: galpones a dos aguas al este del río y escollera", () => {
    const s = scene();
    const sheds = s.solids.filter((x) => x.kind === "prism" && x.roof === "gable" && x.at.x > 300);
    expect(sheds).toHaveLength(2);
    const rocks = s.solids.filter((x) => x.kind === "cone" && x.mat === "rock");
    expect(rocks.length).toBeGreaterThan(30);
  });

  it("faroles: poste de acero con luz cian encima", () => {
    const s = scene();
    const poles = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.w === 0.6 && x.h === 5 && x.at.x > STREET_EDGE && x.at.x < STREET_EDGE + 2);
    expect(poles.length).toBeGreaterThanOrEqual(5);
    for (const p of poles) expect(s.accents.some((a) => Math.abs(a.at.x - p.at.x) < 1 && Math.abs(a.at.y - p.at.y) < 1 && a.at.z === 5)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { ZONE_SPLIT_X, inHeadland, worldZoneAt } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { BUOYS, KEEPER, LIGHTHOUSE, WRECK, WRECK_BUOY, sea, type SeaScene } from "./sea";
import { headlandZ, terrainAt } from "./terrain";

const scene = (): SeaScene => sea(createRng(7));
const SEA_MATS: readonly Material[] = ["rock", "whitewash", "rust", "steel", "glass", "hull", "foam", "leaf", "leafDark"];
const water = new Set(["water", "sea", "shore", "abyss", "reef"]);

describe("sea", () => {
  it("es determinística, trae ≥ 80 sólidos elevados y usa solo materiales del Blog o compartidos", () => {
    expect(JSON.stringify(sea(createRng(7)))).toBe(JSON.stringify(sea(createRng(7))));
    const s = scene();
    expect(s.solids.filter((x) => !isFlat(x)).length).toBeGreaterThanOrEqual(80);
    for (const x of [...s.ground, ...s.solids]) { expect(SEA_MATS).toContain(x.mat); expect(bounds(x).min.x).toBeGreaterThanOrEqual(330); }
  });

  it("faro: seis tambores alternados, galería con ocho postes, linterna de vidrio y cono; ≈ 29.6 sobre la roca", () => {
    const s = scene();
    const drums = s.solids.filter((x) => x.kind === "cylinder" && x.h === 4 && Math.abs(x.at.x - LIGHTHOUSE.x) < 0.01);
    expect(drums).toHaveLength(6);
    expect(drums.map((d) => d.mat)).toEqual(["whitewash", "rust", "whitewash", "rust", "whitewash", "rust"]);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 1.2 && x.w === 0.3)).toHaveLength(8);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "glass" && x.h === 3)).toBe(true);
    const top = Math.max(...s.solids.filter((x) => Math.abs(bounds(x).min.x - (LIGHTHOUSE.x - 3.2)) < 4 && Math.abs(bounds(x).min.y - (LIGHTHOUSE.y - 3.2)) < 4).map((x) => bounds(x).max.z));
    expect(top - LIGHTHOUSE.z).toBeCloseTo(29.6, 1);
    expect(s.lantern.z).toBeCloseTo(LIGHTHOUSE.z + 24 + 0.6 + 1.5, 6);
    expect(worldZoneAt(LIGHTHOUSE.x, LIGHTHOUSE.y)).toBe("portfolio"); // el faro clickea Portfolio
  });

  it("casa del farero, sendero de roca escalonado sobre la punta, afloramientos, pedruscos y arrecife", () => {
    const s = scene();
    const house = s.solids.find((x) => x.kind === "prism" && x.mat === "whitewash" && x.roof === "gable") as Extract<Solid, { kind: "prism" }>;
    expect(house.at).toMatchObject({ x: KEEPER.x, y: KEEPER.y });
    expect(house.at.z).toBeCloseTo(headlandZ(KEEPER.x + 4), 6);
    const path = s.ground.filter((x) => x.kind === "strip" && x.mat === "rock");
    expect(path).toHaveLength(10);
    for (const p of path) if (p.kind === "strip") for (const q of p.path) expect(inHeadland(q.x, q.y)).toBe(true);
    expect(path.map((p) => p.kind === "strip" && p.z)).toEqual([...path].map((p) => p.kind === "strip" && p.z).sort((a, b) => Number(a) - Number(b))); // sube hacia el faro
    expect(s.solids.filter((x) => x.kind === "poly" && x.mat === "rock")).toHaveLength(6);
    const reef = s.solids.filter((x) => x.kind === "cone" && x.mat === "rock" && x.h === 1) as Extract<Solid, { kind: "cone" }>[];
    expect(reef.length).toBeGreaterThanOrEqual(30); expect(reef.length).toBeLessThanOrEqual(40);
    for (const c of reef) expect(terrainAt(c.at.x, c.at.y)).toBe("reef");
    expect(s.solids.filter((x) => x.kind === "cone" && x.mat === "rock" && x.h === 1.5)).toHaveLength(20); // pedruscos sobre la punta
  });

  it("boyas y pecio sobre el agua; la boya del pecio tiene luz fija y anillo de espuma", () => {
    const s = scene();
    for (const b of BUOYS) expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "rust" && x.at.x === b.x && x.at.y === b.y && x.at.z === -1)).toBe(true);
    expect(s.buoys).toHaveLength(2);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "steel" && x.at.x === WRECK_BUOY.x)).toBe(true);
    expect(s.accents).toEqual([{ kind: "poly", pts: expect.any(Array), color: "magentaBleed", alpha: expect.any(Number) }, { kind: "dot", at: { x: WRECK_BUOY.x, y: WRECK_BUOY.y, z: 1 }, r: 1, color: "magentaMid" }]);
    expect(s.ground.some((g) => g.kind === "ground" && g.mat === "foam" && g.tris.length === 8)).toBe(true);
    const wreck = s.solids.find((x) => x.kind === "hull")!;
    expect(wreck.kind === "hull" && wreck.heading).toBe(WRECK.heading);
    expect(wreck.at).toEqual({ x: WRECK.x, y: WRECK.y, z: -3 });
    for (const x of s.solids) if (x.kind === "cylinder" || x.kind === "hull") if (bounds(x).min.x > ZONE_SPLIT_X + 60) expect(water.has(terrainAt(x.at.x, x.at.y))).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList([...s.ground, ...s.solids])) expect(colors.has(i.color)).toBe(true);
  });
});

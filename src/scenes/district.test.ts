import { describe, expect, it } from "vitest";
import { screenBounds, overlaps, isBehind } from "../iso/depth";
import { v3 } from "../iso/geometry";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { buildRenderList } from "../iso/render-list";
import { DISTRICT_COLS, DISTRICT_ROWS, LIT_FLOOR, SITE, TOWER, TOWER_FLOORS, TOWER_H, blocks, type Block } from "./city-grid";
import { PLINTH_H } from "./city-pieces";
import { MAX_DISTRICT_H, districtBlock, maxDistrictHeight } from "./district";

const DISTRICT: Block[] = blocks().filter((b) => b.kind === "district" || b.kind === "site");
const inRect = (s: Solid, r: { x: number; y: number; w: number; d: number }) => { const b = bounds(s); return b.min.x >= r.x - 1 && b.max.x <= r.x + r.w + 1 && b.min.y >= r.y - 1 && b.max.y <= r.y + r.d + 1; };
const DISTRICT_MATS: readonly Material[] = ["paving", "curtain", "stone", "copper", "office", "officeDark", "glass", "leaf", "leafDark", "steel", "rust"];

function build() {
  const solids: Solid[] = [], ground: Solid[] = [], accents = [] as Parameters<typeof districtBlock>[2];
  const rng = createRng(7);
  for (const b of DISTRICT) districtBlock(solids, ground, accents, rng, b, maxDistrictHeight(b));
  return { solids, ground, accents };
}

describe("district", () => {
  it("es determinístico y toda pieza cae en su manzana con materiales del distrito", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
    const { solids, ground } = build();
    for (const s of [...solids, ...ground]) {
      expect(DISTRICT.some((b) => inRect(s, b))).toBe(true);
      expect(DISTRICT_MATS).toContain(s.mat);
    }
  });

  it("mezcla: ≥ 4 torres de vidrio en cuerpos, ≥ 2 clásicos de piedra, ≥ 2 campus con patio verde y una obra con grúa", () => {
    const { solids, ground } = build();
    const curtain = solids.filter((s): s is Solid & { kind: "prism" } => s.kind === "prism" && s.mat === "curtain" && !!s.facade);
    expect(curtain.filter((s) => s.at.z === PLINTH_H).length).toBeGreaterThanOrEqual(4); // un cuerpo base por torre: por lo menos 4 torres
    expect(curtain.every((s) => s.kind === "prism" && s.facade!.window?.w === 0.85)).toBe(true);
    expect(solids.filter((s) => s.kind === "prism" && s.mat === "stone" && s.facade).length).toBeGreaterThanOrEqual(2);
    expect(ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThanOrEqual(2); // patios
    expect(solids.some((s) => s.kind === "prism" && s.h === 22 && s.w === 1.2 && inRect(s, SITE))).toBe(true);   // mástil de la obra
    expect(solids.filter((s) => s.kind === "prism" && s.mat === "paving" && s.h === 0.3 && s.at.z > 1 && inRect(s, SITE)).length).toBe(5); // losas
  });

  it("alturas: edificios ≤ 24, remates ≤ 28, y nada delante del piso encendido supera 10", () => {
    const { solids } = build();
    const lit = { min: v3(TOWER.x, TOWER.y, LIT_FLOOR * (TOWER_H / TOWER_FLOORS)), max: v3(TOWER.x + TOWER.w, TOWER.y + TOWER.d, (LIT_FLOOR + 1) * (TOWER_H / TOWER_FLOORS)) };
    for (const s of solids) {
      const b = bounds(s);
      if (s.kind === "prism" && s.facade) expect(s.h).toBeLessThanOrEqual(MAX_DISTRICT_H);
      expect(b.max.z).toBeLessThanOrEqual(28); // 0.3 + 24 + 3 losas de 0.3 + terraza 0.3 + cono 2 = 27.5, con margen para la suma en coma flotante
      if (s.kind === "prism" && s.facade && overlaps(screenBounds(b), screenBounds(lit)) && isBehind(lit, b)) expect(s.h).toBeLessThanOrEqual(10);
    }
    expect(maxDistrictHeight({ x: TOWER.x + 20, y: TOWER.y + 20, w: 24, d: 18 })).toBe(10); // una manzana que en pantalla pisa el piso encendido y queda delante
    expect(maxDistrictHeight(SITE)).toBe(MAX_DISTRICT_H);
  });

  it("acentos ámbar y colores del atlas", () => {
    const { solids, ground, accents } = build();
    expect(accents.length).toBeGreaterThan(6);
    expect(accents.every((a) => a.color.startsWith("amber"))).toBe(true);
    const colors = allIsoColors();
    for (const i of buildRenderList([...ground, ...solids])) expect(colors.has(i.color)).toBe(true);
    expect(solids.filter((s) => !isFlat(s)).length).toBeGreaterThan(150);
  });
});

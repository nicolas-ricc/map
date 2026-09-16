import { describe, expect, it } from "vitest";
import { BLEED, CELL, QUAY_X, RIVER_HALF, WORLD, ZONE_SPLIT_X, coverQuad, inCoverQuad, pointInPolygon, riverCenter } from "../map/geo";
import { CITY_EDGE, estuaryEast } from "./city-grid";
import { GREEN_BELT, REACH, bayShoreX, builtAt, fairAt, reachAt, suburbBlocks, urbanAt } from "./sprawl-grid";
import { bleedTerrainAt, bleedZ, terrainAt } from "./terrain";

describe("sprawl-grid", () => {
  it("el alcance ondula entre REACH y REACH + 36 y nunca es recto", () => {
    const xs = Array.from({ length: 40 }, (_, i) => reachAt("s", -300 + i * 20));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(REACH.s); expect(Math.max(...xs)).toBeLessThanOrEqual(REACH.s + 36);
    expect(new Set(xs.map((v) => Math.round(v))).size).toBeGreaterThan(10);
  });

  it("builtAt: industrial al norte y oeste de Portfolio, urbano al oeste y sur de Resume, nada sobre agua ni en el cinturón verde", () => {
    expect(builtAt(-100, 0)).toBe("industrial");
    expect(builtAt(100, -100)).toBe("industrial");
    expect(builtAt(-100, 250)).toBe("urban");
    expect(builtAt(100, 500)).toBe("urban");
    expect(builtAt(-100, (GREEN_BELT.y0 + GREEN_BELT.y1) / 2)).toBeNull();
    expect(builtAt(250, 400)).toBeNull();          // estuario
    expect(builtAt(400, -100)).toBeNull();         // bahía
    expect(builtAt(400, 400)).toBeNull();          // mar
    expect(builtAt(100, 100)).toBeNull();          // contenido
    expect(builtAt(-400, 100)).toBeNull();         // más allá del alcance: loma
    expect(builtAt(150, -264)).toBe("fair");
    expect(builtAt(100, -220)).toBe("fair");
    expect(builtAt(40, -264)).toBe("industrial");   // al oeste de la feria
    expect(builtAt(150, -330)).toBe("industrial");  // al norte de la feria
    expect(builtAt(150, -400)).toBeNull();          // más allá del alcance nuevo
    expect(builtAt(240, -300)).toBeNull();          // bahía
    expect(fairAt(150, -264)).toBe(true); expect(fairAt(150, -100)).toBe(false);
    expect(bayShoreX(-300)).toBe(riverCenter(-300) - RIVER_HALF);
  });

  it("urbanAt cubre los bordes de la ciudad que pasaron a asfalto y el sangrado urbano", () => {
    expect(urbanAt(-57, 200)).toBe(true);
    expect(urbanAt(100, 330)).toBe(true);
    expect(urbanAt(-100, 200)).toBe(true);
    expect(urbanAt(100, 200)).toBe(false);  // ciudad vieja
    expect(urbanAt(-57, 150)).toBe(false);  // cinturón de costura
    expect(urbanAt(250, 400)).toBe(false);  // estuario
  });

  it("las manzanas del distrito tecnológico caen enteras en suelo urbano dentro del cover, y son más de 100", () => {
    const blocks = suburbBlocks();
    expect(blocks.length).toBeGreaterThan(100);
    for (const b of blocks) {
      for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.d], [b.x, b.y + b.d]] as const) expect(urbanAt(x, y)).toBe(true);
      expect(inCoverQuad(b.x + b.w / 2, b.y + b.d / 2, 16 / 9, 30)).toBe(true);
      expect(b.x + b.w).toBeLessThanOrEqual(QUAY_X - 6); // nunca pisan el muro de la ribera
      expect(b.dist).toBeGreaterThanOrEqual(0);
    }
    expect(blocks.some((b) => b.dist === 0)).toBe(true);
    expect(blocks.some((b) => b.dist > 160)).toBe(true);
  });

  it("dentro del cover 16:9 la selva (con roca) es a lo sumo el 7 % del sangrado y el 6 % del total", () => {
    const quad = coverQuad(16 / 9).flat();
    let bleed = 0, bleedGreen = 0, all = 0, allGreen = 0;
    for (let y = WORLD.y0 - BLEED.y + 3; y < WORLD.y1 + BLEED.y; y += CELL) for (let x = WORLD.x0 - BLEED.x + 3; x < WORLD.x1 + BLEED.x; x += CELL) {
      if (!pointInPolygon(x, y, quad)) continue;
      const inside = x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1;
      const green = inside ? terrainAt(x, y) === "jungle" : bleedTerrainAt(x, y) === "jungle";
      all++; if (green) allGreen++;
      if (!inside) { bleed++; if (green) bleedGreen++; }
    }
    expect(bleedGreen / bleed).toBeLessThan(0.07);
    expect(allGreen / all).toBeLessThan(0.06);
  });

  it("el estuario sigue al sur hasta el mar y el terreno del sangrado es plano donde está construido", () => {
    for (let y = WORLD.y1 + 3; y < 460; y += CELL) expect(bleedTerrainAt(QUAY_X + 10, y)).toBe("river");
    expect(estuaryEast(460)).toBeGreaterThan(ZONE_SPLIT_X);
    for (let y = WORLD.y1 + 3; y < WORLD.y1 + REACH.s; y += CELL) for (let x = -200; x < QUAY_X; x += CELL) if (builtAt(x, y)) expect(bleedZ(x, y)).toBe(0.6);
    expect(terrainAt(CITY_EDGE.west - 3, 200)).toBe("asphalt");
  });
});

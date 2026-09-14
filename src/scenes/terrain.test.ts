import { describe, expect, it } from "vitest";
import { MOUTH_Y, WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y } from "../map/geo";
import { createRng } from "../map/seed";
import type { Solid, Tri } from "../iso/solids";
import { QUAY_X } from "./shipyard";
import { CELL, buildTerrain, seaTerrainAt, shipyardTerrainAt, terrainAt } from "./terrain";

const tris = (s: Solid): Tri[] => (s.kind === "ground" ? s.tris : []);
// La fila de vértices más cercana a ZONE_SPLIT_Y = 146 es y = 144: la comparten la última fila de celdas del astillero (centro 141) y la primera de la ciudad (centro 147).
const SEAM_Y = Math.floor(ZONE_SPLIT_Y / CELL) * CELL;
const allTris = (m: ReturnType<typeof buildTerrain>): Tri[] => [...m.ground, m.river, m.sea, m.shore].flatMap(tris);

describe("clasificación", () => {
  it("astillero: losa al oeste del muelle, río, desembocadura y selva en los bordes", () => {
    expect(shipyardTerrainAt(50, 50)).toBe("slab");
    expect(shipyardTerrainAt(QUAY_X + 20, 60)).toBe("water");
    expect(shipyardTerrainAt(300, 10)).toBe("water");     // bahía
    expect(shipyardTerrainAt(300, MOUTH_Y + 2)).toBe("east");
    expect(shipyardTerrainAt(10, 144)).toBe("jungle");
    expect(shipyardTerrainAt(150, 20)).toBe("dock");
  });
  it("mar: punta, arrecife, orilla y mar abierto", () => {
    expect(terrainAt(380, 118)).toBe("headland");
    expect(terrainAt(336, 115)).toBe("headland");          // la base de la punta gana en la zona del astillero
    expect(seaTerrainAt(404, 118)).toBe("reef");
    expect(seaTerrainAt(350, 60)).toBe("shore");           // pegado a la costa del astillero
    expect(seaTerrainAt(500, 200)).toBe("sea");
    expect(seaTerrainAt(350, 10)).toBe("shore");           // frente a la bahía hay bajío
    expect(seaTerrainAt(370, 10)).toBe("sea");
  });
  it("ciudad: cinturón de selva junto al astillero, río y pavimento", () => {
    expect(terrainAt(50, ZONE_SPLIT_Y + 4)).toBe("jungle");
    expect(terrainAt(50, 200)).toBe("paving");
    expect(terrainAt(255, 200)).toBe("water");
  });
  it("el agua es continua en la costura y el estuario no llega al límite con Blog", () => {
    // la última fila de celdas del astillero (centro 141) y la primera de la ciudad (centro 147) mojan las mismas columnas
    const waterX = (y: number) => { const xs: number[] = []; for (let x = 3; x < ZONE_SPLIT_X; x += CELL) if (terrainAt(x, y) === "water") xs.push(x); return xs; };
    const north = waterX(141), south = waterX(147);
    expect(north.length).toBeGreaterThan(3);
    expect(south[0]).toBe(north[0]);
    expect(Math.abs(south[south.length - 1]! - north[north.length - 1]!)).toBeLessThanOrEqual(CELL);
    // al sur del todo el estuario sigue dejando tierra antes de x = 344
    expect(terrainAt(ZONE_SPLIT_X - 3, WORLD_H - 3)).not.toBe("water");
  });
});

describe("buildTerrain", () => {
  it("una sola malla determinística que cubre el mundo", () => {
    const a = buildTerrain(createRng(7)), b = buildTerrain(createRng(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const t = allTris(a);
    expect(t.length).toBeGreaterThan(2 * (WORLD_W / CELL) * (WORLD_H / CELL) * 0.9);
    for (const tri of t) for (const p of tri.pts) {
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(WORLD_W);
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(WORLD_H);
    }
  });
  it("agua plana a z = -1: río (con la bahía), mar y orilla, en sólidos separados", () => {
    const m = buildTerrain(createRng(7));
    expect(m.river.kind === "ground" && m.river.mat).toBe("water");
    expect(m.sea.kind === "ground" && m.sea.mat).toBe("waterDeep");
    expect(m.shore.kind === "ground" && m.shore.mat).toBe("water");
    for (const s of [m.river, m.sea, m.shore]) expect(tris(s).every((t) => t.pts.every((p) => p.z === -1) && (t.toneOffset ?? 0) === 0)).toBe(true);
    expect(tris(m.river).length).toBeGreaterThan(200);
    expect(tris(m.river).some((t) => t.pts.every((p) => p.y < MOUTH_Y && p.x > 300))).toBe(true); // la bahía es río
    expect(tris(m.sea).length).toBeGreaterThan(600);
    // el canal del astillero nunca cruza al oeste del muelle: ninguna celda de agua del río tiene vértices en x < QUAY_X
    expect(tris(m.river).filter((t) => t.pts.every((p) => p.y < ZONE_SPLIT_Y)).every((t) => t.pts.every((p) => p.x >= QUAY_X))).toBe(true);
  });
  it("la punta está alta y cae al mar; el dique seco no tiene suelo (lo pone la escena)", () => {
    const m = buildTerrain(createRng(7));
    const rock = m.ground.filter((g) => g.kind === "ground" && g.mat === "rock").flatMap(tris);
    const high = rock.filter((t) => t.pts.every((p) => p.z >= 4));
    expect(high.length).toBeGreaterThan(20);
    // la base de la punta (x < 340) es baja: nada alto junto a los galpones del muelle
    const base = rock.filter((t) => t.pts.every((p) => p.x <= 340 && p.y > 96 && p.y < 136));
    expect(base.length).toBeGreaterThan(0);
    expect(base.every((t) => t.pts.every((p) => p.z < 4))).toBe(true);
    const inDock = allTris(m).filter((t) => t.pts.every((p) => p.x > 122 && p.x < 190 && p.y > 8 && p.y < 28));
    expect(inDock).toEqual([]);
  });
  it("filtrar por zona conserva las alturas en la costura", () => {
    const p = buildTerrain(createRng(7), ["portfolio"]), c = buildTerrain(createRng(7), ["cv"]);
    const onSeam = (m: ReturnType<typeof buildTerrain>) => new Map(allTris(m).flatMap((t) => t.pts).filter((v) => v.y === SEAM_Y).map((v) => [`${v.x},${v.y}`, v.z]));
    const a = onSeam(p), b = onSeam(c);
    expect(a.size).toBeGreaterThan(10);
    expect([...a.keys()].filter((k) => b.has(k)).length).toBeGreaterThan(10);
    for (const [k, z] of a) if (b.has(k)) expect(b.get(k)).toBe(z);
    expect(allTris(p).every((t) => t.pts.every((v) => v.y <= ZONE_SPLIT_Y + CELL))).toBe(true);
  });
});

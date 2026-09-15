import { describe, expect, it } from "vitest";
import { BLEED, MOUTH_Y, QUAY_X, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, worldZoneAt } from "../map/geo";
import { createRng } from "../map/seed";
import type { Solid, Tri } from "../iso/solids";
import { CELL, bleedTerrainAt, bleedZ, buildTerrain, seaTerrainAt, shipyardTerrainAt, terrainAt } from "./terrain";

const tris = (s: Solid): Tri[] => (s.kind === "ground" ? s.tris : []);
// La fila de vértices más cercana a ZONE_SPLIT_Y = 146 es y = 144: la comparten la última fila de celdas del astillero (centro 141) y la primera de la ciudad (centro 147).
const SEAM_Y = Math.floor(ZONE_SPLIT_Y / CELL) * CELL;
const allTris = (m: ReturnType<typeof buildTerrain>): Tri[] => [...m.ground, m.river, m.sea, m.shore, m.abyss].flatMap(tris);

describe("clasificación", () => {
  it("astillero: losa al oeste del muelle, río, desembocadura y selva en los bordes", () => {
    expect(shipyardTerrainAt(50, 50)).toBe("slab");
    expect(shipyardTerrainAt(QUAY_X + 20, 60)).toBe("water");
    expect(shipyardTerrainAt(300, 10)).toBe("water");     // bahía
    expect(shipyardTerrainAt(300, MOUTH_Y + 2)).toBe("east");
    expect(shipyardTerrainAt(10, 144)).toBe("jungle");
    expect(shipyardTerrainAt(150, 20)).toBe("dock");
    expect(shipyardTerrainAt(-30, 50)).toBe("slab");     // playa de vías
    expect(shipyardTerrainAt(-30, 130)).toBe("jungle");
    expect(shipyardTerrainAt(50, -30)).toBe("slab");     // banda de la fábrica
    expect(shipyardTerrainAt(300, -30)).toBe("water");   // la bahía sigue al norte
  });
  it("mar: punta, arrecife, orilla y mar abierto", () => {
    expect(terrainAt(380, 118)).toBe("headland");
    expect(terrainAt(336, 115)).toBe("headland");          // la base de la punta gana en la zona del astillero
    expect(seaTerrainAt(404, 118)).toBe("reef");
    expect(seaTerrainAt(350, 60)).toBe("shore");           // pegado a la costa del astillero
    expect(seaTerrainAt(400, 200)).toBe("sea");
    expect(seaTerrainAt(350, 10)).toBe("shore");           // frente a la bahía hay bajío
    expect(seaTerrainAt(370, 10)).toBe("sea");
    expect(seaTerrainAt(500, 200)).toBe("abyss");
    expect(seaTerrainAt(410, 60)).toBe("sea");
    expect(terrainAt(ZONE_SPLIT_X + 2, 200)).toBe("shore"); // clickea Resume pero es orilla
  });
  it("ciudad: cinturón de selva, estuario, ribera este de selva, cráteres y asfalto", () => {
    expect(terrainAt(50, ZONE_SPLIT_Y + 4)).toBe("jungle");   // cinturón
    expect(terrainAt(5, 200)).toBe("jungle");                  // borde oeste
    expect(terrainAt(100, 268)).toBe("jungle");                // borde sur
    expect(terrainAt(255, 200)).toBe("water");                 // estuario
    expect(terrainAt(268, 200)).toBe("jungle");                // ribera este, antes del anillo
    expect(terrainAt(290, 200)).toBe("asphalt");               // ciudad del este
    expect(terrainAt(60, 185)).toBe("jungle");                 // cráter
    expect(terrainAt(50, 200)).toBe("asphalt");
    expect(terrainAt(340, 200)).toBe("asphalt");               // bajo el malecón
    expect(terrainAt(ZONE_SPLIT_X, 200)).toBe("shore");        // la costura este sigue siendo mar
  });
  it("en la zona cv solo hay asfalto, selva y agua", () => {
    const seen = new Set<string>();
    for (let y = ZONE_SPLIT_Y + 3; y < WORLD.y1; y += CELL) for (let x = WORLD.x0 + 3; x < ZONE_SPLIT_X; x += CELL) seen.add(terrainAt(x, y));
    expect([...seen].sort()).toEqual(["asphalt", "jungle", "water"]);
  });
  it("el agua es continua en la costura y el estuario no llega al límite con Blog", () => {
    // la última fila de celdas del astillero (centro 141) y la primera de la ciudad (centro 147) mojan las mismas columnas
    const waterX = (y: number) => { const xs: number[] = []; for (let x = 3; x < ZONE_SPLIT_X; x += CELL) if (terrainAt(x, y) === "water") xs.push(x); return xs; };
    const north = waterX(141), south = waterX(147);
    expect(north.length).toBeGreaterThan(3);
    expect(south[0]).toBe(north[0]);
    expect(Math.abs(south[south.length - 1]! - north[north.length - 1]!)).toBeLessThanOrEqual(CELL);
    // al sur del todo el estuario sigue dejando tierra antes de x = 344
    expect(terrainAt(ZONE_SPLIT_X - 3, WORLD.y1 - 3)).not.toBe("water");
  });
  it("ningún punto de tierra clickea Blog y toda la fosa clickea Blog", () => {
    const land = new Set(["slab", "east", "jungle", "dock", "asphalt", "headland", "reef"]);
    for (let y = WORLD.y0 + 3; y < WORLD.y1; y += CELL) for (let x = WORLD.x0 + 3; x < WORLD.x1; x += CELL) {
      const t = terrainAt(x, y), z = worldZoneAt(x, y);
      if (z === "blog") expect(land.has(t)).toBe(false);
      if (t === "abyss") expect(z).toBe("blog");
    }
  });
  it("sangrado: selva al oeste y sur, selva y bahía al norte, mar y fosa al este; lomas solo detrás", () => {
    expect(bleedTerrainAt(-100, 100)).toBe("jungle");
    expect(bleedTerrainAt(100, 400)).toBe("jungle");
    expect(bleedTerrainAt(100, -100)).toBe("jungle");
    expect(bleedTerrainAt(400, -100)).toBe("sea");
    expect(bleedTerrainAt(600, 100)).toBe("abyss");
    expect(bleedZ(-250, 100)).toBeGreaterThan(9);   // loma al oeste
    expect(bleedZ(100, -250)).toBeGreaterThan(9);   // loma al norte
    expect(bleedZ(100, 500)).toBe(0.6);              // chato al sur
    expect(bleedZ(-60, 100)).toBe(0.6);              // en la costura no sube
  });
});

describe("buildTerrain", () => {
  it("una sola malla determinística que cubre el mundo", () => {
    const a = buildTerrain(createRng(7)), b = buildTerrain(createRng(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const t = allTris(a);
    expect(t.length).toBeGreaterThan(2 * ((WORLD.x1 - WORLD.x0) / CELL) * ((WORLD.y1 - WORLD.y0) / CELL) * 0.9);
    for (const tri of t) for (const p of tri.pts) {
      expect(p.x).toBeGreaterThanOrEqual(WORLD.x0); expect(p.x).toBeLessThanOrEqual(WORLD.x1);
      expect(p.y).toBeGreaterThanOrEqual(WORLD.y0); expect(p.y).toBeLessThanOrEqual(WORLD.y1);
    }
  });
  it("agua plana a z = -1: río (con la bahía), mar y orilla, en sólidos separados", () => {
    const m = buildTerrain(createRng(7));
    expect(m.river.kind === "ground" && m.river.mat).toBe("water");
    expect(m.sea.kind === "ground" && m.sea.mat).toBe("waterDeep");
    expect(m.shore.kind === "ground" && m.shore.mat).toBe("water");
    for (const s of [m.river, m.sea, m.shore, m.abyss]) expect(tris(s).every((t) => t.pts.every((p) => p.z === -1) && (t.toneOffset ?? 0) === 0)).toBe(true);
    expect(tris(m.river).length).toBeGreaterThan(200);
    expect(tris(m.river).some((t) => t.pts.every((p) => p.y < MOUTH_Y && p.x > 300))).toBe(true); // la bahía es río
    expect(tris(m.sea).length).toBeGreaterThan(300);
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
  it("el asfalto es casi plano y sale como su propio ground", () => {
    const m = buildTerrain(createRng(7), ["cv"]);
    const asphalt = m.ground.filter((g) => g.kind === "ground" && g.mat === "asphalt").flatMap(tris);
    expect(asphalt.length).toBeGreaterThan(600);
    expect(asphalt.every((t) => t.pts.every((p) => Math.abs(p.z) <= 0.1 || terrainAt(p.x, p.y) !== "asphalt"))).toBe(true);
    expect(m.ground.some((g) => g.kind === "ground" && g.mat === "paving")).toBe(false);
  });
  it("el sangrado rodea el contenido con celdas de 18, sin lomas al sur ni al este, y sin jitter en la costura", () => {
    const m = buildTerrain(createRng(7));
    expect(m.bleed.length).toBeGreaterThan(0);
    const bt = m.bleed.flatMap(tris);
    expect(bt.length).toBeGreaterThan(3000);
    const mats = new Set(m.bleed.map((s) => s.kind === "ground" && s.mat));
    for (const mt of mats) expect(["leafDark", "rock", "waterDeep", "abyss"]).toContain(mt);
    for (const t of bt) for (const p of t.pts) {
      expect(p.x).toBeGreaterThanOrEqual(WORLD.x0 - BLEED.x); expect(p.x).toBeLessThanOrEqual(WORLD.x1 + BLEED.x);
      expect(p.y).toBeGreaterThanOrEqual(WORLD.y0 - BLEED.y); expect(p.y).toBeLessThanOrEqual(WORLD.y1 + BLEED.y);
      if ((p.y > WORLD.y1 && p.x >= WORLD.x0) || p.x > WORLD.x1) expect(p.z).toBeLessThanOrEqual(1.4); // al sur (salvo la esquina SO, que queda detrás) y al este, chato
    }
    expect(bt.some((t) => t.pts.every((p) => p.y < WORLD.y0 - 150 && p.x < 100 && p.z > 6))).toBe(true); // lomas al norte
    // costura: los vértices del sangrado sobre el borde del contenido tienen la z base del contenido, sin jitter.
    // Solo el tramo del borde que toca el contenido: un vértice en x = WORLD.x0 pero y = 400 es selva común del sangrado.
    const onSeam = (p: { x: number; y: number }) =>
      ((p.x === WORLD.x0 || p.x === WORLD.x1) && p.y >= WORLD.y0 && p.y <= WORLD.y1) ||
      ((p.y === WORLD.y0 || p.y === WORLD.y1) && p.x >= WORLD.x0 && p.x <= WORLD.x1);
    const seamZ = new Set(bt.flatMap((t) => t.pts).filter(onSeam).map((p) => p.z));
    expect(seamZ.size).toBeGreaterThan(0);
    for (const z of seamZ) expect([0, 0.6, -1]).toContain(z);
    const contentSeamZ = new Set(allTris(m).flatMap((t) => t.pts).filter(onSeam).map((p) => p.z));
    for (const z of contentSeamZ) expect([0, 0.6, -1]).toContain(z);
    // con filtro por zona no hay sangrado
    expect(buildTerrain(createRng(7), ["cv"]).bleed).toEqual([]);
  });
  it("la fosa sale como su propio ground plano a z -1", () => {
    const m = buildTerrain(createRng(7));
    expect(m.abyss.kind === "ground" && m.abyss.mat).toBe("abyss");
    expect(tris(m.abyss).length).toBeGreaterThan(400);
    expect(tris(m.abyss).every((t) => t.pts.every((p) => p.z === -1 && p.x >= 380))).toBe(true);
  });
});

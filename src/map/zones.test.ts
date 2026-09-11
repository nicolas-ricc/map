import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, ZONES, ZONE_IDS, pointInPolygon, zoneAt, zoneById } from "./zones";

describe("zones", () => {
  it("hay tres zonas con ids únicos en orden portfolio, cv, blog", () => {
    expect(ZONES.map((z) => z.id)).toEqual(["portfolio", "cv", "blog"]);
    expect(ZONE_IDS).toEqual(["portfolio", "cv", "blog"]);
  });

  it("los polígonos están dentro del lienzo", () => {
    for (const z of ZONES) {
      for (let i = 0; i < z.polygon.length; i += 2) {
        expect(z.polygon[i]).toBeGreaterThanOrEqual(0);
        expect(z.polygon[i]).toBeLessThanOrEqual(MAP_W);
        expect(z.polygon[i + 1]).toBeGreaterThanOrEqual(0);
        expect(z.polygon[i + 1]).toBeLessThanOrEqual(MAP_H);
      }
    }
  });

  it("los tres tercios cubren todo el lienzo sin huecos ni superposiciones", () => {
    for (let x = 0; x < MAP_W; x += 2) {
      for (let y = 0; y < MAP_H; y += 2) {
        const hits = ZONES.filter((z) => pointInPolygon(x + 0.5, y + 0.5, z.polygon)).length;
        if (hits !== 1) throw new Error(`(${x},${y}) cae en ${hits} zonas`);
      }
    }
  });

  it("el landmark y el cartel de cada zona están dentro de su polígono", () => {
    for (const z of ZONES) {
      expect(pointInPolygon(z.landmark.x, z.landmark.y, z.polygon)).toBe(true);
      expect(pointInPolygon(z.label.x, z.label.y, z.polygon)).toBe(true);
    }
  });

  it("el landmark queda a 96 px o más de los bordes laterales (la cámara hace 2.5x sobre él)", () => {
    for (const z of ZONES) {
      expect(z.landmark.x).toBeGreaterThanOrEqual(96);
      expect(z.landmark.x).toBeLessThanOrEqual(MAP_W - 96);
    }
  });

  it("zoneAt devuelve la zona del punto y la más cercana fuera del lienzo", () => {
    for (const z of ZONES) expect(zoneAt(z.landmark.x, z.landmark.y)).toBe(z.id);
    expect(zoneAt(-50, -50)).toBe("portfolio");
    expect(zoneAt(600, 100)).toBe("blog");
  });

  it("pointInPolygon en un cuadrado", () => {
    const sq = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(pointInPolygon(5, 5, sq)).toBe(true);
    expect(pointInPolygon(15, 5, sq)).toBe(false);
  });

  it("zoneById devuelve la zona y tira si no existe", () => {
    expect(zoneById("cv").name).toBe("Resume");
    // @ts-expect-error id inválido
    expect(() => zoneById("nada")).toThrow();
  });
});

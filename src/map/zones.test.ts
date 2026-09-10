import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, ZONES, ZONE_IDS, pointInPolygon, zoneById } from "./zones";

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

  it("el landmark y el cartel de cada zona están dentro de su polígono", () => {
    for (const z of ZONES) {
      expect(pointInPolygon(z.landmark.x, z.landmark.y, z.polygon)).toBe(true);
      expect(pointInPolygon(z.label.x, z.label.y, z.polygon)).toBe(true);
    }
  });

  it("los polígonos no se superponen en sus landmarks", () => {
    for (const a of ZONES) for (const b of ZONES) {
      if (a !== b) expect(pointInPolygon(a.landmark.x, a.landmark.y, b.polygon)).toBe(false);
    }
  });

  it("pointInPolygon en un cuadrado", () => {
    const sq = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(pointInPolygon(5, 5, sq)).toBe(true);
    expect(pointInPolygon(15, 5, sq)).toBe(false);
  });

  it("zoneById devuelve la zona y tira si no existe", () => {
    expect(zoneById("cv").name).toBe("Currículum");
    // @ts-expect-error id inválido
    expect(() => zoneById("nada")).toThrow();
  });
});

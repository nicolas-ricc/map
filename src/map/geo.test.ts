import { describe, expect, it } from "vitest";
import { HEADLAND, MOUTH_Y, RIVER_HALF, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, abyssX, distToHeadland, inHeadland, inMouth, pointInPolygon, riverCenter, shoreWidth, worldZoneAt } from "./geo";

describe("mundo", () => {
  it("el contenido tiene origen negativo y lados múltiplos de 18", () => {
    expect(WORLD).toEqual({ x0: -60, y0: -60, x1: 570, y1: 336 });
    expect([ZONE_SPLIT_X, ZONE_SPLIT_Y]).toEqual([344, 146]);
    expect((WORLD.x1 - WORLD.x0) % 18).toBe(0);
    expect((WORLD.y1 - WORLD.y0) % 18).toBe(0);
  });

  it("zona clickeable: la punta y su orilla son Portfolio, la orilla del malecón Resume, el mar abierto Blog", () => {
    expect(worldZoneAt(10, 10)).toBe("portfolio");
    expect(worldZoneAt(-30, -30)).toBe("portfolio");   // banda de la fábrica
    expect(worldZoneAt(10, 200)).toBe("cv");
    expect(worldZoneAt(-30, 300)).toBe("cv");          // distrito
    expect(worldZoneAt(380, 118)).toBe("portfolio");   // punta
    expect(worldZoneAt(404, 118)).toBe("portfolio");   // arrecife
    expect(worldZoneAt(350, 100)).toBe("portfolio");   // orilla del astillero
    expect(worldZoneAt(350, 200)).toBe("cv");          // orilla del malecón
    expect(worldZoneAt(500, 200)).toBe("blog");
    expect(worldZoneAt(400, 10)).toBe("blog");
    expect(worldZoneAt(400, 260)).toBe("blog");
    for (let y = -60; y < 336; y += 6) expect(worldZoneAt(ZONE_SPLIT_X + shoreWidth(y) - 0.5, y)).not.toBe("blog");
  });

  it("la fosa empieza en x ≈ 392 al norte, a más de 30 u de la punta, y se abre al este hacia el sur", () => {
    expect(abyssX(-60)).toBeCloseTo(392 + 6 * Math.sin(-60 / 17), 6);
    expect(abyssX(118) - 400).toBeGreaterThan(30);
    expect(abyssX(336)).toBeGreaterThan(abyssX(-60) + 90);
    expect(shoreWidth(0)).toBeGreaterThan(4);
  });

  it("la desembocadura es todo lo que hay al este del río por encima de MOUTH_Y", () => {
    expect(MOUTH_Y).toBe(24);
    for (let y = 0; y < MOUTH_Y; y += 4) {
      expect(inMouth(riverCenter(y) - RIVER_HALF - 1, y)).toBe(false);
      expect(inMouth(riverCenter(y), y)).toBe(true);
      expect(inMouth(343, y)).toBe(true);
    }
    expect(inMouth(300, MOUTH_Y)).toBe(false);
  });

  it("la punta nace en el muelle de alistamiento y llega hasta x≈400 con el faro en la punta", () => {
    expect(inHeadland(336, 115)).toBe(true);
    expect(inHeadland(396, 118)).toBe(true);
    expect(inHeadland(410, 118)).toBe(false);
    expect(inHeadland(360, 90)).toBe(false);
    expect(Math.min(...HEADLAND.map(([x]) => x))).toBeLessThanOrEqual(330);
    expect(Math.max(...HEADLAND.map(([x]) => x))).toBe(400);
  });

  it("distToHeadland es 0 adentro y crece afuera", () => {
    expect(distToHeadland(380, 118)).toBe(0);
    expect(distToHeadland(400, 118)).toBe(0);
    expect(distToHeadland(410, 118)).toBeCloseTo(10, 1);
    expect(distToHeadland(380, 80)).toBeGreaterThan(20);
  });

  it("pointInPolygon vive en geo", () => {
    expect(pointInPolygon(1, 1, [0, 0, 4, 0, 4, 4, 0, 4])).toBe(true);
    expect(pointInPolygon(5, 1, [0, 0, 4, 0, 4, 4, 0, 4])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { HEADLAND, MOUTH_Y, RIVER_HALF, WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, distToHeadland, inHeadland, inMouth, pointInPolygon, riverCenter, worldZoneAt } from "./geo";

describe("mundo", () => {
  it("tres zonas que cubren el mundo", () => {
    expect([WORLD_W, WORLD_H, ZONE_SPLIT_X, ZONE_SPLIT_Y]).toEqual([560, 270, 344, 146]);
    expect(worldZoneAt(10, 10)).toBe("portfolio");
    expect(worldZoneAt(10, 200)).toBe("cv");
    expect(worldZoneAt(400, 10)).toBe("blog");
    expect(worldZoneAt(400, 260)).toBe("blog");
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

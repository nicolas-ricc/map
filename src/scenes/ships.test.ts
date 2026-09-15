import { describe, expect, it } from "vitest";
import { bounds } from "../iso/solids";
import { SHIP_SPECS, ship } from "./ships";

describe("ships", () => {
  it("carguero: casco 60×10×5 con superestructura en popa, chimenea, grúa y tres luces; proa según heading", () => {
    const s = ship("cargo", { x: 100, y: 100 }, 0);
    const hull = s.solids.find((x) => x.kind === "hull")!;
    expect(hull).toMatchObject({ len: 60, beam: 10, h: 5, heading: 0, at: { x: 100, y: 100, z: -1 } });
    expect(s.solids.filter((x) => x.kind === "poly").length).toBeGreaterThanOrEqual(3);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "rust")).toBe(true);
    expect(s.lights.map((l) => l.color)).toEqual(["magentaMid", "magenta", "cyanMid"]);
    const east = ship("cargo", { x: 100, y: 100 }, Math.PI / 2);
    expect(Math.max(...east.solids.map((x) => bounds(x).max.y))).toBeCloseTo(160, 6); // proa al sur
    for (const x of east.solids) expect(["hull", "steel", "rust"]).toContain(x.mat);
  });
  it("remolcador y barcaza con sus medidas; los contenedores alternan óxido y acero sobre la barcaza", () => {
    expect(ship("tug", { x: 0, y: 0 }, 0).solids.find((x) => x.kind === "hull")).toMatchObject(SHIP_SPECS.tug);
    const barge = ship("barge", { x: 0, y: 0 }, 0);
    const boxes = barge.solids.filter((x) => x.kind === "poly" && x.h === 2.4);
    expect(boxes).toHaveLength(6);
    expect(boxes.map((b) => b.mat)).toEqual(["rust", "steel", "rust", "steel", "rust", "steel"]);
    for (const b of boxes) { expect(bounds(b).min.x).toBeGreaterThanOrEqual(0); expect(bounds(b).max.x).toBeLessThanOrEqual(40); }
  });
});

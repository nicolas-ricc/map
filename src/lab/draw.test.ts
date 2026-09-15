import { describe, expect, it } from "vitest";
import type { RenderItem } from "../iso/render-list";
import { coverFrame, fitTransform, zoneFrame } from "./draw";

describe("fitTransform", () => {
  it("escala para que el bounding box entre con margen y quede centrado", () => {
    const items = [{ layer: "ground" as const, pts: [0, 0, 100, 0, 100, 50, 0, 50], color: 0 }];
    const f = fitTransform(items, 1000, 1000, 0.1);
    expect(f.scale).toBeCloseTo(8); // 800 / 100
    expect(f.x).toBeCloseTo(100);
    expect(f.y).toBeCloseTo(500 - 25 * 8);
  });
  it("con la lista vacía no explota", () => {
    expect(fitTransform([], 100, 100)).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe("zoneFrame", () => {
  it("la caja de una zona contiene sus cuatro esquinas proyectadas, de z 0 a 30", () => {
    const [it] = zoneFrame("blog");
    expect(it!.pts).toHaveLength(8);
    const xs = it!.pts.filter((_, i) => i % 2 === 0), ys = it!.pts.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBe(344 - 336);   // esquina SO: x - y
    expect(Math.max(...xs)).toBe(570 + 60);     // esquina NE
    expect(Math.min(...ys)).toBe((344 - 60) / 2 - 30 * 1.4); // esquina NO en alto
    expect(Math.max(...ys)).toBe((570 + 336) / 2);
  });
  it("all cubre el mundo", () => {
    const [it] = zoneFrame("all");
    expect(Math.max(...it!.pts.filter((_, i) => i % 2 === 0))).toBe(630);
  });
});

describe("coverFrame", () => {
  it("el rectángulo cover 16:9 contiene la caja del contenido con la torre", () => {
    const box = (items: RenderItem[]) => {
      const xs = items.flatMap((i) => i.pts.filter((_, k) => k % 2 === 0)), ys = items.flatMap((i) => i.pts.filter((_, k) => k % 2 === 1));
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    };
    const cover = box(coverFrame(16 / 9)), all = box(zoneFrame("all"));
    expect(all.minX).toBeGreaterThanOrEqual(cover.minX); expect(all.maxX).toBeLessThanOrEqual(cover.maxX);
    expect(all.minY).toBeGreaterThanOrEqual(cover.minY); expect(all.maxY).toBeLessThanOrEqual(cover.maxY);
    expect((cover.maxX - cover.minX) / (cover.maxY - cover.minY)).toBeCloseTo(16 / 9, 6);
  });
});

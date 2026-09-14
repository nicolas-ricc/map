import { describe, expect, it } from "vitest";
import { ISO_COLORS } from "../map/palette-iso";
import { accentItem } from "./accent";
import { v3 } from "./geometry";

describe("accentItem", () => {
  it("un punto se proyecta y resuelve su color", () => {
    expect(accentItem({ kind: "dot", at: v3(0, 0, 10), r: 2, color: "amber" })).toEqual({ kind: "dot", x: 0, y: -14, r: 2, color: ISO_COLORS.amber });
  });
  it("un polígono se proyecta plano, con alpha 1 por defecto", () => {
    const it = accentItem({ kind: "poly", pts: [v3(0, 0, 0), v3(2, 0, 0), v3(2, 2, 0)], color: "magentaMid" });
    expect(it).toEqual({ kind: "poly", pts: [0, 0, 2, 1, 0, 2], color: ISO_COLORS.magentaMid, alpha: 1 });
  });
  it("respeta el alpha pedido", () => {
    const it = accentItem({ kind: "poly", pts: [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0)], color: "cyanBleed", alpha: 0.3 });
    expect(it.kind === "poly" && it.alpha).toBe(0.3);
  });
});

import { describe, expect, it } from "vitest";
import { pathForZone, zoneFromPath } from "./router";

describe("router", () => {
  it("mapea paths a zonas", () => {
    expect(zoneFromPath("/")).toBeNull();
    expect(zoneFromPath("/portfolio/")).toBe("portfolio");
    expect(zoneFromPath("/portfolio")).toBe("portfolio");
    expect(zoneFromPath("/cv/index.html")).toBe("cv");
    expect(zoneFromPath("/blog/?x=1")).toBe("blog");
    expect(zoneFromPath("/otra/")).toBeNull();
  });
  it("mapea zonas a paths", () => {
    expect(pathForZone(null)).toBe("/");
    expect(pathForZone("cv")).toBe("/cv/");
  });
  it("es inverso", () => {
    for (const id of ["portfolio", "cv", "blog"] as const) expect(zoneFromPath(pathForZone(id))).toBe(id);
  });
});

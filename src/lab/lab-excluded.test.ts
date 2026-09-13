import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../../", import.meta.url).pathname;

describe("laboratorio fuera de producción", () => {
  it("existe la entrada de dev", () => {
    expect(existsSync(`${ROOT}lab/portfolio.html`)).toBe(true);
  });
  it("vite.config no agrega el laboratorio al build", () => {
    const cfg = readFileSync(`${ROOT}vite.config.ts`, "utf8");
    expect(cfg).not.toMatch(/lab/);
  });
  it("prerender no lo copia", () => {
    expect(readFileSync(`${ROOT}scripts/prerender.ts`, "utf8")).not.toMatch(/lab/);
  });
});

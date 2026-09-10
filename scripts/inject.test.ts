import { describe, expect, it } from "vitest";
import { injectZone } from "./inject";

const index = `<html><head><title>Nicolás Riccomini</title></head><body data-zone=""><div id="hud" hidden><a id="back" href="/">←</a><h1 id="zone-title"></h1></div><main id="content" hidden></main></body></html>`;

describe("injectZone", () => {
  const out = injectZone(index, "cv", "Currículum", "<h1>Currículum</h1>");
  it("inyecta contenido y estado de zona", () => {
    expect(out).toContain('<body data-zone="cv" class="zone">');
    expect(out).toContain('<main id="content"><h1>Currículum</h1></main>');
    expect(out).toContain('<div id="hud">');
    expect(out).toContain('<h1 id="zone-title">Currículum</h1>');
    expect(out).toContain("<title>Currículum · Nicolás Riccomini</title>");
  });
  it("no toca el resto", () => {
    expect(out).toContain('<a id="back" href="/">←</a>');
  });

  it("lanza si falta el marcador de <main>", () => {
    const broken = index.replace('<main id="content" hidden></main>', "");
    expect(() => injectZone(broken, "cv", "Currículum", "<h1>Currículum</h1>")).toThrow(
      /injectZone: no se encontró.*main/i,
    );
  });

  it("lanza si falta el <title>", () => {
    const broken = index.replace("<title>Nicolás Riccomini</title>", "");
    expect(() => injectZone(broken, "cv", "Currículum", "<h1>Currículum</h1>")).toThrow(
      /injectZone: no se encontró.*title/i,
    );
  });
});

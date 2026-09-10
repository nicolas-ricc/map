import { describe, expect, it } from "vitest";
import { escapeHtml, renderContent } from "./render";
import type { ZoneContent } from "./types";

const zone: ZoneContent = {
  id: "cv",
  titulo: "Currículum",
  descripcion: "Quién soy & qué hago",
  pdf: "/cv.pdf",
  secciones: [{ subtitulo: "Experiencia", items: [{ titulo: "Illustrate <dev>", descripcion: "Backend", links: [{ label: "Sitio", url: "https://illustrate.example" }] }] }],
};

describe("renderContent", () => {
  const html = renderContent(zone);
  it("estructura semántica", () => {
    expect(html).toContain("<h1>Currículum</h1>");
    expect(html).toContain('<p class="lead">Quién soy &amp; qué hago</p>');
    expect(html).toContain('<a class="pdf" href="/cv.pdf"');
    expect(html).toContain("<h2>Experiencia</h2>");
    expect(html).toContain("<h3>Illustrate &lt;dev&gt;</h3>");
    expect(html).toContain('<a href="https://illustrate.example"');
    expect(html).toContain('rel="noopener"');
  });
  it("omite lead y pdf si no están", () => {
    const min = renderContent({ id: "blog", titulo: "Blog", secciones: [] });
    expect(min).not.toContain("lead");
    expect(min).not.toContain("pdf");
  });
  it("escapeHtml escapa los cinco caracteres", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

import { describe, expect, it } from "vitest";
import blog from "../../content/blog.json";
import cv from "../../content/cv.json";
import portfolio from "../../content/portfolio.json";
import { validateContent } from "./validate";

const ok = {
  id: "portfolio",
  titulo: "Portfolio",
  secciones: [{ subtitulo: "Juegos", items: [{ titulo: "X", descripcion: "d", links: [{ label: "Repo", url: "https://x" }] }] }],
};

describe("validateContent", () => {
  it("acepta contenido válido", () => {
    expect(validateContent(ok)).toEqual([]);
  });
  it("rechaza id desconocido y campos faltantes", () => {
    const errs = validateContent({ id: "nada", secciones: [] });
    expect(errs.some((e) => e.startsWith("id"))).toBe(true);
    expect(errs.some((e) => e.startsWith("titulo"))).toBe(true);
  });
  it("señala el path del error anidado", () => {
    const bad = structuredClone(ok) as { secciones: { items: { links: { url?: string }[] }[] }[] };
    delete bad.secciones[0]!.items[0]!.links[0]!.url;
    expect(validateContent(bad)).toEqual(["secciones[0].items[0].links[0].url: falta o no es string"]);
  });
  it("rechaza lo que no es objeto", () => {
    expect(validateContent(null)).toEqual(["raíz: no es un objeto"]);
  });
  it("los JSON del repo son válidos", () => {
    for (const c of [portfolio, cv, blog]) expect(validateContent(c)).toEqual([]);
  });
});

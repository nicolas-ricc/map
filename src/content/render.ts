import type { ContentItem, ContentSection, ZoneContent } from "./types";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderItem(item: ContentItem): string {
  const links = item.links
    .map((l) => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a></li>`)
    .join("");
  const desc = item.descripcion ? `<p>${escapeHtml(item.descripcion)}</p>` : "";
  return `<article><h3>${escapeHtml(item.titulo)}</h3>${desc}<ul class="links">${links}</ul></article>`;
}

function renderSection(sec: ContentSection): string {
  return `<section><h2>${escapeHtml(sec.subtitulo)}</h2>${sec.items.map(renderItem).join("")}</section>`;
}

export function renderContent(zone: ZoneContent): string {
  const lead = zone.descripcion ? `<p class="lead">${escapeHtml(zone.descripcion)}</p>` : "";
  const pdf = zone.pdf ? `<a class="pdf" href="${escapeHtml(zone.pdf)}" download>Descargar CV en PDF</a>` : "";
  return `<h1>${escapeHtml(zone.titulo)}</h1>${lead}${pdf}${zone.secciones.map(renderSection).join("")}`;
}

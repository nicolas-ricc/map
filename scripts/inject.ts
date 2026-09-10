import type { ZoneId } from "../src/map/zones";

function replaceOnce(html: string, marker: string | RegExp, replacement: string, label: string): string {
  const found = typeof marker === "string" ? html.includes(marker) : marker.test(html);
  if (!found) throw new Error(`injectZone: no se encontró ${label} en index.html`);
  return html.replace(marker, replacement);
}

export function injectZone(indexHtml: string, id: ZoneId, name: string, contentHtml: string): string {
  let html = indexHtml;
  html = replaceOnce(html, '<body data-zone="">', `<body data-zone="${id}" class="zone">`, '<body data-zone="">');
  html = replaceOnce(html, '<main id="content" hidden></main>', `<main id="content">${contentHtml}</main>`, '<main id="content" hidden></main>');
  html = replaceOnce(html, '<div id="hud" hidden>', '<div id="hud">', '<div id="hud" hidden>');
  // aria-hidden: el <h1> del HUD duplica el <h1> del contenido; queda solo como rótulo visual
  html = replaceOnce(html, '<h1 id="zone-title" aria-hidden="true"></h1>', `<h1 id="zone-title" aria-hidden="true">${name}</h1>`, '<h1 id="zone-title" aria-hidden="true"></h1>');
  html = replaceOnce(html, /<title>.*?<\/title>/, `<title>${name} · Nicolás Riccomini</title>`, "<title>");
  return html;
}

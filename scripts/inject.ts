import type { ZoneId } from "../src/map/zones";

export function injectZone(indexHtml: string, id: ZoneId, name: string, contentHtml: string): string {
  return indexHtml
    .replace('<body data-zone="">', `<body data-zone="${id}" class="zone">`)
    .replace('<main id="content" hidden></main>', `<main id="content">${contentHtml}</main>`)
    .replace('<div id="hud" hidden>', '<div id="hud">')
    .replace('<h1 id="zone-title"></h1>', `<h1 id="zone-title">${name}</h1>`)
    .replace(/<title>.*?<\/title>/, `<title>${name} · Nicolás Riccomini</title>`);
}

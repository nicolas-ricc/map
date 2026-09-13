# mapa

Sitio personal: un mapa RPG pixel art nocturno con tres zonas (Portfolio, Resume, Blog).

- `npm run dev` — desarrollo (baja el feed del blog primero).
- `npm test` — tests unitarios (Vitest).
- `npm run build` — valida `content/*.json`, baja el feed, buildea y prerenderiza `/portfolio/`, `/cv/`, `/blog/`.
- `npm run typecheck` — `tsc --noEmit`. En un clone fresco correr `npm run feed` primero: `content/blog.generated.json` está gitignoreado y `src/main.ts` lo importa (`predev`/`prebuild` ya lo hacen por vos).

Sin licencia pública: `private: true`, el campo `license` (ISC) queda como resto del scaffold y no aplica — el repo no se publica en npm.

Contenido editable en `content/*.json`. Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.

## Laboratorio isométrico

`npm run dev` y abrir `/map/lab/portfolio.html`: el astillero del Portfolio en
2.5D isométrico (motor puro en `src/iso/`, escena en `src/scenes/shipyard.ts`).
No entra en el build de producción. Para cambiar la escena, editar la lista de
sólidos; para cambiar el look, `src/map/palette-iso.ts`. Spec en
`docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md`.

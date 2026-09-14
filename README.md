# mapa

Sitio personal: un mapa RPG pixel art nocturno con tres zonas (Portfolio, Resume, Blog).

- `npm run dev` — desarrollo (baja el feed del blog primero).
- `npm test` — tests unitarios (Vitest).
- `npm run build` — valida `content/*.json`, baja el feed, buildea y prerenderiza `/portfolio/`, `/cv/`, `/blog/`.
- `npm run typecheck` — `tsc --noEmit`. En un clone fresco correr `npm run feed` primero: `content/blog.generated.json` está gitignoreado y `src/main.ts` lo importa (`predev`/`prebuild` ya lo hacen por vos).

Sin licencia pública: `private: true`, el campo `license` (ISC) queda como resto del scaffold y no aplica — el repo no se publica en npm.

Contenido editable en `content/*.json`. Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.

## Laboratorio isométrico

`npm run dev` y abrir `/map/lab/world.html`: el mundo entero en 2.5D isométrico
(motor puro en `src/iso/`, terreno compartido en `src/scenes/terrain.ts`,
escenas en `src/scenes/`). `/map/lab/portfolio.html` muestra solo el astillero;
`/map/lab/resume.html` muestra la ciudad de oficinas más el astillero,
encuadrados en Resume. Teclas `0`..`3` encuadran mundo, Portfolio, Resume y
Blog. Las teclas encuadran; no recortan: al enfocar una zona las vecinas
asoman por el borde. No entra en el build de producción. Para cambiar una
escena, editar su lista de sólidos; para el look, `src/map/palette-iso.ts`.
Specs en `docs/superpowers/specs/`
(`2026-09-13-portfolio-isometrico-design.md`, `2026-09-14-mundo-isometrico-design.md`,
`2026-09-14-resume-ciudad-design.md`).

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
escenas en `src/scenes/`, incluidas `factory.ts` (fábrica de Portfolio),
`district.ts` (distrito moderno de Resume) y `sea.ts` (punta, faro y barcos de
Blog). El mundo tiene origen en `(-60, -60)` y un sangrado de terreno
alrededor de todo el contenido, para que la cámara *cover* nunca muestre
cielo; sobre el sangrado viven los márgenes construidos, `hinterland.ts`
(industria de Portfolio al norte y al oeste de la fábrica) y `suburb.ts`
(suburbio de Resume al oeste y al sur de la ciudad), separados por un
cinturón verde; el estuario y el mar siguen hacia el sur hasta juntarse.
Solo existen con el mundo entero (`world.html`). `/map/lab/portfolio.html` muestra solo el astillero;
`/map/lab/resume.html` muestra la ciudad de oficinas más el astillero,
encuadrados en Resume; `/map/lab/blog.html` muestra la punta, el faro, la fosa
y los barcos, encuadrados en Blog. Teclas `0`..`3` encuadran mundo, Portfolio,
Resume y Blog; `4` encuadra con `coverFrame(16/9)`, el zoom mínimo que la
cámara del sitio deberá usar. Las teclas encuadran; no recortan: al enfocar
una zona las vecinas asoman por el borde. No entra en el build de producción.
Para cambiar una escena, editar su lista de sólidos; para el look,
`src/map/palette-iso.ts`. Specs en `docs/superpowers/specs/`
(`2026-09-13-portfolio-isometrico-design.md`, `2026-09-14-mundo-isometrico-design.md`,
`2026-09-14-resume-ciudad-design.md`,
`2026-09-14-mundo-2-fabrica-distrito-blog-design.md`,
`2026-09-15-margenes-urbanos-design.md`).

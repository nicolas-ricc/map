# mapa

Sitio personal: un mapa RPG pixel art nocturno con tres zonas (Portfolio, Currículum, Blog).

- `npm run dev` — desarrollo (baja el feed del blog primero).
- `npm test` — tests unitarios (Vitest).
- `npm run build` — valida `content/*.json`, baja el feed, buildea y prerenderiza `/portfolio/`, `/cv/`, `/blog/`.
- `npm run typecheck` — `tsc --noEmit`. En un clone fresco correr `npm run feed` primero: `content/blog.generated.json` está gitignoreado y `src/main.ts` lo importa (`predev`/`prebuild` ya lo hacen por vos).

Sin licencia pública: `private: true`, el campo `license` (ISC) queda como resto del scaffold y no aplica — el repo no se publica en npm.

Contenido editable en `content/*.json`. Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.

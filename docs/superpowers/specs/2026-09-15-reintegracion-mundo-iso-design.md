# Reintegración del mundo isométrico al sitio — diseño

**Fecha:** 2026-09-15
**Estado:** implementada (2026-09-16)
**Antecede:** `2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md` (último
estado del mundo en el laboratorio), `2026-09-14-mundo-isometrico-design.md`
(§10 dejó esta reintegración para una spec aparte),
`2026-09-09-mapa-rpg-sitio-personal-design.md` (§5 interacción, vistas y
transiciones del sitio, que esta spec conserva salvo donde dice lo contrario).
**Alcance:** `src/main.ts`, `src/style.css`, `index.html` y un módulo nuevo
`src/world/` que el laboratorio pasa a compartir. No cambia el motor
(`src/iso/`), las escenas (`src/scenes/`), el contenido, el router, el
prerender ni el deploy. Parte de `main` con `worktree-mundo-2` ya mergeado.

## 1. Problema

El sitio publicado (`/map/`) sigue mostrando el mapa pixel-art de la spec
original (`src/map/build-world.ts`: tres `ZoneNode` con textura por tercio,
landmarks de 40 px, luciérnagas). El mundo isométrico completo (astillero,
fábrica, hinterland, feria, ciudad, distrito tecnológico, mar con barcos, agua
por profundidad, sangrado construido) solo existe en `lab/world.html`, que no
entra al build. Hay que hacer que el sitio muestre el mundo iso con la misma
interacción que hoy: hover que enciende una zona, clic que hace zoom y abre
el panel de contenido, URL por zona, teclado y lector de pantalla, móvil.

Lo que el laboratorio no resuelve y esta spec decide:

1. **Hover y zona apagada.** El mapa viejo teñía un `Container` por tercio. La
   lista de render iso es una `Graphics` por capa ordenada por profundidad
   sobre las tres zonas; no hay contenedor por zona que teñir.
2. **Cámara.** `coverTransform` (`src/camera.ts`) encuadra un lienzo de
   480×270. El mundo iso tiene un paralelogramo de sangrado y un `coverQuad`
   por aspecto; la vista activa tiene que encajar la zona sin mostrar cielo.
3. **Rótulos.** El mundo iso no tiene texto: ni nombres de zona ni el cartel
   del sitio. La accesibilidad del mapa viejo vivía en los divs del
   `AccessibilitySystem` de Pixi, atados a `hitArea` por polígono.
4. **Qué hacer con el mapa viejo.**

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Mapa viejo | Se borra. `main.ts` monta el mundo iso. Se eliminan los módulos que solo usaba el mapa viejo (§3.1) y sus tests |
| Módulo compartido | `src/world/`: el runtime, el armado de escena y animadores, el encuadre, el velo y la cámara pura. `src/lab/` queda como páginas finas que importan de `src/world/` y agregan teclas y log |
| Hover / apagado | **Velo + luces**: una `Graphics` de velo por zona (celdas clasificadas por `worldZoneAt`, color cielo, alpha `VEIL_ALPHA = 0.45`) entre los sólidos y los acentos, más alpha reducida en los acentos (estáticos y animados) de las zonas no enfocadas. Sin partir la lista de sólidos por zona: no se rompe el orden pintor en las costuras |
| Hit test | `pointermove` sobre el canvas → `unproject` a z 0 con el estado de la cámara → `worldZoneAt`. Sin `hitArea` de Pixi |
| Cámara: mapa | `coverQuad(hostW / hostH)` encajado exacto en el host (sin margen). Es el rectángulo de ese aspecto inscripto en el sangrado: nunca hay cielo |
| Cámara: zona activa | `zoneFrame(zone)` encajado en la columna izquierda con margen 4 %, escala nunca menor que la escala cover del host, y traslación recortada para que el viewport quede dentro del paralelogramo del sangrado (`clampToBleed`) |
| Rótulos | HTML sobre el canvas: el `<nav id="zonas">` existente deja de ser invisible y sus links se posicionan sobre el landmark proyectado de cada zona; el título del sitio es un elemento HTML fijo en una esquina, visible solo en la vista mapa |
| Accesibilidad | Los links del nav son los controles: orden de tab natural, `:focus-visible` nativo, Enter navega. `:hover` y `:focus` del link ponen su zona hot. Se apaga el `AccessibilitySystem` de Pixi |
| Renderer | `antialias: true`, `resolution: devicePixelRatio`, `autoDensity: true`, fondo `ISO_COLORS.sky`; se saca `image-rendering: pixelated` y `roundPixels`. `maxFPS` 30 y pausa con `visibilitychange` quedan |
| Reduced motion | Cámara de duración 0 (como hoy) y `reducedMotion: true` a todos los animadores (como el lab) |
| Transición del hover | El parpadeo de tubo fluorescente del mapa viejo se reemplaza por un lerp de 120 ms del alpha del velo y de los acentos. No hay tint por zona sobre el que parpadear |

### Alternativas descartadas

- **`Graphics` por zona con tint** (fiel a la spec original): triplica draws y
  rompe el orden por profundidad en las costuras `x 344` / `y 146`: un sólido
  de Blog se dibujaría siempre después de uno de Portfolio aunque esté detrás.
- **Solo luces** (sin velo): más sutil, pero no se lee como "zona
  seleccionada" en la vista activa, donde las otras dos deben quedar apagadas.
- **Zoom fijo sobre el landmark** (`cover × 2.5`, como hoy): con el mundo
  grande se ve un recorte chico y arbitrario de la zona.
- **Carteles como sólidos iso** (fuente bitmap extruida): trabajo de escena, y
  a escala cover no se lee.
- **Mantener el mapa viejo detrás de un flag**: dos mundos vivos por
  mantener sin motivo.

## 3. Módulos

### 3.1 Qué se borra

`src/map/build-world.ts`, `zone-node.ts`, `terrain.ts`, `terrain-portfolio.ts`,
`landmarks.ts`, `ambient.ts`, `canvas.ts`, `ops.ts`, `paint.ts`, `pixelfont.ts`,
`brightness.ts`, `palette.ts`, `src/title-sign.ts`, y sus `.test.ts`. La
constante `EXEMPT` de `palette-guard.test.ts` pierde `map/palette.ts`.

`src/map/zones.ts` queda con `ZoneId`, `ZONE_IDS`, `ZoneDef = { id, name,
accent }`, `ZONES`, `zoneById`. `Accent` pasa a ser `"cyan" | "amber" |
"magenta"` definido ahí (antes venía de `palette.ts`). `polygon`, `landmark`,
`label`, `zoneAt`, `MAP_W`, `MAP_H` y `pointInPolygon` re-exportado se van;
`pointInPolygon` sigue en `geo.ts`.

De `src/map/geo.ts` se borran `MAP_W`, `MAP_H`, `coastX`, `splitX` e
`isWater`: fuera de lo borrado nadie los usa (`terrain-classify.ts` tiene su
propio `isWaterAt`). `riverCenter`, `RIVER_HALF` y todo lo del mundo iso se
quedan.

`src/camera.ts` pierde `coverTransform` y `ZOOM`; conserva `Camera`,
`CameraState`, `DURATION_MS`, `easeOutCubic`.

### 3.2 `src/world/stage.ts` (desde `src/lab/runtime.ts`)

```ts
export interface Stage {
  container: Container;
  /** zona enfocada (hover o activa) o null: mueve los objetivos de alpha de velos y acentos */
  setFocus(zone: WorldZone | null): void;
  tick(dtMs: number): void;
}
export function buildStage(scene: WorldScene, animators: ZonedAnimator[]): Stage;
```

Es `bootLab` sin `Application`, sin teclas, sin `fit` y sin log: recibe la
escena y los animadores, arma las capas y devuelve el contenedor. Orden de
capas, de abajo hacia arriba: sangrado, agua (estática más animada), suelo,
banda de sombras, núcleo de sombras, sólidos estáticos, sólidos animados,
**velos (uno por zona)**, acentos estáticos (**una `Graphics` por zona**),
acentos animados (una `Graphics` por capa, cada una con la zona de su
animador).

- Los acentos estáticos se reparten en tres `Graphics` por `worldZoneAt` de la
  posición del acento (`at` de los `dot`; el primer vértice de `pts` en los
  `poly`), sin proyectar: `worldZoneAt` trabaja en mundo.
- `ZonedAnimator = Animator & { zone: WorldZone | null }`. El agua es `null`:
  nunca se atenúa.
- `setFocus(zone)`: objetivo de alpha del velo de cada zona = `VEIL_ALPHA` si
  `zone !== null && zone !== z`, si no 0; objetivo de alpha de los acentos de
  cada zona = `ACCENT_DIM = 0.35` en el mismo caso, si no 1. `tick` hace el
  lerp con `min(1, dt / 120)`, como hacía `ZoneNode`. Un animador que ya fija
  `layer.alpha` (barcos que se desvanecen) multiplica: `g.alpha = layer.alpha
  × dimAlpha`.
- `tick` corre los animadores y redibuja las capas que devuelvan, como hoy.

### 3.3 `src/world/assemble.ts` (desde `src/lab/page.ts`)

```ts
export const SEED = 7;
export function assembleWorld(zones: readonly WorldZone[] | undefined, opts: { reducedMotion: boolean }): { scene: WorldScene; animators: ZonedAnimator[] };
```

Mismos animadores y seeds que `bootWorldPage` hoy, cada uno etiquetado:
agua `null`; astillero, fábrica (con las chimeneas del hinterland) y feria
`"portfolio"`; ciudad y tech `"cv"`; mar `"blog"`.

### 3.4 `src/world/frame.ts` (desde `src/lab/draw.ts`)

`zoneFrame`, `coverFrame`, `fitTransform`, `drawLayer`, `drawAccents`, sin
cambios. `LabFrame` se renombra `Frame`. `src/lab/draw.ts` se borra;
`draw.test.ts` se muda a `src/world/frame.test.ts`.

### 3.5 `src/world/veil.ts` (puro)

```ts
export const VEIL_ALPHA = 0.45;
export const ACCENT_DIM = 0.35;
/** Polígonos proyectados (pts como RenderItem) que cubren contenido + sangrado, por zona. */
export function veilPolygons(): Record<WorldZone, number[][]>;
```

Recorre el rectángulo `WORLD ± BLEED` en celdas de `CELL_BLEED = 18`. Si las
cuatro esquinas y el centro de una celda dan la misma zona por `worldZoneAt`,
la celda entera va a esa zona; si no, se subdivide en celdas de `CELL = 6`
clasificadas por su centro. Cada celda es un cuadrilátero proyectado con
`project` a z 0. Las celdas no se solapan, así una `Graphics` por zona con
alpha global no oscurece dos veces (no hace falta `AlphaFilter`). Estimación:
≈ 4 700 celdas de 18 más las subdivididas de las costuras; se dibujan una vez.

El velo se pinta a z 0: un edificio alto de una zona velada se ve velado
solo por su huella y no por su altura proyectada. Aceptado: la costura
`x 344` es el malecón y el mar; `y 146` es el estuario y la selva; los pocos
edificios altos cerca de una costura quedan parcialmente velados.

### 3.6 `src/world/view.ts` (puro)

```ts
export interface View { x: number; y: number; scale: number }  // = CameraState
/** Encuadre cover: coverQuad(w / h) llena exactamente w × h. */
export function coverView(w: number, h: number): View;
/** Zona encajada en w × h con margen, escala ≥ coverView(w, h).scale, recortada al sangrado. */
export function zoneView(zone: WorldZone, w: number, h: number): View;
/** Corre la vista lo mínimo para que sus cuatro esquinas queden dentro del paralelogramo del sangrado. */
export function clampToBleed(v: View, w: number, h: number): View;
/** Inversa de project() a z 0, en coordenadas de pantalla del contenedor del mundo (sin la cámara). */
export function unproject(sx: number, sy: number): { x: number; y: number };
/** Punto de pantalla del host → mundo a z 0, con la cámara. */
export function pointerToWorld(v: View, px: number, py: number): { x: number; y: number };
```

- `coverView`: `fitTransform(coverFrame(w / h), w, h, 0)`. Como el rectángulo
  tiene el aspecto exacto del host, la escala queda igual en x e y y el
  encuadre llena el host sin cielo. Para aspectos muy verticales (móvil,
  `9/16`) el rectángulo inscripto queda apoyado abajo del rango factible
  (`coverQuad`, `geo.ts`); es donde está el mar del sur. Aceptado por ahora:
  `coverQuad` no cambia.
- `zoneView`: `fitTransform(zoneFrame(zone), w, h, 0.04)`; si
  `scale < coverView(w, h).scale`, se usa la escala cover centrada en el
  centro de la caja de la zona; después `clampToBleed`.
- `clampToBleed`: el paralelogramo del sangrado proyectado tiene lados de
  pendiente ±1/2; que un rectángulo `w × h` (en pantalla, escala `s`) esté
  adentro son cuatro desigualdades lineales por esquina sobre `(x, y)`, o sea
  un polígono convexo de traslaciones admisibles. Se devuelve el punto más
  cercano a `(v.x, v.y)` de ese polígono. Si el polígono es vacío (el
  rectángulo no cabe a esa escala) se devuelve `coverView(w, h)`.
- `unproject`: `x = sx / 2 + sy`, `y = sy − sx / 2` (la inversa que ya usa
  `coverQuad`).

### 3.7 `src/main.ts`

- `assembleWorld(undefined, { reducedMotion })` → `buildStage` →
  `app.stage.addChild(stage.container)`.
- `app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: devicePixelRatio || 1, autoDensity: true })`. Sin `accessibilityOptions`.
- `targetFor(null) = coverView(w, h)`, `targetFor(zone) = zoneView(zone, w, h)`.
- `hot: WorldZone | null` (hover o foco de un link) y `current` (zona activa).
  `stage.setFocus(current ?? hot)`.
- Eventos del canvas: `pointermove` → `pointerToWorld(camera.state, …)` →
  `worldZoneAt` → `hot`; `pointerleave` → `hot = null`; `pointertap`
  (`click`) → `navigate(worldZoneAt(...))`. En la vista activa el canvas no
  cambia el hover (la zona activa manda) pero sí acepta clic sobre otra zona.
  `cursor: pointer` sobre el canvas en la vista mapa.
- Rótulos: por cada zona, `label = nav.querySelector('a[href$="/<id>/"]')`;
  en cada tick se posiciona con `project(LANDMARKS[id])` transformado por la
  cámara (`left = x·s + v.x`, `top = y·s + v.y`), anclado abajo-centro. Los
  `LANDMARKS` de `src/scenes/world.ts` ya están en mundo (grúa pórtico, torre,
  faro). `mouseenter`/`focus` del link → `hot = id`; `mouseleave`/`blur` →
  `hot = null`; `click` → `preventDefault` + `navigate(id, true)`.
- El título del sitio: `<p id="titulo">Nicolás Riccomini</p>` en `#hud`, o
  hermano de él, oculto por `body.zone`.
- Lo demás (`render`, `navigate`, `ResizeObserver`, `popstate`, Escape,
  "Volver", `.no-anim`, `.no-canvas`) no cambia.

### 3.8 `index.html` y `src/style.css`

- `#zonas` deja de ser visualmente oculto: `position: absolute; inset: 0;
  pointer-events: none` sobre `#canvas-host`, cada `a` con
  `position: absolute; transform: translate(-50%, -100%); pointer-events: auto`,
  fuente del sitio en mayúsculas pequeñas con `letter-spacing`, color por
  zona (`[data-zone=portfolio]` cian `#7cf5ff`, `cv` ámbar `#ffc457`, `blog`
  magenta `#ff5ee0`: los `core` de `palette-iso.ts`, como `#content a` ya
  usa `#7cf5ff`), sombra de texto oscura, `:hover`/`:focus-visible` con
  subrayado y brillo. Los links llevan `data-zone`.
- `body.zone #zonas a:not([data-zone="<activa>"])` a `opacity: 0.35`; se hace
  con una clase por link puesta desde `render` (`.dim`).
- `.no-canvas #zonas` vuelve al flujo como hoy (lista horizontal arriba del
  contenido).
- Se saca `image-rendering: pixelated` y la regla de foco de los divs de Pixi.
- `#titulo`: esquina inferior izquierda del host, `font-size` chico,
  mayúsculas, `letter-spacing`, color ámbar, oculto con `body.zone`.

### 3.9 Laboratorio

`src/lab/page.ts` pasa a llamar `assembleWorld` y `buildStage`; conserva
`Application`, teclas `0`..`4`, `fit` con `zoneFrame`/`coverFrame` de
`src/world/frame.ts`, y el log de `primer dibujo` y `peor redibujo`.
`src/lab/runtime.ts` y `src/lab/draw.ts` se borran. Tecla nueva `5`: alterna
`setFocus` entre `null`, `portfolio`, `cv` y `blog` para ver el velo. Las
cuatro páginas HTML no cambian. `lab-excluded.test.ts` sigue vigilando que
`dist/` no tenga `lab/`.

## 4. Interacción (diferencias con la spec original §5)

| Estado | Visual |
|---|---|
| Reposo | Sin velo; acentos a pleno; animadores corriendo; rótulos visibles a pleno |
| Hover / foco | La zona bajo el puntero (por `worldZoneAt`) o cuyo link tiene foco queda a pleno; las otras dos con velo `0.45` y acentos al `0.35`, lerp 120 ms. Cursor pointer |
| Activa | Cámara `zoneView`; velo fijo sobre las otras dos; sus rótulos al `0.35`; título del sitio oculto |

Todo lo demás de §5 (URL por zona, transición de 500 ms en paralelo con la
grilla CSS, fade-in del panel, Volver / Esc / atrás, carga directa
prerenderizada, móvil apilado 40vh) se conserva tal cual.

## 5. Rendimiento

Presupuesto en el headless de siempre (Chrome vía CDP, sin GPU, DPR 2,
`npx vite --port 5199`), medido sobre `/map/` (el sitio, no el lab; agregar el
log de `primer dibujo` / `peor redibujo` bajo `import.meta.env.DEV` en
`main.ts` igual que en el lab):

- Primer dibujo caliente ≤ 200 ms (Mundo 3 midió 175 ms en `world.html`; el
  velo suma ≈ 5 000 polígonos estáticos).
- Peor redibujo en 5 s ≤ 15 ms (el lerp de alpha no redibuja nada: cambia
  `alpha` de `Graphics` ya construidas).
- Hover: cambiar `hot` no dispara redibujos, solo objetivos de alpha.
- JS del sitio: anotar el peso gzip de `dist/assets/*.js` antes y después; el
  criterio de la spec original (< 200 KB gzip) probablemente no se cumple ya
  por Pixi solo; se anota, no se gatea.

### Medidas (Task 8, 2026-09-16)

Mismo headless de siempre (Chrome vía CDP con `agent-browser`, sin GPU, DPR 2,
viewport 1600×900), `npx vite --port 5199`, sobre `/map/` (el sitio):

- **Primer dibujo (segunda apertura, pestaña cerrada y reabierta): 261.0 ms.**
  Se pasa del presupuesto (≤ 200 ms). `stage.staticCount` = 32 050 polígonos
  estáticos — bastante más que la estimación de §5 (≈ 5 000 solo del velo);
  el resto son los sólidos del mundo completo (astillero, fábrica, ciudad,
  distrito tecnológico, feria, hinterland, mar). No se tocó código en esta
  tarea (fuera de alcance): el sospechoso natural es el velo (`veilPolygons`,
  ≈ 4 700 celdas), pero también pesa el resto de la escena: **queda para una
  tarea de rendimiento aparte** decidir si se optimiza (tiras horizontales en
  `veilCells`, o revisar el conteo total de sólidos).
- **Peor redibujo en 5 s (máximo de 15 lecturas, moviendo el puntero sobre el
  canvas ~30 s con `agent-browser mouse move`): 12.70 ms.** Dentro del
  presupuesto (≤ 15 ms).
- **gzip de `dist/assets/index-*.js` tras `npm run build`: 104 048 bytes**
  (104 KB; el archivo sin comprimir pesa 332 440 bytes). Por encima de los
  200 KB gzip de la spec original, como se anticipaba en este punto — no se
  gatea.

Líneas de consola crudas (recorte de la sesión de medición):

```
[info] [mapa] primer dibujo: 513.5 ms, 32050 polígonos estáticos
[info] [mapa] primer dibujo: 260.4 ms, 32050 polígonos estáticos
[info] [mapa] primer dibujo: 261.0 ms, 32050 polígonos estáticos
[info] [mapa] peor redibujo en 5 s: 11.30 ms
[info] [mapa] peor redibujo en 5 s: 9.20 ms
[info] [mapa] peor redibujo en 5 s: 9.10 ms
[info] [mapa] peor redibujo en 5 s: 10.50 ms
[info] [mapa] peor redibujo en 5 s: 7.50 ms
[info] [mapa] peor redibujo en 5 s: 8.50 ms
[info] [mapa] peor redibujo en 5 s: 12.70 ms
[info] [mapa] peor redibujo en 5 s: 7.70 ms
[info] [mapa] peor redibujo en 5 s: 7.20 ms
[info] [mapa] peor redibujo en 5 s: 8.90 ms
[info] [mapa] peor redibujo en 5 s: 7.70 ms
[info] [mapa] peor redibujo en 5 s: 9.60 ms
[info] [mapa] peor redibujo en 5 s: 7.60 ms
[info] [mapa] peor redibujo en 5 s: 7.20 ms
[info] [mapa] peor redibujo en 5 s: 11.70 ms
```

(La primera línea de `primer dibujo`, 513.5 ms, es la primera apertura de la
pestaña, más fría; la spec pide la segunda, 260.4/261.0 ms, consistente entre
dos aperturas sucesivas.)

## 6. Tests

Unit (Vitest, sin Pixi salvo donde ya lo hay):

- `veil.test.ts`: cada polígono cae en la zona de `worldZoneAt` de su centro;
  las áreas suman el área del rectángulo `WORLD ± BLEED` (sin huecos ni
  solapes, tolerancia 1e-6); la punta del faro y su orilla están en el velo
  de Portfolio, no de Blog.
- `view.test.ts`: `coverView` para `16/9`, `4/3`, `9/16` y `21/9` deja las
  cuatro esquinas del viewport dentro del paralelogramo del sangrado (con
  `COVER_INSET`); `zoneView` nunca tiene escala menor que `coverView` a las
  mismas medidas y sus esquinas están dentro del sangrado; `clampToBleed` es
  idempotente y deja quieta una vista que ya está adentro;
  `unproject(project(p))` recupera `p` a z 0; `pointerToWorld` invierte la
  cámara.
- `assemble.test.ts`: cada animador tiene la zona que dice §3.3 y el agua
  `null`.
- `stage.test.ts` (con Pixi, como los tests que ya instancian `Graphics` si
  los hay; si no, se testea la lógica de objetivos de alpha extraída a una
  función pura `focusAlphas(focus): Record<WorldZone, { veil, accents }>`).
- `zones.test.ts` recortado; `router.test.ts`, `camera.test.ts` (sin
  `coverTransform`), `inject.test.ts` siguen.
- `palette-guard`: sigue verde (los colores de los rótulos van en CSS).

Manual (agent-browser, viewport 2×, `localhost`):

1. `/map/` a 16:9: sin cielo en ninguna esquina; los tres rótulos sobre
   grúa, torre y faro.
2. Hover sobre cada zona y sobre la punta del faro: se vela lo demás; la
   punta enciende Portfolio.
3. Clic en Resume: la cámara encaja la ciudad y el distrito en la columna
   izquierda sin cielo; panel a la derecha; URL `/map/cv/`; Volver y Esc
   vuelven al cover.
4. Tab recorre Portfolio, Resume, Blog con foco visible; Enter abre.
5. Móvil 390×844: cover sin cielo, zona activa en 40vh sin cielo.
6. Carga directa de `/map/cv/`: arranca en la zona sin animar.
7. `prefers-reduced-motion`: cámara instantánea, mundo quieto.
8. `npm test`, `npm run typecheck`, `npm run build`; `dist/` sin `lab/`;
   los cuatro `lab/*.html` siguen funcionando en dev.

## 7. Criterios de aceptación

1. `/map/` muestra el mundo iso completo con sangrado, animado, sin cielo a
   16:9, 4:3 y 9:16.
2. Hover y foco de teclado encienden una zona y velan las otras dos; clic,
   Enter, URL directa, Volver, Esc y atrás funcionan como hoy.
3. Los tres links del nav son los únicos controles del mapa y funcionan sin
   canvas (`.no-canvas`).
4. No queda código del mapa viejo; `npm test`, `typecheck` y `build` verdes.
5. Presupuesto de §5 medido y anotado en esta spec.

## 8. Fuera de alcance

- Arrastre con el dedo y pinch en móvil.
- Carteles o texto como sólidos del mundo.
- Cambiar `coverQuad` para centrar verticalmente en aspectos verticales.
- Reducir el peso de Pixi (imports selectivos).
- Cuarta zona.

## 9. Desvíos de la implementación

Respecto del texto de esta spec (Tasks 1–8, cerradas el 2026-09-16):

- **`VIEW_INSET` en unidades de mundo.** `clampToBleed` (`src/world/view.ts`)
  usa `VIEW_INSET = 3` como margen del paralelogramo del sangrado en
  unidades de mundo, no de pantalla como sugiere el texto de §3.6.
- **Piso de escala de `zoneView`.** El texto dice "nunca menor que la escala
  cover del host"; la implementación aplica un piso algo mayor,
  `cover × ZONE_MIN_ZOOM` con `ZONE_MIN_ZOOM = 1.01`, para evitar el caso
  límite en que ambas escalas empatan exacto y la comparación de punto
  flotante decide mal.
- **`LABEL_Z = 34`.** La altura del rótulo sobre el pie del landmark
  (`src/main.ts`) es una constante nombrada con ese valor, no derivada de
  otra constante existente.
- **`<nav id="zonas">` dentro de `#canvas-host`.** El texto de §3.8 no fija
  dónde vive el nav en el DOM; terminó como hijo de `#canvas-host` (para que
  su posicionamiento absoluto quede relativo al host del canvas), no como
  hermano suelto.
- **Rótulos ocultos hasta `mapa-listo`.** Los links de `#zonas` son
  `visibility: hidden` hasta que la raíz (`<html>`) recibe la clase
  `mapa-listo`, agregada en `main.ts` justo después del primer `jumpTo` de
  la cámara. Se sumó en la ronda de fixes de la Task 6 para evitar un
  parpadeo de los rótulos en su posición `(0, 0)` antes del primer
  posicionamiento real; no está en el texto original de §3.7/§3.8.
- **Columna angosta de escritorio: la zona no entra a escala natural.** En el
  layout de escritorio con la columna izquierda angosta, `zoneView` no
  encuentra una escala ≥ cover que además quepa con margen 4 % adentro de
  esa columna; se resuelve centrando la zona a escala `cover × ZONE_MIN_ZOOM`
  (anticipado como caso a resolver en §3.6, sin decidir la solución exacta).
- **Sin `stage.test.ts` con Pixi.** Como preveía la nota de autorevisión del
  plan, no se agregó un test de `Stage` que instancie `Graphics`: la lógica
  de objetivos de alpha se extrajo a la función pura `focusAlphas` (testeada
  en `veil.test.ts`/`stage` según corresponda) y el resto del comportamiento
  visual se verificó a ojo en el laboratorio y con las capturas de la Task 8.
- **Presupuesto de primer dibujo no cumplido.** Medido en Task 8: 260–261 ms
  caliente en `/map/` (segunda apertura), por encima del objetivo de
  ≤ 200 ms de §5. El peor redibujo sí cumple (12.70 ms ≤ 15 ms). Se anota
  sin tocar código, según el alcance de la Task 8; el sospechoso natural
  para una futura optimización es el velo (`veilPolygons`, ≈ 4 700 celdas)
  y/o el total de sólidos estáticos del mundo completo (32 050). Ver §5.

### Checklist manual §6, ítems 1–8 (Task 8, 2026-09-16)

Capturas en
`/tmp/claude-1000/-home-nicolasr-Projects-mapa--claude-worktrees-mundo-2/d1ff0b65-9d47-4fce-924a-b97356f749ef/scratchpad/task8/`
(agent-browser, Chrome vía CDP, viewport 1600×900 DPR 2 salvo donde se
indica).

1. **PASS** — `/map/` a 16:9 sin cielo en ninguna esquina, tres rótulos
   (Portfolio sobre la grúa, Resume sobre la torre, Blog sobre el faro).
   Captura: `01-cover-1600x900.png`.
2. **PASS** — Hover sobre cada zona vela las otras dos (velo + acentos
   atenuados) y la punta del faro enciende Portfolio, no Blog, como pide
   `veil.test.ts`. Verificado por diferencia de píxel entre pares de
   capturas con la página recién abierta (sin contaminar el estado `hot`
   con un movimiento de mouse previo — `worldZoneAt` no tiene "zona nula": un
   punto cualquiera del canvas siempre resuelve a alguna de las tres, así
   que cualquier `pointermove` previo deja `hot` en una zona real, no en
   `null`). Capturas: `02-hover-portfolio.png`, `02-hover-resume.png`,
   `02-hover-blog.png`, `02-hover-faro-tip.png`.
3. **PASS** — Clic en `#zonas a[data-zone=cv]` (Resume) encaja ciudad +
   distrito tecnológico en la columna izquierda sin cielo, panel a la
   derecha, URL pasa a `/map/cv/`; "Volver al mapa" y Escape devuelven a
   `/map/`. **Verificación adicional del click en el rótulo visible de
   Resume, pedida para esta tarea:** `agent-browser click "#zonas
   a[data-zone=cv]"` seguido de `agent-browser get url` confirma
   `http://localhost:5199/map/cv/` — sin mis-clic (a diferencia de una
   corrida previa con locator de texto). Captura: `03-click-resume-active.png`.
4. **PASS** — Tab recorre Portfolio → Resume → Blog (verificado leyendo
   `data-zone` del elemento con foco tras cada `Tab`) con anillo de foco
   visible; Enter sobre Blog navega a `/map/blog/`. Capturas:
   `04-tab1-portfolio.png`, `04-tab2-resume.png`, `04-tab3-blog.png`.
5. **PASS** — Móvil 390×844: cover sin cielo y zona activa (Resume) en su
   franja sin cielo. Capturas: `05-mobile-cover.png`, `05-mobile-active.png`.
6. **PASS** — `npm run build` + `npm run preview`, carga directa de
   `/map/cv/`: arranca ya en la zona, sin pasar por el mapa. Captura:
   `06-direct-load-cv.png`.
7. **PASS (verificado en headless)** — `agent-browser set media
   reduced-motion` antes de abrir la página: los clics entre zonas saltan
   sin animación (cámara de duración 0) y, comparando dos capturas tomadas
   3 s aparte sin ninguna interacción de por medio, el diff de píxeles es
   cero (mundo completamente quieto: sin barcos, luces ni olas animándose).
   El brief permitía anotar "no verificado" si la herramienta no soportaba
   emulación de medios, pero sí la soporta. Capturas: `07-reduced-motion.png`,
   `07-rm-c1.png`, `07-rm-c2.png` (par usado para el diff de cero píxeles).
8. **PASS** — `npm test` (54 archivos, 412 tests), `npm run typecheck` y
   `npm run build` verdes; `dist/` no contiene `lab/`
   (`find dist -type d` solo lista `assets/`, `portfolio/`, `cv/`, `blog/`);
   los cuatro `lab/*.html` (`world.html`, `portfolio.html`, `resume.html`,
   `blog.html`) abren y renderizan en `npx vite --port 5199`. Capturas:
   `08-lab-world.png`, `08-lab-portfolio.png`, `08-lab-resume.png`,
   `08-lab-blog.png`.

Resultado: 8/8 PASS. El único incumplimiento de presupuesto es el primer
dibujo de §5 (260–261 ms vs. ≤ 200 ms), que no es parte del checklist §6
pero sí del criterio 5 de §7 (medido y anotado, no necesariamente cumplido).

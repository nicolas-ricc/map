# Portfolio isométrico low-poly — diseño

**Fecha:** 2026-09-13
**Estado:** aprobado; plan en `docs/superpowers/plans/2026-09-13-portfolio-isometrico.md`
**Antecede:** `2026-09-09-mapa-rpg-sitio-personal-design.md` (mapa top-down pixel art)

## 1. Objetivo

Rehacer la zona Portfolio (el astillero) como una escena **2.5D isométrica
low-poly**, vectorial y nítida, que se lea como una foto satelital estilizada
de un RPG de alta calidad. Se trabaja **aislada en un laboratorio**: una página
de desarrollo que renderiza solo el astillero a pantalla completa, sin hover,
sin cámara de zoom y sin los otros dos tercios. El objetivo de esta ronda es
acertar el estilo; reintegrar la escena al mapa de tres zonas es una spec
aparte.

Criterios de éxito:

- Al abrir `/lab/portfolio` se ve el astillero completo en proyección
  dimétrica 2:1, con volúmenes de tres tonos, sombras largas hacia el SE y
  terreno facetado.
- Un cambio de posición o altura en un sólido se refleja sin tocar nada más.
- El motor (`iso/`) no depende de PixiJS y está cubierto por tests numéricos.
- Ningún color sale del atlas de la paleta atardecer.
- Tres animaciones corren a 30 fps sin regenerar toda la escena por frame.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Motor | PixiJS 8 (stack actual). Proyección isométrica calculada a mano, sin Three.js |
| Textura | Vectores nítidos con antialias a resolución nativa. Se abandona el lienzo 480×270 con nearest para esta escena |
| Proyección | Dimétrica 2:1 (ángulo de 26.57°), ortográfica, cámara fija mirando desde el SO. Eje Z (altura) exagerado ×1.4 |
| Luz | Atardecer rasante: sol a ~25° de elevación desde el **oeste-sudoeste**. Sombras largas y duras hacia el ENE (a la derecha en pantalla). Con la cámara al SE, las paredes visibles son la sur y la este: la sur queda iluminada, la este en sombra. (Un sol al NO dejaría las dos en sombra.) |
| Paleta | Atlas nuevo `palette-iso.ts`: base cálida (hormigón ocre, óxido, losa arena), sombra fría azulada, agua verde oscuro, selva en dos verdes, cian como único acento artificial. Tres tonos por material, generados una vez y congelados en el atlas |
| Alcance | Laboratorio (`lab/portfolio.html` → `/map/lab/portfolio.html` en dev), excluido del build de producción. Con animación: carro de la grúa, agua, chispas de soldadura |
| Modelo | Lista declarativa de sólidos en coordenadas de mundo → motor puro proyecta, sombrea, ordena → runtime vuelca a `Graphics` |
| Plan urbano | El mismo del astillero top-down (commit `6c2b795`): línea de producción O→E que muere en el agua, calle de transferencia N-S, ribera dragada recta, dique seco, dos gradas, grúa pórtico, talleres + playa + vías al SO, muelle de alistamiento al este del río. En dimétrico, el eje O→E queda en diagonal, cumpliendo la grilla de "evitar oclusión" |

## 3. Principios de estilo (traducidos a reglas del motor)

1. **Axonometría fija y escala real.** Sin perspectiva: un objeto mide lo mismo
   adelante que atrás. Todo sólido se apoya en el plano `z = 0` salvo lo que
   está hundido (dique seco, canal) que va a `z < 0`.
2. **Capas de altura estrictas.** Suelo (`z ≤ 0`) → detalles de calle (`0 < z ≤ 1`)
   → naves y talleres (`z ≤ 12`) → grúa pórtico y tanques (`z ≤ 24`). Los techos
   llevan perfil: cumbrera a dos aguas en las naves, escalón en los talleres,
   unidades de ventilación y claraboyas como prismas chicos sobre el techo.
3. **Tres valores por volumen.** Cada cara recibe un tono según su normal:
   techo, pared iluminada (sur) o en sombra (este). Las vertientes (techos a dos
   aguas, conos, folds del suelo) usan dos pasos extra, `up` y `down`, según
   miren o no al sol. Escalera de cinco tonos por material
   (`shade < lit < down < top < up`), literales en el atlas, nada se calcula en
   runtime.
4. **Legibilidad adelante-atrás.** Fondo (patio de material, muelle de
   alistamiento) con prismas de 4 caras simples; detalle denso (autos, postes,
   bolardos, bobinas) solo sobre la calle de transferencia y el frente de las
   gradas.
5. **Sombras exageradas.** Cada sólido proyecta su sombra como un polígono al
   plano del suelo (casco convexo de sus vértices proyectados), con longitud
   `altura × Z_SCALE / tan(25°)` en dirección ENE. Además,
   un halo oscuro de 1-2 unidades pegado a la base de cada edificio y en el
   fondo de los cañones entre naves (oclusión ambiental falsa).
6. **Suelo geométrico.** Calles, vías y canal como franjas levemente hundidas
   (`z = -0.4`) con bordes propios. Losa, agua y selva trianguladas con folds
   sutiles: cada triángulo recibe una variación de tono ±1 paso del atlas según
   su inclinación, efecto papercraft.

## 4. Estructura

```
src/
  iso/                       motor puro, sin Pixi
    project.ts               mundo (x,y,z) → pantalla (sx,sy); constantes de ángulo y Z_SCALE
    solids.ts                tipos Solid (prism, ramp, cylinder, strip, hull, cone) y su
                             tesselado a Face[] (polígono en mundo + normal + material)
    light.ts                 LIGHT_DIR, factor por normal, shadowPolygon(solid) al suelo
    depth.ts                 clave de orden painter por sólido y por cara
    render-list.ts           solids → RenderItem[] ordenados (suelo, sombras, caras, acentos)
  scenes/
    shipyard.ts              la escena como datos: función pura (rng) → Solid[] por capa
    shipyard-anim.ts         qué sólidos se mueven y cómo (carro, agua, chispas)
  map/
    palette-iso.ts           atlas atardecer: material → { top, lit, shade } + acentos
  lab/
    portfolio.ts             runtime: Application, encuadre, Graphics por capa, ticker
lab.html                     entrada Vite de desarrollo, no se copia a dist
```

### 4.1 `iso/`: contratos

```ts
type Vec3 = { x: number; y: number; z: number };
type Material = keyof typeof ISO_PALETTE;   // "concrete" | "rust" | "slab" | ...

type Solid =
  | { kind: "prism";    at: Vec3; w: number; d: number; h: number; mat: Material; roof?: "flat" | "gable" | "step" }
  | { kind: "ramp";     at: Vec3; w: number; d: number; h: number; mat: Material; dir: "e" | "w" }
  | { kind: "cylinder"; at: Vec3; r: number; h: number; sides: 8; mat: Material }
  | { kind: "strip";    path: Vec3[]; width: number; z: number; mat: Material }        // calle, vía, canal
  | { kind: "hull";     at: Vec3; len: number; beam: number; h: number; mat: Material; bow: "e" }
  | { kind: "cone";     at: Vec3; r: number; h: number; sides: 6; mat: Material }      // árboles
  | { kind: "ground";   tris: [Vec3, Vec3, Vec3][]; mat: Material };                    // losa, agua, selva facetada

type Face = { pts: Vec3[]; normal: Vec3; mat: Material; tone: "top" | "lit" | "shade" | number };
type RenderItem = { layer: "ground" | "shadow" | "solid" | "accent"; pts2d: number[]; color: number; key: number };

project(v: Vec3): { sx: number; sy: number }
tessellate(s: Solid): Face[]
shadeTone(normal: Vec3): "top" | "lit" | "shade"
shadowPolygon(s: Solid): Vec3[]                   // proyectado a z = 0
depthKey(s: Solid | Face): number                 // x + y + z ponderado
buildRenderList(solids: Solid[]): RenderItem[]
```

- `project` implementa dimétrico 2:1: `sx = x - y`, `sy = (x + y) / 2 - z * Z_SCALE`,
  con `Z_SCALE = 1.4`. La cámara queda al SE mirando al NO. Constantes en un solo lugar.
- `ground` con `tone: number` usa la inclinación del triángulo para elegir un
  paso `-1 | 0 | +1` del atlas; nunca un color interpolado.
- Sombras: se dibujan **todas** antes que cualquier sólido, con un color único
  semitransparente del atlas (`shadow`), así las superposiciones no se oscurecen
  dos veces (una sola `Graphics` con `alpha`).
- Orden painter: sólidos por `depthKey` ascendente; dentro de un sólido las
  caras `shade` (SE) y `lit` (NO) después del techo no hacen falta ordenarse
  entre sí porque el prisma es convexo y solo se emiten caras visibles
  (normal · vista > 0).

### 4.2 `scenes/shipyard.ts`

Función pura `shipyard(rng: Rng): { static: Solid[]; animated: Record<AnimId, Solid[]> }`.
Coordenadas de mundo en unidades abstractas (1 u ≈ 1 px del mapa viejo), mismo
plano que `terrain-portfolio.ts` para poder comparar:

| Zona | Sólidos |
|---|---|
| Losa | `ground` triangulada con folds; juntas como `strip` finas hundidas |
| Ribera y canal | `strip` de agua a `z = -1` desde `QUAY_X` hasta la ribera vieja; muelle como `prism` bajo con bolardos (`cylinder` r=0.6) |
| Patio de material | pilas de chapa (`prism` apilados con offset), mazos de caños (`cylinder` acostados: `prism` fino por ahora), bobinas, secciones de casco (`prism` con techo `step`), tanques (`cylinder` 8 lados) |
| Dique seco | pozo: `ground` a `z = -6` rodeado de `prism` de muro; compuerta `prism` rust; `hull` con superestructura; casa de bombas |
| Naves | dos `prism` 90×16×10 con `roof: "gable"`, claraboyas como `prism` finos sobre la vertiente NO, ventilaciones, portón sombreado |
| Calle y rieles | `strip` hundida N-S; rieles como `strip` de 0.3 de ancho a `z = 0.1` |
| Gradas | plataforma `ramp` hacia el agua; grada 1 con quilla y cuadernas (`prism` finos en serie), grada 2 con `hull` casi cerrado; andamios como `prism` finos de 4 u de alto |
| Grúa pórtico | dos patas `prism` 3×3×24, viga `prism` sobre las gradas, carro `prism` (animado); rieles E-O |
| Talleres | dos `prism` con `roof: "step"`, playa como `strip` con líneas, 5 autos `prism` 3×4×1.5, vías |
| Muelle de alistamiento | dos galpones largos, tanque, chatarra, escollera de `cone` chatos |
| Selva | racimos de `cone` (6 lados, dos verdes) y `ground` facetado bajo cada racimo, evitando losa, agua y galpones |

Acentos cian (capa `accent`, blend `add`): ventanas de las naves en la cara
NO, faroles en la calle, lámpara del carro de la grúa, chispas.

### 4.3 `scenes/shipyard-anim.ts`

Tres animaciones, cada una muta solo sus sólidos y devuelve si cambió algo:

- **Carro de la grúa:** va y viene sobre la viga entre las dos gradas, 14 s por
  ciclo, con pausa de 2 s en cada extremo. Solo se regenera el carro y su sombra.
- **Agua:** los triángulos del canal y del río cambian de paso de tono en ondas
  diagonales (fase por `x + y`, 2 s por ciclo). Se regenera solo la `Graphics`
  del agua.
- **Soldadura:** en la grada 1, cada 1-3 s aparece un destello cian de 3 frames
  (chispas como 4-6 puntos) en una cuaderna al azar. Capa `accent`.

Con `prefers-reduced-motion`, las tres quedan en su frame 0.

### 4.4 `lab/portfolio.ts`

- `lab/portfolio.html` con `<div id="lab-host">` y `<script type="module" src="/src/lab/portfolio.ts">`.
- Vite: la página solo existe en dev; `build.rollupOptions.input` sigue siendo
  `index.html`. Se verifica con un test que `dist/` no contiene `lab`.
- `Application` con `antialias: true`, `resolution: devicePixelRatio`,
  `background: ISO_PALETTE.sky`, `resizeTo: host`, `maxFPS: 30`.
- Encuadre: bounding box de todos los `RenderItem` proyectados → escala y
  offset para que entre con margen del 4 %. Recalcula en resize.
- Cinco `Graphics` en orden: `ground`, `shadow` (alpha 0.35), `solid`,
  `water` (animada), `accent` (blend add). El carro y las chispas viven en
  `Graphics` propias para no redibujar `solid`.

## 5. Paleta

`palette-iso.ts` exporta `ISO_PALETTE` con una entrada por material,
cada una `{ top, lit, shade }` y opcionalmente `{ up, down }` para los pasos
de ground facetado. Los números se escriben a mano (no se derivan en runtime)
para que el guard de colores los vea. Materiales: `slab`, `concrete`, `rust`,
`steel`, `road`, `rail`, `water`, `waterDeep`, `leaf`, `leafDark`, `rock`,
`sand`, `hull`, `deck`, `shadow`, `sky`, y acentos `cyan`, `cyanMid`,
`cyanBleed`.

Regla de tono: `lit ≈ top × 0.82`, `shade ≈ top × 0.55` con un corrimiento
hacia azul en `shade` (luz cálida, sombra fría). Se calculan una vez con un
script y se pegan como literales.

## 6. Tests

- `project.test.ts`: puntos conocidos; `(1,0,0)` y `(0,1,0)` proyectan
  simétricos respecto a `sx = 0`; `z` solo mueve `sy`.
- `solids.test.ts`: un `prism` emite exactamente 3 caras visibles con normales
  `top`, NO y SE; `gable` emite 4; `cylinder` de 8 lados emite techo + 4 laterales.
- `light.test.ts`: `shadowPolygon` de un prisma 1×1×h tiene longitud
  `h × Z_SCALE / tan(25°)` en dirección SE; `shadeTone` por normal.
- `depth.test.ts`: dos prismas en diagonal se ordenan de atrás hacia adelante;
  un sólido a `z < 0` va antes que uno a `z = 0` en la misma celda.
- `render-list.test.ts`: capas en orden `ground < shadow < solid < accent`;
  ningún `color` fuera del atlas (reutiliza el patrón de `palette-guard.test.ts`).
- `shipyard.test.ts`: la escena es determinística por seed; ningún sólido se
  apoya fuera de la losa/agua salvo la selva; conteo mínimo de sólidos por zona.
- `shipyard-anim.test.ts`: el carro nunca sale de la viga; el agua vuelve a su
  fase inicial tras un ciclo; con reduced-motion nada cambia.
- Verificación visual: captura de `/lab/portfolio` en un artifact al final de
  la implementación, antes de dar por cerrada la ronda.

## 7. Fuera de alcance

- Reintegración al mapa de tres zonas, hover/dim, faro del Blog, cartel de
  bienvenida, panel de contenido. Spec aparte.
- Resume y Blog en isométrico: mismo motor, escenas nuevas, después.
- Rotar la luz o la cámara en runtime.
- Sprites o texturas PNG: todo procedural.

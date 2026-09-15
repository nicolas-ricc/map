# Márgenes urbanos: el sangrado deja de ser selva — diseño

**Fecha:** 2026-09-15
**Estado:** implementada (2026-09-15)
**Antecede:** `2026-09-14-mundo-2-fabrica-distrito-blog-design.md` (§4 sangrado, `coverFrame`).
**Alcance:** el laboratorio (`lab/world.html`, tecla `4`). No cambia las costuras
`x 344` / `y 146` ni ninguna escena existente salvo dos cinturones de selva de
Resume.

## 1. Problema

Con el encuadre *cover* (`coverFrame(16/9)`) el 60 % del sangrado visible es
selva plana (`leafDark`) y otro 8 % roca: el mundo se lee como tres islas de
contenido flotando en verde, y las zonas pierden sentido (Portfolio es una
fábrica en medio de la nada; Resume, una ciudad con borde recto contra la
selva). Además el sangrado sur clasifica todo como selva: el estuario y el
mar terminan contra una pared verde recta en `y = 336`.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Agua al sur | El sangrado sur continúa el estuario (`QUAY_X ≤ x ≤ estuaryEast(y)`, material `water`) y el mar (`x ≥ ZONE_SPLIT_X`, clasificado con `seaTerrainAt`: orilla, mar, fosa). Se juntan solos en `y ≈ 440`, donde `estuaryEast` alcanza 344. La lengua de tierra entre ambos sigue siendo selva (es un banco natural) |
| Tierra construida | Dentro de `REACH` del contenido (144 al norte y al oeste, 288 al sur, múltiplos de `CELL_BLEED`) el sangrado de tierra es **industrial** (`slab`) si `y < ZONE_SPLIT_Y` y **urbano** (`asphalt`) si no. El borde de la tierra construida ondula (`reachAt`) para no ser una línea |
| Lomas | Solo más allá de la tierra construida: `z = 0.6 + 12·min(1, (d − REACH)/180)`; roca a partir de z 9. La tierra construida es plana (z 0, jitter 0.1) como el asfalto del contenido |
| Cinturones de Resume | `x < CITY_EDGE.west` e `y ≥ CITY_EDGE.south` pasan a asfalto: la grilla del suburbio sale derecha del distrito. El cinturón de costura (`y 146..158`) y la ribera este del distrito siguen siendo selva: son parques deliberados, no margen |
| Escenas nuevas | `hinterland.ts` (Portfolio: galpones, tanques, silos, playa de maniobras, contenedores, torres de alta tensión, cantera) y `suburb.ts` (Resume: manzanas bajas sobre grilla con calles, plazas y parques, densidad que cae con la distancia). Rng propio por escena (`zoneRng(seed, zona, 2)`), así no re-sortean nada existente |
| Materiales | Los de cada zona. Hinterland: `slab concrete rust steel road rail sand brick leaf leafDark`. Suburbio: `office officeDark glass paving plaza stone copper curtain leaf leafDark steel rust`. Ningún material nuevo |
| Presupuesto | ≤ 1 400 sólidos elevados nuevos en total; fachadas solo en las manzanas a menos de 60 u del contenido. Primer dibujo de `world.html` se mide antes y después |
| Métrica del objetivo | Dentro del cuadrilátero del *cover*, la selva (con roca) del sangrado baja del 68 % a ≤ 20 % del sangrado visible; test en `sprawl-grid.test.ts` muestreando cada 6 u |

### Desvíos de la implementación

- `coverQuad(aspect, inset)` e `inCoverQuad` viven en `src/map/geo.ts` (el lab
  proyecta `coverQuad` en `coverFrame`): el suburbio solo arma manzanas cuyo
  centro cae en el cover 16:9 ensanchado `COVER_MARGIN = 30` u, porque la
  cámara del sitio nunca va a mostrar el resto. Los hitos quedaron en
  `WATER_TOWER (−114, 242)`, `STADIUM (102, 448)` y `CHURCH (12, 352)`: las
  esquinas propuestas caían fuera del cover.
- Las hileras son de 4 casas por fila (no 5) y los baldíos usan dos
  triángulos (no baldosas): el suburbio pasó de 12 k a 6 k polígonos.
- `sortByDepth` busca pares con un barrido por x de pantalla (mismo orden que
  antes, con test contra la versión de todos los pares): era cuadrático y con
  2 600 sólidos elevados pesaba más que el dibujo.
- La lengua entre el estuario y el mar se adelgaza en dos celdas
  (`spitEast`), no en 104 u: como sliver larga se leía como un error.
- El cinturón verde (`GREEN_BELT`, `y 110..158`) sigue hacia el oeste sobre
  el sangrado: separa el hinterland del suburbio, con sus conos repartidos
  entre las dos escenas por la costura `y = 146` (materiales por zona).
- Un muelle de graneles sobre la bahía (`pier`, x 190..208) con grúa torre:
  la costa al norte del astillero quedaba vacía.
- Medido en headless (Chrome vía CDP, sin GPU, DPR 2, `world.html`): primer
  dibujo caliente 96 ms → 115–130 ms con 17 407 → 25 283 polígonos
  estáticos; peor redibujo sin cambio (5–10 ms, las escenas nuevas son
  estáticas). Selva + roca dentro del cover: 45 % → 7,4 % del total y
  68 % → 7,9 % del sangrado.

## 3. Geografía (`src/scenes/sprawl-grid.ts`, `src/scenes/terrain.ts`)

- `builtAt(x, y): "industrial" | "urban" | null` para puntos fuera de `WORLD`:
  - Sur (`y > WORLD.y1`): agua si `x ≥ QUAY_X` (estuario hasta `estuaryEast(y)`, mar desde 344); si no, urbano hasta `reachAt("s", x)`.
  - Oeste (`x < WORLD.x0`): industrial (`y < ZONE_SPLIT_Y`) o urbano hasta `reachAt("w", y)`.
  - Norte (`y < WORLD.y0`): agua si `x ≥ riverCenter(y) − RIVER_HALF` (la bahía sigue); si no, industrial hasta `reachAt("n", x)`.
  - Esquinas: manda el mayor de los dos alcances; la esquina NO es industrial, la SO urbana.
- `bleedTerrainAt` gana `industrial`, `urban`, `river`, `shore`; `BLEED_MAT` los mapea a `slab`, `asphalt`, `water`, `water`.
- `bleedZ`: `behindDist` se mide desde el borde de la tierra construida, no del contenido.

## 4. Suburbio (`src/scenes/suburb.ts`)

Grilla de manzanas `24×18` con calles de 6, alineada a la del distrito
(`SUBURB_COLS` sigue hacia el oeste cada 30 desde `−84`; `SUBURB_ROWS` sigue hacia el sur cada 24 desde 328, sumando las columnas de la ciudad). Cada manzana tirada por rng según su distancia `d` al contenido (`pickKind`; 12 % son parques a cualquier distancia):

- `d < 60`: zócalo `paving` y dos edificios `office`/`officeDark`/`stone` de h 6..12 con fachada (`floors`, `cols`) y cornisa; farol ámbar en la mitad de las manzanas.
- `60 ≤ d < 160`: hileras: dos filas de cuatro casas de h 3..5 con techo `gable` (`stone`/`office`/`officeDark`) sobre zócalo, dos árboles en el pasillo; 15 % baldíos.
- `d ≥ 160`: la mitad de las manzanas es baldío (`leafDark` liso, a veces una casa suelta), el resto hileras.
- Hitos: un depósito de agua (cilindro `steel` sobre patas, remate `rust`), un estadio bajo (anillo octogonal `stone` con césped `leafDark` encima y cuatro torres de luz), una iglesia (nave `stone` a dos aguas, torre con chapitel `copper` y rosetón ámbar).
- La avenida prolonga `BOULEVARD` hacia el oeste: cordones `paving`, canteros `leafDark` con árboles y faroles.
- Muro de ribera: `plaza` desde `CITY_EDGE.south` hasta `WORLD.y1 + REACH.s` en `x 192..198`, continuación del `westQuay`, con bolardos.

## 5. Hinterland (`src/scenes/hinterland.ts`)

- Norte (`x −200..198`, `y −204..−60`): playa de maniobras con 5 vías E-O
  (`rail`, `YARD_TRACKS_Y`) con vagones en huecos de 10 u y una locomotora,
  dos galpones `concrete` a dos aguas de 60×14, parque de tanques (`TANKS`: 6
  cilindros `steel`/`rust` de r 7..9 con murete `concrete`), batería de silos
  (`SILOS`: 3×2 cilindros `concrete` r 3 h 16 con galería y elevador),
  línea de alta tensión E-O en `y = −196` (8 torres `steel` de 14 con dos
  travesaños y dos cables), acopios `rust`/`sand` con pala cargadora, camiones,
  y el muelle de graneles sobre la bahía (`pier`, x 190..208, con grúa torre y
  contenedores). No hay cantera: la loma queda lejos del cover.
- Oeste (`x −204..−60`, `y −60..110`): dos vías N-S más (`WEST_TRACKS_X`) con
  vagones, patio de contenedores (`CONTAINER_YARD`: pilas `rust`/`steel`
  6×2.4×2.6 hasta 3 de alto, dos pórticos sobre neumáticos), dos galpones
  `concrete` a dos aguas y una nave `brick`, camiones, depósito de agua
  `steel`, faroles cian. Al sur (`y 110..146`) la selva del cinturón verde.
- Nada apoya en agua (salvo el muelle) ni en loma; nada supera 18 salvo silos,
  torres y el elevador (esbeltos).

## 6. Criterios de aceptación

1. `lab/world.html` con tecla `4`: sin cielo; el estuario y el mar salen del
   encuadre sin cortarse; selva + roca ≤ 20 % del sangrado visible.
2. Tests verdes: terreno, mundo (materiales por zona), escenas nuevas
   (determinismo, materiales, alturas, nada en agua, presupuesto).
3. Primer dibujo de `world.html` ≤ 150 ms caliente en el mismo headless de la
   medición de Mundo 2; peor redibujo sin cambio (las escenas nuevas son
   estáticas).

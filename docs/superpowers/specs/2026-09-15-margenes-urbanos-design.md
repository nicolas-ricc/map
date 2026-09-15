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
(`WEST_COLS` sigue hacia el oeste cada 30 desde `−84`; las filas siguen hacia el sur cada 24 desde 330). Cada manzana tirada por rng según su distancia `d` al contenido:

- `d < 60`: zócalo `paving` y dos o tres edificios `office`/`officeDark`/`stone` de h 6..12 con fachada (`floors`, `cols`), o un clásico de piedra bajo con cornisa.
- `60 ≤ d < 160`: casas en hilera: 4..6 prismas de h 3..5 con techo `gable` (`stone`, `office`) sobre zócalo; cada tercera manzana, un parque (`leafDark` con conos `leaf`).
- `d ≥ 160`: la mitad de las manzanas queda vacía (baldío `leafDark`), el resto casas sueltas; sin faroles.
- Hitos, uno por cuadrante: un depósito de agua (cilindro `steel` sobre patas), un estadio bajo (anillo `stone` con césped), una iglesia con torre (`stone`, cúpula `copper`).
- Faroles ámbar cada segunda manzana en `d < 60`; carriles discontinuos solo en la avenida que prolonga `BOULEVARD` hacia el oeste.
- Muro de ribera: `plaza` desde `CITY_EDGE.south` hasta `WORLD.y1 + 100` en `x 192..198`, continuación del `westQuay`.

## 5. Hinterland (`src/scenes/hinterland.ts`)

- Norte (`x −60..198`, `y −204..−60`): playa de maniobras con 5 vías E-O
  (`rail`) que prolongan `SIDING_Y`, vagones, dos galpones de dientes de sierra
  (`brick`, `ramp`), parque de tanques (6 cilindros `steel`/`rust` de r 6..9,
  con murete `concrete`), batería de silos (`concrete`, r 3, h 16, esbeltos),
  línea de alta tensión (torres `steel` de 14 con travesaños, cada 48 u, rumbo
  NO hacia las lomas), y la cantera: un escalón `sand`/`rock` cortado en la
  loma al NO con una cinta hacia el sur.
- Oeste (`x −204..−60`, `y −60..146`): continuación de las tres vías N-S de
  `RAIL_YARD_X` hacia el oeste con dos vías más, patio de contenedores (pilas
  `rust`/`steel` 6×2.4×2.6 hasta 3 de alto), galpones `concrete` a dos aguas,
  estacionamiento de camiones, tanque de agua `steel`, faroles cian cada 40 u.
- Nada apoya en agua ni en loma; nada supera 18 salvo silos y torres (esbeltos).

## 6. Criterios de aceptación

1. `lab/world.html` con tecla `4`: sin cielo; el estuario y el mar salen del
   encuadre sin cortarse; selva + roca ≤ 20 % del sangrado visible.
2. Tests verdes: terreno, mundo (materiales por zona), escenas nuevas
   (determinismo, materiales, alturas, nada en agua, presupuesto).
3. Primer dibujo de `world.html` ≤ 150 ms caliente en el mismo headless de la
   medición de Mundo 2; peor redibujo sin cambio (las escenas nuevas son
   estáticas).

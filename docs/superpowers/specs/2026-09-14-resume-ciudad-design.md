# Resume: ciudad de oficinas en el mundo isométrico — diseño

**Fecha:** 2026-09-14
**Estado:** implementada (2026-09-14)
**Antecede:** `2026-09-14-mundo-isometrico-design.md` (§5 y "Rulings de la parte 1")
**Alcance:** la escena Resume dentro del laboratorio (`lab/world.html`,
`lab/resume.html`). La reintegración al sitio sigue siendo spec aparte.

## 1. Objetivo

Bajar a detalle el §5 de la spec del mundo: una ciudad de oficinas en grilla,
tragada por la selva, con una torre de 30 con un solo piso encendido como
landmark, cortada por el estuario que la parte 1 dejó en el medio de la zona.
Comparte terreno, seed por zona, `Animator` y runtime con el astillero, y
cumple el piso de calidad de la spec del mundo (≥ 250 sólidos elevados, ≥ 8
materiales, ≥ 2 animaciones, un elemento hundido y uno elevado, altura máxima
18 salvo el landmark).

Decisiones de esta spec que corrigen o precisan a §5:

| Tema | Decisión |
|---|---|
| Riberas | La ciudad ocupa las dos riberas del estuario y la avenida las une con un puente |
| Módulo | Manzana 24×18, calle 6 (período 30×24). §5 decía 30×24 con calle 6; con el estuario entraban 20 manzanas y §8 pide ≥ 30 |
| Calles y cordón | El terreno de la ciudad es asfalto plano; cada manzana es un zócalo (prisma chato de `paving`). Los tipos de terreno a distinta z se unen con talud, no con escalón, así que no sirven para cordones |
| Generación | Híbrida: grilla determinista de constantes, contenido de cada manzana por `rng` con pesos, excepciones fijas (plaza, puente, derrumbe, cráteres) |
| Texturas | Ninguna. Materiales de cinco tonos y patrones procedurales (fachadas, `toneOffset`, `strip`) |
| Landmark | `LANDMARKS.cv` pasa de (130, 206) a (129, 227) |
| Ruling para el plan 3 | §6 le da `paving` al sendero del faro; rompe la regla de materiales exclusivos. El Blog usa `rock` o `whitewash` para el sendero |

### Desvíos de la implementación

Decisiones del controller, tomadas al planificar (Task 1) o durante las
Tasks 4..7, que corrigen los números y rulings de arriba y de §2.

| Tema | Decisión |
|---|---|
| Columnas este y cráter | Columnas este en x 280 y 310 (no 276 y 306) y malecón en 334..344 (no 330..344): con 276 la manzana de la fila 218..236 quedaba a menos de una calle del agua (`estuaryEast(236) ≈ 272.5`). El cráter este pasa a (307, 224) para caer en la calle 304..310. El puente llega a x 276, donde termina la calle del anillo este |
| Anillo este y borde sur | Anillo este en 270..276 (no 274..280) y borde sur de la ciudad en y 264 (no 266): los límites que clasifican terreno tienen que ser múltiplos de `CELL = 6` (`buildTerrain` clasifica cada celda por su centro). Queda una vereda de 4 entre el anillo y la columna de x 280, y una calle sur de 4 (260..264) |
| Plaza y manzanas devoradas | La plaza no es un prisma: sus baldosas son un `ground` de `plaza` a nivel de calle (z 0.05) con `toneOffset`, rodeado por un cordón de cuatro prismas finos; la torre apoya a z 0. Un `ground` se dibuja antes que los sólidos, así que no puede pintarse sobre el techo de un prisma. Las manzanas devoradas usan el mismo esquema (`ground` de `leafDark` + losas de zócalo sueltas) |
| Cornisa | No usa `toneOffset` (un prisma no lo tiene): se hace con el material contrario (`officeDark` sobre `office` y viceversa). En los edificios con techo `step`, la cornisa y el detalle de techo se apoyan sobre la huella del escalón superior (inset `STEP_INSET = 0.2`), no sobre la base completa: un elemento de ancho completo quedaría flotando sobre el retranqueo |
| Escalera del malecón | Se abre hacia adentro (x 338..344) para no pisar la zona Blog |
| Parpadeo | Apaga el piso encendido durante **un tick** (el siguiente `tick` lo vuelve a encender), no 100 ms fijos: así "nunca dos frames apagados seguidos" es verificable con cualquier `dt` |
| Derrame de luz de la plaza | Los cuatro derrames dejaron de ser `dot` r 3: son dos polígonos octogonales `amberBleed` planos (z 0.12, alpha ≈ 0.55) sobre las baldosas al este de la torre. La franja sur de la plaza queda tapada por los edificios de la fila 3 desde la cámara, así que ahí no hay derrame |
| Papeles | Derivan al **NNE** (`{ x: 0.45, y: -0.893 }`), no al ENE: con la proyección `sx = x - y`, `sy = (x + y)/2 - 1.4 z`, ENE se veía cayendo hacia abajo a la derecha. Cada papel tiene desvío lateral (±1.5, entra gradualmente en 5 u), factor de velocidad 0.8..1.2, gana altura 0.15 u por unidad recorrida y se encoge de r 0.4 a 0.12 en el último tercio antes de reciclarse |
| Selva, autos y postes | La selva de los cinturones norte y sur y de la ribera este rechaza conos cuyo círculo toque el estuario. Los autos rechazan superposiciones entre sí y con el cuarto bloque caído. Los postes (faroles, semáforos) apoyan sobre la superficie que tienen debajo (asfalto 0, zócalo 0.3, plaza 0.05) y se omiten sobre el muelle oeste y las rampas del puente |
| Boulevard este y estribo | El boulevard este arranca en x 283 (no 280) para no tocar la rampa del puente. Hay un estribo `plaza` bajo el tablero sobre el muelle oeste (x 192..198, z 0.6..1.2) |
| Derrumbe | La rampa al agua va de x 274 a 286 (su labio bajo llega al agua en toda la manzana), la plataforma de `paving` va de 286 a 304, y los tres bloques hundidos están en el agua sin cruzarse; el cuarto bloque cayó en la calle frente al malecón |
| Carriles | Las rayas de carril saltan los cráteres y no hay cebra bajo el tablero del puente (x 273) |
| Tanque de agua | La pata mide 1.1 (no 1.2) para que el filtro de "autos" de los tests no la cuente |
| Presupuesto | Primer dibujo ≈ 50 ms; peor redibujo 3–5 ms (un pico de 14 ms), por encima de los 3 ms que mencionaba el plan; aceptado, a revisar en el plan 3 |
| Test de `city-grid` | El test "entre manzanas vecinas" comparaba dos arrays distintos de `blocks()`; se corrigió para iterar una sola lista |

## 2. Grilla y geometría

Coordenadas de mundo. Resume es x 0..344, y 146..270. El estuario ocupa
x ≥ `QUAY_X` (198) hasta `estuaryEast(y)`, que va de ≈ 247 en y 164 a ≈ 281
en y 260.

### Terreno (`cityTerrainAt`)

- `water`: el estuario, como hoy.
- `jungle`: cinturón de costura (y < 158), borde oeste (x < 12), borde sur
  (y ≥ 266), ribera este del estuario (desde el agua hasta x 270) y los tres
  cráteres.
- `asphalt`: todo el resto. Tipo nuevo de `Terrain`, z 0, jitter 0.1, material
  `asphalt`. Es la calle.
- `paving` deja de ser tipo de terreno (nadie lo devuelve).

### Módulo y tramos

Manzana 24×18, calle 6.

| Eje | Tramos |
|---|---|
| Columnas oeste (x) | 12..36, 42..66, 72..96, 102..126, 132..156, 162..186; calle 186..192; muelle oeste 192..198 |
| Columnas este (x) | ribera de selva hasta 270; calle (anillo) 270..276; vereda 276..280; 280..304; calle 304..310; 310..334; malecón 334..344 |
| Filas (y) | calle 158..164; 164..182; calle 182..188; 188..206; avenida 206..218; 218..236; calle 236..242; 242..260; calle sur 260..264 (4 u, alineada a `CELL`) |

Cuenta: 22 manzanas oeste (24 menos las dos que une la plaza) + plaza + 7
este + derrumbe = 31.

### Piezas fijas

- **Zócalos.** Cada manzana es un prisma `paving` h 0.3 con su huella; los
  edificios se apoyan a z 0.3. El cordón es el escalón del zócalo.
- **Plaza y torre.** La plaza une las columnas 102..126 y 132..156 de la fila
  218..236: zócalo `plaza` 54×18 en (102, 218). Torre 16×14 centrada en
  (129, 227).
- **Avenida.** y 206..218, boulevard central de 4 u (`leafDark` bajo + conos;
  el tramo este arranca en x 283, no 280, para no tocar la rampa del puente).
  Cruza el estuario por el puente: tablero `asphalt` de x 192 a 276 en
  y 207..217 (10×84), z 1.2 h 0.6; rampas `asphalt` de 6 u en cada cabecera
  (`dir` `w` y `e`); cuatro pilotes `plaza` 2×10 desde z -1 (x 210, 228, 246,
  264); un estribo `plaza` bajo el tablero sobre el muelle oeste (x 192..198,
  z 0.6..1.2, para que el tablero apoye y no flote); barandas `officeDark`
  0.3×84×0.8 a cada lado; dos faroles cerca de cada cabecera; dos autos
  detenidos.
- **Muelle oeste.** Muro `plaza` en x 192..198 desde z -1 hasta 0.6, con
  escalera al agua (rampa) a la altura y 194..200 y dos bolardos.
- **Derrumbe.** La manzana 280..304 × 242..260, donde el estuario llega a
  x ≈ 275: rampa `asphalt` hacia el agua (`dir: "w"`) de x 274 a 286 (su
  labio bajo llega al agua en toda la manzana), plataforma `paving` de 286 a
  304, tres bloques `officeDark` a z -0.4..-0.7 asomando del agua sin
  cruzarse, y uno más caído en la calle 236..242 frente al malecón. Es el
  elemento hundido de la zona.
- **Malecón.** Zócalo `paving` 334..344 × 158..266 a z 0.6 cuyo lado este baja
  hasta z -1: es el muro de mar de la costura con el Blog y tapa el talud del
  terreno entre asfalto y `shore`. Parapeto 0.8 sobre x 342.5..344, escalera
  hacia adentro (x 338..344, para no pisar la zona Blog) en y ≈ 227, cuatro
  bancos, tres faroles ámbar, bolardos.
- **Cráteres.** Círculos fijos de selva sobre calles: (60, 185) r 5,
  (150, 239) r 6, (307, 224) r 5. `inCrater(x, y)` los expone para el terreno
  y la escena.

## 3. Catálogo de objetos

### Manzana: `block(rng, rect, opts)`

Elige un tipo por pesos y devuelve sólidos y acentos sobre el zócalo (z 0.3),
con vereda libre de 1.5 u en el perímetro (huella útil 21×15). `opts.maxH`
permite topar la altura (ver §5, orden de dibujo).

| Tipo | Peso | Contenido |
|---|---|---|
| Torre única | 30 % | Prisma `office` 12×10 a 14×12, h 12..18, fachada 4..6 pisos × 3..4 columnas, base `glass` o `portico` |
| Dos medianos | 30 % | Dos prismas `office`/`officeDark` 9×13, h 7..10, fachada 3 pisos × 2..3 columnas, pasaje de 2 u entre ambos |
| Bajo con patio | 20 % | Prisma en L (dos prismas `office`) h 4..6, techo `step`, patio interior con dos conos `leaf` |
| Devorada | 20 % | Zócalo partido en 2..3 losas, `ground` `leafDark` con `toneOffset`, 6..9 conos `leaf`/`leafDark` r 2..4 h 5..9, y una ruina: prisma `officeDark` h 2..3 sin fachada |

Toda manzana construida lleva:

- Cornisa: prisma h 0.4 que sobresale 0.5 por lado, mismo material,
  `toneOffset` +1 en el techo.
- Losas entre pisos: las emite la fachada. Pisos de 3 u: `floors = round(h / 3)`.
  La fachada se aplica solo a prismas de h ≥ 4; ruinas y salas de máquinas van
  lisas.
- Un detalle de techo por rng: tanque de agua (cilindro `rust` r 1.2 h 2 sobre
  cuatro postes `steel`), sala de máquinas (prisma `officeDark` 4×3×2), antena
  (cilindro `steel` r 0.2 h 4) o terraza con selva (dos conos `leaf` chicos).

### Landmark

Torre `officeDark` 16×14, h 30, fachada 8 pisos × 4 columnas, base `portico`,
`litFloor` 5 en `amber`. Cornisa, sala de máquinas 6×4×2.5, antena `steel` h 5
con esfera de luz `amberMid` (acento `dot` r 1). Selva trepando: cuatro conos
`leaf` en la base y dos prismas finos `leaf` (0.6×0.6) pegados a las aristas
NO y SE hasta z 12. En la plaza, cuatro dots `amberBleed` r 3 como derrame de
luz, cuatro bancos (`prism` `paving` 2×0.6×0.5) y dos faroles.

### Calle y avenida

- Carriles: `strip` `paving` de 0.4 discontinuas (tramo 3, hueco 2) por el
  eje de cada calle. En la avenida, doble línea continua y sendas peatonales
  (cinco `strip` de 0.5 paralelas) en cada cruce con las columnas.
- Semáforos en las esquinas de la avenida: poste `steel` r 0.15 h 4 + caja
  `officeDark` 0.5×0.5×1.2, apagados.
- Faroles solo en la avenida, el puente y el malecón: poste `steel` h 5, dot
  `amber` r 0.6, cada 12 u.
- Autos: prisma `steel` o `rust` 3×1.5×1.2 pegados al cordón, 1..3 por manzana
  en las calles E-O, orientación por rng.

### Selva

Cinturón norte, borde oeste, ribera este y borde sur: conos `leaf`/`leafDark`
r 2..4 h 5..9 a la densidad del astillero. `jungle()` de `shipyard.ts` se
extrae a `src/scenes/flora.ts` como `jungle(out, rng, rect, density)` y lo
usan ambas escenas. Cráteres: 4..6 conos cada uno. Nunca conos sobre asfalto
fuera de cráteres y manzanas devoradas.

### Conteo estimado

~330 sólidos elevados; 6 materiales exclusivos + 5 compartidos; altura máxima
18 salvo la torre (30).

## 4. Materiales y patrones

No hace falta ningún material ni color nuevo.

| Material | Uso en Resume | Exclusivo |
|---|---|---|
| `office` | edificios comunes, cornisas, ruinas | sí |
| `officeDark` | torre, segundos edificios, salas de máquinas, barandas, bloques del derrumbe | sí |
| `glass` | ventanas y vidrieras (fachada) | sí |
| `asphalt` | terreno de calles, puente y rampas, rampa del derrumbe | sí |
| `paving` | zócalos, malecón, carriles, sendas, bancos | sí (ver ruling del sendero en §1) |
| `plaza` | zócalo de la plaza, muelle oeste, pilotes del puente | sí |
| `leaf`, `leafDark` | selva, boulevard, cráteres, terrazas | compartido |
| `water` | estuario | compartido |
| `steel`, `rust` | autos, postes, tanques, antenas, bolardos | compartido (vehículos y mobiliario) |

Patrones, todos con el motor actual:

- **Fachadas.** Losas un tono más oscuro, ventanas `glass` con el tono de la
  pared, planta baja `glass` o `portico`.
- **Piso encendido.** `facadeAccents` sobre las paredes visibles de la torre en
  `amber`; el runtime las pinta con blend aditivo.
- **Baldosas rotas.** El techo del zócalo de la plaza se emite como `ground`
  de triángulos con `toneOffset` ±1 en un tercio, por rng. Cráteres y manzanas
  devoradas hacen lo mismo en `leafDark`.
- **Cordón.** Escalón de 0.3 del zócalo; lo dibujan las paredes del prisma.
- **Carriles y sendas.** `strip` a z 0.02 sobre el asfalto; van después del
  terreno por orden de inserción, como los rieles del astillero.
- **Cornisa.** `toneOffset` +1 en el techo para que lea como borde claro.

Acentos: `amber` (piso encendido, faroles), `amberMid` (antena, papeles),
`amberBleed` (derrame en la plaza). Cian y magenta no aparecen en la zona.

## 5. Integración con el mundo

- **`src/map/geo.ts`.** Recibe `DOCK`, `QUAY_X`, `QUAY_W`, `BOTTOM` y
  `eastBank` desde `shipyard.ts` (que los re-exporta). `terrain.ts` deja de
  importar una escena.
- **`src/scenes/city-grid.ts`.** Módulo puro sin rng con las constantes de §2
  (`BLOCK_W = 24`, `BLOCK_D = 18`, `STREET = 6`, `AVENUE`, `WEST_COLS`,
  `EAST_COLS`, `ROWS`, `PLAZA`, `BRIDGE`, `MALECON`, `CRATERS`, `COLLAPSED`) y
  las funciones `blocks(): BlockRect[]`, `estuaryEast(y)` (se muda desde
  `terrain.ts`) e `inCrater(x, y)`. `terrain.ts` y `city.ts` leen de ahí, así
  la clasificación del terreno y los sólidos no pueden desalinearse.
- **`src/scenes/terrain.ts`.** `Terrain` suma `asphalt` y pierde `paving`;
  `cityTerrainAt` clasifica como dice §2; `TerrainMesh.ground` incorpora
  `ground("asphalt")`.
- **`src/scenes/city.ts`.** `city(rng): CityScene`:

  ```ts
  interface CityScene {
    ground: Solid[];   // strips de carriles, ground de plaza y cráteres
    solids: Solid[];
    accents: Accent[]; // ventanas encendidas, faroles, derrame, antena
    tower: { facadeWalls: Face[]; litWindows: Accent[]; antenna: Vec3; paperWindow: Vec3 };
  }
  ```

  Funciones por sector, como en `shipyard.ts`: `plinths`, `blocks` (llama a
  `block`), `plazaAndTower`, `avenue`, `bridge`, `westQuay`, `malecon`,
  `collapsed`, `craters`, `jungle` (de `flora.ts`), `cars`, `lamps`.
- **`src/scenes/city-anim.ts` y `city-animator.ts`.** Mismo par que el
  astillero: `createCityAnim` puro con estado y `cityAnimator(scene, rng,
  opts): Animator` con tres ids, todos de capa `accent`: `city.lit`,
  `city.papers`, `city.antenna`. Ningún id `solid` ni `water`: la ciudad no
  mueve sólidos y el estuario es el río del astillero, que ya ondula.
- **`src/scenes/world.ts`.** `WorldScene` suma `city: CityScene | null`;
  `world()` llama a `city(zoneRng(seed, "cv"))` si la zona está pedida y
  concatena `ground`, `solids`, `accents`. `LANDMARKS.cv = v3(129, 227, 0)`.
- **Laboratorio.** `src/lab/page.ts` exporta `bootWorldPage(zones?, frame?)`:
  arma `world(SEED, { zones })`, los animadores que correspondan (astillero si
  hay `shipyard`, ciudad si hay `city`) y llama a `bootLab`. `portfolio.ts` y
  `world.ts` pasan a ser entradas de dos líneas. Se suma `lab/resume.html` +
  `src/lab/resume.ts` con `zones: ["portfolio", "cv"]` y `frame: "cv"` (el
  astillero entra para que la costura de selva se vea). `runtime.ts` no cambia.
- **Orden de dibujo.** Los acentos van sobre todo lo demás, así que las
  ventanas encendidas se verían aunque una torre vecina estuviera delante en
  profundidad. Ruling: nada en la fila 242..260 dentro de x 96..162 supera
  h 10 (`block` lo recibe en `opts.maxH`).
- **Costuras.** Norte: cinturón de selva 146..158 más conos de ambas escenas.
  Este: el malecón termina a z 0.6 en x 344 y el terreno pasa a `shore` a
  z -1; el muro del malecón tapa el talud. Sur y oeste: bordes del diorama en
  selva, como el astillero.

## 6. Animaciones

Tres, todas en capas `accent`; con `reduced-motion` quedan en el frame 0 y
`tick` nunca devuelve ids.

- **Parpadeo.** El piso encendido se apaga un frame (100 ms) cada 4..9 s por
  rng; nunca dos apagados seguidos. Frame 0 = encendido. `city.lit` devuelve
  las ventanas o una lista vacía.
- **Papeles.** 5..8 dots `amberMid` r 0.4 que nacen en `paperWindow` (una
  ventana del piso encendido en la pared este), derivan al ENE a 4 u/s con un
  seno vertical de amplitud 1.5 y período 2 s, y se reciclan a 30 u con fase
  nueva. Frame 0: todos en la ventana.
- **Antena.** Dot en `antenna` con radio 0.8 + 0.3·(1 + sin(t / 1200)).
  Frame 0: radio 1.1.

## 7. Tests y verificación

Patrón de `shipyard.test`, sin Pixi.

- `city-grid.test`: manzanas ≥ 30; ninguna pisa una calle ni el estuario
  (`estuaryEast`); ninguna cruza x 344 ni y 146; plaza y derrumbe en su lugar;
  `inCrater` solo sobre asfalto.
- `terrain.test` (suma): en la zona cv solo salen `asphalt`, `jungle`,
  `water`; los vértices en y = 146 y x = 344 mantienen la altura que tienen
  hoy; la costura este sigue siendo mar a z -1.
- `city.test`: determinismo por seed; edificios con fachada ≥ 25; nada supera
  18 salvo la torre (30); ningún sólido usa materiales del astillero salvo
  `steel`/`rust` en autos y mobiliario; ninguna base de edificio fuera de un
  zócalo; ningún cono sobre asfalto fuera de cráteres y devoradas; todo dentro
  de x 0..344, y 146..270 salvo la selva del cinturón; nada de h > 10 en la
  fila sur frente a la torre.
- `city-anim.test`: parpadeo sin dos apagados seguidos en 60 s simulados;
  papeles a ≤ 30 u de la ventana; antena entre 0.8 y 1.4; con `reducedMotion`
  `tick` nunca devuelve ids.
- `world.test` (suma): con `zones: ["cv"]` hay ciudad y no astillero;
  `LANDMARKS.cv` cae dentro de la huella de la torre.
- `lab-excluded.test` ya cubre `lab/resume.html`.
- Visual: captura de `lab/resume.html` y `lab/world.html` a 1600×900 al
  cerrar; primer dibujo < 150 ms medido en consola.

## 8. Orden de implementación

Cada paso deja `npm test` y `npm run typecheck` verdes.

1. Mudar `DOCK`, `QUAY_X`, `QUAY_W`, `BOTTOM`, `eastBank` a `geo.ts`; extraer
   `flora.ts`.
2. `city-grid.ts` con sus tests; `estuaryEast` se muda ahí.
3. `terrain.ts`: `asphalt`, cráteres, ribera este; quitar `paving` como terreno.
4. `city.ts` en dos tandas: zócalos, manzanas, plaza y torre; después avenida,
   puente, muelle, malecón, derrumbe, autos, faroles, selva.
5. `city-anim.ts` + `city-animator.ts`.
6. `world.ts`, `page.ts`, `lab/resume.html`, capturas y presupuesto.
7. Actualizar la spec del mundo (estado, ruling del sendero del faro) y el
   README del laboratorio.

## 9. Fuera de alcance

- Reintegración al sitio (hover, cámara, panel): spec aparte.
- Blog (plan 3): el mar sigue estático; el malecón ya deja la costura lista.
- Rotar luz o cámara, texturas, sprites, sonido.

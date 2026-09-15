# Mundo 2: sombras, sangrado, fábrica, distrito moderno y Blog — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar las sombras, agrandar el mundo con sangrado para la cámara *cover*, sumar la fábrica detrás del astillero, el distrito moderno de Resume y la zona Blog (punta, faro, fosa de agua profunda y barcos que se van), con zonas clickeables por geografía.

**Architecture:** El motor puro (`src/iso/`) gana dos bandas de sombra, `hull.heading` y ventanas parametrizables. `src/map/geo.ts` fija `WORLD`, `BLEED`, `abyssX` y el `worldZoneAt` geográfico; `terrain.ts` agrega la fosa y una segunda grilla de sangrado. Tres escenas nuevas (`factory.ts`, `district.ts`, `sea.ts`) se concatenan en `world.ts`; cada una con su `Animator` (`factory-animator.ts`, `sea-animator.ts`). Pixi sigue solo en `src/lab/`: el runtime suma `AlphaFilter` por banda de sombra, alpha por capa animada y `claims` de agua.

**Tech Stack:** TypeScript strict, Vite 8, pixi.js 8.20 (solo `src/lab/`), Vitest 5. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-14-mundo-2-fabrica-distrito-blog-design.md` (más los rulings de `2026-09-14-mundo-isometrico-design.md` §4 y los desvíos de `2026-09-14-resume-ciudad-design.md`).

## Global Constraints

- `src/iso/` y `src/scenes/` **no importan `pixi.js`** (`src/iso/pixi-free.test.ts`). Solo `src/lab/runtime.ts` y `src/lab/draw.ts` tocan Pixi.
- Proyección: `sx = x - y`, `sy = (x + y) / 2 - z * 1.4`. `x` este, `y` sur, `z` arriba. Cámara al SE: caras visibles este (+x) y sur (+y). Un vector con `x + y > 0` baja en pantalla; lo que "sube con el viento" va al NNE `{ x: 0.45, y: -0.893 }`.
- **Ningún literal `0x......` fuera de `palette.ts`, `palette-iso.ts` y `seed.ts`** (`palette-guard.test.ts`).
- Suelo (`ground`, `strip`) se pinta antes que los sólidos y el agua antes que el suelo: nada plano puede pintarse sobre un techo ni sobre un zócalo. Los acentos se pintan arriba de todo.
- Límites que clasifican terreno: múltiplos de `CELL = 6`. Los del sangrado, múltiplos de `CELL_BLEED = 18`.
- Materiales exclusivos por zona. Compartidos: `leaf`, `leafDark`, `rock`, `water`, `waterDeep` (naturaleza) y `steel`, `rust`, `hull` (vehículos, grúas, barcos). Acentos: Portfolio cian, Resume ámbar, Blog magenta (más `cyanMid` en la luz de estribor).
- Alturas: nada no esbelto supera 18 salvo torre (30), faro (~29.6 sobre roca) y grúa pórtico (24); el distrito llega a 24. Esbelto = `r ≤ 3` o lado `≤ 3` (chimeneas, mástiles). `SHADOW_MAX_H = 18`.
- Con `reducedMotion: true` un `Animator` nunca devuelve ids en `tick` y sus capas quedan en el frame 0.
- Rng: `createRng(seed)` da `{ next(), int(min, max), chance(p), pick(arr) }`. Toda escena es determinista por seed.
- El laboratorio **no entra en `dist/`** (`lab-excluded.test.ts`).
- Texto y comentarios en español. Commits `feat:`, `test:`, `refactor:`, `docs:`. `npm test` y `npm run typecheck` verdes al final de cada task.
- Comandos de captura (memoria del repo): `agent-browser set viewport 1600 900 2` antes de `open`; servidor en `http://127.0.0.1:PORT/map/lab/<página>.html`; teclas `0..4` encuadran; recortar con `magick in.png -crop WxH+X+Y +repage out.png`.

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/iso/light.ts` | modificar | `SHADOW_CORE_H`, `shadowPoint(p, maxH)`, `shadowPolygon(s, maxH)` |
| `src/iso/render-list.ts` | modificar | capa `shadowCore`, `SHADOW_BAND_ALPHA`, un ítem por banda por sólido |
| `src/iso/depth.ts` | modificar | exporta `overlaps` |
| `src/iso/facade.ts` | modificar | `Facade.window?: { w, h }` |
| `src/iso/solids.ts` | modificar | `hull.heading?` |
| `src/map/palette-iso.ts` | modificar | sombra `0x2a1a3a`; materiales `abyss`, `brick`, `curtain`, `stone`, `copper` |
| `src/map/geo.ts` | modificar | `WORLD`, `BLEED`, `CELL_BLEED`, `SHORE_W`, `shoreWidth`, `abyssX`, `worldZoneAt` geográfico |
| `src/scenes/terrain.ts` | modificar | `abyss`, `bleedTerrainAt`, `bleedZ`, `buildBleed`, `headlandZ` exportado, grilla sobre `WORLD` |
| `src/scenes/pieces.ts` | crear | `towerCrane()` compartida (fábrica y obra) |
| `src/scenes/factory.ts`, `factory-anim.ts`, `factory-animator.ts` | crear | fábrica, humo, adaptador `Animator` |
| `src/scenes/shipyard.ts` | modificar | muro del muelle hasta `WORLD.y0` |
| `src/scenes/city-grid.ts` | modificar | columnas/filas nuevas, `DISTRICT_*`, `SITE`, `kind: "district" \| "site"`, `MALECON.y1` |
| `src/scenes/city-pieces.ts` | crear | `prism`, `tiles`, `lamp`, `brokenTone` mudados de `city.ts` |
| `src/scenes/district.ts` | crear | torre de vidrio, clásico, campus, obra; `maxDistrictHeight` |
| `src/scenes/city.ts` | modificar | usa `city-pieces`, delega manzanas de distrito, rectángulos de selva sobre `WORLD` |
| `src/scenes/sea.ts`, `ships.ts`, `sea-anim.ts`, `sea-animator.ts` | crear | punta, faro, boyas, pecio; barcos; mar, ruta, haz; adaptador |
| `src/scenes/animator.ts` | modificar | `AnimLayer.alpha?`, `Animator.claims?` |
| `src/scenes/world.ts` | modificar | `factory`, `sea`, `zoneRng(seed, zone, part)`, `LANDMARKS.blog` |
| `src/lab/draw.ts` | modificar | `zoneFrame` sobre `WORLD`, `coverFrame(aspect)`, `LabFrame` |
| `src/lab/runtime.ts` | modificar | sangrado, bandas de sombra con `AlphaFilter`, alpha por capa, `claims`, tecla `4` |
| `src/lab/page.ts` | modificar | animadores de fábrica y mar |
| `src/lab/blog.ts`, `lab/blog.html` | crear | página Blog (mundo entero, encuadre `blog`) |
| Tests | crear/modificar | `light`, `render-list`, `depth`, `facade`, `solids`, `palette-iso`, `geo`, `terrain`, `draw`, `world`, `shipyard`, `factory*`, `city-grid`, `city`, `district`, `sea*`, `ships`, `lab-excluded` |
| Docs | modificar | spec (desvíos), specs anteriores (estado), README, memoria |

**Desvíos respecto de la spec, decididos al planificar** (se documentan en la Task 7):

- `WORLD = { x0: -60, y0: -60, x1: 570, y1: 336 }` (no 560/330) y `BLEED = { x: 324, y: 270 }` (no 320/260): el sangrado es una grilla de 18 anclada en la esquina del contenido, así que el ancho y el alto del contenido tienen que ser múltiplos de 18 (630 = 35·18, 396 = 22·18) y los sangrados también. Blog gana 10 al este y Resume 6 al sur (selva). `Wx + Wy = 1278 + 936 = 2214 ≥ 2182`, que es lo que pide la caja `1026 × 555` del contenido con la torre.
- El vértice de sangrado que cae sobre la costura toma la **z base del terreno del contenido** en ese punto (no 0.6): al norte del astillero el borde es losa de fábrica (z 0). Entre dos vértices de sangrado (18 u) el borde del contenido puede cambiar de tierra a agua: queda una grieta de ≤ 1.6 u en esos pocos puntos, aceptada.
- Piso de calidad Blog: **≥ 110 sólidos elevados** (no 250), contando arrecife (hasta 40 conos), pedruscos (20), roca (6 `poly`), faro, casa, boyas, pecio (≥ 80 estáticos) y los tres barcos (~30). La spec heredó 250 de la spec del mundo; el usuario pidió que el Blog sea agua.
- Ruta de barcos: `(290, -6) → (350, 10) → (405, 50) → (436, 78) → (444, 118) → (470, 172) → (530, 224) → (600, 260)`. La de la spec pisaba la selva del muelle de alistamiento (x 330..344, y ≥ 24) y no cumplía `x > 430` con `|y − 118| < 40`.
- Pecio en `(462, 150)` con heading 30° (la spec decía 466, 156): separado 12 u de la ruta. La boya del pecio sigue en `(470, 160)`, que es `LANDMARKS.blog`.
- Terraza verde de las torres de vidrio: prisma fino de `leafDark` (0.3) más conos, no `ground` (un `ground` no puede pintarse sobre un techo). Losas de la obra en `paving` y núcleo en `officeDark` (`concrete` es del astillero). Contrapeso de la grúa en `steel`.
- Boyas: parpadeo 1 s encendida / 1 s apagada, desfasadas 1 s. El test verifica que en un período de 2 s cada boya está encendida ≥ 1 s y que nunca están las dos apagadas a la vez (la frase "nunca dos ticks apagadas seguidas" de la spec era del parpadeo de la torre).
- Las manzanas de distrito usan un `Rng` propio (`zoneRng(seed, "cv", 1)`), así las manzanas viejas no se re-sortean. Los autos y la selva sí cambian de lugar (iteran manzanas nuevas).
- `Facade` gana `window?: { w: number; h: number }` (fracciones de columna y de piso; default 0.5/0.5). La spec hablaba de `floorH`/`sill`, que no existen en el motor; el muro cortina se logra con `window: { w: 0.85, h: 0.8 }` y `cols` denso.

---

### Task 1: Sombras en dos bandas, uniformes y de atardecer

**Files:**
- Modify: `src/iso/light.ts:33-58`
- Modify: `src/iso/render-list.ts`
- Modify: `src/map/palette-iso.ts:40` (`shadow`)
- Modify: `src/lab/runtime.ts`
- Test: `src/iso/light.test.ts`, `src/iso/render-list.test.ts`

**Interfaces:**
- Produces: `SHADOW_CORE_H = 9`; `shadowPoint(p: Vec3, maxH = SHADOW_MAX_H): Vec2`; `shadowPolygon(s: Solid, maxH = SHADOW_MAX_H): Vec2[] | null`; `type Layer = "ground" | "shadow" | "shadowCore" | "solid"`; `SHADOW_BAND_ALPHA = 0.3` (reemplaza a `SHADOW_ALPHA`). `buildRenderList` emite por sólido elevado un ítem `shadow` y luego uno `shadowCore`, ambos antes de todo `solid`.
- Runtime: `shadowSlot` y `coreSlot` (contenedores con `AlphaFilter`); las `Graphics` de sombra de cada sólido animado viven ahí, no en `solidSlot`. Las tasks 3 y 6 agregan sólidos animados y heredan esto sin tocar nada.

- [ ] **Step 1: Tests del motor**

En `src/iso/light.test.ts`, dentro de `describe("shadowPolygon")`, agregar:

```ts
  it("el núcleo recorta la sombra a SHADOW_CORE_H y cabe dentro de la completa", () => {
    const s: Solid = { kind: "prism", at: v3(0, 0, 0), w: 1, d: 1, h: 20, mat: "steel" };
    const full = shadowPolygon(s)!, core = shadowPolygon(s, SHADOW_CORE_H)!;
    expect(SHADOW_CORE_H).toBe(9);
    expect(Math.max(...core.map((p) => p.x))).toBeCloseTo(1 + SHADOW_DIR.x * SHADOW_PER_UNIT * SHADOW_CORE_H, 6);
    expect(Math.max(...full.map((p) => p.x))).toBeCloseTo(1 + SHADOW_DIR.x * SHADOW_PER_UNIT * SHADOW_MAX_H, 6);
    expect(shadowPoint(v3(0, 0, 20), SHADOW_CORE_H)).toEqual(shadowPoint(v3(0, 0, 9)));
  });
```

y sumar `SHADOW_CORE_H` al import de `./light`.

En `src/iso/render-list.test.ts` reemplazar el primer test por:

```ts
  it("capas en orden ground < shadow < shadowCore < solid", () => {
    const items = buildRenderList([prism, slab]);
    const layers = items.map((i) => i.layer);
    const last = (l: Layer) => layers.lastIndexOf(l), first = (l: Layer) => layers.indexOf(l);
    expect(last("ground")).toBeLessThan(first("shadow"));
    expect(last("shadowCore")).toBeLessThan(first("solid"));
    expect(first("shadow")).toBeLessThan(first("shadowCore"));
  });

  it("cada sólido elevado emite sombra completa y núcleo; el núcleo es más chico", () => {
    const tall: Solid = { kind: "prism", at: v3(0, 0, 0), w: 2, d: 2, h: 20, mat: "concrete" };
    const items = buildRenderList([tall, slab]);
    expect(items.filter((i) => i.layer === "shadow")).toHaveLength(1);
    expect(items.filter((i) => i.layer === "shadowCore")).toHaveLength(1);
    const area = (pts: number[]) => { let a = 0; for (let i = 0; i < pts.length; i += 2) { const j = (i + 2) % pts.length; a += pts[i]! * pts[j + 1]! - pts[j]! * pts[i + 1]!; } return Math.abs(a) / 2; };
    expect(area(items.find((i) => i.layer === "shadowCore")!.pts)).toBeLessThan(area(items.find((i) => i.layer === "shadow")!.pts));
    expect(items.find((i) => i.layer === "shadowCore")!.color).toBe(ISO_COLORS.shadow);
  });
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx vitest run src/iso/light.test.ts src/iso/render-list.test.ts`
Expected: FAIL (`SHADOW_CORE_H` no exportado; `shadowCore` no existe).

- [ ] **Step 3: Motor**

`src/iso/light.ts`: reemplazar desde `SHADOW_MAX_H` hasta el final por:

```ts
/** Altura máxima que proyecta sombra: una torre de 30 sombrea como una de 18 y no cruza tres manzanas. */
export const SHADOW_MAX_H = 18;
/** Tope del núcleo: la mitad inferior del sólido proyecta la banda densa; la punta queda solo con la banda suave. */
export const SHADOW_CORE_H = 9;

/** Dónde toca el suelo (z = 0) el rayo que pasa por p, con la altura recortada a `maxH`. */
export function shadowPoint(p: Vec3, maxH = SHADOW_MAX_H): Vec2 {
  const len = Math.min(Math.max(0, p.z), maxH) * SHADOW_PER_UNIT;
  return { x: p.x + SHADOW_DIR.x * len, y: p.y + SHADOW_DIR.y * len };
}

/**
 * Sombra al suelo: casco convexo de todos los vértices proyectados por el sol.
 * Los vértices bajo el suelo se quedan donde están (la parte hundida no tapa luz).
 * Sólidos planos o enteramente hundidos no proyectan. Con `maxH` menor sale el núcleo.
 */
export function shadowPolygon(s: Solid, maxH = SHADOW_MAX_H): Vec2[] | null {
  if (isFlat(s)) return null;
  const pts: Vec2[] = [];
  let above = false;
  for (const f of tessellateAll(s)) for (const p of f.pts) {
    if (p.z > 0) above = true;
    pts.push(shadowPoint(p, maxH));
  }
  if (!above) return null;
  return convexHull(pts);
}
```

`src/iso/render-list.ts`:

```ts
import { ISO_COLORS, stepTone, toneColor } from "../map/palette-iso";
import { sortByDepth } from "./depth";
import { v3, type Vec3 } from "./geometry";
import { SHADOW_CORE_H, shadowPolygon } from "./light";
import { project } from "./project";
import { isFlat, tessellate, type Face, type Solid } from "./solids";

export type Layer = "ground" | "shadow" | "shadowCore" | "solid";
export interface RenderItem { layer: Layer; pts: number[]; color: number }

/**
 * Alpha de cada banda de sombra. El runtime dibuja cada banda como una unión
 * (un contenedor con AlphaFilter): las superposiciones no se oscurecen dos
 * veces. Núcleo y completa se suman: ≈ 0.51 cerca del sólido, 0.30 en la punta.
 */
export const SHADOW_BAND_ALPHA = 0.3;

const flatten = (pts: Vec3[]): number[] => pts.flatMap((p) => { const s = project(p); return [s.x, s.y]; });

const faceItem = (layer: Layer, f: Face): RenderItem => ({ layer, pts: flatten(f.pts), color: toneColor(f.mat, stepTone(f.tone, f.toneOffset)) });
const shadowItem = (layer: Layer, poly: { x: number; y: number }[]): RenderItem => ({ layer, pts: flatten(poly.map((p) => v3(p.x, p.y, 0))), color: ISO_COLORS.shadow });

export function buildRenderList(solids: Solid[]): RenderItem[] {
  const ground: RenderItem[] = [], shadow: RenderItem[] = [], solid: RenderItem[] = [];
  const raised: Solid[] = [];
  // El suelo se pinta en orden de inserción, sin ordenar por profundidad: el
  // suelo hundido (dique seco) tiene que quedar tapado por un muro sólido que
  // se dibuje después.
  for (const s of solids) {
    if (isFlat(s)) for (const f of tessellate(s)) ground.push(faceItem("ground", f));
    else raised.push(s);
  }
  for (const s of raised) {
    const full = shadowPolygon(s), core = shadowPolygon(s, SHADOW_CORE_H);
    if (full) shadow.push(shadowItem("shadow", full));
    if (core) shadow.push(shadowItem("shadowCore", core));
  }
  for (const s of sortByDepth(raised)) for (const f of tessellate(s)) solid.push(faceItem("solid", f));
  return [...ground, ...shadow, ...solid];
}
```

`src/map/palette-iso.ts`: `shadow: 0x2a1a3a,` (violeta cálido de atardecer; sigue siendo más azul que rojo).

- [ ] **Step 4: Correr tests del motor**

Run: `npx vitest run src/iso src/map`
Expected: PASS.

- [ ] **Step 5: Runtime con dos bandas unidas**

`src/lab/runtime.ts`: cambiar el import de Pixi a `import { AlphaFilter, Application, Container, Graphics } from "pixi.js";`, el de render-list a `import { SHADOW_BAND_ALPHA, buildRenderList } from "../iso/render-list";`, y reemplazar el bloque desde `const gGround = ...` hasta `drawAccents(gAccents, scene.accents);` por:

```ts
  const gGround = new Graphics(), gShadow = new Graphics(), gCore = new Graphics(), gSolid = new Graphics(), gAccents = new Graphics();
  gAccents.blendMode = "add";
  const waterSlot = new Container(), shadowSlot = new Container(), coreSlot = new Container(), solidSlot = new Container(), accentSlot = new Container();
  // cada banda de sombra es una unión: el filtro aplica el alpha al conjunto,
  // no a cada polígono, así dos sombras superpuestas no se oscurecen dos veces
  shadowSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  coreSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  shadowSlot.addChild(gShadow);
  coreSlot.addChild(gCore);
  world.addChild(waterSlot, gGround, shadowSlot, coreSlot, gSolid, solidSlot, gAccents, accentSlot);

  const { terrain } = scene;
  const staticItems = buildRenderList([...terrain.ground, ...scene.ground, ...scene.solids]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gCore, staticItems, "shadowCore");
  drawLayer(gSolid, staticItems, "solid");
  drawAccents(gAccents, scene.accents);
```

y la rama `kind === "solid"` del bucle de capas animadas por:

```ts
    } else if (kind === "solid") {
      const gs = new Graphics(), gc = new Graphics(), g = new Graphics();
      shadowSlot.addChild(gs); coreSlot.addChild(gc); solidSlot.addChild(g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "solid" }; const items = buildRenderList(l.solids); drawLayer(gs, items, "shadow"); drawLayer(gc, items, "shadowCore"); drawLayer(g, items, "solid"); });
    } else {
```

Borrar `gShadow.alpha = SHADOW_ALPHA;` y `gs.alpha = SHADOW_ALPHA;`. Actualizar el comentario de cabecera de `bootLab`: "agua, suelo, banda completa de sombras, núcleo de sombras, sólidos estáticos, sólidos animados, acentos".

- [ ] **Step 6: Typecheck, tests y captura**

Run: `npm run typecheck && npm test`
Expected: PASS.

Levantar `npx vite --port 5199`, luego:

```bash
agent-browser set viewport 1600 900 2
agent-browser open http://127.0.0.1:5199/map/lab/resume.html
agent-browser screenshot /tmp/sombras.png
magick /tmp/sombras.png -crop 900x600+1050+600 +repage -resize 200% /tmp/sombras-crop.png
```

Leer el PNG: ninguna mancha más oscura donde se cruzan sombras (zócalo + edificio, edificio + vecino); la sombra es más densa junto al edificio y más suave en la punta; tono violeta cálido. Si hay manchas, revisar que las `Graphics` de sombra estén dentro de los slots filtrados y no en `solidSlot`.

- [ ] **Step 7: Commit**

```bash
git add src/iso/light.ts src/iso/light.test.ts src/iso/render-list.ts src/iso/render-list.test.ts src/map/palette-iso.ts src/lab/runtime.ts
git commit -m "feat(iso): sombras en dos bandas unidas por AlphaFilter, color de atardecer"
```

### Task 2: `WORLD` con origen negativo, sangrado, zonas clickeables por geografía y fosa

**Files:**
- Modify: `src/map/geo.ts` (bloque "mundo isométrico"), `src/map/geo.test.ts`
- Modify: `src/map/palette-iso.ts` (+ `abyss`)
- Modify: `src/scenes/terrain.ts`, `src/scenes/terrain.test.ts`
- Modify: `src/scenes/world.ts`, `src/scenes/world.test.ts`
- Modify: `src/scenes/shipyard.test.ts` (área), `src/scenes/city.test.ts:4` (import `WORLD_H`)
- Modify: `src/lab/draw.ts`, `src/lab/draw.test.ts`, `src/lab/runtime.ts`

**Interfaces:**
- Produces (`geo.ts`): `WORLD = { x0: -60, y0: -60, x1: 570, y1: 336 }`, `BLEED = { x: 324, y: 270 }`, `CELL_BLEED = 18`, `SHORE_W = 12`, `shoreWidth(y)`, `abyssX(y)`, `worldZoneAt(x, y)` geográfico. `WORLD_W`/`WORLD_H` desaparecen.
- Produces (`terrain.ts`): `Terrain` suma `"abyss"`; `TerrainMesh` suma `abyss: Solid` y `bleed: Solid[]`; `bleedTerrainAt(x, y): "jungle" | "sea" | "abyss"`; `bleedZ(x, y)`; `headlandZ(x)` exportado; `buildTerrain(rng, zones?)` construye el sangrado solo cuando `zones` es `undefined`.
- Produces (`draw.ts`): `type LabFrame = WorldZone | "all" | "cover"`, `coverFrame(aspect): RenderItem[]`, `zoneFrame(frame)` sobre `WORLD`.
- Produces (`world.ts`): `LANDMARKS.blog = (470, 160, 0)`; `zoneRng(seed, zone, part = 0)`.
- Tecla `4` en el lab encuadra el rectángulo cover 16:9.

- [ ] **Step 1: Tests de geo**

`src/map/geo.test.ts`: cambiar el import a `HEADLAND, MOUTH_Y, RIVER_HALF, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, abyssX, distToHeadland, inHeadland, inMouth, pointInPolygon, riverCenter, shoreWidth, worldZoneAt` y reemplazar el test "tres zonas que cubren el mundo" por:

```ts
  it("el contenido tiene origen negativo y lados múltiplos de 18", () => {
    expect(WORLD).toEqual({ x0: -60, y0: -60, x1: 570, y1: 336 });
    expect([ZONE_SPLIT_X, ZONE_SPLIT_Y]).toEqual([344, 146]);
    expect((WORLD.x1 - WORLD.x0) % 18).toBe(0);
    expect((WORLD.y1 - WORLD.y0) % 18).toBe(0);
  });

  it("zona clickeable: la punta y su orilla son Portfolio, la orilla del malecón Resume, el mar abierto Blog", () => {
    expect(worldZoneAt(10, 10)).toBe("portfolio");
    expect(worldZoneAt(-30, -30)).toBe("portfolio");   // banda de la fábrica
    expect(worldZoneAt(10, 200)).toBe("cv");
    expect(worldZoneAt(-30, 300)).toBe("cv");          // distrito
    expect(worldZoneAt(380, 118)).toBe("portfolio");   // punta
    expect(worldZoneAt(404, 118)).toBe("portfolio");   // arrecife
    expect(worldZoneAt(350, 100)).toBe("portfolio");   // orilla del astillero
    expect(worldZoneAt(350, 200)).toBe("cv");          // orilla del malecón
    expect(worldZoneAt(500, 200)).toBe("blog");
    expect(worldZoneAt(400, 10)).toBe("blog");
    expect(worldZoneAt(400, 260)).toBe("blog");
    for (let y = -60; y < 336; y += 6) expect(worldZoneAt(ZONE_SPLIT_X + shoreWidth(y) - 0.5, y)).not.toBe("blog");
  });

  it("la fosa empieza en x ≈ 392 al norte, a más de 30 u de la punta, y se abre al este hacia el sur", () => {
    expect(abyssX(-60)).toBeCloseTo(392 + 6 * Math.sin(-60 / 17), 6);
    expect(abyssX(118) - 400).toBeGreaterThan(30);
    expect(abyssX(336)).toBeGreaterThan(abyssX(-60) + 90);
    expect(shoreWidth(0)).toBeGreaterThan(4);
  });
```

- [ ] **Step 2: geo.ts**

Reemplazar en `src/map/geo.ts` desde el comentario `// ---- mundo isométrico` hasta `worldZoneAt` inclusive por:

```ts
// ---------------------------------------------------------------- mundo isométrico

/**
 * Contenido del mundo iso: las tres zonas. Origen negativo porque la fábrica
 * (norte y oeste del astillero) y el distrito (oeste y sur de la ciudad)
 * crecieron hacia afuera sin mover lo ya hecho. Lados múltiplos de 18 para que
 * la grilla del sangrado (CELL_BLEED) comparta vértices con la del contenido.
 */
export const WORLD = { x0: -60, y0: -60, x1: 570, y1: 336 } as const;
/** Sangrado: terreno de relleno alrededor del contenido, para que la cámara cover del sitio no muestre cielo. Múltiplos de CELL_BLEED. */
export const BLEED = { x: 324, y: 270 } as const;
export const CELL_BLEED = 18;
/** Blog es todo lo que está al este de ZONE_SPLIT_X (visualmente); Resume, lo que está al sur de ZONE_SPLIT_Y del lado oeste. */
export const ZONE_SPLIT_X = 344;
export const ZONE_SPLIT_Y = 146;
/** Agua clara a esta distancia de la tierra. */
export const SHORE_W = 12;
const SHORE_WOBBLE = 5;
/** Ancho de la orilla frente a la costa del corte x = 344, ondulado y determinístico. Mínimo 5. */
export const shoreWidth = (y: number): number => SHORE_W + SHORE_WOBBLE * Math.sin(y / 11) + 2 * Math.sin(y / 4.3);
/** x donde empieza la fosa (agua profunda): talud diagonal NE-SO que se abre hacia el este. */
export const abyssX = (y: number): number => 392 + 0.25 * (y + 60) + 6 * Math.sin(y / 17);

export type WorldZone = "portfolio" | "cv" | "blog";

/**
 * Zona clickeable (hover y click del sitio), por geografía y no por corte:
 * la punta, el arrecife y su orilla son Portfolio (el faro remata el
 * astillero), la orilla del malecón es Resume y Blog es solo el mar abierto.
 * El terreno visual (terrain.ts) no usa esto para clasificar el mar.
 */
export function worldZoneAt(x: number, y: number): WorldZone {
  if (inHeadland(x, y) || distToHeadland(x, y) < SHORE_W) return "portfolio";
  if (x < ZONE_SPLIT_X + shoreWidth(y)) return y >= ZONE_SPLIT_Y ? "cv" : "portfolio";
  return "blog";
}
```

Borrar las viejas `WORLD_W`, `WORLD_H`, `ZONE_SPLIT_X`, `ZONE_SPLIT_Y` duplicadas si quedaron. `inHeadland`/`distToHeadland` se declaran más abajo en el mismo archivo: son `function`, se izan.

Run: `npx vitest run src/map/geo.test.ts` → PASS.

- [ ] **Step 3: Material `abyss`**

En `ISO_TONES`, debajo de `foam`:

```ts
  abyss:     { top: 0x12303e, lit: 0x0f2426, shade: 0x071425, up: 0x15363f, down: 0x0f2a3a },
```

En `palette-iso.test.ts`, sumar `"abyss"` a la lista de "materiales exclusivos de ciudad y costa". Run: `npx vitest run src/map` → PASS.

- [ ] **Step 4: Tests de terreno**

`src/scenes/terrain.test.ts`: import `MOUTH_Y, QUAY_X, WORLD, BLEED, ZONE_SPLIT_X, ZONE_SPLIT_Y, worldZoneAt` de geo y `CELL, bleedTerrainAt, bleedZ, buildTerrain, seaTerrainAt, shipyardTerrainAt, terrainAt` de terrain. `allTris` pasa a `[...m.ground, m.river, m.sea, m.shore, m.abyss]`. Reemplazar `WORLD_W`/`WORLD_H` por `WORLD.x1`/`WORLD.y1` y los `0` de límites por `WORLD.x0`/`WORLD.y0`; en "una sola malla", `t.length > 2 * ((WORLD.x1 - WORLD.x0) / CELL) * ((WORLD.y1 - WORLD.y0) / CELL) * 0.9` y los puntos entre `WORLD.x0..x1`, `WORLD.y0..y1`. En "en la zona cv" el bucle va de `y = ZONE_SPLIT_Y + 3` a `WORLD.y1` y de `x = WORLD.x0 + 3` a `ZONE_SPLIT_X`. En "el estuario no llega", `terrainAt(ZONE_SPLIT_X - 3, WORLD.y1 - 3)`. Agregar a "astillero":

```ts
    expect(shipyardTerrainAt(-30, 50)).toBe("slab");     // playa de vías
    expect(shipyardTerrainAt(-30, 130)).toBe("jungle");
    expect(shipyardTerrainAt(50, -30)).toBe("slab");     // banda de la fábrica
    expect(shipyardTerrainAt(300, -30)).toBe("water");   // la bahía sigue al norte
```

Agregar a "mar":

```ts
    expect(seaTerrainAt(500, 200)).toBe("abyss");
    expect(seaTerrainAt(420, 60)).toBe("sea");
    expect(terrainAt(ZONE_SPLIT_X + 2, 200)).toBe("shore"); // clickea Resume pero es orilla
```

y nuevos tests en `describe("clasificación")`:

```ts
  it("ningún punto de tierra clickea Blog y toda la fosa clickea Blog", () => {
    const land = new Set(["slab", "east", "jungle", "dock", "asphalt", "headland", "reef"]);
    for (let y = WORLD.y0 + 3; y < WORLD.y1; y += CELL) for (let x = WORLD.x0 + 3; x < WORLD.x1; x += CELL) {
      const t = terrainAt(x, y), z = worldZoneAt(x, y);
      if (z === "blog") expect(land.has(t)).toBe(false);
      if (t === "abyss") expect(z).toBe("blog");
    }
  });
  it("sangrado: selva al oeste y sur, selva y bahía al norte, mar y fosa al este; lomas solo detrás", () => {
    expect(bleedTerrainAt(-100, 100)).toBe("jungle");
    expect(bleedTerrainAt(100, 400)).toBe("jungle");
    expect(bleedTerrainAt(100, -100)).toBe("jungle");
    expect(bleedTerrainAt(400, -100)).toBe("sea");
    expect(bleedTerrainAt(600, 100)).toBe("abyss");
    expect(bleedZ(-250, 100)).toBeGreaterThan(9);   // loma al oeste
    expect(bleedZ(100, -250)).toBeGreaterThan(9);   // loma al norte
    expect(bleedZ(100, 500)).toBe(0.6);              // chato al sur
    expect(bleedZ(-60, 100)).toBe(0.6);              // en la costura no sube
  });
```

y en `describe("buildTerrain")`:

```ts
  it("el sangrado rodea el contenido con celdas de 18, sin lomas al sur ni al este, y sin jitter en la costura", () => {
    const m = buildTerrain(createRng(7));
    expect(m.bleed.length).toBeGreaterThan(0);
    const bt = m.bleed.flatMap(tris);
    expect(bt.length).toBeGreaterThan(3000);
    const mats = new Set(m.bleed.map((s) => s.kind === "ground" && s.mat));
    for (const mt of mats) expect(["leafDark", "rock", "waterDeep", "abyss"]).toContain(mt);
    for (const t of bt) for (const p of t.pts) {
      expect(p.x).toBeGreaterThanOrEqual(WORLD.x0 - BLEED.x); expect(p.x).toBeLessThanOrEqual(WORLD.x1 + BLEED.x);
      expect(p.y).toBeGreaterThanOrEqual(WORLD.y0 - BLEED.y); expect(p.y).toBeLessThanOrEqual(WORLD.y1 + BLEED.y);
      if ((p.y > WORLD.y1 && p.x >= WORLD.x0) || p.x > WORLD.x1) expect(p.z).toBeLessThanOrEqual(1.4); // al sur (salvo la esquina SO, que queda detrás) y al este, chato
    }
    expect(bt.some((t) => t.pts.every((p) => p.y < WORLD.y0 - 150 && p.x < 100 && p.z > 6))).toBe(true); // lomas al norte
    // costura: los vértices del sangrado sobre el borde del contenido tienen la z base del contenido, sin jitter
    const seamZ = new Set(bt.flatMap((t) => t.pts).filter((p) => p.x === WORLD.x0 || p.x === WORLD.x1 || p.y === WORLD.y0 || p.y === WORLD.y1).map((p) => p.z));
    for (const z of seamZ) expect([0, 0.6, -1]).toContain(z);
    const contentSeamZ = new Set(allTris(m).flatMap((t) => t.pts).filter((p) => p.x === WORLD.x0 || p.x === WORLD.x1 || p.y === WORLD.y0 || p.y === WORLD.y1).map((p) => p.z));
    for (const z of contentSeamZ) expect([0, 0.6, -1]).toContain(z);
    // con filtro por zona no hay sangrado
    expect(buildTerrain(createRng(7), ["cv"]).bleed).toEqual([]);
  });
  it("la fosa sale como su propio ground plano a z -1", () => {
    const m = buildTerrain(createRng(7));
    expect(m.abyss.kind === "ground" && m.abyss.mat).toBe("abyss");
    expect(tris(m.abyss).length).toBeGreaterThan(400);
    expect(tris(m.abyss).every((t) => t.pts.every((p) => p.z === -1 && p.x >= 380))).toBe(true);
  });
```

Ajustar "agua plana": agregar `m.abyss` al bucle de `[m.river, m.sea, m.shore]` y bajar `tris(m.sea).length` a `> 300` (la fosa se lleva parte del mar).

- [ ] **Step 5: terrain.ts**

Reescribir `src/scenes/terrain.ts` así (conserva `shipyardTerrainAt`, `cityTerrainAt`, `headlandZ` y las tablas; cambia clasificadores, grilla y sangrado):

```ts
import { v3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { BLEED, BOTTOM, CELL, CELL_BLEED, DOCK, QUAY_X, RIVER_HALF, SHORE_W, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, abyssX, distToHeadland, eastBank, inHeadland, inMouth, riverCenter, shoreWidth, worldZoneAt, type WorldZone } from "../map/geo";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { CITY_EDGE, EAST_RING, estuaryEast, inCrater } from "./city-grid";

/**
 * Terreno de todo el mundo: una grilla facetada de CELL sobre WORLD (el
 * contenido) más una de CELL_BLEED alrededor (el sangrado). Cada zona aporta
 * su clasificador; `terrainAt` despacha por geografía. Una sola malla por
 * grilla garantiza que los vértices en las costuras compartan altura.
 */
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "asphalt" | "sea" | "shore" | "headland" | "reef" | "abyss";
export type BleedTerrain = "jungle" | "sea" | "abyss";

export { CELL };
const WATER_Z = -1;
const REEF_W = 6;

export interface TerrainMesh { ground: Solid[]; bleed: Solid[]; river: Solid; sea: Solid; shore: Solid; abyss: Solid }

export function shipyardTerrainAt(x: number, y: number): Terrain {
  if (x < 0) return y < 110 ? "slab" : "jungle"; // columna oeste: playa de vías y acopios, selva al sur
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab"; // la banda norte (y < 0) es losa de fábrica
  if (x <= eastBank(y) || inMouth(x, y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

export function cityTerrainAt(x: number, y: number): Terrain {
  if (x >= QUAY_X && x <= estuaryEast(y)) return "water";
  if (y < CITY_EDGE.north || y >= CITY_EDGE.south || x < CITY_EDGE.west) return "jungle";
  if (x > QUAY_X && x < EAST_RING.x0) return "jungle";
  if (inCrater(x, y)) return "jungle";
  return "asphalt";
}

export function seaTerrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland";
  const d = distToHeadland(x, y);
  if (d < REEF_W) return "reef";
  if (d < SHORE_W) return "shore";
  if (x < ZONE_SPLIT_X + shoreWidth(y)) return "shore"; // bajío frente a la costa del astillero, la bahía y el malecón
  return x >= abyssX(y) ? "abyss" : "sea";
}

/** Despacha por geografía, no por zona clickeable: el mar y la punta son de seaTerrainAt aunque clickeen Portfolio o Resume. */
export function terrainAt(x: number, y: number): Terrain {
  if (x >= ZONE_SPLIT_X || inHeadland(x, y)) return seaTerrainAt(x, y);
  return y >= ZONE_SPLIT_Y ? cityTerrainAt(x, y) : shipyardTerrainAt(x, y);
}

/** Sangrado: selva al oeste y al sur, selva y bahía al norte (partidas por el río), mar y fosa al este. */
export function bleedTerrainAt(x: number, y: number): BleedTerrain {
  if (x > WORLD.x1) return x >= abyssX(y) ? "abyss" : "sea";
  if (y < WORLD.y0) return x < riverCenter(y) - RIVER_HALF ? "jungle" : "sea";
  return "jungle";
}

const HILL_H = 12, HILL_REACH = 200, HILL_JITTER = 3, ROCK_FROM_Z = 9;
/** Cuánto se aleja el punto del contenido hacia el norte o el oeste (los lados que quedan detrás de la cámara). */
const behindDist = (x: number, y: number): number => Math.max(0, WORLD.x0 - x, WORLD.y0 - y);
/** Altura base de la selva del sangrado: lomas que suben con la distancia, solo detrás del contenido. Al sur y al este queda chato. */
export function bleedZ(x: number, y: number): number {
  return 0.6 + HILL_H * Math.min(1, behindDist(x, y) / HILL_REACH);
}

const HEADLAND_BASE_Z = 1, HEADLAND_TOP_Z = 7, HEADLAND_RISE_X0 = 330, HEADLAND_RISE_X1 = 355;
/** La punta sube desde su base hasta el faro: rampa en x, con el jitter de `headland` encima. */
export const headlandZ = (x: number): number => {
  const t = Math.min(1, Math.max(0, (x - HEADLAND_RISE_X0) / (HEADLAND_RISE_X1 - HEADLAND_RISE_X0)));
  return HEADLAND_BASE_Z + (HEADLAND_TOP_Z - HEADLAND_BASE_Z) * t;
};

const BASE_Z: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth, asphalt: 0, sea: WATER_Z, shore: WATER_Z, headland: HEADLAND_TOP_Z, reef: 0.5, abyss: WATER_Z };
const JITTER: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0, asphalt: 0.1, sea: 0, shore: 0, headland: 1.5, reef: 0.3, abyss: 0 };
const MAT: Record<Exclude<Terrain, "dock">, Material> = { slab: "slab", water: "water", east: "sand", jungle: "leafDark", asphalt: "asphalt", sea: "waterDeep", shore: "water", headland: "rock", reef: "rock", abyss: "abyss" };
const FLAT = new Set<Terrain>(["water", "sea", "shore", "dock", "abyss"]);
const BLEED_MAT: Record<BleedTerrain, Material> = { jungle: "leafDark", sea: "waterDeep", abyss: "abyss" };

const onSeam = (x: number, y: number): boolean => x === WORLD.x0 || x === WORLD.x1 || y === WORLD.y0 || y === WORLD.y1;
/** z base del contenido en un punto (sin jitter); en la costura las dos grillas usan esto. */
const contentBaseZ = (x: number, y: number): number => {
  const t = terrainAt(Math.min(x, WORLD.x1 - 1), Math.min(y, WORLD.y1 - 1));
  return t === "headland" ? headlandZ(x) : BASE_Z[t];
};

/** Dos triángulos por celda con diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados. */
function cellTris(out: Tri[], x0: number, y0: number, x1: number, y1: number, za: number, zb: number, zc: number, zd: number, flat: number | null, i: number, j: number): void {
  const p = (x: number, y: number, z: number) => v3(x, y, flat ?? z);
  const a = p(x0, y0, za), b = p(x1, y0, zb), c = p(x1, y1, zc), d = p(x0, y1, zd);
  if ((i + j) % 2 === 0) out.push({ pts: [a, b, c] }, { pts: [a, c, d] });
  else out.push({ pts: [a, b, d] }, { pts: [b, c, d] });
}

/** Grilla de CELL_BLEED alrededor de WORLD. Comparte vértices con la de CELL en la costura (lados múltiplos de 18) y ahí no lleva jitter. */
function buildBleed(rng: Rng): Solid[] {
  const bx0 = WORLD.x0 - BLEED.x, by0 = WORLD.y0 - BLEED.y, bx1 = WORLD.x1 + BLEED.x, by1 = WORLD.y1 + BLEED.y;
  const cols = (bx1 - bx0) / CELL_BLEED, rows = (by1 - by0) / CELL_BLEED;
  const inside = (x: number, y: number) => x >= WORLD.x0 && x <= WORLD.x1 && y >= WORLD.y0 && y <= WORLD.y1;
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = bx0 + i * CELL_BLEED, y = by0 + j * CELL_BLEED;
      const r = rng.next() * 2 - 1;
      if (inside(x, y)) { z[j]!.push(onSeam(x, y) ? contentBaseZ(x, y) : 0); continue; } // interior: no se usa; costura: z del contenido
      const t = bleedTerrainAt(x, y);
      if (t !== "jungle") { z[j]!.push(WATER_Z); continue; }
      const base = bleedZ(x, y);
      z[j]!.push(base + r * (base > 0.6 ? HILL_JITTER : JITTER.jungle));
    }
  }
  const tris: Record<Material, Tri[]> = { leafDark: [], rock: [], waterDeep: [], abyss: [] } as Record<Material, Tri[]>;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = bx0 + i * CELL_BLEED, y0 = by0 + j * CELL_BLEED, x1 = x0 + CELL_BLEED, y1 = y0 + CELL_BLEED;
    const cx = x0 + CELL_BLEED / 2, cy = y0 + CELL_BLEED / 2;
    if (inside(cx, cy)) continue;
    const t = bleedTerrainAt(cx, cy);
    const mat: Material = t === "jungle" ? (bleedZ(cx, cy) > ROCK_FROM_Z ? "rock" : "leafDark") : BLEED_MAT[t];
    cellTris(tris[mat]!, x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, t === "jungle" ? null : WATER_Z, i, j);
  }
  return (Object.keys(tris) as Material[]).filter((m) => tris[m]!.length > 0).map((m): Solid => ({ kind: "ground", mat: m, tris: tris[m]! }));
}

/**
 * Grilla de CELL sobre WORLD con alturas por vértice; cada celda son dos
 * triángulos clasificados por su centro. `zones` filtra celdas por zona
 * clickeable (y entonces no hay sangrado: las páginas de zona no lo usan).
 */
export function buildTerrain(rng: Rng, zones?: readonly WorldZone[]): TerrainMesh {
  const cols = (WORLD.x1 - WORLD.x0) / CELL, rows = (WORLD.y1 - WORLD.y0) / CELL;
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = WORLD.x0 + i * CELL, y = WORLD.y0 + j * CELL;
      const t = terrainAt(Math.min(x, WORLD.x1 - 1), Math.min(y, WORLD.y1 - 1));
      const jitter = onSeam(x, y) ? 0 : JITTER[t]; // la costura con el sangrado no lleva jitter: las dos grillas coinciden ahí
      z[j]!.push(contentBaseZ(x, y) + (rng.next() * 2 - 1) * jitter);
    }
  }
  const tris = {} as Record<Terrain, Tri[]>;
  for (const t of Object.keys(BASE_Z) as Terrain[]) tris[t] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = WORLD.x0 + i * CELL, y0 = WORLD.y0 + j * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
    const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
    if (zones && !zones.includes(worldZoneAt(cx, cy))) continue;
    const t = terrainAt(cx, cy);
    if (t === "dock") continue; // el pozo lo amuebla la escena del astillero
    cellTris(tris[t], x0, y0, x1, y1, z[j]![i]!, z[j]![i + 1]!, z[j + 1]![i + 1]!, z[j + 1]![i]!, FLAT.has(t) ? BASE_Z[t] : null, i, j);
  }
  const ground = (t: Exclude<Terrain, "dock">): Solid => ({ kind: "ground", mat: MAT[t], tris: tris[t] });
  return {
    ground: [ground("slab"), ground("east"), ground("jungle"), ground("asphalt"), ground("headland"), ground("reef")],
    bleed: zones ? [] : buildBleed(rng),
    river: ground("water"),
    sea: ground("sea"),
    shore: ground("shore"),
    abyss: ground("abyss"),
  };
}
```

Nota: el `rng.next()` del sangrado se consume también en los vértices interiores, así la secuencia es estable aunque cambie el contenido.

Run: `npx vitest run src/scenes/terrain.test.ts` → PASS. Si "el agua es continua en la costura" falla por el nuevo `terrainAt`, revisar que `x >= ZONE_SPLIT_X` vaya antes que el corte por `y`.

- [ ] **Step 6: world.ts, draw.ts y runtime**

`src/scenes/world.ts`: `LANDMARKS.blog = v3(470, 160, 0)` (la boya del pecio en la fosa) y

```ts
/** Rng por zona y parte (0 = escena principal, 1 = escena secundaria: fábrica, distrito). Retocar una no reordena las otras. */
export function zoneRng(seed: number, zone: WorldZone, part = 0): Rng {
  return createRng(seed * 31 + ZONE_INDEX[zone] + 16 * part);
}
```

`src/lab/draw.ts`: import `BLEED, WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, type WorldZone` y reemplazar `zoneFrame` por:

```ts
export type LabFrame = WorldZone | "all" | "cover";

/** Caja de una zona (o del mundo) proyectada, como un RenderItem para fitTransform. `cover` es el rectángulo 16:9 inscripto en el rombo del sangrado. */
export function zoneFrame(frame: LabFrame): RenderItem[] {
  if (frame === "cover") return coverFrame(16 / 9);
  const box = {
    all: [WORLD.x0, WORLD.y0, WORLD.x1, WORLD.y1],
    portfolio: [WORLD.x0, WORLD.y0, ZONE_SPLIT_X, ZONE_SPLIT_Y],
    cv: [WORLD.x0, ZONE_SPLIT_Y, ZONE_SPLIT_X, WORLD.y1],
    blog: [ZONE_SPLIT_X, WORLD.y0, WORLD.x1, WORLD.y1],
  }[frame];
  const [x0, y0, x1, y1] = box as [number, number, number, number];
  const pts: number[] = [];
  for (const [x, y, z] of [[x0, y0, FRAME_H], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]] as const) { const p = project(v3(x, y, z)); pts.push(p.x, p.y); }
  return [{ layer: "ground", pts, color: 0 }];
}

/**
 * Rectángulo de aspecto `aspect` inscripto en el rombo del terreno con
 * sangrado, centrado en él: lo que la cámara cover del sitio podrá mostrar sin
 * cielo. Rombo de semidiagonales a (horizontal) y a/2: el rectángulo inscripto
 * mide u = aspect·a/(aspect+2) de semiancho y v = a/(aspect+2) de semialto.
 */
export function coverFrame(aspect: number): RenderItem[] {
  const x0 = WORLD.x0 - BLEED.x, y0 = WORLD.y0 - BLEED.y, x1 = WORLD.x1 + BLEED.x, y1 = WORLD.y1 + BLEED.y;
  const c = project(v3((x0 + x1) / 2, (y0 + y1) / 2, 0));
  const a = (x1 - x0 + y1 - y0) / 2;
  const v = a / (aspect + 2), u = aspect * v;
  return [{ layer: "ground", pts: [c.x - u, c.y - v, c.x + u, c.y - v, c.x + u, c.y + v, c.x - u, c.y + v], color: 0 }];
}
```

`src/lab/draw.test.ts`: en "zoneFrame" los números pasan a `344 - 336` (min x), `570 + 60` (max x), `(344 - 60) / 2 - 30 * 1.4` (min y), `(570 + 336) / 2` (max y); "all cubre el mundo" espera `630`. Nuevo:

```ts
describe("coverFrame", () => {
  it("el rectángulo cover 16:9 contiene la caja del contenido con la torre", () => {
    const box = (items: RenderItem[]) => {
      const xs = items.flatMap((i) => i.pts.filter((_, k) => k % 2 === 0)), ys = items.flatMap((i) => i.pts.filter((_, k) => k % 2 === 1));
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    };
    const cover = box(coverFrame(16 / 9)), all = box(zoneFrame("all"));
    expect(all.minX).toBeGreaterThanOrEqual(cover.minX); expect(all.maxX).toBeLessThanOrEqual(cover.maxX);
    expect(all.minY).toBeGreaterThanOrEqual(cover.minY); expect(all.maxY).toBeLessThanOrEqual(cover.maxY);
    expect((cover.maxX - cover.minX) / (cover.maxY - cover.minY)).toBeCloseTo(16 / 9, 6);
  });
});
```

(importar `coverFrame` y `type RenderItem` de `../iso/render-list`).

`src/lab/runtime.ts`: `LabOptions.frame?: LabFrame` (import `LabFrame` de `./draw`); `KEY_ZONE: Record<string, LabFrame> = { "0": "all", "1": "portfolio", "2": "cv", "3": "blog", "4": "cover" }`; `let frame: LabFrame = ...`. Sangrado: antes de `waterSlot` en `world.addChild`, una `gBleed = new Graphics()` con `drawLayer(gBleed, buildRenderList(terrain.bleed), "ground")`, y el agua estática pasa a `buildRenderList([terrain.river, terrain.sea, terrain.shore, terrain.abyss].filter(...))`. `src/lab/page.ts`: `frame: LabFrame` en la firma (`bootWorldPage(zones, frame: LabFrame)`).

- [ ] **Step 7: Tests de mundo y astillero**

`src/scenes/world.test.ts`: import `WORLD` en lugar de `WORLD_H, WORLD_W`; en "con todas las zonas" los límites son `WORLD.x0 - 1 .. WORLD.x1 + 1` y `WORLD.y0 - 1 .. WORLD.y1 + 1`, y `w.terrain.sea.tris.length > 300`; en "no comparten materiales" la zona se calcula con `worldZoneAt(bounds(s).min.x, bounds(s).min.y)`; en "todo el render usa colores" sumar `w.terrain.abyss` y `...w.terrain.bleed`. Agregar:

```ts
  it("el landmark del Blog cae en la fosa y el sangrado existe solo con el mundo entero", () => {
    expect(worldZoneAt(LANDMARKS.blog.x, LANDMARKS.blog.y)).toBe("blog");
    expect(world(7).terrain.bleed.length).toBeGreaterThan(0);
    expect(world(7, { zones: ["portfolio"] }).terrain.bleed).toEqual([]);
  });
```

`src/scenes/shipyard.test.ts` "todo cae dentro del área": `b.min.x >= WORLD.x0 - 1`, `b.min.y >= WORLD.y0 - 1` (import `WORLD` de geo; `AREA_W/H` siguen para los máximos). `src/scenes/city.test.ts`: quitar `WORLD_H` del import y reemplazar sus usos por `WORLD.y1` (import `WORLD`).

Run: `npm run typecheck && npm test` → PASS. Abrir `lab/world.html`, tecla `0` y tecla `4`, captura de cada una: con `4` no se ve cielo en ninguna esquina; con `0` el diorama tiene selva y lomas alrededor y mar oscuro al este.

- [ ] **Step 8: Commit**

```bash
git add src/map src/scenes/terrain.ts src/scenes/terrain.test.ts src/scenes/world.ts src/scenes/world.test.ts src/scenes/shipyard.test.ts src/scenes/city.test.ts src/lab
git commit -m "feat(world): origen negativo, sangrado con lomas, zonas clickeables por geografía y fosa"
```

### Task 3: Fábrica detrás del astillero, con humo

**Files:**
- Modify: `src/map/palette-iso.ts` (+ `brick`)
- Create: `src/scenes/pieces.ts`, `src/scenes/pieces.test.ts`
- Create: `src/scenes/factory.ts`, `src/scenes/factory.test.ts`
- Create: `src/scenes/factory-anim.ts`, `src/scenes/factory-anim.test.ts`
- Create: `src/scenes/factory-animator.ts`
- Modify: `src/scenes/shipyard.ts:45-48` (`quay`), `src/scenes/world.ts`, `src/scenes/world.test.ts`, `src/lab/page.ts`

**Interfaces:**
- Produces (`pieces.ts`): `towerCrane(out: Solid[], accents: Accent[], c: { at: Vec2; z?: number; mastH: number; jibLen: number; dir: "e" | "w"; light: AccentColor }): void`. Materiales `steel`/`rust` solamente (compartidos). La Task 4 la reutiliza en la obra.
- Produces (`factory.ts`): `interface FactoryScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; stacks: Vec3[] }`, `factory(rng: Rng): FactoryScene`, constantes `PLANT`, `STACKS`, `STACK_BASE_H`, `SIDING_Y`, `RAIL_YARD_X`.
- Produces (`factory-anim.ts`): `createFactoryAnim(stacks: readonly Vec3[], rng, opts): { puffs(k: number): Solid[]; tick(dtMs): boolean }`; `factoryAnimator(scene, rng, opts): Animator` con ids `factory.smoke0..2` (capas `solid`).
- `WorldScene.factory: FactoryScene | null`; `world()` lo crea con `zoneRng(seed, "portfolio", 1)` cuando `zones` incluye `portfolio`.

- [ ] **Step 1: Material `brick` y test de la grúa**

`ISO_TONES`, debajo de `deck`:

```ts
  brick:     { top: 0x8a4a3a, lit: 0x713724, shade: 0x371f23, up: 0xa0533b, down: 0x774137 }, // fábrica: ladrillo cálido
```

`src/scenes/pieces.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Accent } from "../iso/accent";
import { bounds, type Solid } from "../iso/solids";
import { towerCrane } from "./pieces";

describe("towerCrane", () => {
  it("mástil de la altura pedida, pluma hacia el lado pedido, gancho colgando y luz en la punta", () => {
    const out: Solid[] = [], accents: Accent[] = [];
    towerCrane(out, accents, { at: { x: 100, y: 50 }, mastH: 20, jibLen: 30, dir: "e", light: "cyan" });
    const mast = out.find((s) => s.kind === "prism" && s.h === 20)!;
    expect(mast).toBeDefined();
    expect(bounds(mast).max.x - bounds(mast).min.x).toBeLessThanOrEqual(3); // esbelto
    const jib = out.find((s) => s.kind === "prism" && s.w === 30)!;
    expect(bounds(jib).min.x).toBeCloseTo(100, 6);
    expect(bounds(jib).max.x).toBeCloseTo(130, 6);
    expect(bounds(jib).min.z).toBeGreaterThan(18);
    const hook = out.find((s) => s.kind === "prism" && s.mat === "rust")!;
    expect(bounds(hook).min.x).toBeGreaterThan(110); expect(bounds(hook).max.x).toBeLessThan(120);
    expect(bounds(hook).min.z).toBeGreaterThan(5);
    expect(accents).toEqual([{ kind: "dot", at: { x: 130, y: 50, z: 19.4 }, r: 1, color: "cyan" }]);
    for (const s of out) expect(["steel", "rust"]).toContain(s.mat);
  });
  it("con dir w la pluma va hacia el oeste y respeta z", () => {
    const out: Solid[] = [], accents: Accent[] = [];
    towerCrane(out, accents, { at: { x: 0, y: 0 }, z: 0.3, mastH: 22, jibLen: 20, dir: "w", light: "amber" });
    const jib = out.find((s) => s.kind === "prism" && s.w === 20)!;
    expect(bounds(jib).min.x).toBeCloseTo(-20, 6);
    expect(bounds(out.find((s) => s.kind === "prism" && s.h === 22)!).min.z).toBe(0.3);
    expect(accents[0]!.kind === "dot" && accents[0]!.at.x).toBe(-20);
  });
});
```

- [ ] **Step 2: pieces.ts**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { AccentColor, Material } from "../map/palette-iso";

/** Piezas compartidas entre zonas. Solo materiales compartidos por regla (steel, rust). */

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material): Solid => ({ kind: "prism", at: v3(x, y, z), w, d, h, mat });

export interface TowerCrane { at: Vec2; z?: number; mastH: number; jibLen: number; dir: "e" | "w"; light: AccentColor }

/**
 * Grúa torre de acero: mástil esbelto, pluma con contrapluma y contrapeso,
 * cabina, cable con bloque de gancho a mitad de pluma y una luz en la punta.
 * La fábrica y la obra del distrito la comparten.
 */
export function towerCrane(out: Solid[], accents: Accent[], c: TowerCrane): void {
  const z = c.z ?? 0, s = c.dir === "e" ? 1 : -1;
  const { x, y } = c.at;
  const top = z + c.mastH;
  out.push(prism(x - 0.6, y - 0.6, z, 1.2, 1.2, c.mastH, "steel"));                          // mástil
  out.push(prism(s > 0 ? x : x - c.jibLen, y - 0.5, top - 1, c.jibLen, 1, 0.8, "steel"));     // pluma
  out.push(prism(s > 0 ? x - 8 : x, y - 0.5, top - 1, 8, 1, 0.8, "steel"));                   // contrapluma
  out.push(prism(s > 0 ? x - 8 : x + 6, y - 1, top - 1.5, 2, 2, 1.5, "steel"));               // contrapeso
  out.push(prism(x + s * 1.2 - 0.8, y - 0.8, top - 2.6, 1.6, 1.6, 1.6, "steel"));             // cabina
  const hx = x + s * (c.jibLen / 2), cable = c.mastH * 0.4;
  out.push(prism(hx - 0.3, y - 0.3, top - 1 - cable, 0.6, 0.6, cable, "steel"));              // cable
  out.push(prism(hx - 0.6, y - 0.6, top - 2 - cable, 1.2, 1.2, 1, "rust"));                   // bloque del gancho
  accents.push({ kind: "dot", at: v3(x + s * c.jibLen, y, top - 0.6), r: 1, color: c.light });
}
```

Run: `npx vitest run src/scenes/pieces.test.ts src/map` → PASS.

- [ ] **Step 3: Test de la fábrica**

`src/scenes/factory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { WORLD, ZONE_SPLIT_X, ZONE_SPLIT_Y, worldZoneAt } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { PLANT, RAIL_YARD_X, STACKS, STACK_BASE_H, factory, type FactoryScene } from "./factory";
import { terrainAt } from "./terrain";

const scene = (): FactoryScene => factory(createRng(7));
const PORTFOLIO_MATS: readonly Material[] = ["slab", "concrete", "rust", "steel", "road", "rail", "sand", "brick", "leaf", "leafDark"];
const slender = (s: Solid) => (s.kind === "cylinder" && s.r <= 3) || (s.kind === "prism" && ((s.w <= 3 && s.d <= 3) || s.h <= 1)); // mástiles, chimeneas y vigas finas (pluma)

describe("factory", () => {
  it("es determinística y trae más de 100 sólidos elevados dentro de Portfolio", () => {
    expect(JSON.stringify(factory(createRng(7)))).toBe(JSON.stringify(factory(createRng(7))));
    const s = scene();
    expect(s.solids.filter((x) => !isFlat(x)).length).toBeGreaterThan(100);
    for (const x of [...s.ground, ...s.solids]) {
      const b = bounds(x);
      expect(b.min.x).toBeGreaterThanOrEqual(WORLD.x0 - 1); expect(b.max.x).toBeLessThanOrEqual(ZONE_SPLIT_X);
      expect(b.min.y).toBeGreaterThanOrEqual(WORLD.y0 - 1); expect(b.max.y).toBeLessThanOrEqual(ZONE_SPLIT_Y);
      expect(worldZoneAt(b.min.x, b.min.y)).toBe("portfolio");
      expect(PORTFOLIO_MATS).toContain(x.mat);
    }
  });

  it("nada apoya en agua y solo chimeneas y mástil superan 18, y son esbeltos", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (x.kind !== "cone") expect(terrainAt(b.min.x, b.min.y)).not.toBe("water");
      if (b.max.z > 18) expect(slender(x)).toBe(true);
    }
  });

  it("planta de ladrillo con dientes de sierra, tres chimeneas con banda, torre de enfriamiento y grúa", () => {
    const s = scene();
    const plant = s.solids.find((x) => x.kind === "prism" && x.mat === "brick" && x.h === PLANT.h)!;
    expect(bounds(plant)).toMatchObject({ min: { x: PLANT.x, y: PLANT.y } });
    expect(s.solids.filter((x) => x.kind === "ramp" && x.mat === "brick")).toHaveLength(5);
    const stacks = s.solids.filter((x) => x.kind === "cylinder" && x.mat === "brick");
    expect(stacks).toHaveLength(3);
    expect(s.stacks).toHaveLength(3);
    STACKS.forEach((st, i) => expect(s.stacks[i]).toEqual({ x: st.x, y: st.y, z: STACK_BASE_H + st.h }));
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.mat === "rust" && x.h === 1)).toHaveLength(3); // bandas
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.mat === "concrete" && x.r >= 7)).toHaveLength(4); // torre de enfriamiento
    expect(s.solids.some((x) => x.kind === "prism" && x.h === 20 && x.w === 1.2)).toBe(true); // mástil de la grúa
  });

  it("desvío con seis vagones y locomotora, cinta elevada, subestación, camiones y playa de vías con acopios", () => {
    const s = scene();
    const wagons = s.solids.filter((x) => x.kind === "prism" && x.w === 8 && x.d === 2.4 && x.h === 3);
    expect(wagons).toHaveLength(6);
    for (let i = 0; i < wagons.length; i++) for (let j = i + 1; j < wagons.length; j++) {
      const a = bounds(wagons[i]!), b = bounds(wagons[j]!);
      expect(a.max.x <= b.min.x || b.max.x <= a.min.x).toBe(true);
    }
    expect(s.solids.filter((x) => x.kind === "prism" && x.at.z === 6 && x.h === 0.6)).toHaveLength(2); // dos tramos de cinta
    expect(s.solids.filter((x) => x.kind === "prism" && x.w === 3 && x.d === 3 && x.h === 3 && x.mat === "steel")).toHaveLength(6); // transformadores
    expect(s.solids.filter((x) => x.kind === "prism" && x.w === 6 && x.d === 2.4 && x.h === 2.8)).toHaveLength(3); // camiones
    const rails = s.ground.filter((x) => x.kind === "strip" && x.mat === "steel");
    expect(rails.length).toBeGreaterThanOrEqual(RAIL_YARD_X.length * 2 + 2);
    const piles = s.solids.filter((x): x is Solid & { kind: "cone" } => x.kind === "cone" && (x.mat === "rust" || x.mat === "sand"));
    expect(piles).toHaveLength(6);
    for (const p of piles) expect(p.at.x - p.r).toBeGreaterThanOrEqual(Math.max(...RAIL_YARD_X) + 1); // ningún acopio pisa las vías
  });

  it("acentos cian a la altura de los postes y todo el render usa colores del atlas", () => {
    const s = scene();
    expect(s.accents.length).toBeGreaterThanOrEqual(7);
    expect(s.accents.every((a) => a.kind === "dot" && a.color.startsWith("cyan") && a.at.z > 0)).toBe(true);
    const colors = allIsoColors();
    for (const i of buildRenderList([...s.ground, ...s.solids])) expect(colors.has(i.color)).toBe(true);
  });
});
```

- [ ] **Step 4: factory.ts**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { WORLD } from "../map/geo";
import { jungle } from "./flora";
import { towerCrane } from "./pieces";

/**
 * Fábrica, detrás (al norte) y al oeste del astillero. Banda norte
 * `x -60..205, y -60..0` al oeste del río: planta de ladrillo con dientes de
 * sierra, tres chimeneas humeantes, torre de enfriamiento, grúa torre sobre un
 * desvío ferroviario, cinta transportadora hasta el patio de material,
 * subestación y playa de camiones. Columna oeste `x -60..0, y 0..146`: playa
 * de vías y acopios de mineral, selva al sur. El terreno es `slab`.
 * Spec: docs/superpowers/specs/2026-09-14-mundo-2-fabrica-distrito-blog-design.md §5.
 */
export interface FactoryScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; stacks: Vec3[] }

export const PLANT = { x: 20, y: -46, w: 100, d: 30, h: 14 } as const;
export const STACKS = [{ x: 130, y: -40, r: 2.8, h: 22 }, { x: 140, y: -34, r: 2.6, h: 26 }, { x: 150, y: -40, r: 2.4, h: 24 }] as const;
export const STACK_BASE_H = 3;
export const SIDING_Y = -8;
export const RAIL_YARD_X = [-56, -48, -40] as const; // vías N-S de la playa; los acopios van al este de ellas
const COOLING = { x: 172, y: -36 } as const;
const CONVEYOR_Z = 6;
const LAMP_H = 5;

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material): Solid => ({ kind: "prism", at: v3(x, y, z), w, d, h, mat });
const strip = (path: Vec2[], width: number, z: number, mat: Material): Solid => ({ kind: "strip", path, width, z, mat });

function lamp(out: Solid[], accents: Accent[], x: number, y: number): void {
  out.push(prism(x, y, 0, 0.6, 0.6, LAMP_H, "steel"));
  accents.push({ kind: "dot", at: v3(x + 0.3, y + 0.3, LAMP_H), r: 1.2, color: "cyan" });
}

function plant(out: Solid[]): void {
  const { x, y, w, d, h } = PLANT;
  out.push(prism(x, y, 0, w, d, h, "brick"));
  for (let i = 0; i < 5; i++) out.push({ kind: "ramp", at: v3(x + i * 20, y, h), w: 20, d, h: 4, mat: "brick", dir: "w" }); // dientes de sierra: cara vertical al este
  out.push(prism(x - 0.6, y - 0.6, h, w + 1.2, d + 1.2, 0.8, "concrete"));                                            // cornisa
  for (const px of [x + 20, x + 60]) out.push(prism(px, y + d - 0.5, 0, 6, 0.5, 8, "concrete"));                       // portones en la cara sur
}

function chimneys(out: Solid[]): Vec3[] {
  return STACKS.map((s) => {
    out.push(prism(s.x - 3.5, s.y - 3.5, 0, 7, 7, STACK_BASE_H, "concrete"));
    out.push({ kind: "cylinder", at: v3(s.x, s.y, STACK_BASE_H), r: s.r, h: s.h, mat: "brick" });
    out.push({ kind: "cylinder", at: v3(s.x, s.y, STACK_BASE_H + (s.h * 2) / 3), r: s.r + 0.2, h: 1, mat: "rust" }); // banda a dos tercios
    return v3(s.x, s.y, STACK_BASE_H + s.h);
  });
}

function coolingTower(out: Solid[]): void {
  let z = 0;
  for (const r of [9, 8, 7, 7.5]) { out.push({ kind: "cylinder", at: v3(COOLING.x, COOLING.y, z), r, h: 4, mat: "concrete", sides: 12 }); z += 4; }
}

function siding(out: Solid[]): void {
  for (const dy of [-0.8, 0.8]) out.push(strip([{ x: WORLD.x0, y: SIDING_Y + dy }, { x: 110, y: SIDING_Y + dy }], 0.4, 0.1, "steel"));
  for (let i = 0; i < 6; i++) out.push(prism(-50 + i * 9, SIDING_Y - 1.2, 0, 8, 2.4, 3, i % 2 === 0 ? "rust" : "steel")); // vagones con 1 u de hueco
  out.push(prism(6, SIDING_Y - 1.3, 0, 9, 2.6, 3.6, "steel"), prism(12, SIDING_Y - 1.3, 3.6, 3, 2.6, 1, "steel"));      // locomotora y cabina
}

/** Del portón este de la planta al patio de material: dos tramos rectos a z 6 sobre caballetes cada 12 u. */
function conveyor(out: Solid[]): void {
  out.push(prism(119, -20, CONVEYOR_Z, 2, 22, 0.6, "steel"));
  out.push(prism(30, 1, CONVEYOR_Z, 90, 2, 0.6, "steel"));
  for (let y = -16; y < 2; y += 12) out.push(prism(119.6, y, 0, 0.8, 0.8, CONVEYOR_Z, "steel"));
  for (let x = 34; x < 120; x += 12) out.push(prism(x, 1.6, 0, 0.8, 0.8, CONVEYOR_Z, "steel"));
}

function substation(out: Solid[]): void {
  for (let i = 0; i < 6; i++) out.push(prism(152 + (i % 3) * 12, -58 + Math.floor(i / 3) * 6, 0, 3, 3, 3, "steel"));
  for (const x of [150, 186]) {
    out.push(prism(x, -59, 0, 0.6, 0.6, 7, "steel"), prism(x, -49, 0, 0.6, 0.6, 7, "steel"));
    out.push(prism(x, -59, 6.4, 0.6, 10.6, 0.6, "steel")); // travesaño del pórtico
  }
  out.push(strip([{ x: 149, y: -60 }, { x: 190, y: -60 }, { x: 190, y: -47 }, { x: 149, y: -47 }, { x: 149, y: -60 }], 0.3, 0.05, "concrete")); // cerco
}

function truckYard(out: Solid[], accents: Accent[]): void {
  for (const [x, y] of [[40, -12], [70, -6], [95, -12]] as const) { out.push(prism(x, y, 0, 6, 2.4, 2.8, "rust")); out.push(prism(x + 6, y, 0, 2, 2.4, 2.2, "steel")); } // caja y cabina
  for (let i = 0; i < 6; i++) out.push(prism(22 + i * 4, -3, 0, 3, 2, 0.5 + (i % 3) * 0.4, "steel")); // pallets de chapa junto al portón oeste
  for (const [x, y] of [[20, -14], [110, -3]] as const) lamp(out, accents, x, y);
}

/** Columna oeste: tres vías N-S que empalman con las vías del oeste del astillero, acopios de mineral al este de ellas, selva al sur. */
function railYard(out: Solid[], rng: Rng): void {
  for (const x of RAIL_YARD_X) for (const dx of [-0.8, 0.8]) out.push(strip([{ x: x + dx, y: WORLD.y0 }, { x: x + dx, y: 128 }], 0.4, 0.1, "steel"));
  for (const dy of [-0.8, 0.8]) out.push(strip([{ x: -40 + dy, y: 128 }, { x: -30, y: 132.5 + dy }, { x: 2, y: 132.5 + dy }], 0.4, 0.1, "steel")); // empalme
  for (let i = 0; i < 6; i++) {
    const big = i < 4;
    out.push({ kind: "cone", at: v3(rng.int(-25, -13), rng.int(44, 96), 0), r: big ? rng.int(6, 9) : 5, h: big ? rng.int(4, 6) : 3, mat: big ? "rust" : "sand", sides: 7 });
  }
  for (let i = 0; i < 8; i++) out.push(prism(RAIL_YARD_X[i % 3]! - 1.1, -40 + i * 14, 0, 2.2, 7, 2.8, i % 2 === 0 ? "rust" : "steel")); // vagones estacionados N-S sobre las vías
  jungle(out, rng, { x0: -58, x1: -6, y0: 110, y1: 140 }, 14, 0.4); // y1 140: un cono de r 4 no puede cruzar la costura y = 146
}

function lamps(out: Solid[], accents: Accent[]): void {
  for (const [x, y] of [[24, -13], [64, -13], [58, -16], [148, -46], [-30, 20]] as const) lamp(out, accents, x, y);
}

export function factory(rng: Rng): FactoryScene {
  const solids: Solid[] = [], accents: Accent[] = [];
  plant(solids);
  const stacks = chimneys(solids);
  coolingTower(solids);
  towerCrane(solids, accents, { at: { x: 60, y: -12 }, mastH: 20, jibLen: 30, dir: "e", light: "cyan" });
  siding(solids);
  conveyor(solids);
  substation(solids);
  truckYard(solids, accents);
  railYard(solids, rng);
  lamps(solids, accents);
  return { ground: solids.filter((s) => s.kind === "strip"), solids: solids.filter((s) => s.kind !== "strip"), accents, stacks };
}
```

`src/scenes/shipyard.ts` `quay`: `prism(QUAY_X, WORLD.y0, WATER_Z, QUAY_W, BOTTOM - WORLD.y0, 1.5, "concrete")` y el bucle de bolardos desde `WORLD.y0 + 6` (import `WORLD` de geo).

Run: `npx vitest run src/scenes/factory.test.ts src/scenes/shipyard.test.ts` → PASS. Si "nada apoya en agua" falla por un acopio, mover el rango de `rng.int` de x; si falla por un poste de la cinta en x 119.6 (`dock` empieza en 120, y 6): está en `slab`, revisar el `terrainAt`.

- [ ] **Step 5: Test del humo**

`src/scenes/factory-anim.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { v3 } from "../iso/geometry";
import { createRng } from "../map/seed";
import { PUFFS, PUFF_RANGE, createFactoryAnim } from "./factory-anim";

const stacks = [v3(130, -40, 25), v3(140, -34, 29)];

describe("humo", () => {
  it("frame 0: cinco bocanadas escalonadas por chimenea, cilindros grises que crecen con la distancia", () => {
    const a = createFactoryAnim(stacks, createRng(1), { reducedMotion: false });
    const p = a.puffs(0);
    expect(p).toHaveLength(PUFFS);
    const rs = p.map((s) => (s.kind === "cylinder" ? s.r : 0));
    for (let i = 1; i < rs.length; i++) expect(rs[i]!).toBeGreaterThan(rs[i - 1]!);
    expect(p.every((s) => s.kind === "cylinder" && s.mat === "concrete" && s.at.z >= 25)).toBe(true);
    expect(p[0]!.kind === "cylinder" && p[0]!.at).toEqual(stacks[0]);
  });

  it("deriva al NNE sin alejarse más de PUFF_RANGE + 2 de la boca, y se recicla", () => {
    const a = createFactoryAnim(stacks, createRng(1), { reducedMotion: false });
    for (let t = 0; t < 40000; t += 33) {
      expect(a.tick(33)).toBe(true);
      for (const k of [0, 1]) for (const s of a.puffs(k)) {
        if (s.kind !== "cylinder") continue;
        const dx = s.at.x - stacks[k]!.x, dy = s.at.y - stacks[k]!.y;
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(PUFF_RANGE + 2);
        expect(dy).toBeLessThanOrEqual(0.5); // nunca al sur
        expect(s.at.z).toBeGreaterThanOrEqual(stacks[k]!.z);
      }
    }
  });

  it("con reduced-motion no cambia nada", () => {
    const a = createFactoryAnim(stacks, createRng(1), { reducedMotion: true });
    const before = JSON.stringify(a.puffs(0));
    expect(a.tick(500)).toBe(false);
    expect(JSON.stringify(a.puffs(0))).toBe(before);
  });
});
```

- [ ] **Step 6: factory-anim.ts y factory-animator.ts**

```ts
import { v3, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";

/**
 * Humo de las chimeneas: por cada boca, PUFFS bocanadas (cilindros grises) que
 * suben, derivan al NNE con un seno lateral, crecen y se reciclan en la boca.
 * Arrancan escalonadas, así el frame 0 (y reduced-motion) muestra una columna
 * y no un punto. Sin Pixi.
 */
export const PUFFS = 5;
export const PUFF_RANGE = 28;
export const PUFF_SPEED = 2 / 1000; // u por ms
export const PUFF_LIFT = 0.25;      // z que gana por unidad recorrida
export const PUFF_SIDE = 1.5;
export const PUFF_PERIOD_MS = 2500;
export const PUFF_R0 = 1.2, PUFF_R1 = 3, PUFF_H = 1.2;
const NNE = { x: 0.45, y: -0.893 };
const PERP = { x: -NNE.y, y: NNE.x };

export interface FactoryAnim { puffs(stack: number): Solid[]; tick(dtMs: number): boolean }

export function createFactoryAnim(stacks: readonly Vec3[], rng: Rng, opts: { reducedMotion: boolean }): FactoryAnim {
  interface Puff { dist: number; phase: number; speed: number }
  const fresh = (): Puff => ({ dist: 0, phase: rng.next() * Math.PI * 2, speed: 0.8 + rng.next() * 0.4 });
  const all = stacks.map(() => Array.from({ length: PUFFS }, (_, i) => ({ ...fresh(), dist: (i / PUFFS) * PUFF_RANGE })));
  let clock = 0;
  const puffAt = (s: Vec3, p: Puff): Solid => {
    const t = p.dist / PUFF_RANGE;
    const side = p.dist === 0 ? 0 : PUFF_SIDE * Math.sin((clock / PUFF_PERIOD_MS) * Math.PI * 2 + p.phase) * Math.min(1, p.dist / 5);
    return { kind: "cylinder", at: v3(s.x + NNE.x * p.dist + PERP.x * side, s.y + NNE.y * p.dist + PERP.y * side, s.z + p.dist * PUFF_LIFT), r: PUFF_R0 + (PUFF_R1 - PUFF_R0) * t, h: PUFF_H, mat: "concrete", sides: 6 };
  };
  return {
    puffs: (k) => all[k]!.map((p) => puffAt(stacks[k]!, p)),
    tick(dtMs) {
      if (opts.reducedMotion || dtMs <= 0) return false;
      clock += dtMs;
      for (const ps of all) for (const p of ps) {
        p.dist += PUFF_SPEED * p.speed * dtMs;
        if (p.dist >= PUFF_RANGE) Object.assign(p, fresh(), { dist: p.dist - PUFF_RANGE });
      }
      return true;
    },
  };
}
```

`src/scenes/factory-animator.ts`:

```ts
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { FactoryScene } from "./factory";
import { createFactoryAnim } from "./factory-anim";

/** Adapta el humo de la fábrica al contrato `Animator`: una capa de sólidos por chimenea. */
export function factoryAnimator(scene: FactoryScene, rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createFactoryAnim(scene.stacks, rng, opts);
  const ids = scene.stacks.map((_, k) => `factory.smoke${k}`);
  const layers: Record<string, () => AnimLayer> = Object.fromEntries(ids.map((id, k) => [id, () => ({ kind: "solid", solids: anim.puffs(k) })]));
  return {
    ids,
    layer: (id) => layers[id]!(),
    tick: (dtMs) => new Set(anim.tick(dtMs) ? ids : []),
  };
}
```

Run: `npx vitest run src/scenes/factory-anim.test.ts` → PASS.

- [ ] **Step 7: Enchufar en el mundo y en el lab**

`src/scenes/world.ts`: `import { factory, type FactoryScene } from "./factory";`; `WorldScene` suma `factory: FactoryScene | null`; en `world()`:

```ts
  let fa: FactoryScene | null = null;
  if (zones.includes("portfolio")) {
    sy = shipyard(zoneRng(seed, "portfolio"));
    fa = factory(zoneRng(seed, "portfolio", 1));
    for (const sc of [sy, fa]) { ground.push(...sc.ground); solids.push(...sc.solids); accents.push(...sc.accents); }
  }
```

y `factory: fa` en el retorno. `src/lab/page.ts`: `if (scene.factory) animators.push(factoryAnimator(scene.factory, createRng(SEED + 4), { reducedMotion }));`.

`src/scenes/world.test.ts`: en "con todas las zonas" sumar `expect(w.factory).not.toBeNull()` y `w.solids.length > 700`; nuevo:

```ts
  it("Portfolio con fábrica supera 400 sólidos elevados y la fábrica queda al norte y al oeste del astillero", () => {
    const w = world(7);
    const raised = w.solids.filter((s) => !isFlat(s) && worldZoneAt(bounds(s).min.x, bounds(s).min.y) === "portfolio");
    expect(raised.length).toBeGreaterThan(400);
    expect(w.factory!.solids.every((s) => bounds(s).max.y <= 0 || bounds(s).max.x <= 0)).toBe(true);
  });
```

(import `isFlat` de solids). Run: `npm run typecheck && npm test` → PASS. Captura `lab/portfolio.html`: planta de ladrillo con dientes de sierra al norte del dique, tres chimeneas con columnas de humo hacia arriba a la derecha, grúa sobre el desvío, cinta cruzando la playa, vías y acopios al oeste.

- [ ] **Step 8: Commit**

```bash
git add src/map/palette-iso.ts src/scenes/pieces.ts src/scenes/pieces.test.ts src/scenes/factory.ts src/scenes/factory.test.ts src/scenes/factory-anim.ts src/scenes/factory-anim.test.ts src/scenes/factory-animator.ts src/scenes/shipyard.ts src/scenes/world.ts src/scenes/world.test.ts src/lab/page.ts
git commit -m "feat(scenes): fábrica al norte y oeste del astillero con chimeneas humeantes, grúa torre y playa de vías"
```

### Task 4: Distrito moderno de Resume

**Files:**
- Modify: `src/iso/facade.ts`, `src/iso/facade.test.ts`; `src/iso/depth.ts` (exportar `overlaps`)
- Modify: `src/map/palette-iso.ts` (+ `curtain`, `stone`, `copper`), `src/map/palette-iso.test.ts`
- Modify: `src/scenes/city-grid.ts`, `src/scenes/city-grid.test.ts`
- Create: `src/scenes/city-pieces.ts` (mudanza), `src/scenes/district.ts`, `src/scenes/district.test.ts`
- Modify: `src/scenes/city.ts`, `src/scenes/city.test.ts`, `src/scenes/world.ts`

**Interfaces:**
- Produces (`facade.ts`): `Facade.window?: { w: number; h: number }` (fracciones de ancho de columna y de alto de piso; default 0.5/0.5).
- Produces (`city-grid.ts`): `WEST_COLS = [-48, -18, 12, 42, 72, 102, 132, 162]`, `ROWS = [164, 188, 218, 242, 272, 302]`, `CITY_EDGE = { west: -54, north: 158, south: 324 }`, `DISTRICT_COLS = [-48, -18]`, `DISTRICT_ROWS = [272, 302]`, `SITE: Rect`, `BlockKind` suma `"district" | "site"`, `MALECON.y1 = 326`.
- Produces (`city-pieces.ts`): `prism(x, y, z, w, d, h, mat, extra?)`, `tiles(rng, r, z, mat, tone?)`, `lamp(solids, accents, x, y, z)`, `brokenTone`, `plazaTone` (idénticos a los de `city.ts`, solo mudados).
- Produces (`district.ts`): `MAX_DISTRICT_H = 24`, `districtBlock(solids, ground, accents, rng, b: Block, maxH: number): void`, `maxDistrictHeight(b: Rect): number`.
- `city(rng, districtRng)`: segundo `Rng` para las manzanas de distrito. `world.ts` pasa `zoneRng(seed, "cv", 1)`.

- [ ] **Step 1: Ventanas parametrizables (motor)**

`src/iso/facade.test.ts`, nuevo test en `describe("fachada")`:

```ts
  it("window ancha y alta: muro cortina", () => {
    const wall = tessellateAll(tower).find((f) => isWall(f) && f.pts.every((p) => p.y === 4))!;
    const wide = windowPatches(wall, { floors: 3, cols: 2, window: { w: 0.85, h: 0.8 } }, 1)[0]!;
    const normal = windowPatches(wall, { floors: 3, cols: 2 }, 1)[0]!;
    const width = (p: typeof wide) => Math.abs(p[1]!.x - p[0]!.x), height = (p: typeof wide) => p[2]!.z - p[0]!.z;
    expect(width(wide)).toBeCloseTo(0.85 * 2, 6);
    expect(width(normal)).toBeCloseTo(0.5 * 2, 6);
    expect(height(wide)).toBeCloseTo(0.8 * 2, 6);
  });
```

`src/iso/facade.ts`: `export interface Facade { floors: number; cols: number; litFloor?: number; base?: "glass" | "portico"; window?: { w: number; h: number } }` y en `windowPatches`:

```ts
  const ww = f.window?.w ?? WINDOW_W, wh = f.window?.h ?? WINDOW_H;
  ...
    out.push(patch(wall, c0 + cw * (1 - ww) / 2, c0 + cw * (1 + ww) / 2, z0 + fh * (1 - wh) / 2, z0 + fh * (1 + wh) / 2));
```

`src/iso/depth.ts`: `export const overlaps = ...` (sin cambiar el cuerpo). Run: `npx vitest run src/iso` → PASS.

- [ ] **Step 2: Materiales del distrito**

`ISO_TONES`, debajo de `plaza`:

```ts
  // Resume, distrito moderno: muro cortina, piedra clásica, cobre de cubierta
  curtain:   { top: 0x3d6b7a, lit: 0x324f4c, shade: 0x182d49, up: 0x47787c, down: 0x345e73 },
  stone:     { top: 0xb5a48a, lit: 0x947956, shade: 0x484553, up: 0xd2b88d, down: 0x9c9082 },
  copper:    { top: 0x4f8a78, lit: 0x41664a, shade: 0x203a48, up: 0x5c9b7a, down: 0x447971 },
```

Sumar `"curtain", "stone", "copper"` a la lista del test "materiales exclusivos". Run: `npx vitest run src/map` → PASS.

- [ ] **Step 3: Grilla**

`src/scenes/city-grid.test.ts`, nuevo test:

```ts
  it("distrito: dos columnas al oeste y dos filas al sur, solo ribera oeste, 24 manzanas con una obra; el malecón llega a 326", () => {
    const d = blocks().filter((b) => b.kind === "district" || b.kind === "site");
    expect(d).toHaveLength(24);
    expect(d.filter((b) => b.kind === "site")).toHaveLength(1);
    expect(d.every((b) => b.bank === "west")).toBe(true);
    expect(d.every((b) => DISTRICT_COLS.includes(b.x as 0) || DISTRICT_ROWS.includes(b.y as 0))).toBe(true);
    expect(blocks().filter((b) => b.bank === "east").every((b) => b.y < DISTRICT_ROWS[0])).toBe(true);
    expect(blocks().filter((b) => b.kind === "block")).toHaveLength(29); // las 30 manzanas viejas menos la derrumbada: nada viejo cambió de tipo
    expect(CITY_EDGE).toEqual({ west: -54, north: 158, south: 324 });
    expect(MALECON.y1).toBe(326);
  });
```

Nota: antes de tocar la grilla, verificar con un `console.log` en el test viejo que `blocks().filter((b) => b.kind === "block").length` es 29 (4 filas × 8 columnas − 2 bajo la plaza − 1 derrumbada); si no, corregir el número del test nuevo.

`src/scenes/city-grid.ts`:

```ts
export const WEST_COLS = [-48, -18, 12, 42, 72, 102, 132, 162] as const;
export const EAST_COLS = [280, 310] as const;
export const ROWS = [164, 188, 218, 242, 272, 302] as const;
/** Distrito moderno: las dos columnas del oeste y las dos filas del sur (solo ribera oeste: al sur de 272 el estuario ya pasa x 285). */
export const DISTRICT_COLS = [-48, -18] as const;
export const DISTRICT_ROWS = [272, 302] as const;
export const SITE: Rect = { x: -18, y: 272, w: 24, d: 18 }; // la obra en construcción
...
export const MALECON = { x0: 334, x1: 344, y0: 158, y1: 326, z: 0.6 } as const;
export const CITY_EDGE = { west: -54, north: 158, south: 324 } as const;
...
export type BlockKind = "block" | "plaza" | "collapsed" | "district" | "site";

export function blocks(): Block[] {
  const out: Block[] = [];
  const isDistrict = (x: number, y: number) => (DISTRICT_COLS as readonly number[]).includes(x) || (DISTRICT_ROWS as readonly number[]).includes(y);
  ROWS.forEach((y, row) => {
    for (const x of WEST_COLS) {
      if (y === PLAZA.y && x >= PLAZA.x && x < PLAZA.x + PLAZA.w) continue;
      const kind: BlockKind = x === SITE.x && y === SITE.y ? "site" : isDistrict(x, y) ? "district" : "block";
      out.push({ x, y, w: BLOCK_W, d: BLOCK_D, bank: "west", row, kind });
    }
    if (y >= DISTRICT_ROWS[0]) return; // al sur de la avenida vieja la ribera este es selva y malecón
    for (const x of EAST_COLS) { ... igual que antes ... }
  });
  out.push({ ...PLAZA, bank: "west", row: 2, kind: "plaza" });
  return out;
}
```

`cityTerrainAt` (terrain.ts): agregar antes de `if (x > QUAY_X && x < EAST_RING.x0)`: `if (y >= DISTRICT_ROWS[0] && x > QUAY_X) return x >= MALECON.x0 ? "asphalt" : "jungle";` (import `DISTRICT_ROWS, MALECON`). En `terrain.test.ts` "ciudad", agregar `expect(terrainAt(-30, 290)).toBe("asphalt")` y `expect(terrainAt(300, 300)).toBe("jungle")`.

Run: `npx vitest run src/scenes/city-grid.test.ts src/scenes/terrain.test.ts` → PASS (los tests viejos de city-grid, como "toda manzana cae en tierra", siguen valiendo con los bordes nuevos).

- [ ] **Step 4: Mudar piezas a `city-pieces.ts`**

Crear `src/scenes/city-pieces.ts` con `prism`, `Prism`, `Extra`, `brokenTone`, `plazaTone`, `tiles`, `lamp` copiados **sin cambios** de `city.ts:33-74` (exportados), más `TILE = 6` y `PLINTH_H = 0.3` (mover `PLINTH_H` acá y re-exportarlo desde `city.ts`: `export { PLINTH_H } from "./city-pieces";`). En `city.ts` borrar esas definiciones e importarlas. Run: `npm run typecheck && npx vitest run src/scenes/city.test.ts` → PASS.

- [ ] **Step 5: Test del distrito**

`src/scenes/district.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { screenBounds, overlaps, isBehind } from "../iso/depth";
import { v3 } from "../iso/geometry";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { buildRenderList } from "../iso/render-list";
import { DISTRICT_COLS, DISTRICT_ROWS, SITE, TOWER, blocks, type Block } from "./city-grid";
import { MAX_DISTRICT_H, districtBlock, maxDistrictHeight } from "./district";
import { TOWER_H } from "./city";

const DISTRICT: Block[] = blocks().filter((b) => b.kind === "district" || b.kind === "site");
const inRect = (s: Solid, r: { x: number; y: number; w: number; d: number }) => { const b = bounds(s); return b.min.x >= r.x - 1 && b.max.x <= r.x + r.w + 1 && b.min.y >= r.y - 1 && b.max.y <= r.y + r.d + 1; };
const DISTRICT_MATS: readonly Material[] = ["paving", "curtain", "stone", "copper", "office", "officeDark", "glass", "leaf", "leafDark", "steel", "rust"];

function build() {
  const solids: Solid[] = [], ground: Solid[] = [], accents = [] as Parameters<typeof districtBlock>[2];
  const rng = createRng(7);
  for (const b of DISTRICT) districtBlock(solids, ground, accents, rng, b, maxDistrictHeight(b));
  return { solids, ground, accents };
}

describe("district", () => {
  it("es determinístico y toda pieza cae en su manzana con materiales del distrito", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
    const { solids, ground } = build();
    for (const s of [...solids, ...ground]) {
      expect(DISTRICT.some((b) => inRect(s, b))).toBe(true);
      expect(DISTRICT_MATS).toContain(s.mat);
    }
  });

  it("mezcla: ≥ 4 torres de vidrio en cuerpos, ≥ 2 clásicos de piedra, ≥ 2 campus con patio verde y una obra con grúa", () => {
    const { solids, ground } = build();
    const curtain = solids.filter((s) => s.kind === "prism" && s.mat === "curtain" && s.facade);
    expect(new Set(curtain.map((s) => `${bounds(s).min.x},${bounds(s).min.y}`)).size).toBeGreaterThanOrEqual(4); // por lo menos 4 torres (varios cuerpos cada una)
    expect(curtain.every((s) => s.kind === "prism" && s.facade!.window?.w === 0.85)).toBe(true);
    expect(solids.filter((s) => s.kind === "prism" && s.mat === "stone" && s.facade).length).toBeGreaterThanOrEqual(2);
    expect(ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThanOrEqual(2); // patios
    expect(solids.some((s) => s.kind === "prism" && s.h === 22 && s.w === 1.2 && inRect(s, SITE))).toBe(true);   // mástil de la obra
    expect(solids.filter((s) => s.kind === "prism" && s.mat === "paving" && s.h === 0.3 && s.at.z > 1 && inRect(s, SITE)).length).toBe(5); // losas
  });

  it("alturas: edificios ≤ 24, remates ≤ 27.5, y nada delante del piso encendido supera 10", () => {
    const { solids } = build();
    const lit = { min: v3(TOWER.x, TOWER.y, 5 * (TOWER_H / 8)), max: v3(TOWER.x + TOWER.w, TOWER.y + TOWER.d, 6 * (TOWER_H / 8)) };
    for (const s of solids) {
      const b = bounds(s);
      if (s.kind === "prism" && s.facade) expect(s.h).toBeLessThanOrEqual(MAX_DISTRICT_H);
      expect(b.max.z).toBeLessThanOrEqual(27.5);
      if (s.kind === "prism" && s.facade && overlaps(screenBounds(b), screenBounds(lit)) && isBehind(lit, b)) expect(s.h).toBeLessThanOrEqual(10);
    }
    expect(maxDistrictHeight({ x: TOWER.x + 20, y: TOWER.y + 20, w: 24, d: 18 })).toBe(10); // una manzana que en pantalla pisa el piso encendido y queda delante
    expect(maxDistrictHeight(SITE)).toBe(MAX_DISTRICT_H);
  });

  it("acentos ámbar y colores del atlas", () => {
    const { solids, ground, accents } = build();
    expect(accents.length).toBeGreaterThan(6);
    expect(accents.every((a) => a.color.startsWith("amber"))).toBe(true);
    const colors = allIsoColors();
    for (const i of buildRenderList([...ground, ...solids])) expect(colors.has(i.color)).toBe(true);
    expect(solids.filter((s) => !isFlat(s)).length).toBeGreaterThan(150);
  });
});
```

- [ ] **Step 6: district.ts**

```ts
import type { Accent } from "../iso/accent";
import { isBehind, overlaps, screenBounds } from "../iso/depth";
import { v3 } from "../iso/geometry";
import type { Bounds, Solid } from "../iso/solids";
import type { Rng } from "../map/seed";
import { PLINTH_H, prism, tiles } from "./city-pieces";
import { SIDEWALK, TOWER, type Block, type Rect } from "./city-grid";
import { towerCrane } from "./pieces";

/**
 * Distrito moderno de Resume: torres de vidrio en cuerpos escalonados,
 * clásicos grandes de piedra con cornisa pesada, campus de startups con patio
 * verde y una obra en construcción. Spec §6.
 */
export const MAX_DISTRICT_H = 24;
export const MAX_CLASSIC_H = 18;
const FRONT_CAP_H = 10;
const TOWER_H = 30, TOWER_FLOORS = 8, LIT_FLOOR = 5;
const CURTAIN_WINDOW = { w: 0.85, h: 0.8 } as const;

/** Caja del piso encendido de la torre (city.ts pone la torre; acá solo hace falta dónde queda). */
const LIT: Bounds = { min: v3(TOWER.x, TOWER.y, LIT_FLOOR * (TOWER_H / TOWER_FLOORS)), max: v3(TOWER.x + TOWER.w, TOWER.y + TOWER.d, (LIT_FLOOR + 1) * (TOWER_H / TOWER_FLOORS)) };

/** Regla del piso encendido: si un edificio de 24 en esta manzana se superpondría en pantalla con el piso encendido quedando delante, la manzana se limita a 10. */
export function maxDistrictHeight(b: Rect): number {
  const box: Bounds = { min: v3(b.x, b.y, 0), max: v3(b.x + b.w, b.y + b.d, MAX_DISTRICT_H + PLINTH_H + 1) };
  return overlaps(screenBounds(box), screenBounds(LIT)) && isBehind(LIT, box) ? FRONT_CAP_H : MAX_DISTRICT_H;
}

type Type = "glass" | "classic" | "campus";
const pickType = (rng: Rng): Type => { const r = rng.next(); return r < 0.4 ? "glass" : r < 0.7 ? "classic" : "campus"; };

function glassTower(out: Solid[], accents: Accent[], rng: Rng, x: number, y: number, w: number, d: number, maxH: number): void {
  const h = maxH < 16 ? maxH : rng.int(16, maxH);
  const bw = rng.int(12, 14), bd = rng.int(10, 12);
  const bx = x + (w - bw) / 2, by = y + (d - bd) / 2;
  const tiers = rng.int(2, 3);
  const share = tiers === 3 ? [0.6, 0.3, 0.1] : [0.7, 0.3];
  const insets = [0, 2, 4];
  let z = PLINTH_H;
  for (let t = 0; t < tiers; t++) {
    const th = Math.max(3, Math.round(h * share[t]!)), ins = insets[t]!, tw = bw - 2 * ins, td = bd - 2 * ins;
    const facade = { floors: Math.max(1, Math.round(th / 3)), cols: Math.max(2, Math.round(tw / 2.5)), window: CURTAIN_WINDOW, ...(t === 0 ? { base: "glass" as const } : {}) };
    out.push(prism(bx + ins, by + ins, z, tw, td, th, "curtain", { facade }));
    out.push(prism(bx + ins - 0.3, by + ins - 0.3, z + th, tw + 0.6, td + 0.6, 0.3, "officeDark")); // losa de remate de cada cuerpo
    z += th + 0.3;
  }
  const ins = insets[tiers - 1]!, cx = bx + bw / 2, cy = by + bd / 2;
  if (rng.chance(0.5)) { // helipuerto
    out.push({ kind: "cylinder", at: v3(cx, cy, z), r: 3, h: 0.3, mat: "paving", sides: 8 });
    accents.push({ kind: "dot", at: v3(cx, cy, z + 0.3), r: 0.6, color: "amberMid" });
  } else { // terraza verde: losa fina de selva (un ground no puede ir sobre un techo) más conos
    out.push(prism(bx + ins + 0.5, by + ins + 0.5, z, bw - 2 * ins - 1, bd - 2 * ins - 1, 0.3, "leafDark"));
    for (let k = 0, n = rng.int(3, 5); k < n; k++) out.push({ kind: "cone", at: v3(bx + ins + 1.5 + rng.next() * (bw - 2 * ins - 3), by + ins + 1.5 + rng.next() * (bd - 2 * ins - 3), z + 0.3), r: 1, h: 2, mat: "leaf" });
  }
  if (h >= 20) accents.push({ kind: "dot", at: v3(bx + bw - ins, by + ins, z + 0.5), r: 0.5, color: "amberMid" }); // baliza
}

function classic(out: Solid[], accents: Accent[], rng: Rng, x: number, y: number, w: number, d: number, maxH: number): void {
  const h = maxH < 12 ? maxH : rng.int(12, maxH);
  const bw = rng.int(14, 17), bd = rng.int(11, 13);
  const bx = x + (w - bw) / 2, by = y + (d - bd) / 2;
  const floors = Math.max(2, Math.round(h / 3.5)), cols = rng.int(4, 5), fh = h / floors;
  out.push(prism(bx, by, PLINTH_H, bw, bd, h, "stone", { facade: { floors, cols, base: "portico" } }));
  for (let k = 0; k <= cols; k++) { // pilastras de planta baja en las caras visibles (este y sur)
    out.push(prism(bx + bw, by + (bd * k) / cols - 0.2, PLINTH_H, 0.4, 0.4, fh, "stone"));
    out.push(prism(bx + (bw * k) / cols - 0.2, by + bd, PLINTH_H, 0.4, 0.4, fh, "stone"));
  }
  const top = PLINTH_H + h;
  out.push(prism(bx - 0.8, by - 0.8, top, bw + 1.6, bd + 1.6, 1, "officeDark")); // cornisa pesada
  if (rng.chance(0.5)) out.push(prism(bx + 2, by + 2, top + 1, bw - 4, bd - 4, 3, "copper", { roof: "gable" }));
  else { out.push(prism(bx + 2, by + 2, top + 1, bw - 4, bd - 4, 2, "stone")); out.push(prism(bx + 5, by + 4, top + 3, bw - 10, bd - 8, 1.5, "stone")); } // corona escalonada
  const cz = top - fh / 2, cx = bx + bw / 2, cy = by + bd + 0.02; // reloj en la cara sur, último piso
  accents.push({ kind: "poly", pts: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return v3(cx + 1.2 * Math.cos(a), cy, cz + 1.2 * Math.sin(a)); }), color: "amberBleed", alpha: 0.9 });
}

/** Tres edificios bajos en U alrededor de un patio verde; el suelo de la manzana es selva, con zócalos sueltos bajo cada edificio (esquema de las manzanas devoradas). */
function campus(out: Solid[], ground: Solid[], accents: Accent[], rng: Rng, b: Block, x: number, y: number, w: number, d: number): void {
  ground.push(tiles(rng, b, 0.05, "leafDark"));
  const bldg = (bx: number, by: number, bw: number, bd: number, h: number) => {
    out.push(prism(bx, by, 0, bw, bd, PLINTH_H, "paving"));
    out.push(prism(bx + 0.5, by + 0.5, PLINTH_H, bw - 1, bd - 1, h, "office", { facade: { floors: Math.max(2, Math.round(h / 3)), cols: Math.max(2, Math.round(bw / 4)), base: "glass" } }));
    out.push(prism(bx, by, PLINTH_H + h, bw, bd, 0.4, "officeDark"));
    return PLINTH_H + h + 0.4;
  };
  const topN = bldg(x, y, w, 5, rng.int(6, 8));
  bldg(x, y + 6, 6, d - 6, rng.int(6, 8));
  bldg(x + w - 6, y + 6, 6, d - 6, rng.int(6, 8));
  const px0 = x + 6, px1 = x + w - 6, py0 = y + 6, py1 = y + d; // patio 9×9
  for (let k = 0, n = rng.int(4, 6); k < n; k++) out.push({ kind: "cone", at: v3(px0 + 1.5 + rng.next() * (px1 - px0 - 3), py0 + 1.5 + rng.next() * (py1 - py0 - 3), 0.05), r: 1 + rng.next() * 0.5, h: 2 + rng.next(), mat: "leaf" });
  ground.push({ kind: "strip", path: [{ x: (px0 + px1) / 2, y: y + 5 }, { x: (px0 + px1) / 2, y: py1 }], width: 1, z: 0.08, mat: "paving" });
  ground.push({ kind: "strip", path: [{ x: px0, y: (py0 + py1) / 2 }, { x: px1, y: (py0 + py1) / 2 }], width: 1, z: 0.08, mat: "paving" });
  for (const [dx, dy] of [[1, 1], [px1 - px0 - 2, 1], [1, py1 - py0 - 2], [px1 - px0 - 2, py1 - py0 - 2]] as const) out.push(prism(px0 + dx, py0 + dy, 0.05, 1, 1, 0.7, "paving")); // mesas
  const sx = x + w / 2 - 2, sy = y + 4.5; // cartel luminoso sobre el borde sur del techo del edificio norte
  accents.push({ kind: "poly", pts: [v3(sx - 0.3, sy, topN - 0.2), v3(sx + 4.3, sy, topN - 0.2), v3(sx + 4.3, sy, topN + 1.4), v3(sx - 0.3, sy, topN + 1.4)], color: "amberBleed", alpha: 0.6 });
  accents.push({ kind: "poly", pts: [v3(sx, sy, topN), v3(sx + 4, sy, topN), v3(sx + 4, sy, topN + 1.2), v3(sx, sy, topN + 1.2)], color: "amber" });
}

function constructionSite(out: Solid[], accents: Accent[], x: number, y: number, w: number, d: number): void {
  const sx = x + 2, sy = y + 1.5, sw = 16, sd = 12;
  for (let k = 1; k <= 5; k++) out.push(prism(sx, sy, PLINTH_H + 3 * k - 0.3, k === 5 ? 8 : sw, sd, 0.3, "paving")); // losas; la última a medio hacer
  for (const [cx, cy] of [[0, 0], [8, 0], [16, 0], [0, 12], [8, 12], [16, 12]] as const) out.push(prism(sx + cx - 0.3, sy + cy - 0.3, PLINTH_H, 0.6, 0.6, 15, "steel"));
  out.push(prism(sx + 6, sy + 4, PLINTH_H, 4, 4, 16, "officeDark")); // núcleo
  towerCrane(out, accents, { at: { x: x + w - 2, y: y + d - 2 }, z: PLINTH_H, mastH: 22, jibLen: 20, dir: "w", light: "amber" });
  for (const dx of [2, 6, 10]) accents.push({ kind: "dot", at: v3(sx + dx, sy + 6, PLINTH_H + 15.3), r: 0.5, color: "amber" }); // luces de obra
  for (const [fx, fy, fw, fd] of [[x, y, w, 0.3], [x, y + d - 0.3, w, 0.3], [x, y, 0.3, d], [x + w - 0.3, y, 0.3, d]] as const) out.push(prism(fx, fy, PLINTH_H, fw, fd, 1.2, "officeDark")); // cerco
  out.push(prism(x + 0.5, y + d - 3, PLINTH_H, 6, 2.4, 2.4, "rust"), prism(x + 7, y + d - 3, PLINTH_H, 6, 2.4, 2.4, "rust")); // contenedores de obra
}

export function districtBlock(solids: Solid[], ground: Solid[], accents: Accent[], rng: Rng, b: Block, maxH: number): void {
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK, iw = b.w - 2 * SIDEWALK, id = b.d - 2 * SIDEWALK;
  if (b.kind === "site") { solids.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving")); constructionSite(solids, accents, ix, iy, iw, id); return; }
  const type = pickType(rng);
  if (type === "campus") { campus(solids, ground, accents, rng, b, ix, iy, iw, id); return; }
  solids.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  if (type === "glass") glassTower(solids, accents, rng, ix, iy, iw, id, Math.min(maxH, MAX_DISTRICT_H));
  else classic(solids, accents, rng, ix, iy, iw, id, Math.min(maxH, MAX_CLASSIC_H));
}
```

Run: `npx vitest run src/scenes/district.test.ts` → PASS. Si "≥ 4 torres / ≥ 2 clásicos / ≥ 2 campus" falla con seed 7, ajustar los pesos de `pickType` (no el seed) y anotar.

- [ ] **Step 7: Enchufar el distrito en `city.ts`**

`src/scenes/city.ts`:

- Firma `export function city(rng: Rng, districtRng: Rng): CityScene`. Bucle de manzanas:

```ts
  for (const b of blocks()) if (b.kind === "block") block(solids, ground, rng, b, maxHeightFor(b), tallPending);
  const tower = plazaAndTower(solids, ground, accents, rng);
  for (const b of blocks()) if (b.kind === "district" || b.kind === "site") districtBlock(solids, ground, accents, districtRng, b, maxDistrictHeight(b));
```

- `lanes()`: en el bucle de `LANE_X`, `const yEnd = cx > QUAY_X ? Math.min(DISTRICT_ROWS[0] - STREET, estuaryReaches(cx) - 1) : CITY_EDGE.south;` y en el bucle de filas E-O, la línea del este solo `if (cy < DISTRICT_ROWS[0] - STREET)`.
- `greenery()`: cinturón de costura `x0: WORLD.x0 + 3`; borde oeste `{ x0: WORLD.x0 + 2, x1: CITY_EDGE.west - 2, y0: CITY_EDGE.north, y1: CITY_EDGE.south }`; borde sur `{ x0: CITY_EDGE.west, x1: 330, y0: CITY_EDGE.south, y1: WORLD.y1 - 5 }`; nueva ribera este del distrito: `jungleOnLand(solids, rng, { x0: Math.ceil(estuaryEast(DISTRICT_ROWS[0])) + 2, x1: MALECON.x0 - 3, y0: DISTRICT_ROWS[0], y1: MALECON.y1 - 2 }, 10);` (import `WORLD` de geo y `DISTRICT_ROWS` de city-grid).
- `malecon()`: usa `MALECON.y1` (ya lo hace; verificar que la escalera y los faroles no se dupliquen en el tramo nuevo: los faroles del malecón van cada 12 u, así que el tramo 266..326 suma cinco).

`src/scenes/world.ts`: `ct = city(zoneRng(seed, "cv"), zoneRng(seed, "cv", 1));`.

`src/scenes/city.test.ts`: `scene()` pasa a `city(createRng(7), createRng(8))`; `CITY_MATS` suma `"curtain", "stone", "copper"`; el test "hay un zócalo por manzana construida" itera `blocks().filter((b) => b.kind === "block")` (los campus no llevan zócalo entero); "la torre mide 30 … nada más supera 21" excluye las manzanas de distrito: `if (!isTowerPiece(x) && !DISTRICT.some((b) => inRect(bounds(x), b))) expect(bounds(x).max.z).toBeLessThanOrEqual(21);` con `const DISTRICT = blocks().filter((b) => b.kind === "district" || b.kind === "site")`. Agregar:

```ts
  it("la avenida llega al borde oeste nuevo y el malecón baja hasta 326", () => {
    const s = scene();
    expect(s.ground.some((g) => g.kind === "strip" && g.mat === "paving" && g.path[0]!.x <= CITY_EDGE.west && Math.abs(g.path[0]!.y - (BOULEVARD.y0 - 0.3)) < 0.01)).toBe(true);
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "paving" && x.at.x === MALECON.x0 && x.at.y + x.d >= MALECON.y1)).toBe(true);
  });
```

`world.test.ts` "el mundo entero": `w.solids.length > 900`; nuevo `expect(w.solids.filter((s) => !isFlat(s) && worldZoneAt(bounds(s).min.x, bounds(s).min.y) === "cv").length).toBeGreaterThan(450)`.

Run: `npm run typecheck && npm test` → PASS. Captura `lab/resume.html`: al oeste y al sur de la ciudad vieja, torres de vidrio verde-azulado escalonadas, edificios de piedra clara con cornisa, patios verdes con cartel ámbar, la obra con grúa en la esquina SO; la torre de 30 sigue siendo la más alta y su piso encendido se ve.

- [ ] **Step 8: Commit**

```bash
git add src/iso src/map src/scenes
git commit -m "feat(scenes): distrito moderno de Resume: torres de vidrio, clásicos de piedra, campus con patio verde y obra"
```

### Task 5: Punta, faro, boyas y pecio (Blog estático) y `hull.heading`

**Files:**
- Modify: `src/iso/solids.ts:8-16,131-134` (`hull.heading`), `src/iso/solids.test.ts`
- Create: `src/scenes/sea.ts`, `src/scenes/sea.test.ts`
- Modify: `src/scenes/world.ts`, `src/scenes/world.test.ts`

**Interfaces:**
- Produces (`solids.ts`): `{ kind: "hull"; at; len; beam; h; mat; heading?: number }` — radianes, 0 = proa al este (+x), π/2 = proa al sur (+y); rota la huella alrededor de `at` (la popa).
- Produces (`sea.ts`): `interface SeaScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; lantern: Vec3; buoys: Vec3[] }`, `sea(rng): SeaScene`, constantes `LIGHTHOUSE = { x: 396, y: 118, z: 7 }`, `KEEPER = { x: 372, y: 108 }`, `BUOYS`, `WRECK_BUOY = { x: 470, y: 160 }`, `WRECK = { x: 462, y: 150, heading: Math.PI / 6 }`. `lantern` es el centro de la linterna (para el haz de la Task 6); `buoys` las bases de las dos boyas parpadeantes.
- `WorldScene.sea: SeaScene | null`.

- [ ] **Step 1: `heading` en el casco**

`src/iso/solids.test.ts`, junto al test de hull existente (línea 98):

```ts
  it("hull con heading π/2 tiene la proa al sur (+y) y gira alrededor de la popa", () => {
    const pts = tessellateAll({ kind: "hull", at: v3(10, 20, 0), len: 20, beam: 4, h: 2, mat: "hull", heading: Math.PI / 2 }).flatMap((f) => f.pts);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(40, 6);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(20, 6);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(8, 6);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(12, 6);
  });
```

`src/iso/solids.ts`: `| { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material; heading?: number }` y

```ts
/** Huella del casco: popa en `at`, proa a `len` en la dirección `heading` (0 = este), hombros al 70 %. */
function hullFootprint(at: Vec3, len: number, beam: number, heading = 0): Vec2[] {
  const half = beam / 2, shoulder = len * 0.7;
  const local = [{ x: 0, y: -half }, { x: shoulder, y: -half }, { x: len, y: 0 }, { x: shoulder, y: half }, { x: 0, y: half }];
  const c = Math.cos(heading), s = Math.sin(heading);
  return local.map((p) => ({ x: at.x + p.x * c - p.y * s, y: at.y + p.x * s + p.y * c }));
}
```

y en `tessellateAll`: `case "hull": return extrude(hullFootprint(s.at, s.len, s.beam, s.heading), s.at.z, s.h, s.mat);`. Run: `npx vitest run src/iso` → PASS.

- [ ] **Step 2: Test de la escena**

`src/scenes/sea.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { ZONE_SPLIT_X, inHeadland, worldZoneAt } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { BUOYS, KEEPER, LIGHTHOUSE, WRECK, WRECK_BUOY, sea, type SeaScene } from "./sea";
import { headlandZ, terrainAt } from "./terrain";

const scene = (): SeaScene => sea(createRng(7));
const SEA_MATS: readonly Material[] = ["rock", "whitewash", "rust", "steel", "glass", "hull", "foam", "leaf", "leafDark"];
const water = new Set(["water", "sea", "shore", "abyss", "reef"]);

describe("sea", () => {
  it("es determinística, trae ≥ 80 sólidos elevados y usa solo materiales del Blog o compartidos", () => {
    expect(JSON.stringify(sea(createRng(7)))).toBe(JSON.stringify(sea(createRng(7))));
    const s = scene();
    expect(s.solids.filter((x) => !isFlat(x)).length).toBeGreaterThanOrEqual(80);
    for (const x of [...s.ground, ...s.solids]) { expect(SEA_MATS).toContain(x.mat); expect(bounds(x).min.x).toBeGreaterThanOrEqual(330); }
  });

  it("faro: seis tambores alternados, galería con ocho postes, linterna de vidrio y cono; ≈ 29.6 sobre la roca", () => {
    const s = scene();
    const drums = s.solids.filter((x) => x.kind === "cylinder" && x.h === 4 && Math.abs(x.at.x - LIGHTHOUSE.x) < 0.01);
    expect(drums).toHaveLength(6);
    expect(drums.map((d) => d.mat)).toEqual(["whitewash", "rust", "whitewash", "rust", "whitewash", "rust"]);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 1.2 && x.w === 0.3)).toHaveLength(8);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "glass" && x.h === 3)).toBe(true);
    const top = Math.max(...s.solids.filter((x) => Math.abs(bounds(x).min.x - (LIGHTHOUSE.x - 3.2)) < 4 && Math.abs(bounds(x).min.y - (LIGHTHOUSE.y - 3.2)) < 4).map((x) => bounds(x).max.z));
    expect(top - LIGHTHOUSE.z).toBeCloseTo(29.6, 1);
    expect(s.lantern.z).toBeCloseTo(LIGHTHOUSE.z + 24 + 0.6 + 1.5, 6);
    expect(worldZoneAt(LIGHTHOUSE.x, LIGHTHOUSE.y)).toBe("portfolio"); // el faro clickea Portfolio
  });

  it("casa del farero, sendero de roca escalonado sobre la punta, afloramientos, pedruscos y arrecife", () => {
    const s = scene();
    const house = s.solids.find((x) => x.kind === "prism" && x.mat === "whitewash" && x.roof === "gable")!;
    expect(house.at).toMatchObject({ x: KEEPER.x, y: KEEPER.y });
    expect(house.at.z).toBeCloseTo(headlandZ(KEEPER.x + 4), 6);
    const path = s.ground.filter((x) => x.kind === "strip" && x.mat === "rock");
    expect(path).toHaveLength(10);
    for (const p of path) if (p.kind === "strip") for (const q of p.path) expect(inHeadland(q.x, q.y)).toBe(true);
    expect(path.map((p) => p.kind === "strip" && p.z)).toEqual([...path].map((p) => p.kind === "strip" && p.z).sort((a, b) => Number(a) - Number(b))); // sube hacia el faro
    expect(s.solids.filter((x) => x.kind === "poly" && x.mat === "rock")).toHaveLength(6);
    const reef = s.solids.filter((x) => x.kind === "cone" && x.mat === "rock" && x.h === 1);
    expect(reef.length).toBeGreaterThanOrEqual(30); expect(reef.length).toBeLessThanOrEqual(40);
    for (const c of reef) expect(terrainAt(c.at.x, c.at.y)).toBe("reef");
    expect(s.solids.filter((x) => x.kind === "cone" && x.mat === "rock" && x.h === 1.5)).toHaveLength(20); // pedruscos sobre la punta
  });

  it("boyas y pecio sobre el agua; la boya del pecio tiene luz fija y anillo de espuma", () => {
    const s = scene();
    for (const b of BUOYS) expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "rust" && x.at.x === b.x && x.at.y === b.y && x.at.z === -1)).toBe(true);
    expect(s.buoys).toHaveLength(2);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "steel" && x.at.x === WRECK_BUOY.x)).toBe(true);
    expect(s.accents).toEqual([{ kind: "poly", pts: expect.any(Array), color: "magentaBleed", alpha: expect.any(Number) }, { kind: "dot", at: { x: WRECK_BUOY.x, y: WRECK_BUOY.y, z: 1 }, r: 1, color: "magentaMid" }]);
    expect(s.ground.some((g) => g.kind === "ground" && g.mat === "foam" && g.tris.length === 8)).toBe(true);
    const wreck = s.solids.find((x) => x.kind === "hull")!;
    expect(wreck.kind === "hull" && wreck.heading).toBe(WRECK.heading);
    expect(wreck.at).toEqual({ x: WRECK.x, y: WRECK.y, z: -3 });
    for (const x of s.solids) if (x.kind === "cylinder" || x.kind === "hull") if (bounds(x).min.x > ZONE_SPLIT_X + 30) expect(water.has(terrainAt(x.at.x, x.at.y))).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList([...s.ground, ...s.solids])) expect(colors.has(i.color)).toBe(true);
  });
});
```

- [ ] **Step 3: sea.ts**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { inHeadland } from "../map/geo";
import { headlandZ, terrainAt } from "./terrain";

/**
 * Blog, parte estática: la punta de roca con el faro y la casa del farero
 * (clickean Portfolio), el arrecife, dos boyas, y en la fosa el pecio con su
 * boya (landmark del Blog). Los barcos y el mar animado están en sea-anim.ts.
 * Spec §7.
 */
export interface SeaScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; lantern: Vec3; buoys: Vec3[] }

export const LIGHTHOUSE = { x: 396, y: 118, z: 7 } as const;
export const KEEPER = { x: 372, y: 108 } as const;
export const BUOYS: readonly Vec2[] = [{ x: 420, y: 80 }, { x: 430, y: 160 }];
export const WRECK_BUOY = { x: 470, y: 160 } as const;
export const WRECK = { x: 462, y: 150, heading: Math.PI / 6 } as const;
const WATER_Z = -1;
const DRUMS = 6, DRUM_H = 4, DRUM_R0 = 3.2, DRUM_STEP = 0.2, GALLERY_H = 0.6, LANTERN_H = 3, CAP_H = 2;
const REEF_CELLS = 20, BOULDERS = 20; // dos conos por celda de arrecife: hasta 40

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, roof?: "gable"): Solid => (roof ? { kind: "prism", at: v3(x, y, z), w, d, h, mat, roof } : { kind: "prism", at: v3(x, y, z), w, d, h, mat });
const cyl = (x: number, y: number, z: number, r: number, h: number, mat: Material, sides = 10): Solid => ({ kind: "cylinder", at: v3(x, y, z), r, h, mat, sides });

function lighthouse(out: Solid[]): Vec3 {
  const { x, y } = LIGHTHOUSE;
  let z = LIGHTHOUSE.z;
  for (let i = 0; i < DRUMS; i++) { out.push(cyl(x, y, z, DRUM_R0 - i * DRUM_STEP, DRUM_H, i % 2 === 0 ? "whitewash" : "rust")); z += DRUM_H; }
  out.push(cyl(x, y, z, 3, GALLERY_H, "steel")); z += GALLERY_H;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; out.push(prism(x + 2.7 * Math.cos(a) - 0.15, y + 2.7 * Math.sin(a) - 0.15, z, 0.3, 0.3, 1.2, "steel")); }
  out.push(cyl(x, y, z, 1.6, LANTERN_H, "glass", 8));
  const lantern = v3(x, y, z + LANTERN_H / 2);
  z += LANTERN_H;
  out.push({ kind: "cone", at: v3(x, y, z), r: 1.8, h: CAP_H, mat: "steel", sides: 8 });
  return lantern;
}

function keeperHouse(out: Solid[], accents: Accent[]): void {
  const z = headlandZ(KEEPER.x + 4);
  out.push(prism(KEEPER.x, KEEPER.y, z, 8, 6, 4, "whitewash", "gable"));
  const wx = KEEPER.x + 3, wy = KEEPER.y + 6.02; // ventana en la cara sur
  accents.push({ kind: "poly", pts: [v3(wx, wy, z + 1), v3(wx + 1.2, wy, z + 1), v3(wx + 1.2, wy, z + 2), v3(wx, wy, z + 2)], color: "magentaBleed", alpha: 0.9 });
}

/** Sendero de roca de la escollera al faro: diez tramos, cada uno a la altura de la punta en su centro (la punta sube de 1 a 7). */
function path(ground: Solid[]): void {
  const from = { x: 332, y: 115 }, to = { x: 393, y: 118 }, n = 10;
  for (let i = 0; i < n; i++) {
    const a = { x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n };
    const b = { x: from.x + ((to.x - from.x) * (i + 1)) / n, y: from.y + ((to.y - from.y) * (i + 1)) / n };
    ground.push({ kind: "strip", path: [a, b], width: 1.5, z: headlandZ((a.x + b.x) / 2) + 0.15, mat: "rock" });
  }
}

function rocks(out: Solid[], rng: Rng): void {
  for (const [cx, cy, r] of [[350, 112, 4], [362, 124, 3.5], [385, 110, 4.5], [378, 126, 3], [340, 104, 3], [392, 126, 2.5]] as const) { // afloramientos
    const n = rng.int(5, 6);
    const footprint: Vec2[] = Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; const rr = r * (0.7 + rng.next() * 0.3); return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }; });
    out.push({ kind: "poly", footprint, z: headlandZ(cx) - 1.5, h: rng.int(2, 3), mat: "rock" });
  }
  let placed = 0; // pedruscos: conos chicos sobre la punta, sin pisar el sendero (y 113..120) ni el faro
  while (placed < BOULDERS) {
    const x = rng.int(340, 398), y = rng.int(99, 133);
    if (!inHeadland(x, y) || (y > 112 && y < 121) || Math.hypot(x - LIGHTHOUSE.x, y - LIGHTHOUSE.y) < 5) continue;
    out.push({ kind: "cone", at: v3(x, y, headlandZ(x) - 0.5), r: 1, h: 1.5, mat: "rock", sides: 5 });
    placed++;
  }
  const cells: Vec2[] = [];
  for (let y = 87; y < 147; y += 6) for (let x = 327; x < 417; x += 6) if (terrainAt(x, y) === "reef") cells.push({ x, y });
  for (let i = cells.length - 1; i > 0; i--) { const j = rng.int(0, i); [cells[i], cells[j]] = [cells[j]!, cells[i]!]; } // barajar
  for (const c of cells.slice(0, REEF_CELLS)) for (let k = 0; k < 2; k++) out.push({ kind: "cone", at: v3(c.x + (rng.next() - 0.5) * 2, c.y + (rng.next() - 0.5) * 2, 0.5), r: 1.5, h: 1, mat: "rock", sides: 5 });
}

function buoysAndWreck(out: Solid[], ground: Solid[], accents: Accent[]): Vec3[] {
  const bases = BUOYS.map((b) => { out.push(cyl(b.x, b.y, WATER_Z, 0.8, 1.5, "rust", 6)); return v3(b.x, b.y, WATER_Z + 1.5); });
  out.push(cyl(WRECK_BUOY.x, WRECK_BUOY.y, WATER_Z, 1, 2, "steel", 6));
  accents.push({ kind: "dot", at: v3(WRECK_BUOY.x, WRECK_BUOY.y, 1), r: 1, color: "magentaMid" });
  const ring = Array.from({ length: 8 }, (_, k): { pts: [Vec3, Vec3, Vec3] } => {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2, r0 = 1.6, r1 = 2.5;
    return { pts: [v3(WRECK_BUOY.x + r0 * Math.cos(a0), WRECK_BUOY.y + r0 * Math.sin(a0), -0.95), v3(WRECK_BUOY.x + r1 * Math.cos(a0), WRECK_BUOY.y + r1 * Math.sin(a0), -0.95), v3(WRECK_BUOY.x + r1 * Math.cos(a1), WRECK_BUOY.y + r1 * Math.sin(a1), -0.95)] };
  });
  ground.push({ kind: "ground", mat: "foam", tris: ring });
  out.push({ kind: "hull", at: v3(WRECK.x, WRECK.y, -3), len: 40, beam: 8, h: 4, mat: "hull", heading: WRECK.heading }); // asoma 1 u
  const mx = WRECK.x + 20 * Math.cos(WRECK.heading), my = WRECK.y + 20 * Math.sin(WRECK.heading);
  out.push(prism(mx - 0.3, my - 0.3, 0, 0.6, 0.6, 6, "rust")); // mástil
  return bases;
}

export function sea(rng: Rng): SeaScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  const lantern = lighthouse(solids);
  keeperHouse(solids, accents);
  path(ground);
  rocks(solids, rng);
  const buoys = buoysAndWreck(solids, ground, accents);
  return { ground, solids, accents, lantern, buoys };
}
```

Run: `npx vitest run src/scenes/sea.test.ts` → PASS. Si el conteo de `reef` no llega a 40 celdas, ampliar el rango del bucle de `cells`; si un pedrusco cae sobre el sendero, ajustar la banda excluida.

- [ ] **Step 4: Enchufar en el mundo**

`src/scenes/world.ts`: `import { sea, type SeaScene } from "./sea";`, `WorldScene.sea: SeaScene | null`, y en `world()`:

```ts
  let se: SeaScene | null = null;
  if (zones.includes("blog")) {
    se = sea(zoneRng(seed, "blog"));
    ground.push(...se.ground); solids.push(...se.solids); accents.push(...se.accents);
  }
```

`world.test.ts`: "filtrar por zona": `const b = world(7, { zones: ["blog"] }); expect(b.city).toBeNull(); expect(b.sea).not.toBeNull(); expect(b.solids.length).toBeGreaterThan(100);`. "el mundo entero": `> 1000`. "no comparten materiales": el filtro por zona ya excluye Blog (compara portfolio y cv); agregar:

```ts
  it("el Blog no comparte materiales de construcción con el astillero ni la ciudad, salvo steel, rust y hull", () => {
    const w = world(7);
    const mats = (zone: "portfolio" | "cv" | "blog") => new Set(w.solids.filter((s) => worldZoneAt(bounds(s).min.x, bounds(s).min.y) === zone && s.kind !== "cone").map((s) => s.mat));
    const blog = mats("blog");
    for (const other of ["portfolio", "cv"] as const) expect([...blog].filter((m) => mats(other).has(m)).every((m) => ["steel", "rust", "hull"].includes(m))).toBe(true);
  });
```

(el faro y la punta clickean Portfolio: `whitewash` cuenta como Portfolio en este test; si aparece como compartido con `cv` revisar el malecón, que no lo usa).

Run: `npm run typecheck && npm test` → PASS. Captura `lab/world.html` tecla `3`: punta de roca con sendero, casa blanca, faro de tambores blancos y óxido con galería y linterna, arrecife de conos alrededor, dos boyas, y en la fosa oscura el pecio inclinado con su boya iluminada.

- [ ] **Step 5: Commit**

```bash
git add src/iso/solids.ts src/iso/solids.test.ts src/scenes/sea.ts src/scenes/sea.test.ts src/scenes/world.ts src/scenes/world.test.ts
git commit -m "feat(scenes): punta con faro, casa del farero, arrecife, boyas y pecio; hull.heading"
```

### Task 6: Barcos que se van, mar animado, haz y boyas; `lab/blog.html`

**Files:**
- Create: `src/scenes/ships.ts`, `src/scenes/ships.test.ts`
- Create: `src/scenes/sea-anim.ts`, `src/scenes/sea-anim.test.ts`
- Create: `src/scenes/sea-animator.ts`, `src/scenes/sea-animator.test.ts`
- Modify: `src/scenes/animator.ts`, `src/lab/runtime.ts`, `src/lab/page.ts`
- Create: `src/lab/blog.ts`, `lab/blog.html`; Modify: `src/lab/lab-excluded.test.ts`

**Interfaces:**
- Produces (`animator.ts`): `AnimLayer` gana `alpha?: number` en las tres variantes; `Animator` gana `claims?: readonly Solid[]` (cuerpos de agua del terreno que el animador reemplaza enteros: el runtime no los dibuja estáticos).
- Produces (`ships.ts`): `type ShipKind = "cargo" | "tug" | "barge"`, `SHIP_SPECS`, `ship(kind, at: Vec2, heading: number): { solids: Solid[]; lights: Accent[] }` (popa en `at`, sobre el agua).
- Produces (`sea-anim.ts`): `ROUTE: Vec2[]`, `SHIPS`, `routeLength()`, `routeAt(dist): { x, y, heading }`, `createSeaAnim(scene: SeaScene, terrain: TerrainMesh, rng, opts): SeaAnim` con `band(k): Solid[]`, `abyss(): Solid[]`, `ship(k): { solids; lights; wake: Solid[]; alpha }`, `beam(): Accent[]`, `buoys(): Accent[]`, `tick(dtMs): SeaChanges`.
- Produces (`sea-animator.ts`): `seaAnimator(scene, terrain, rng, opts): Animator` con ids `sea.band0..2`, `sea.abyss`, `sea.ship0..2`, `sea.wake0..2`, `sea.lights0..2`, `sea.beam`, `sea.buoys`, y `claims = [terrain.sea, terrain.shore, terrain.abyss]`.

- [ ] **Step 1: Contrato del animador y runtime**

`src/scenes/animator.ts`:

```ts
export type AnimLayer =
  | { kind: "solid"; solids: Solid[]; alpha?: number }
  | { kind: "accent"; accents: Accent[]; alpha?: number }
  | { kind: "water"; water: Solid[]; alpha?: number };

export interface Animator {
  readonly ids: readonly string[];
  /** Cuerpos de agua del terreno que este animador dibuja por su cuenta (partidos en bandas, por ejemplo): el runtime no los pinta estáticos. */
  readonly claims?: readonly Solid[];
  layer(id: string): AnimLayer;
  tick(dtMs: number): ReadonlySet<string>;
}
```

`src/lab/runtime.ts`: `animatedWater` pasa a `new Set(animators.flatMap((a) => [...(a.claims ?? []), ...a.ids.flatMap((id) => { const l = a.layer(id); return l.kind === "water" ? l.water : []; })]))`. En cada `redraw` aplicar el alpha: `const al = l.alpha ?? 1;` y `g.alpha = al` (para `solid`: `gs.alpha = gc.alpha = g.alpha = al`).

`src/lab/page.ts`: `if (scene.sea) animators.push(seaAnimator(scene.sea, scene.terrain, createRng(SEED + 3), { reducedMotion }));`.

- [ ] **Step 2: Test de barcos**

`src/scenes/ships.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bounds } from "../iso/solids";
import { SHIP_SPECS, ship } from "./ships";

describe("ships", () => {
  it("carguero: casco 60×10×5 con superestructura en popa, chimenea, grúa y tres luces; proa según heading", () => {
    const s = ship("cargo", { x: 100, y: 100 }, 0);
    const hull = s.solids.find((x) => x.kind === "hull")!;
    expect(hull).toMatchObject({ len: 60, beam: 10, h: 5, heading: 0, at: { x: 100, y: 100, z: -1 } });
    expect(s.solids.filter((x) => x.kind === "poly").length).toBeGreaterThanOrEqual(3);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "rust")).toBe(true);
    expect(s.lights.map((l) => l.color)).toEqual(["magentaMid", "magenta", "cyanMid"]);
    const east = ship("cargo", { x: 100, y: 100 }, Math.PI / 2);
    expect(Math.max(...east.solids.map((x) => bounds(x).max.y))).toBeCloseTo(160, 6); // proa al sur
    for (const x of east.solids) expect(["hull", "steel", "rust"]).toContain(x.mat);
  });
  it("remolcador y barcaza con sus medidas; los contenedores alternan óxido y acero sobre la barcaza", () => {
    expect(ship("tug", { x: 0, y: 0 }, 0).solids.find((x) => x.kind === "hull")).toMatchObject(SHIP_SPECS.tug);
    const barge = ship("barge", { x: 0, y: 0 }, 0);
    const boxes = barge.solids.filter((x) => x.kind === "poly" && x.h === 2.4);
    expect(boxes).toHaveLength(6);
    expect(boxes.map((b) => b.mat)).toEqual(["rust", "steel", "rust", "steel", "rust", "steel"]);
    for (const b of boxes) { expect(bounds(b).min.x).toBeGreaterThanOrEqual(0); expect(bounds(b).max.x).toBeLessThanOrEqual(40); }
  });
});
```

- [ ] **Step 3: ships.ts**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";

/**
 * Barcos hechos con las piezas del astillero: `hull` con heading, cajas como
 * `poly` con huella rotada, chimeneas como cilindros. Popa en `at`, sobre el
 * agua (z -1). Luces: mástil magentaMid, babor magenta, estribor cyanMid.
 */
export type ShipKind = "cargo" | "tug" | "barge";
export interface ShipSpec { len: number; beam: number; h: number }
export const SHIP_SPECS: Record<ShipKind, ShipSpec> = { cargo: { len: 60, beam: 10, h: 5 }, tug: { len: 18, beam: 6, h: 3 }, barge: { len: 40, beam: 9, h: 2 } };
const WATER_Z = -1;

export function ship(kind: ShipKind, at: Vec2, heading: number): { solids: Solid[]; lights: Accent[] } {
  const spec = SHIP_SPECS[kind];
  const c = Math.cos(heading), s = Math.sin(heading);
  const local = (dx: number, dy: number) => ({ x: at.x + dx * c - dy * s, y: at.y + dx * s + dy * c });
  const box = (dx: number, dy: number, w: number, d: number, z: number, h: number, mat: Material): Solid => ({ kind: "poly", footprint: [local(dx, dy), local(dx + w, dy), local(dx + w, dy + d), local(dx, dy + d)], z, h, mat });
  const cyl = (dx: number, dy: number, z: number, r: number, h: number, mat: Material): Solid => { const p = local(dx, dy); return { kind: "cylinder", at: v3(p.x, p.y, z), r, h, mat, sides: 8 }; };
  const dot = (dx: number, dy: number, z: number, r: number, color: Accent["color"]): Accent => { const p = local(dx, dy); return { kind: "dot", at: v3(p.x, p.y, z), r, color }; };
  const solids: Solid[] = [{ kind: "hull", at: v3(at.x, at.y, WATER_Z), len: spec.len, beam: spec.beam, h: spec.h, mat: "hull", heading }];
  const deck = WATER_Z + spec.h;
  const lights: Accent[] = [];
  if (kind === "cargo") {
    solids.push(box(4, -4, 10, 8, deck, 6, "steel"), cyl(8, 0, deck + 6, 1.2, 3, "rust"));
    solids.push(box(34, -0.5, 1, 1, deck, 8, "steel"), box(34, -0.5, 6, 1, deck + 7, 0.8, "steel")); // grúa de cubierta
    lights.push(dot(9, 0, deck + 9.5, 0.7, "magentaMid"));
    lights.push(dot(30, -5, deck, 0.4, "magenta"), dot(30, 5, deck, 0.4, "cyanMid"));
  } else if (kind === "tug") {
    solids.push(box(3, -2, 5, 4, deck, 3, "steel"));
    lights.push(dot(5, 0, deck + 3.5, 0.7, "magentaMid"));
    lights.push(dot(12, -3, deck, 0.4, "magenta"), dot(12, 3, deck, 0.4, "cyanMid"));
  } else {
    for (let i = 0; i < 6; i++) solids.push(box(4 + i * 6, -1.2, 5.5, 2.4, deck, 2.4, i % 2 === 0 ? "rust" : "steel"));
    lights.push(dot(1, 0, deck + 4, 0.7, "magentaMid"));
    lights.push(dot(30, -4.5, deck, 0.4, "magenta"), dot(30, 4.5, deck, 0.4, "cyanMid"));
  }
  return { solids, lights };
}
```

Run: `npx vitest run src/scenes/ships.test.ts` → PASS.

- [ ] **Step 4: Test de la animación del mar**

`src/scenes/sea-anim.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isBehind, overlaps, screenBounds } from "../iso/depth";
import { bounds, type Solid, type Tri } from "../iso/solids";
import { WORLD } from "../map/geo";
import { createRng } from "../map/seed";
import { BEAM_PERIOD_MS, FADE_U, ROUTE, SEA_STEP_MS, SHIPS, createSeaAnim, routeAt, routeLength } from "./sea-anim";
import { ship } from "./ships";
import { bleedTerrainAt, terrainAt } from "./terrain";
import { world } from "./world";

const WATER = new Set(["water", "sea", "shore", "abyss"]);
const setup = (reducedMotion = false) => { const w = world(7); return { w, a: createSeaAnim(w.sea!, w.terrain, createRng(3), { reducedMotion }) }; };
const tris = (s: Solid): Tri[] => (s.kind === "ground" ? s.tris : []);

describe("ruta", () => {
  it("nace en la bahía, rodea la punta por el este (x > 430 cerca de y 118), cruza la fosa y termina en el sangrado, siempre sobre agua", () => {
    expect(ROUTE[0]).toEqual({ x: 290, y: -6 });
    expect(ROUTE[ROUTE.length - 1]!.x).toBeGreaterThan(WORLD.x1);
    const L = routeLength();
    let crossedAbyss = false;
    for (let d = 0; d <= L; d += 1) {
      const p = routeAt(d);
      const t = p.x > WORLD.x1 ? bleedTerrainAt(p.x, p.y) : terrainAt(p.x, p.y);
      expect(WATER.has(t)).toBe(true);
      if (t === "abyss") crossedAbyss = true;
      if (Math.abs(p.y - 118) < 40) expect(p.x).toBeGreaterThan(430);
    }
    expect(crossedAbyss).toBe(true);
    expect(routeAt(0).heading).toBeCloseTo(Math.atan2(16, 60), 6);
  });

  it("ningún punto de la ruta queda detrás de un sólido estático que se le superponga en pantalla", () => {
    const w = world(7);
    const statics = w.solids.map((s) => ({ b: bounds(s), sb: screenBounds(bounds(s)) }));
    for (let d = 0; d <= routeLength(); d += 4) {
      const p = routeAt(d);
      const parts = ship("cargo", p, p.heading).solids.map(bounds);
      const sb = { min: { x: Math.min(...parts.map((b) => b.min.x)), y: Math.min(...parts.map((b) => b.min.y)), z: -1 }, max: { x: Math.max(...parts.map((b) => b.max.x)), y: Math.max(...parts.map((b) => b.max.y)), z: 13 } };
      const scr = screenBounds(sb);
      for (const s of statics) if (overlaps(scr, s.sb)) expect(isBehind(sb, s.b)).toBe(false);
    }
  });
});

describe("barcos", () => {
  it("tres barcos con velocidades y fases distintas; alpha 0 en el inicio y el final, 1 en el medio; cada uno vuelve tras un ciclo", () => {
    const { a } = setup();
    expect(SHIPS.map((s) => s.speed)).toEqual([1.2, 2, 0.8]);
    const L = routeLength();
    expect([0, 1, 2].map((k) => a.dist(k))).toEqual(SHIPS.map((s) => s.phase * L));
    const cycleMs = (L / SHIPS[0]!.speed) * 1000, n = Math.round(cycleMs / 100), dt = cycleMs / n;
    let seenMid = false;
    for (let i = 0; i < n; i++) {
      a.tick(dt);
      const s0 = a.ship(0);
      if (s0.alpha === 1) seenMid = true;
      expect(s0.alpha).toBeGreaterThanOrEqual(0); expect(s0.alpha).toBeLessThanOrEqual(1);
      expect(s0.wake.length).toBe(1);
    }
    expect(seenMid).toBe(true);
    const d0 = a.dist(0);
    expect(Math.min(d0, L - d0)).toBeLessThan(1e-6); // el carguero (fase 0) volvió al inicio tras su ciclo
    expect(Math.abs(a.dist(1) - SHIPS[1]!.phase * L)).toBeGreaterThan(1); // el remolcador, con otra velocidad, no
  });
  it("alpha exactamente 0 al final de la ruta y 1 fuera de las bandas de bruma", () => {
    const { a } = setup();
    expect(a.alphaAt(0)).toBe(0);
    expect(a.alphaAt(routeLength())).toBe(0);
    expect(a.alphaAt(FADE_U)).toBe(1);
    expect(a.alphaAt(routeLength() / 2)).toBe(1);
  });
});

describe("mar, haz y boyas", () => {
  it("tres bandas de mar más la fosa cubren todo el mar del contenido; cada paso redibuja una sola banda", () => {
    const { w, a } = setup();
    const total = tris(w.terrain.sea).length + tris(w.terrain.shore).length;
    const banded = [0, 1, 2].reduce((n, k) => n + a.band(k).filter((s) => s.mat !== "foam").reduce((m, s) => m + tris(s).length, 0), 0);
    expect(banded).toBe(total);
    expect(a.band(0).some((s) => s.mat === "foam")).toBe(true); // espuma junto al arrecife, en la banda del oeste
    const c1 = a.tick(SEA_STEP_MS), c2 = a.tick(SEA_STEP_MS), c3 = a.tick(SEA_STEP_MS);
    expect([c1.bands, c2.bands, c3.bands].map((b) => [...b])).toEqual([[1], [2], [0]]); // el paso 1 pinta la banda 1, y así en ronda
    expect(a.band(0).some((s) => tris(s).some((t) => (t.toneOffset ?? 0) !== 0))).toBe(true);
    expect(a.abyss().every((s) => tris(s).every((t) => Math.abs(t.toneOffset ?? 0) <= 1))).toBe(true);
  });
  it("el haz da una vuelta cada 8 s y con reduced-motion apunta al este", () => {
    const { a } = setup();
    const angle = (acc: ReturnType<typeof a.beam>) => { const p = acc[0]!; if (p.kind !== "poly") throw new Error(); const apex = p.pts[0]!, tip = p.pts[1]!; return Math.atan2(tip.y - apex.y, tip.x - apex.x); };
    const a0 = angle(a.beam());
    a.tick(BEAM_PERIOD_MS / 4);
    expect(angle(a.beam()) - a0).toBeCloseTo(Math.PI / 2, 1);
    a.tick((BEAM_PERIOD_MS * 3) / 4);
    expect(Math.abs(angle(a.beam()) - a0) % (Math.PI * 2)).toBeCloseTo(0, 1);
    expect(a.beam()).toHaveLength(2);
    const r = setup(true).a;
    expect(Math.abs(angle(r.beam()))).toBeLessThan(0.2);
    expect(r.tick(500)).toEqual({ bands: new Set(), abyss: false, ships: false, beam: false, buoys: false });
  });
  it("las boyas parpadean desfasadas: nunca las dos apagadas, cada una encendida la mitad del período", () => {
    const { a } = setup();
    let on0 = 0, on1 = 0;
    for (let t = 0; t < 2000; t += 50) {
      const b = a.buoys();
      expect(b.length).toBeGreaterThanOrEqual(1);
      on0 += b.some((d) => d.kind === "dot" && d.at.x === 420) ? 1 : 0;
      on1 += b.some((d) => d.kind === "dot" && d.at.x === 430) ? 1 : 0;
      a.tick(50);
    }
    expect(on0).toBe(20); expect(on1).toBe(20);
  });
});
```

- [ ] **Step 5: sea-anim.ts**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { distToHeadland } from "../map/geo";
import type { Rng } from "../map/seed";
import type { SeaScene } from "./sea";
import { ship as buildShip, type ShipKind } from "./ships";
import type { TerrainMesh } from "./terrain";

/**
 * Blog animado, sin Pixi: el mar en tres bandas (onda de tono, una banda por
 * paso), la fosa más lenta, tres barcos que salen de la bahía, rodean la punta
 * por el este, cruzan la fosa y se desvanecen en el sangrado, sus estelas y
 * luces, el haz del faro y las dos boyas. Spec §7.
 */
export const ROUTE: Vec2[] = [{ x: 290, y: -6 }, { x: 350, y: 10 }, { x: 405, y: 50 }, { x: 436, y: 78 }, { x: 444, y: 118 }, { x: 470, y: 172 }, { x: 530, y: 224 }, { x: 600, y: 260 }];
export const SHIPS: readonly { kind: ShipKind; speed: number; phase: number }[] = [{ kind: "cargo", speed: 1.2, phase: 0 }, { kind: "tug", speed: 2, phase: 0.4 }, { kind: "barge", speed: 0.8, phase: 0.75 }];
export const FADE_U = 30, TURN_U = 20, WAKE_LEN = 25;
export const SEA_STEP_MS = 100, SEA_CYCLE_MS = 4000, ABYSS_STEP_MS = 200, ABYSS_CYCLE_MS = 8000, FOAM_STEP_MS = 500;
export const BEAM_PERIOD_MS = 8000, BEAM_LEN = 24, BEAM_INNER = 12, BEAM_HALF = (7 * Math.PI) / 180;
export const BUOY_PERIOD_MS = 2000;
const BANDS = 3, FOAM_DIST = 8; // espuma: triángulos de orilla a menos de 8 u de la punta (arrecife de 6 + 2)
const WATER_Z = -1;

const seg = ROUTE.slice(1).map((b, i) => { const a = ROUTE[i]!; const len = Math.hypot(b.x - a.x, b.y - a.y); return { a, b, len, heading: Math.atan2(b.y - a.y, b.x - a.x) }; });
const cum = seg.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s.len], [0]);
export const routeLength = (): number => cum[cum.length - 1]!;

const lerpAngle = (a: number, b: number, t: number): number => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

/** Punto y rumbo a `dist` unidades del inicio; el rumbo se interpola en los TURN_U alrededor de cada vértice. */
export function routeAt(dist: number): { x: number; y: number; heading: number } {
  const d = Math.max(0, Math.min(routeLength(), dist));
  let i = 0;
  while (i < seg.length - 1 && d > cum[i + 1]!) i++;
  const s = seg[i]!, local = d - cum[i]!, t = local / s.len;
  let heading = s.heading;
  if (local < TURN_U / 2 && i > 0) heading = lerpAngle(seg[i - 1]!.heading, s.heading, 0.5 + local / TURN_U);
  else if (s.len - local < TURN_U / 2 && i < seg.length - 1) heading = lerpAngle(s.heading, seg[i + 1]!.heading, (TURN_U / 2 - (s.len - local)) / TURN_U);
  return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, heading };
}

export interface ShipFrame { solids: Solid[]; lights: Accent[]; wake: Solid[]; alpha: number }
export interface SeaChanges { bands: Set<number>; abyss: boolean; ships: boolean; beam: boolean; buoys: boolean }
export interface SeaAnim {
  band(k: number): Solid[];
  abyss(): Solid[];
  ship(k: number): ShipFrame;
  dist(k: number): number;
  alphaAt(dist: number): number;
  beam(): Accent[];
  buoys(): Accent[];
  tick(dtMs: number): SeaChanges;
}

const centerKey = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x + t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;
const centerX = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
const centerY = (t: Tri): number => (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;

export function createSeaAnim(scene: SeaScene, terrain: TerrainMesh, rng: Rng, opts: { reducedMotion: boolean }): SeaAnim {
  const seaTris = terrain.sea.kind === "ground" ? terrain.sea.tris : [], shoreTris = terrain.shore.kind === "ground" ? terrain.shore.tris : [];
  const abyssTris = terrain.abyss.kind === "ground" ? terrain.abyss.tris : [];
  // bandas por x: cada una lleva su parte de mar y de orilla; la del oeste lleva además la espuma del arrecife
  const xs = [...seaTris, ...shoreTris].map(centerX);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1e-6, bandW = (x1 - x0) / BANDS;
  const bandOf = (t: Tri) => Math.min(BANDS - 1, Math.floor((centerX(t) - x0) / bandW));
  const foamTris: Tri[] = shoreTris.filter((t) => distToHeadland(centerX(t), centerY(t)) < FOAM_DIST).map((t) => ({ pts: t.pts }));
  const bands: Solid[][] = Array.from({ length: BANDS }, (_, k) => [
    { kind: "ground", mat: "waterDeep", tris: seaTris.filter((t) => bandOf(t) === k) },
    { kind: "ground", mat: "water", tris: shoreTris.filter((t) => bandOf(t) === k) },
    ...(k === 0 ? [{ kind: "ground" as const, mat: "foam" as const, tris: foamTris }] : []),
  ]);
  const abyssSolid: Solid = { kind: "ground", mat: "abyss", tris: abyssTris };

  let clock = 0, seaStep = 0, abyssStep = 0, foamStep = 0, buoyStep = 0;
  const L = routeLength();
  const dists = SHIPS.map((s) => s.phase * L);
  const alphaAt = (d: number): number => Math.max(0, Math.min(1, d / FADE_U, (L - d) / FADE_U));

  const wave = (tris: Tri[], k: number, phase: number, amp: number) => { for (const t of tris) t.toneOffset = Math.round(amp * Math.sin(centerKey(t) / k - phase)); };
  const paintBand = (k: number): void => {
    const phase = ((clock % SEA_CYCLE_MS) / SEA_CYCLE_MS) * Math.PI * 2;
    for (const s of bands[k]!) if (s.kind === "ground" && s.mat !== "foam") wave(s.tris, 8, phase, 1);
    if (k === 0) for (const t of foamTris) t.toneOffset = foamStep % 2 === 0 ? 0 : -1;
  };
  for (let k = 0; k < BANDS; k++) paintBand(k);

  const shipFrame = (k: number): ShipFrame => {
    const p = routeAt(dists[k]!), alpha = alphaAt(dists[k]!);
    const built = buildShip(SHIPS[k]!.kind, p, p.heading);
    const c = Math.cos(p.heading), s = Math.sin(p.heading);
    const local = (dx: number, dy: number) => v3(p.x + dx * c - dy * s, p.y + dx * s + dy * c, WATER_Z + 0.05);
    const wake: Tri[] = [1, 2, 3, 4].map((i): Tri => ({ pts: [local(-6 * i + 3, 0), local(-6 * i, -(0.8 + 1.2 * i)), local(-6 * i, 0.8 + 1.2 * i)], toneOffset: i < 2 ? 1 : i < 4 ? 0 : -1 }));
    return { solids: built.solids, lights: built.lights, wake: [{ kind: "ground", mat: "foam", tris: wake }], alpha };
  };

  const beamAngle = (): number => (opts.reducedMotion ? 0 : ((clock % BEAM_PERIOD_MS) / BEAM_PERIOD_MS) * Math.PI * 2);
  const wedge = (len: number, color: Accent["color"], alpha: number): Accent => {
    const a = beamAngle(), o: Vec3 = scene.lantern;
    return { kind: "poly", pts: [o, v3(o.x + len * Math.cos(a - BEAM_HALF), o.y + len * Math.sin(a - BEAM_HALF), o.z), v3(o.x + len * Math.cos(a + BEAM_HALF), o.y + len * Math.sin(a + BEAM_HALF), o.z)], color, alpha };
  };

  const buoyOn = (k: number): boolean => Math.floor((clock + k * (BUOY_PERIOD_MS / 2)) / (BUOY_PERIOD_MS / 2)) % 2 === 0;

  return {
    band: (k) => bands[k]!,
    abyss: () => [abyssSolid],
    ship: shipFrame,
    dist: (k) => dists[k]!,
    alphaAt,
    beam: () => [wedge(BEAM_LEN, "magentaBleed", 0.5), wedge(BEAM_INNER, "magenta", 0.6)],
    buoys: () => scene.buoys.flatMap((b, k) => (buoyOn(k) ? [{ kind: "dot" as const, at: v3(b.x, b.y, b.z + 0.3), r: 0.8, color: "magentaMid" as const }] : [])),
    tick(dtMs) {
      const none: SeaChanges = { bands: new Set(), abyss: false, ships: false, beam: false, buoys: false };
      if (opts.reducedMotion || dtMs <= 0) return none;
      clock += dtMs;
      const c: SeaChanges = { bands: new Set(), abyss: false, ships: true, beam: true, buoys: false };
      const fs = Math.floor(clock / FOAM_STEP_MS);
      if (fs !== foamStep) { foamStep = fs; c.bands.add(0); }
      const ss = Math.floor(clock / SEA_STEP_MS);
      if (ss !== seaStep) { seaStep = ss; c.bands.add(ss % BANDS); } // round-robin: una banda por paso
      for (const k of c.bands) paintBand(k);
      const as = Math.floor(clock / ABYSS_STEP_MS);
      if (as !== abyssStep) { abyssStep = as; wave(abyssTris, 14, ((clock % ABYSS_CYCLE_MS) / ABYSS_CYCLE_MS) * Math.PI * 2, 0.6); c.abyss = true; }
      for (let k = 0; k < SHIPS.length; k++) { dists[k] = dists[k]! + (SHIPS[k]!.speed * dtMs) / 1000; if (dists[k]! >= L) dists[k] = dists[k]! - L; }
      const bs = Math.floor(clock / (BUOY_PERIOD_MS / 2));
      if (bs !== buoyStep) { buoyStep = bs; c.buoys = true; }
      void rng;
      return c;
    },
  };
}
```

Notas para el implementador: `rng` queda reservado (la spec no usa azar en el mar); si el lint se queja, quitar el parámetro de la firma y del adaptador.

Run: `npx vitest run src/scenes/sea-anim.test.ts` → PASS. Si "ningún punto de la ruta detrás" falla, imprimir el sólido estático culpable (`console.log(s.b)`) y mover el vértice de `ROUTE` más cercano hacia el este/sur, o el pecio hacia el NE, y anotar el desvío.

- [ ] **Step 6: Adaptador**

`src/scenes/sea-animator.ts`:

```ts
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { SeaScene } from "./sea";
import { SHIPS, createSeaAnim } from "./sea-anim";
import type { TerrainMesh } from "./terrain";

/** Adapta el mar al contrato `Animator`. Reclama mar, orilla y fosa del terreno: los dibuja partidos en bandas. */
export function seaAnimator(scene: SeaScene, terrain: TerrainMesh, rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createSeaAnim(scene, terrain, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    "sea.band0": () => ({ kind: "water", water: anim.band(0) }),
    "sea.band1": () => ({ kind: "water", water: anim.band(1) }),
    "sea.band2": () => ({ kind: "water", water: anim.band(2) }),
    "sea.abyss": () => ({ kind: "water", water: anim.abyss() }),
    "sea.beam": () => ({ kind: "accent", accents: anim.beam() }),
    "sea.buoys": () => ({ kind: "accent", accents: anim.buoys() }),
  };
  SHIPS.forEach((_, k) => {
    layers[`sea.ship${k}`] = () => { const f = anim.ship(k); return { kind: "solid", solids: f.solids, alpha: f.alpha }; };
    layers[`sea.wake${k}`] = () => { const f = anim.ship(k); return { kind: "water", water: f.wake, alpha: f.alpha }; };
    layers[`sea.lights${k}`] = () => { const f = anim.ship(k); return { kind: "accent", accents: f.lights, alpha: f.alpha }; };
  });
  return {
    ids: Object.keys(layers),
    claims: [terrain.sea, terrain.shore, terrain.abyss],
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs);
      const out = new Set<string>();
      for (const k of c.bands) out.add(`sea.band${k}`);
      if (c.abyss) out.add("sea.abyss");
      if (c.ships) SHIPS.forEach((_, k) => { out.add(`sea.ship${k}`); out.add(`sea.wake${k}`); out.add(`sea.lights${k}`); });
      if (c.beam) out.add("sea.beam");
      if (c.buoys) out.add("sea.buoys");
      return out;
    },
  };
}
```

`src/scenes/sea-animator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { seaAnimator } from "./sea-animator";
import { world } from "./world";

describe("seaAnimator", () => {
  it("expone las capas del mar, reclama los tres cuerpos de agua y con reduced-motion no devuelve ids", () => {
    const w = world(7);
    const a = seaAnimator(w.sea!, w.terrain, createRng(3), { reducedMotion: false });
    expect(a.ids).toEqual(expect.arrayContaining(["sea.band0", "sea.band1", "sea.band2", "sea.abyss", "sea.ship0", "sea.wake2", "sea.lights1", "sea.beam", "sea.buoys"]));
    expect(a.claims).toEqual([w.terrain.sea, w.terrain.shore, w.terrain.abyss]);
    expect(a.layer("sea.ship0").kind).toBe("solid");
    expect(a.layer("sea.wake0")).toMatchObject({ kind: "water", alpha: 0 }); // fase 0: en la bahía, aún invisible
    const ids = a.tick(100);
    expect(ids.has("sea.ship0")).toBe(true); expect(ids.has("sea.beam")).toBe(true);
    expect([...ids].filter((id) => id.startsWith("sea.band")).length).toBeLessThanOrEqual(2); // una banda por paso (más la espuma)
    const r = seaAnimator(w.sea!, w.terrain, createRng(3), { reducedMotion: true });
    expect(r.tick(1000).size).toBe(0);
  });
});
```

Run: `npx vitest run src/scenes/sea-animator.test.ts` → PASS.

- [ ] **Step 7: Página del Blog**

`lab/blog.html`: copiar `lab/resume.html` con `<title>Lab: Blog isométrico</title>`, `aria-label="Blog isométrico: el mar, el faro y los barcos que se van; el mundo entero alrededor. Teclas 0..4 encuadran mundo, Portfolio, Resume, Blog y cover."` y `src="/src/lab/blog.ts"`. `src/lab/blog.ts`:

```ts
import { bootWorldPage } from "./page";

// El mundo entero: los barcos nacen en la bahía del astillero y rodean la punta, que clickea Portfolio.
bootWorldPage(undefined, "blog");
```

`src/lab/lab-excluded.test.ts`: la lista de páginas pasa a `["portfolio", "resume", "blog", "world"]`.

Run: `npm run typecheck && npm test` → PASS. Levantar el lab y abrir `lab/blog.html`: el mar ondula por bandas, la fosa más oscura y lenta, espuma titilando junto al arrecife, tres barcos que salen de la bahía, doblan al sur pasando al este del faro, cruzan la fosa y se desvanecen; el haz gira; las boyas parpadean alternadas. Anotar en consola `peor redibujo en 5 s`: meta ≤ 6 ms; si supera, `SEA_STEP_MS = 150` y anotar.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/animator.ts src/scenes/ships.ts src/scenes/ships.test.ts src/scenes/sea-anim.ts src/scenes/sea-anim.test.ts src/scenes/sea-animator.ts src/scenes/sea-animator.test.ts src/lab lab/blog.html
git commit -m "feat(scenes): barcos con rumbo que salen de la bahía, mar en bandas, haz del faro, boyas; lab/blog.html"
```

### Task 7: Presupuesto, capturas y documentación

**Files:**
- Modify: `docs/superpowers/specs/2026-09-14-mundo-2-fabrica-distrito-blog-design.md` (estado + "Desvíos de la implementación")
- Modify: `docs/superpowers/specs/2026-09-14-mundo-isometrico-design.md` (estado: Blog implementado en Mundo 2), `docs/superpowers/plans/2026-09-14-mundo-iso-2-resume-ciudad.md` (sección "Lo que queda para el plan 3": hecho)
- Modify: `README.md` (sección "Laboratorio isométrico")
- Modify: este plan (sección "Estado")
- Modify: memoria `~/.claude/projects/-home-nicolasr-Projects-mapa/memory/mapa-iso-world-rulings.md`

- [ ] **Step 1: Medir**

Con `npx vite --port 5199` corriendo, abrir cada página dos veces (frío y caliente) y anotar de la consola `[lab] primer dibujo: … ms, … polígonos estáticos` y el peor `peor redibujo en 5 s` tras 20 s: `world.html`, `portfolio.html`, `resume.html`, `blog.html`. Metas: primer dibujo < 150 ms, peor redibujo ≤ 6 ms. Si el redibujo del mar pasa de 6 ms: `SEA_STEP_MS = 150`; si sigue, partir en 4 bandas (`BANDS = 4`, y sumar `sea.band3` al adaptador y a su test). Anotar los números finales.

- [ ] **Step 2: Capturas**

```bash
agent-browser set viewport 1600 900 2
agent-browser open http://127.0.0.1:5199/map/lab/world.html
agent-browser screenshot /tmp/mundo2-world.png
agent-browser press 4
agent-browser screenshot /tmp/mundo2-cover.png
agent-browser open http://127.0.0.1:5199/map/lab/portfolio.html
agent-browser screenshot /tmp/mundo2-portfolio.png
agent-browser open http://127.0.0.1:5199/map/lab/resume.html
agent-browser screenshot /tmp/mundo2-resume.png
agent-browser open http://127.0.0.1:5199/map/lab/blog.html
agent-browser screenshot /tmp/mundo2-blog.png
```

Leer cada PNG y escribir PASS/FAIL por criterio de la spec §9: sin cielo dentro del rectángulo cover; sombras sin manchas y con núcleo más denso; skyline con vidrio y piedra mezclados; patios verdes; humo saliendo de las tres chimeneas; barcos delante del faro; la fosa se lee más oscura que la plataforma. Un FAIL vuelve a la task correspondiente. Publicar las cinco capturas como artifact (una página HTML con las imágenes embebidas como data URI, título "Mundo 2: capturas").

- [ ] **Step 3: Documentar**

En la spec de Mundo 2: `**Estado:** implementada (2026-09-14)` y una sección `### Desvíos de la implementación` bajo §2 con la tabla de "Desvíos respecto de la spec, decididos al planificar" de este plan más lo que surja en las tasks (pesos de `pickType`, ajustes de `ROUTE`, `SEA_STEP_MS`, números del presupuesto). En la spec del mundo (`2026-09-14-mundo-isometrico-design.md`): `**Estado:** partes 1 y 2 implementadas; Blog implementado en 2026-09-14-mundo-2-fabrica-distrito-blog-design.md`. En el plan 2, bajo "Lo que queda para el plan 3": una línea "Hecho en el plan Mundo 2 (2026-09-14)". En `README.md`, sección "Laboratorio isométrico": sumar `/map/lab/blog.html`, la tecla `4` (encuadre cover), que el mundo tiene origen en (-60, -60) y sangrado alrededor, y las nuevas escenas (`factory.ts`, `district.ts`, `sea.ts`). En este plan, sección `## Estado: implementado (2026-09-14)` al principio con el resumen de desvíos.

Memoria (`mapa-iso-world-rulings.md`): agregar los rulings nuevos que una sesión futura (reintegración al sitio) necesita y que no salen del código: `worldZoneAt` es geográfico (la punta clickea Portfolio); `coverFrame(16/9)` es el encuadre cover que la cámara del sitio debe usar como zoom mínimo; el sangrado existe solo con `world(seed)` sin filtro; las sombras animadas viven en `shadowSlot`/`coreSlot`; `Animator.claims` y `AnimLayer.alpha`; y los números del presupuesto medidos. Actualizar la línea de `MEMORY.md` si cambia la descripción.

- [ ] **Step 4: Verificación final y commit**

Run: `npm run typecheck && npm test && npm run build && ls dist | grep -c lab` → tests verdes, build ok, `0`.

```bash
git add docs README.md
git commit -m "docs: Mundo 2 implementado: estado, desvíos, README del laboratorio"
```

Cerrar la rama con `superpowers:finishing-a-development-branch` (PR contra `main`, como los planes 1 y 2).

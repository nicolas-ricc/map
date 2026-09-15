# Mundo 3: distrito tecnológico, feria al norte, agua dinámica y barcos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el cover del mundo deje de tener partes planas: toda el agua ondula con profundidad progresiva y destellos de atardecer, los barcos tienen casco de barco, la extensión de Resume es un distrito tecnológico con ventanas y carteles, y al norte de la fábrica hay industria pesada y una feria de playa con vuelta al mundo.

**Architecture:** Cuatro partes independientes (A agua, B barcos, C distrito tecnológico, D norte y feria), cada una mergeable sola, en ese orden sugerido. El motor puro (`src/iso/`) gana `hull` lofteado, `poly.facade` y el sólido `wheel`. `terrain.ts` deja de repartir el agua por cuerpo y la reparte por profundidad (`depth-map.ts`); un solo animador (`water-animator.ts`) la mueve toda. Las escenas nuevas (`tech.ts`, `fair.ts`) y las funciones nuevas de `hinterland.ts` siguen el patrón de `suburb.ts`/`hinterland.ts`: puras, rng propio, test de determinismo, materiales y presupuesto. Pixi sigue solo en `src/lab/`.

**Tech Stack:** TypeScript strict, Vite 8, pixi.js 8 (solo `src/lab/`), Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md` (más `2026-09-15-margenes-urbanos-design.md` para `builtAt` y la grilla del suburbio, y `2026-09-14-mundo-2-fabrica-distrito-blog-design.md` §7 para la ruta de los barcos).

## Global Constraints

- `src/iso/` y `src/scenes/` **no importan `pixi.js`** (`src/iso/pixi-free.test.ts`). Solo `src/lab/runtime.ts` y `src/lab/draw.ts` tocan Pixi.
- Proyección: `sx = x - y`, `sy = (x + y) / 2 - z * 1.4`. `x` este, `y` sur, `z` arriba. Cámara al SE: caras visibles este (+x) y sur (+y). Sol al OSO: pared sur `lit`, este `shade`.
- **Ningún literal `0x......` fuera de `palette.ts`, `palette-iso.ts` y `seed.ts`** (`palette-guard.test.ts`). Colores nuevos: generados y pegados como literales.
- Suelo (`ground`, `strip`) se pinta antes que los sólidos y el agua antes que el suelo. Los acentos se pintan arriba de todo con blend `add`.
- Límites que clasifican terreno: múltiplos de `CELL = 6` en el contenido y de `CELL_BLEED = 18` en el sangrado (grilla anclada en `(−402, −438)`).
- Materiales por zona (spec §2, §3, §4.5, §7). Compartidos: `leaf leafDark rock water waterDeep shallow abyss sand` (naturaleza) y `steel rust hull hullBlue deck` (vehículos). Acentos: Portfolio cian, Resume ámbar, Blog magenta; **la feria usa los tres** (excepción declarada).
- Alturas: nada no esbelto supera 18 salvo torre (30), faro, grúa pórtico (24), distrito (24), tech (20). Esbelto = `r ≤ 3` o lado `≤ 3`. La rueda de la feria (31) es la única excepción no esbelta y va en su propio test.
- Con `reducedMotion: true` un `Animator` nunca devuelve ids en `tick` y sus capas quedan en el frame 0.
- Rng: `createRng(seed)` da `{ next(), int(min, max), chance(p), pick(arr) }`. Toda escena es determinista por seed. Escenas de margen: `zoneRng(seed, zona, 2)`; la feria: `zoneRng(seed, "portfolio", 3)`.
- El laboratorio **no entra en `dist/`** (`lab-excluded.test.ts`).
- Texto y comentarios en español. Commits `feat:`, `test:`, `refactor:`, `docs:`. `npm test` y `npm run typecheck` verdes al final de cada task. Git en el worktree: comandos sueltos, sin `git -C` ni heredocs.
- Capturas: `agent-browser set viewport 1600 900 2`, `agent-browser open http://localhost:PORT/map/lab/world.html`, `agent-browser press 4` (cover), `2` (Resume), `1` (Portfolio), `3` (Blog), `agent-browser screenshot out.png`; recortar con `magick in.png -crop WxH+X+Y +repage out.png`. El servidor: `npx vite --port 5199` en segundo plano.
- Medición: `world.html` en Chrome headless (el mismo `agent-browser`, sin GPU, DPR 2), leer en consola `[lab] primer dibujo: N ms, P polígonos estáticos` (dos cargas, tomar la segunda) y `[lab] peor redibujo en 5 s: N ms` (esperar tres líneas, tomar la mayor). `agent-browser console` lista los mensajes. Metas de la spec §8: primer dibujo ≤ 170 ms, ≤ 36 000 polígonos, peor redibujo ≤ 15 ms.

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/map/palette-iso.ts` | modificar | `shallow`, `hullBlue`; escaleras nuevas de `water`, `waterDeep`, `abyss` |
| `src/scenes/depth-map.ts` | crear | `depthAt(x, y)`: distancia a tierra, transformada de distancia sobre la grilla de 6 |
| `src/scenes/terrain.ts` | modificar | `TerrainMesh.water`/`foam` por profundidad, `Tri.baseTone`, sangrado de agua a 9 u |
| `src/iso/solids.ts` | modificar | `Tri.baseTone`, `hull` lofteado (`topMat`, `sheer`), `poly.facade`, sólido `wheel` |
| `src/scenes/water-anim.ts` | crear | ola direccional, destellos, espuma, bandas (puro) |
| `src/scenes/water-animator.ts` | crear | contrato `Animator` del agua; reclama toda el agua |
| `src/scenes/shipyard-anim.ts`, `shipyard-animator.ts` | modificar | pierden la capa `water` |
| `src/scenes/sea-anim.ts`, `sea-animator.ts` | modificar | pierden bandas, fosa y espuma; suman la lancha `ferry` |
| `src/scenes/ships.ts` | modificar | flota nueva (`cargo`, `tug`, `barge`, `ferry`) y `wake()` |
| `src/scenes/sea.ts` | modificar | pecio con `topMat` |
| `src/scenes/city-pieces.ts` | modificar | `campus()` compartido (sale de `district.ts`) |
| `src/scenes/district.ts` | modificar | usa `campus` de `city-pieces` |
| `src/scenes/tech.ts`, `tech-anim.ts`, `tech-animator.ts` | crear | distrito tecnológico y su animación |
| `src/scenes/suburb.ts`, `suburb.test.ts` | borrar | reemplazados por `tech` |
| `src/scenes/sprawl-grid.ts` | modificar | `REACH.n = 16`, `FAIR`, `builtAt` → `"fair"`, `bayShoreX`, `fairAt` |
| `src/scenes/hinterland.ts` | modificar | central, refinería, locomotoras, calle, `stacks`, `PYLON_Y = −340` |
| `src/scenes/fair.ts`, `fair-anim.ts`, `fair-animator.ts` | crear | la feria y su animación |
| `src/scenes/world.ts` | modificar | `tech`, `fair` en `WorldScene` |
| `src/lab/page.ts`, `src/lab/runtime.ts` | modificar | animadores nuevos; agua estática desde `terrain.water` |
| `README.md`, spec §"Desvíos" | modificar | estado final y medidas |

---

# Parte A — Agua dinámica

### Task 1: Paleta del agua y `hullBlue`

**Files:**
- Modify: `src/map/palette-iso.ts`
- Test: `src/map/palette-iso.test.ts`

**Interfaces:**
- Produces: materiales `shallow`, `hullBlue` en `ISO_TONES`; escaleras nuevas de `water`, `waterDeep`, `abyss`. `Material` los incluye automáticamente.

- [ ] **Step 1: Test que falla**

Agregar a `src/map/palette-iso.test.ts`:

```ts
const rgb = (c: number) => [c >> 16, (c >> 8) & 255, c & 255] as const;
const warmth = (c: number) => rgb(c)[0] - rgb(c)[2];

it("agua: cuatro profundidades que se oscurecen, seno frío y cresta cálida (el atardecer)", () => {
  const mats = ["shallow", "water", "waterDeep", "abyss"] as const;
  for (let i = 1; i < mats.length; i++) expect(lum(ISO_TONES[mats[i]!].top)).toBeLessThan(lum(ISO_TONES[mats[i - 1]!].top));
  for (const m of mats) {
    expect(warmth(ISO_TONES[m].up)).toBeGreaterThan(warmth(ISO_TONES[m].top) + 40);
    expect(warmth(ISO_TONES[m].lit)).toBeLessThan(warmth(ISO_TONES[m].top));
    expect(lum(ISO_TONES[m].lit)).toBeLessThan(lum(ISO_TONES[m].down));
    expect(lum(ISO_TONES[m].down)).toBeLessThan(lum(ISO_TONES[m].top));
  }
  expect(Object.keys(ISO_TONES.hullBlue).sort()).toEqual(["down", "lit", "shade", "top", "up"]);
});
```

(`lum` ya existe en ese test.)

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/map/palette-iso.test.ts`
Expected: FAIL, `ISO_TONES.shallow` undefined.

- [ ] **Step 3: Pegar las escaleras**

En `src/map/palette-iso.ts` reemplazar las líneas `water:` y `waterDeep:` y `abyss:` y agregar `shallow` y `hullBlue`. Regla (documentarla en el comentario de cabecera): agua `lit = top × (0.55, 0.60, 0.80)`, `down = top × (0.78, 0.84, 0.96)`, `shade = top × (0.40, 0.42, 0.60)`, `up = top × 0.3 + 0xf0a070 × 0.7`. `hullBlue` con la regla de ciudad/costa.

```ts
  shallow:   { top: 0x2f7f86, lit: 0x1a4c6b, shade: 0x133550, up: 0xb69677, down: 0x256b81 }, // orillas, bajíos, ríos: turquesa sobre arena
  water:     { top: 0x225f6c, lit: 0x133956, shade: 0x0e2841, up: 0xb28d6f, down: 0x1b5068 }, // bahía, estuario, mar cerca de la costa
  waterDeep: { top: 0x183f56, lit: 0x0d2645, shade: 0x0a1a34, up: 0xaf8368, down: 0x133553 }, // mar abierto
  hullBlue:  { top: 0x2f4a6e, lit: 0x273744, shade: 0x131f42, up: 0x375370, down: 0x284167 }, // obra muerta de los barcos
```

y en el bloque de Blog:

```ts
  abyss:     { top: 0x0f2740, lit: 0x081733, shade: 0x061026, up: 0xad7c62, down: 0x0c213d },
```

- [ ] **Step 4: Correr tests**

Run: `npm test`
Expected: PASS (el palette-guard sigue verde: son literales en `palette-iso.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/map/palette-iso.ts src/map/palette-iso.test.ts
git commit -m "feat(palette): agua en cuatro profundidades con seno frío y cresta de atardecer; hullBlue"
```

### Task 2: Mapa de profundidad y terreno por profundidad

**Files:**
- Create: `src/scenes/depth-map.ts`, `src/scenes/depth-map.test.ts`
- Modify: `src/iso/solids.ts:8` (`Tri`), `src/scenes/terrain.ts`, `src/scenes/terrain.test.ts`, `src/scenes/world.test.ts:20,40,74`, `src/scenes/sea-anim.ts`, `src/scenes/sea-anim.test.ts`, `src/scenes/sea-animator.ts`, `src/scenes/sea-animator.test.ts`, `src/scenes/shipyard-anim.test.ts`, `src/scenes/shipyard-animator.test.ts`, `src/lab/page.ts`, `src/lab/runtime.ts`

**Interfaces:**
- Produces: `depthAt(x, y): number` (u a la tierra más cercana; 0 en tierra); `waterBand(x, y): WaterMat | null`; `Tri.baseTone?: number`; `TerrainMesh = { ground: Solid[]; bleed: Solid[]; water: Solid[]; foam: Solid }` con `water` = un `ground` por `WaterMat` presente (orden `shallow, water, waterDeep, abyss`); `WATER_MATS`, `FOAM_W = 3`, `CELL_WATER = 9`, `SHALLOW_D = 12`, `DEEP_D = 48`.
- Consumes: `terrainAt`, `bleedTerrainAt`, `inCoverQuad`, `COVER_MARGIN` (de `sprawl-grid.ts`).

- [ ] **Step 1: Test de `depthAt`**

`src/scenes/depth-map.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { depthAt } from "./depth-map";

describe("depth-map", () => {
  it("es 0 en tierra y crece al alejarse de la costa", () => {
    expect(depthAt(100, 100)).toBe(0);           // astillero
    expect(depthAt(150, -300)).toBe(0);          // sangrado norte (selva o construido)
    expect(depthAt(400, 60)).toBeGreaterThan(0);
    expect(depthAt(400, 60)).toBeLessThan(depthAt(480, 60));
    expect(depthAt(480, 60)).toBeLessThan(depthAt(560, 60));
    expect(depthAt(200, 300)).toBeLessThan(depthAt(240, 300)); // orilla vs centro del estuario
  });
  it("es una distancia en unidades de mundo, no en celdas", () => {
    expect(depthAt(560, 60)).toBeGreaterThan(60);
    expect(depthAt(900, 300)).toBeGreaterThan(200); // mar del sangrado, lejos de todo
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/depth-map.test.ts` → FAIL, módulo inexistente.

- [ ] **Step 3: Implementar `depth-map.ts`**

```ts
import { BLEED, CELL, WORLD } from "../map/geo";
import { bleedTerrainAt, terrainAt } from "./terrain";

/**
 * Distancia de cada punto de agua a la tierra más cercana, en unidades de
 * mundo: transformada de distancia (chaflán 1 / √2, dos pasadas) sobre una
 * grilla de CELL que cubre contenido y sangrado. Se calcula una vez, sin rng.
 * La usa el terreno para repartir el agua por profundidad.
 */
const X0 = WORLD.x0 - BLEED.x, Y0 = WORLD.y0 - BLEED.y, X1 = WORLD.x1 + BLEED.x, Y1 = WORLD.y1 + BLEED.y;
const COLS = (X1 - X0) / CELL, ROWS = (Y1 - Y0) / CELL;
const WATER_CONTENT = new Set(["water", "sea", "shore", "abyss"]);
const WATER_BLEED = new Set(["sea", "shore", "abyss", "river"]);

export function isWaterAt(x: number, y: number): boolean {
  if (x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1) return WATER_CONTENT.has(terrainAt(x, y));
  return WATER_BLEED.has(bleedTerrainAt(x, y));
}

let grid: Float32Array | null = null;

function build(): Float32Array {
  const d = new Float32Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) d[j * COLS + i] = isWaterAt(X0 + (i + 0.5) * CELL, Y0 + (j + 0.5) * CELL) ? Infinity : 0;
  const relax = (i: number, j: number, di: number, dj: number, w: number) => {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) return;
    const v = d[nj * COLS + ni]! + w;
    if (v < d[j * COLS + i]!) d[j * COLS + i] = v;
  };
  const R2 = Math.SQRT2;
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { relax(i, j, -1, 0, 1); relax(i, j, 0, -1, 1); relax(i, j, -1, -1, R2); relax(i, j, 1, -1, R2); }
  for (let j = ROWS - 1; j >= 0; j--) for (let i = COLS - 1; i >= 0; i--) { relax(i, j, 1, 0, 1); relax(i, j, 0, 1, 1); relax(i, j, 1, 1, R2); relax(i, j, -1, 1, R2); }
  return d;
}

/** Distancia a tierra en unidades de mundo (0 en tierra o fuera del sangrado). */
export function depthAt(x: number, y: number): number {
  grid ??= build();
  const i = Math.floor((x - X0) / CELL), j = Math.floor((y - Y0) / CELL);
  if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return 0;
  const v = grid[j * COLS + i]!;
  return Number.isFinite(v) ? v * CELL : 0;
}
```

Nota: `terrain.ts` importará `depth-map.ts` y `depth-map.ts` importa `terrainAt` de `terrain.ts`: es un ciclo de módulos ESM válido porque `depth-map` solo usa `terrainAt` dentro de funciones (no en la carga). Si `vitest` se queja de `undefined` al cargar, mover `terrainAt`, `bleedTerrainAt` y sus clasificadores a `src/scenes/terrain-classify.ts` y que ambos importen de ahí (refactor sin cambio de comportamiento; `terrain.ts` re-exporta).

- [ ] **Step 4: Correr**

Run: `npx vitest run src/scenes/depth-map.test.ts` → PASS.

- [ ] **Step 5: Test del terreno por profundidad**

En `src/scenes/terrain.test.ts` reemplazar `allTris` (línea 10) por:

```ts
const allTris = (m: ReturnType<typeof buildTerrain>): Tri[] => [...m.ground, ...m.water].flatMap(tris);
```

y los tests que usan `m.river`, `m.sea`, `m.shore`, `m.abyss` (líneas ~120–122 y ~186–187) por:

```ts
  it("el agua se reparte por profundidad en cuatro materiales, toda a z −1, con baseTone en [−1, 1] y espuma junto a la costa", () => {
    const m = buildTerrain(createRng(7));
    expect(m.water.map((w) => w.mat)).toEqual(["shallow", "water", "waterDeep", "abyss"]);
    for (const w of m.water) {
      expect(tris(w).length).toBeGreaterThan(100);
      for (const t of tris(w)) { expect(t.pts.every((p) => p.z === -1)).toBe(true); expect(t.toneOffset ?? 0).toBe(0); expect(Math.abs(t.baseTone ?? 0)).toBeLessThanOrEqual(1); }
    }
    expect(m.foam.mat).toBe("foam");
    expect(tris(m.foam).length).toBeGreaterThan(200);
    expect(waterBand(200, 300)).toBe("shallow"); expect(waterBand(240, 300)).toBe("water"); // orilla y centro del estuario
    expect(waterBand(560, 60)).toBe("abyss"); expect(waterBand(100, 100)).toBeNull();
    expect(tris(m.water[3]!).length).toBeGreaterThan(400);
  });

  it("el agua del sangrado usa celdas de 9 dentro del cover y de 18 afuera", () => {
    const m = buildTerrain(createRng(7));
    const side = (t: Tri) => Math.max(...t.pts.map((p) => p.x)) - Math.min(...t.pts.map((p) => p.x));
    const at = (x: number, y: number) => m.water.flatMap(tris).filter((t) => t.pts.some((p) => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1));
    expect(at(603, 303).some((t) => side(t) === 9)).toBe(true);
    expect(at(900, 690).every((t) => side(t) === 18)).toBe(true);
  });
```

Importar `waterBand` de `./terrain`. Actualizar también la lista de materiales del sangrado (línea ~163) a `["leafDark", "rock", "slab", "asphalt"]` (el agua ya no está en `bleed`).

- [ ] **Step 6: Correr y ver que falla**

Run: `npx vitest run src/scenes/terrain.test.ts` → FAIL (`m.water` undefined).

- [ ] **Step 7: Implementar en `terrain.ts`**

En `src/iso/solids.ts` línea 8: `export interface Tri { pts: [Vec3, Vec3, Vec3]; toneOffset?: number; baseTone?: number }`.

En `terrain.ts`:

```ts
import { depthAt } from "./depth-map";
import { COVER_MARGIN } from "./sprawl-grid";
import { inCoverQuad } from "../map/geo";

export type WaterMat = "shallow" | "water" | "waterDeep" | "abyss";
export const WATER_MATS: readonly WaterMat[] = ["shallow", "water", "waterDeep", "abyss"];
export const SHALLOW_D = 12, DEEP_D = 48, FOAM_W = 3, CELL_WATER = 9;
const ABYSS_RAMP = 60;

export interface TerrainMesh { ground: Solid[]; bleed: Solid[]; water: Solid[]; foam: Solid }

const WATER_TERRAIN = new Set<Terrain>(["water", "sea", "shore", "abyss"]);
const BLEED_WATER = new Set<BleedTerrain>(["sea", "shore", "abyss", "river"]);

/** Material del agua en un punto por profundidad (distancia a tierra); la fosa manda por geografía. Null en tierra. */
export function waterBand(x: number, y: number): WaterMat | null {
  const inside = x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1;
  const t = inside ? terrainAt(x, y) : bleedTerrainAt(x, y);
  if (inside ? !WATER_TERRAIN.has(t as Terrain) : !BLEED_WATER.has(t as BleedTerrain)) return null;
  if (t === "abyss") return "abyss";
  const d = depthAt(x, y);
  return d < SHALLOW_D ? "shallow" : d < DEEP_D ? "water" : "waterDeep";
}

/** Posición dentro de la banda, −1 (borde somero) … +1 (borde profundo), en pasos enteros. */
export function baseToneAt(x: number, y: number, mat: WaterMat): number {
  const d = depthAt(x, y);
  const frac = mat === "shallow" ? d / SHALLOW_D : mat === "water" ? (d - SHALLOW_D) / (DEEP_D - SHALLOW_D) : mat === "waterDeep" ? Math.min(1, (d - DEEP_D) / DEEP_D) : Math.min(1, Math.max(0, (x - abyssX(y)) / ABYSS_RAMP));
  return Math.max(-1, Math.min(1, Math.round(1 - 2 * frac)));
}

type WaterTris = Record<WaterMat, Tri[]>;
const newWaterTris = (): WaterTris => ({ shallow: [], water: [], waterDeep: [], abyss: [] });

/** Dos triángulos de agua por celda, con `baseTone` por su centro, y copia en `foam` si están a menos de FOAM_W de tierra. */
function waterCell(w: WaterTris, foam: Tri[], x0: number, y0: number, x1: number, y1: number, i: number, j: number): void {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const mat = waterBand(cx, cy);
  if (!mat) return;
  const tmp: Tri[] = [];
  cellTris(tmp, x0, y0, x1, y1, WATER_Z, WATER_Z, WATER_Z, WATER_Z, WATER_Z, i, j);
  const base = baseToneAt(cx, cy, mat);
  for (const t of tmp) {
    t.baseTone = base;
    w[mat].push(t);
    if (depthAt(cx, cy) < FOAM_W) foam.push({ pts: t.pts });
  }
}

const waterSolids = (w: WaterTris): Solid[] => WATER_MATS.filter((m) => w[m].length > 0).map((m): Solid => ({ kind: "ground", mat: m, tris: w[m] }));
```

En `buildTerrain`: en el bucle de celdas, si `WATER_TERRAIN.has(t)` llamar `waterCell(w, foam, x0, y0, x1, y1, i, j)` y `continue` (el agua ya no entra en `tris[t]`). Con `zones` (páginas de zona) el filtro por `worldZoneAt` sigue aplicando antes. Devolver `{ ground: [...], bleed, water: waterSolids(w), foam: { kind: "ground", mat: "foam", tris: foam } }` donde `bleed` viene de `buildBleed(rng, w, foam)`.

En `buildBleed(rng, w, foam)`: en el bucle de celdas, si `BLEED_WATER.has(t)`:

```ts
      if (BLEED_WATER.has(t)) {
        if (inCoverQuad(cx, cy, 16 / 9, COVER_MARGIN)) { for (let sj = 0; sj < 2; sj++) for (let si = 0; si < 2; si++) waterCell(w, foam, x0 + si * CELL_WATER, y0 + sj * CELL_WATER, x0 + (si + 1) * CELL_WATER, y0 + (sj + 1) * CELL_WATER, i * 2 + si, j * 2 + sj); }
        else waterCell(w, foam, x0, y0, x1, y1, i, j);
        continue;
      }
```

y sacar `waterDeep`, `water`, `abyss` de `tris` y de `BLEED_MAT` (dejar `BLEED_MAT` solo para `jungle`, `industrial`, `urban`; `BLEED_WATER` sigue sirviendo para la z de los vértices). Borrar `FLAT` del contenido para los tipos de agua (ya no se generan ahí) pero conservar `dock`.

Quitar los campos `river`, `sea`, `shore`, `abyss` de `TerrainMesh`. El compilador señala cada uso: `sea-anim.ts` (bandas, fosa, espuma: **borrar** `band`, `abyss`, `foam`, `wave`, `paintBand`, `paintFoam`, `bands`, `foamTris`, `abyssSolid`, `foamSolid`, `SEA_STEP_MS`, `SEA_CYCLE_MS`, `ABYSS_*`, `FOAM_STEP_MS`, `BANDS`, `FOAM_DIST`; `SeaChanges` queda `{ ships; beam; buoys }`; `createSeaAnim(scene, opts)` ya no recibe `terrain`), `sea-animator.ts` (sin capas `sea.band*`, `sea.abyss`, `sea.foam`; sin `claims`; `seaAnimator(scene, opts)`), `sea-anim.test.ts` (borrar el test "tres bandas de mar…" y el `terrain` de los `setup`; `tick` con reduced-motion devuelve `{ ships: false, beam: false, buoys: false }`), `sea-animator.test.ts` (ids sin bandas; sin `claims`), `shipyard-anim.ts` (`createShipyardAnim(scene, rng, opts)`: borrar `water`, `centers`, `waterStep`, `WATER_STEP_MS`, `WATER_CYCLE_MS` y la rama de agua del `tick`; `AnimChanges = { trolley; sparks }`), `shipyard-animator.ts` (sin capa `water`), sus dos tests (borrar el test del agua y el argumento), `world.test.ts` (línea 20: `w.terrain.water.reduce((n, s) => n + (s.kind === "ground" ? s.tris.length : 0), 0) > 300`; línea 40: `w.terrain.water` es `[]` solo si la zona no tiene agua: cambiar por `expect(w.terrain.bleed).toEqual([])`; línea 74: `[...w.terrain.ground, ...w.terrain.water, w.terrain.foam, ...w.terrain.bleed, ...]`), `src/lab/page.ts` (`shipyardAnimator(scene.shipyard, createRng(SEED + 1), { reducedMotion })`, `seaAnimator(scene.sea, { reducedMotion })`), `src/lab/runtime.ts` (`staticWater` dibuja `[...terrain.water, terrain.foam].filter((w) => !animatedWater.has(w))`). `src/map/build-world.ts` usa otro `terrain` (el del mapa viejo): no tocar.

- [ ] **Step 8: Correr todo**

Run: `npm test && npm run typecheck` → PASS. En este punto el agua es estática (nadie la anima): es el estado intermedio esperado.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/depth-map.ts src/scenes/depth-map.test.ts src/iso/solids.ts src/scenes/terrain.ts src/scenes/terrain.test.ts src/scenes/sea-anim.ts src/scenes/sea-anim.test.ts src/scenes/sea-animator.ts src/scenes/sea-animator.test.ts src/scenes/shipyard-anim.ts src/scenes/shipyard-anim.test.ts src/scenes/shipyard-animator.ts src/scenes/shipyard-animator.test.ts src/scenes/world.test.ts src/lab/page.ts src/lab/runtime.ts
git commit -m "feat(terrain): el agua se reparte por profundidad (shallow/water/waterDeep/abyss) con baseTone y espuma de costa; sangrado de agua a 9 u en el cover"
```

### Task 3: `water-anim.ts` (puro)

**Files:**
- Create: `src/scenes/water-anim.ts`, `src/scenes/water-anim.test.ts`

**Interfaces:**
- Consumes: `TerrainMesh.water`, `TerrainMesh.foam`, `Tri.baseTone`, `WaterMat`.
- Produces: `WATER_STEP_MS = 150`, `WAVE_T_MS = 4000`, `WAVE_LAMBDA = 10`, `ABYSS_T_MS = 8000`, `ABYSS_LAMBDA = 14`, `FOAM_STEP_MS = 500`, `BANDS = 4`; `triHash(t): number` (0..3); `waveTone(t, mat, clockMs): number`; `createWaterAnim(terrain, opts): WaterAnim` con `{ band(k): Solid[]; foam(): Solid[]; tick(dtMs): WaterChanges }`, `WaterChanges = { bands: Set<number>; foam: boolean }`.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import type { Tri } from "../iso/solids";
import { v3 } from "../iso/geometry";
import { createRng } from "../map/seed";
import { buildTerrain } from "./terrain";
import { BANDS, WATER_STEP_MS, WAVE_LAMBDA, WAVE_T_MS, createWaterAnim, triHash, waveTone } from "./water-anim";

const tri = (x: number, y: number, base = 0): Tri => ({ pts: [v3(x, y, -1), v3(x + 6, y, -1), v3(x + 6, y + 6, -1)], baseTone: base });
const tris = (s: { kind: string; tris?: Tri[] }) => (s.kind === "ground" ? s.tris! : []);

describe("water-anim", () => {
  it("la ola es periódica, viaja hacia el noroeste y nunca sale de [−2, 2]", () => {
    for (let k = 0; k < 200; k++) {
      const t = tri(k * 3, (k * 7) % 100, (k % 3) - 1);
      expect(waveTone(t, "water", 1234)).toBe(waveTone(t, "water", 1234 + WAVE_T_MS));
      for (let c = 0; c < WAVE_T_MS; c += 250) expect(Math.abs(waveTone(t, "water", c))).toBeLessThanOrEqual(2);
    }
    let towardNW = 0, towardSE = 0; // la cresta en s a t está en s − λ/4 a t + T/4 (s = x + 0.5 y)
    for (let x = 0; x < 400; x += 6) {
      const a = waveTone(tri(x, 0), "water", 0);
      towardNW += Math.abs(waveTone(tri(x - WAVE_LAMBDA / 4, 0), "water", WAVE_T_MS / 4) - a);
      towardSE += Math.abs(waveTone(tri(x + WAVE_LAMBDA / 4, 0), "water", WAVE_T_MS / 4) - a);
    }
    expect(towardNW).toBeLessThan(towardSE);
  });
  it("el destello (+2) solo aparece en triángulos con hash 0; en promedio la ola respeta el baseTone", () => {
    for (let k = 0; k < 300; k++) {
      const t = tri(k * 5, k * 2, 1);
      let sum = 0, n = 0;
      for (let c = 0; c < WAVE_T_MS; c += 50) { const v = waveTone(t, "water", c); if (v === 2) expect(triHash(t)).toBe(0); sum += v; n++; }
      expect(Math.abs(sum / n - 1)).toBeLessThan(0.6);
    }
  });
  it("reparte el agua en cuatro bandas parejas, pinta una por paso en ronda y alterna la espuma", () => {
    const terrain = buildTerrain(createRng(7));
    const a = createWaterAnim(terrain, { reducedMotion: false });
    const sizes = Array.from({ length: BANDS }, (_, k) => a.band(k).reduce((n, s) => n + tris(s).length, 0));
    const total = terrain.water.reduce((n, s) => n + tris(s).length, 0);
    expect(sizes.reduce((x, y) => x + y, 0)).toBe(total);
    expect(Math.max(...sizes)).toBeLessThan(2 * Math.min(...sizes));
    expect(a.band(0).some((s) => tris(s).some((t) => (t.toneOffset ?? 0) !== 0))).toBe(true);
    const c1 = a.tick(WATER_STEP_MS), c2 = a.tick(WATER_STEP_MS), c3 = a.tick(WATER_STEP_MS), c4 = a.tick(WATER_STEP_MS);
    expect([c1, c2, c3, c4].map((c) => [...c.bands])).toEqual([[1], [2], [3], [0]]);
    expect(a.tick(500).foam).toBe(true);
    expect(a.foam()[0]!.mat).toBe("foam");
  });
  it("con reduced-motion no cambia nada", () => {
    const a = createWaterAnim(buildTerrain(createRng(7)), { reducedMotion: true });
    expect(a.tick(1000)).toEqual({ bands: new Set(), foam: false });
  });
});
```

- [ ] **Step 2: Correr** → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

```ts
import type { Solid, Tri } from "../iso/solids";
import { WATER_MATS, type TerrainMesh, type WaterMat } from "./terrain";

/**
 * Material dinámico del agua, sin Pixi: una ola direccional que viaja hacia
 * el noroeste (hacia las costas del astillero y de la ciudad) suma ±1..2 al
 * `baseTone` de profundidad de cada triángulo; el +2 (tono `up`, la cresta
 * que refleja el sol) solo sobrevive en un cuarto de los triángulos, así son
 * destellos y no una franja. La espuma de costa alterna. El agua entera se
 * reparte en BANDS bandas por x de pantalla y cada paso repinta una.
 */
export const WATER_STEP_MS = 150, WAVE_T_MS = 4000, WAVE_LAMBDA = 10, ABYSS_T_MS = 8000, ABYSS_LAMBDA = 14, FOAM_STEP_MS = 500, BANDS = 4;
const WAVE_AMP = 1.2, ABYSS_AMP = 0.6, RIPPLE_AMP = 0.35;

const cx = (t: Tri): number => (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
const cy = (t: Tri): number => (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;

/** Hash fijo por triángulo, 0..3. */
export const triHash = (t: Tri): number => Math.abs(Math.floor(cx(t) * 7 + cy(t) * 13)) % 4;

export function waveTone(t: Tri, mat: WaterMat, clockMs: number): number {
  const abyss = mat === "abyss";
  const lam = abyss ? ABYSS_LAMBDA : WAVE_LAMBDA, T = abyss ? ABYSS_T_MS : WAVE_T_MS, amp = abyss ? ABYSS_AMP : WAVE_AMP;
  const phi = (cx(t) + 0.5 * cy(t)) / lam + (2 * Math.PI * (clockMs % T)) / T;
  const crest = Math.round(amp * Math.sin(phi) + RIPPLE_AMP * Math.sin(2.3 * phi + triHash(t)));
  let tone = Math.max(-2, Math.min(2, (t.baseTone ?? 0) + crest));
  if (tone === 2 && triHash(t) !== 0) tone = 1;
  return tone;
}

export interface WaterChanges { bands: Set<number>; foam: boolean }
export interface WaterAnim { band(k: number): Solid[]; foam(): Solid[]; tick(dtMs: number): WaterChanges }

export function createWaterAnim(terrain: TerrainMesh, opts: { reducedMotion: boolean }): WaterAnim {
  const all = terrain.water.flatMap((s) => (s.kind === "ground" ? s.tris.map((t) => ({ t, mat: s.mat as WaterMat })) : []));
  const sx = (t: Tri) => cx(t) - cy(t);
  const sorted = all.map(({ t }) => sx(t)).sort((a, b) => a - b);
  const cuts = Array.from({ length: BANDS - 1 }, (_, k) => sorted[Math.floor(((k + 1) * sorted.length) / BANDS)]!); // cuantiles: bandas parejas
  const bandOf = (t: Tri) => cuts.findIndex((c) => sx(t) < c) === -1 ? BANDS - 1 : cuts.findIndex((c) => sx(t) < c);
  const bands: { mat: WaterMat; tris: Tri[] }[][] = Array.from({ length: BANDS }, () => WATER_MATS.map((mat) => ({ mat, tris: [] })));
  for (const { t, mat } of all) bands[bandOf(t)]![WATER_MATS.indexOf(mat)]!.tris.push(t);
  const bandSolids: Solid[][] = bands.map((b) => b.filter((x) => x.tris.length > 0).map((x): Solid => ({ kind: "ground", mat: x.mat, tris: x.tris })));
  const foamTris = terrain.foam.kind === "ground" ? terrain.foam.tris : [];

  let clock = 0, step = 0, foamStep = 0;
  const paintBand = (k: number): void => { for (const b of bands[k]!) for (const t of b.tris) t.toneOffset = waveTone(t, b.mat, clock); };
  const paintFoam = (): void => { for (const t of foamTris) t.toneOffset = foamStep % 2 === 0 ? 0 : -1; };
  for (let k = 0; k < BANDS; k++) paintBand(k);
  paintFoam();

  return {
    band: (k) => bandSolids[k]!,
    foam: () => [terrain.foam],
    tick(dtMs) {
      const c: WaterChanges = { bands: new Set(), foam: false };
      if (opts.reducedMotion || dtMs <= 0) return c;
      clock += dtMs;
      const s = Math.floor(clock / WATER_STEP_MS);
      if (s !== step) { step = s; c.bands.add(s % BANDS); }
      for (const k of c.bands) paintBand(k);
      const fs = Math.floor(clock / FOAM_STEP_MS);
      if (fs !== foamStep) { foamStep = fs; c.foam = true; paintFoam(); }
      return c;
    },
  };
}
```

- [ ] **Step 4: Correr** → `npx vitest run src/scenes/water-anim.test.ts` PASS. Si la aserción del promedio falla por poco, subir la tolerancia a 0.8 (la ola redondeada no es simétrica); si el test de dirección falla, revisar el signo de `phi` (debe ser `+ ωt`).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/water-anim.ts src/scenes/water-anim.test.ts
git commit -m "feat(scenes): water-anim: ola direccional con destellos de atardecer sobre el baseTone de profundidad, espuma de costa, cuatro bandas"
```

### Task 4: `water-animator.ts` y cableado del laboratorio

**Files:**
- Create: `src/scenes/water-animator.ts`, `src/scenes/water-animator.test.ts`
- Modify: `src/lab/page.ts`

**Interfaces:**
- Produces: `waterAnimator(terrain: TerrainMesh, opts: { reducedMotion: boolean }): Animator` con ids `water.band0..3`, `water.foam` y `claims = [...terrain.water, terrain.foam]`.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import { WATER_STEP_MS } from "./water-anim";
import { waterAnimator } from "./water-animator";
import { world } from "./world";

describe("waterAnimator", () => {
  it("expone cuatro bandas y la espuma, reclama toda el agua y con reduced-motion no devuelve ids", () => {
    const w = world(7);
    const a = waterAnimator(w.terrain, { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["water.band0", "water.band1", "water.band2", "water.band3", "water.foam"]);
    expect(a.claims).toEqual([...w.terrain.water, w.terrain.foam]);
    expect(a.layer("water.band0").kind).toBe("water");
    expect([...a.tick(WATER_STEP_MS)]).toEqual(["water.band1"]);
    expect(waterAnimator(w.terrain, { reducedMotion: true }).tick(1000).size).toBe(0);
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar**

```ts
import type { AnimLayer, Animator } from "./animator";
import type { TerrainMesh } from "./terrain";
import { BANDS, createWaterAnim } from "./water-anim";

/** Adapta el agua al contrato `Animator`. Reclama todos los cuerpos de agua y la espuma: el runtime no los pinta estáticos. */
export function waterAnimator(terrain: TerrainMesh, opts: { reducedMotion: boolean }): Animator {
  const anim = createWaterAnim(terrain, opts);
  const layers: Record<string, () => AnimLayer> = {};
  for (let k = 0; k < BANDS; k++) layers[`water.band${k}`] = () => ({ kind: "water", water: anim.band(k) });
  layers["water.foam"] = () => ({ kind: "water", water: anim.foam() });
  return {
    ids: Object.keys(layers),
    claims: [...terrain.water, terrain.foam],
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs), out = new Set<string>();
      for (const k of c.bands) out.add(`water.band${k}`);
      if (c.foam) out.add("water.foam");
      return out;
    },
  };
}
```

En `src/lab/page.ts`, antes de los demás animadores: `animators.push(waterAnimator(scene.terrain, { reducedMotion }));` (importar de `../scenes/water-animator`). El orden importa: sus Graphics van a `waterSlot`, que ya está debajo del suelo, así que solo importa para que `sea.wake*` (espuma de las estelas, también en `waterSlot`) se agregue después y quede encima.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS.

- [ ] **Step 5: Mirar**

`npx vite --port 5199` en segundo plano; `agent-browser set viewport 1600 900 2`; `agent-browser open http://localhost:5199/map/lab/world.html`; `agent-browser press 4`; esperar 3 s; `agent-browser screenshot water-cover.png`. Verificar: toda el agua (bahía al norte, estuario y mar al sur, fosa al este) tiene textura; hay turquesa pegado a la costa, azul, azul profundo y casi negro en la fosa; puntos durazno dispersos; espuma alternando en las costas. Si el agua del sangrado sigue plana, revisar que `terrain.bleed` no contenga `ground` de materiales de agua.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/water-animator.ts src/scenes/water-animator.test.ts src/lab/page.ts
git commit -m "feat(lab): un solo animador de agua reclama todo el agua del mundo"
```

### Task 5: Medición del agua y decisión gateada

**Files:**
- Modify (según resultado): `src/scenes/water-anim.ts` (`BANDS`), `src/scenes/terrain.ts` (`CELL_WATER`), spec §"Desvíos de la implementación".

- [ ] **Step 1: Medir** `world.html` como dice Global Constraints (dos cargas; tres líneas de "peor redibujo"). Anotar primer dibujo, polígonos y peor redibujo.

- [ ] **Step 2: Decidir** (spec §8.1): si el peor redibujo > 15 ms, poner `BANDS = 6` (ajustar el test de ronda a `[[1],[2],[3],[4],[5],[0]]` y los ids del animador) y medir otra vez; si sigue > 15 ms, `CELL_WATER = 18` (borrar la subdivisión en `buildBleed` y el test "celdas de 9") y medir. Dejar la variante que cumple.

- [ ] **Step 3: Anotar** en la spec, sección nueva `### Desvíos de la implementación` bajo §2, las tres cifras antes/después y la variante elegida.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/water-anim.ts src/scenes/terrain.ts src/scenes/water-anim.test.ts src/scenes/water-animator.test.ts docs/superpowers/specs/2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md
git commit -m "docs: medición del agua dinámica y variante elegida"
```

---

# Parte B — Barcos

### Task 6: `hull` lofteado y `poly.facade`

**Files:**
- Modify: `src/iso/solids.ts`, `src/iso/solids.test.ts:95-115`

**Interfaces:**
- Produces: `Solid` `hull` = `{ kind: "hull"; at: Vec3; len; beam; h; mat; topMat?: Material; heading?: number; sheer?: number }` (sheer por defecto `0.25`); `poly` = `{ kind: "poly"; footprint; z; h; mat; facade?: Facade }`; `HULL_WATERLINE = 0.2`, `DECK_RING`, `hullRings(s): { deck: Vec3[]; keel: Vec3[] }`.
- Consumes: `facadeFaces`, `isWall` (ya existen).

- [ ] **Step 1: Tests** (reemplazar los dos tests de `hull` en `solids.test.ts`, líneas ~95–115, por estos; el resto queda)

```ts
  it("hull lofteado: proa en punta, popa redondeada, cubierta en deck, banda baja en mat y obra muerta en topMat, arrufo en la proa", () => {
    const s: Solid = { kind: "hull", at: v3(0, 0, 0), len: 20, beam: 4, h: 2, mat: "hull", topMat: "hullBlue" };
    const all = tessellateAll(s);
    expect(all).toHaveLength(2 + 10 * 4); // cubierta, base, 10 lados × (2 bandas × 2 triángulos)
    const deck = all.find((f) => f.normal.z > 0.99)!;
    expect(deck.mat).toBe("deck"); expect(deck.pts).toHaveLength(10);
    expect(Math.max(...deck.pts.map((p) => p.x))).toBeCloseTo(20, 6); // proa
    expect(Math.min(...deck.pts.map((p) => p.x))).toBeCloseTo(0, 6);  // popa
    expect(deck.pts.find((p) => p.x === 20)!.z).toBeCloseTo(2 * 1.25, 6); // arrufo de proa
    expect(deck.pts.find((p) => p.x === 0)!.z).toBeCloseTo(2 * 1.1, 6);  // arrufo de popa
    const sides = all.filter((f) => Math.abs(f.normal.z) < 0.99 && f.normal.z > -0.5);
    expect(sides.filter((f) => f.mat === "hull").length).toBe(20);
    expect(sides.filter((f) => f.mat === "hullBlue").length).toBe(20);
    const b = bounds(s);
    expect(b.min.x).toBeCloseTo(0, 6); expect(b.max.x).toBeCloseTo(20, 6);
    expect(b.min.y).toBeCloseTo(-2, 6); expect(b.max.y).toBeCloseTo(2, 6);
    expect(b.max.z).toBeCloseTo(2.5, 6);
    const mono = tessellateAll({ kind: "hull", at: v3(0, 0, 0), len: 20, beam: 4, h: 2, mat: "hull" });
    expect(mono.every((f) => f.mat === "hull")).toBe(true); // sin topMat: monocromo (astillero)
  });

  it("hull con heading π/2 tiene la proa al sur (+y) y gira alrededor de la popa", () => {
    const pts = tessellateAll({ kind: "hull", at: v3(10, 20, 0), len: 20, beam: 4, h: 2, mat: "hull", heading: Math.PI / 2 }).flatMap((f) => f.pts);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(40, 6);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(20, 6);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(8, 6);
  });

  it("poly con facade emite ventanas y losas sobre sus paredes", () => {
    const fp = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
    const plain = tessellateAll({ kind: "poly", footprint: fp, z: 0, h: 3, mat: "whitewash" });
    const withFacade = tessellateAll({ kind: "poly", footprint: fp, z: 0, h: 3, mat: "whitewash", facade: { floors: 1, cols: 2 } });
    expect(withFacade.length).toBeGreaterThan(plain.length);
    expect(withFacade.some((f) => f.mat === "glass")).toBe(true);
  });
```

- [ ] **Step 2: Correr** → `npx vitest run src/iso/solids.test.ts` FAIL.

- [ ] **Step 3: Implementar** en `solids.ts`

Tipos:

```ts
  | { kind: "poly"; footprint: Vec2[]; z: number; h: number; mat: Material; facade?: Facade }
  ...
  | { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material; topMat?: Material; heading?: number; sheer?: number }
```

Reemplazar `hullFootprint` por:

```ts
export const HULL_WATERLINE = 0.2, HULL_SHEER = 0.25, KEEL_BEAM = 0.7;
/** Anillo de cubierta en fracciones de eslora/manga: popa redondeada, manga máxima al 57 %, proa en punta. Sentido horario visto desde arriba. */
export const DECK_RING: readonly Vec2[] = [
  { x: 0.04, y: -0.3 }, { x: 0, y: 0 }, { x: 0.04, y: 0.3 }, { x: 0.18, y: 0.5 }, { x: 0.57, y: 0.5 },
  { x: 0.86, y: 0.3 }, { x: 1, y: 0 }, { x: 0.86, y: -0.3 }, { x: 0.57, y: -0.5 }, { x: 0.18, y: -0.5 },
];
/** Arrufo: cuánto sube la cubierta sobre `h` en cada punto (proa cuadrática, popa lineal más corta). */
const sheerAt = (x: number): number => Math.max(0, (x - 0.55) / 0.45) ** 2 + 0.4 * Math.max(0, (0.18 - x) / 0.18);

/** Anillos de cubierta y quilla en coordenadas de mundo (popa en `at`, proa a `len` según `heading`). */
export function hullRings(s: Solid & { kind: "hull" }): { deck: Vec3[]; keel: Vec3[] } {
  const c = Math.cos(s.heading ?? 0), sn = Math.sin(s.heading ?? 0), sheer = s.sheer ?? HULL_SHEER;
  const world = (fx: number, fy: number, z: number): Vec3 => { const x = fx * s.len, y = fy * s.beam; return v3(s.at.x + x * c - y * sn, s.at.y + x * sn + y * c, z); };
  const deck = DECK_RING.map((p) => world(p.x, p.y, s.at.z + s.h * (1 + sheer * sheerAt(p.x))));
  const keel = DECK_RING.map((p) => world(0.06 + 0.84 * p.x, p.y * KEEL_BEAM, s.at.z));
  return { deck, keel };
}

/** Casco lofteado entre quilla y cubierta: cada lado son dos cuadriláteros (obra viva en `mat`, obra muerta en `topMat`) partidos en triángulos. */
function hull(s: Solid & { kind: "hull" }): Face[] {
  const { deck, keel } = hullRings(s);
  const c = centroid([...deck, ...keel]);
  const top = s.topMat ?? s.mat, deckMat: Material = s.topMat ? "deck" : s.mat;
  const out = [face(deck, deckMat, c), face(keel, s.mat, c)];
  const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  const n = deck.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k0 = keel[i]!, k1 = keel[j]!, d0 = deck[i]!, d1 = deck[j]!, m0 = lerp(k0, d0, HULL_WATERLINE), m1 = lerp(k1, d1, HULL_WATERLINE);
    out.push(face([k0, k1, m1], s.mat, c), face([k0, m1, m0], s.mat, c));
    out.push(face([m0, m1, d1], top, c), face([m0, d1, d0], top, c));
  }
  return out;
}
```

En `tessellateAll`:

```ts
    case "poly": { const raw = extrude(s.footprint, s.z, s.h, s.mat); return s.facade ? raw.flatMap((f) => (isWall(f) ? [f, ...facadeFaces(f, s.facade!)] : [f])) : raw; }
    ...
    case "hull": return hull(s);
```

Nota sobre la prueba de los 20/20 lados: la quilla es más angosta que la cubierta, así que las caras de los lados tienen `normal.z` entre 0 y ~0.3 (positivo, mirando hacia arriba y afuera); el filtro `normal.z > −0.5` las incluye y excluye la base. Los triángulos de proa y popa cuentan igual (son lados del anillo).

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Los tests del astillero y del pecio (`shipyard.test.ts`, `sea.test.ts`) siguen verdes: solo usan `kind`, `heading` y `bounds`. Si `shipyard.test.ts` compara alturas máximas, el casco de la grada sube `h · 0.25` (1.0 u): ajustar ese número.

- [ ] **Step 5: Commit**

```bash
git add src/iso/solids.ts src/iso/solids.test.ts
git commit -m "feat(iso): casco lofteado con arrufo, línea de flotación y cubierta; poly con fachada"
```

### Task 7: Flota nueva y estelas (`ships.ts`)

**Files:**
- Modify: `src/scenes/ships.ts`, `src/scenes/ships.test.ts`, `src/scenes/sea.ts:91`, `src/scenes/sea.test.ts:11`, `src/scenes/sea-anim.ts` (estela)

**Interfaces:**
- Produces: `ShipKind = "cargo" | "tug" | "barge" | "ferry"`; `SHIP_SPECS[kind] = { len; beam; h; sheer; topMat }`; `ship(kind, at, heading): { solids: Solid[]; lights: Accent[] }`; `wake(kind, at, heading): Tri[]` (17 triángulos con `toneOffset`); `SHIP_MATS`.
- Consumes: `hull` con `topMat`/`sheer`, `poly.facade`.

- [ ] **Step 1: Tests** (reemplazar `ships.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { bounds, isFlat } from "../iso/solids";
import { SHIP_MATS, SHIP_SPECS, ship, wake, type ShipKind } from "./ships";

const KINDS: ShipKind[] = ["cargo", "tug", "barge", "ferry"];

describe("ships", () => {
  it("cada barco: casco con topMat y arrufo, ≤ 30 sólidos, ≤ 6 luces, todo dentro de la caja del casco (margen 2) y sobre la cubierta", () => {
    for (const kind of KINDS) {
      const s = ship(kind, { x: 100, y: 100 }, 0), spec = SHIP_SPECS[kind];
      const hull = s.solids.find((x) => x.kind === "hull")!;
      expect(hull).toMatchObject({ len: spec.len, beam: spec.beam, h: spec.h, sheer: spec.sheer, topMat: spec.topMat, mat: "hull", at: { x: 100, y: 100, z: -1 } });
      expect(s.solids.length).toBeLessThanOrEqual(30); expect(s.lights.length).toBeLessThanOrEqual(6);
      const x0 = kind === "barge" ? 100 - 10 : 100; // el empujador va detrás de la barcaza
      for (const x of s.solids) {
        const b = bounds(x);
        expect(b.min.x).toBeGreaterThanOrEqual(x0 - 2); expect(b.max.x).toBeLessThanOrEqual(100 + spec.len + 2);
        expect(b.min.y).toBeGreaterThanOrEqual(100 - spec.beam / 2 - 2); expect(b.max.y).toBeLessThanOrEqual(100 + spec.beam / 2 + 2);
        if (x.kind !== "hull" && !(x.kind === "cylinder" && x.r === 0.45)) expect(b.min.z).toBeGreaterThanOrEqual(-1 + spec.h - 0.01); // las defensas cuelgan del costado
        expect(SHIP_MATS).toContain(x.mat);
        expect(isFlat(x)).toBe(false);
      }
    }
  });
  it("carguero: tres escotillas, superestructura con ventanas, chimenea con tapa, dos grúas; proa según heading", () => {
    const s = ship("cargo", { x: 0, y: 0 }, 0);
    expect(s.solids.filter((x) => x.kind === "poly" && x.mat === "rust" && x.h === 1.2)).toHaveLength(3);
    expect(s.solids.filter((x) => x.kind === "poly" && x.facade).length).toBeGreaterThanOrEqual(4);
    expect(s.solids.filter((x) => x.kind === "cylinder")).toHaveLength(2);
    expect(s.solids.filter((x) => x.kind === "poly" && x.mat === "steel" && x.h === 8)).toHaveLength(2); // kingposts
    expect(s.lights.slice(0, 3).map((l) => l.color)).toEqual(["magentaMid", "magenta", "cyanMid"]);
    const south = ship("cargo", { x: 100, y: 100 }, Math.PI / 2);
    expect(Math.max(...south.solids.map((x) => bounds(x).max.y))).toBeCloseTo(160, 6);
  });
  it("remolcador con defensas y timonera; barcaza con diez contenedores (seis dobles) y empujador; lancha de dos cubiertas", () => {
    const tug = ship("tug", { x: 0, y: 0 }, 0);
    expect(tug.solids.filter((x) => x.kind === "cylinder" && x.r === 0.45)).toHaveLength(6);
    expect(tug.solids.some((x) => x.kind === "poly" && x.mat === "whitewash" && x.facade?.base === "glass")).toBe(true);
    const barge = ship("barge", { x: 0, y: 0 }, 0);
    expect(barge.solids.filter((x) => x.kind === "poly" && x.h === 2.6 && (x.mat === "rust" || x.mat === "steel"))).toHaveLength(16);
    expect(barge.solids.filter((x) => x.kind === "hull")).toHaveLength(2);
    const ferry = ship("ferry", { x: 0, y: 0 }, 0);
    expect(ferry.solids.filter((x) => x.kind === "poly" && x.mat === "whitewash" && x.facade)).toHaveLength(2);
    expect(ferry.lights.some((l) => l.color === "amber")).toBe(true);
  });
  it("la estela son 17 triángulos detrás y a los lados del casco, con la ola de proa más clara", () => {
    for (const kind of KINDS) {
      const w = wake(kind, { x: 0, y: 0 }, 0);
      expect(w).toHaveLength(17);
      expect(w.filter((t) => t.toneOffset === 1).length).toBeGreaterThanOrEqual(2);
      for (const t of w) for (const p of t.pts) { expect(p.z).toBeCloseTo(-0.95, 6); expect(p.x).toBeLessThanOrEqual(SHIP_SPECS[kind].len + 0.01); }
    }
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `ships.ts`** (reemplazar el archivo)

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2 } from "../iso/geometry";
import type { Facade } from "../iso/facade";
import type { Solid, Tri } from "../iso/solids";
import type { Material } from "../map/palette-iso";

/**
 * Flota: casco lofteado (`hull` con obra muerta `topMat` y arrufo) más
 * superestructuras como `poly` con huella rotada y fachada (ventanas),
 * chimeneas y mástiles como cilindros y cajas. Popa en `at`, sobre el agua
 * (z −1). Luces: mástil magentaMid, babor magenta, estribor cyanMid; la
 * lancha de la feria suma una ámbar. `wake` arma la estela de espuma.
 */
export type ShipKind = "cargo" | "tug" | "barge" | "ferry";
export interface ShipSpec { len: number; beam: number; h: number; sheer: number; topMat: Material }
export const SHIP_SPECS: Record<ShipKind, ShipSpec> = {
  cargo: { len: 60, beam: 10, h: 5, sheer: 0.25, topMat: "hullBlue" },
  tug: { len: 18, beam: 6, h: 3, sheer: 0.35, topMat: "hullBlue" },
  barge: { len: 40, beam: 9, h: 2, sheer: 0, topMat: "rust" },
  ferry: { len: 26, beam: 7, h: 3, sheer: 0.2, topMat: "whitewash" },
};
export const SHIP_MATS: readonly Material[] = ["hull", "hullBlue", "whitewash", "steel", "rust", "deck", "glass"];
const WATER_Z = -1, WAKE_Z = -0.95;
const BRIDGE: Facade = { floors: 1, cols: 3, window: { w: 0.5, h: 0.5 } };

interface Kit {
  hull: (dx: number, len: number, beam: number, h: number, sheer: number, topMat: Material) => Solid;
  box: (dx: number, dy: number, w: number, d: number, z: number, h: number, mat: Material, facade?: Facade) => Solid;
  cyl: (dx: number, dy: number, z: number, r: number, h: number, mat: Material) => Solid;
  dot: (dx: number, dy: number, z: number, r: number, color: Accent["color"]) => Accent;
  poly: (pts: [number, number, number][], color: Accent["color"], alpha: number) => Accent;
}

/** Piezas en coordenadas locales del barco (x a proa, y a estribor), rotadas por `heading`. */
function kit(at: Vec2, heading: number): Kit {
  const c = Math.cos(heading), s = Math.sin(heading);
  const local = (dx: number, dy: number) => ({ x: at.x + dx * c - dy * s, y: at.y + dx * s + dy * c });
  return {
    hull: (dx, len, beam, h, sheer, topMat) => { const p = local(dx, 0); return { kind: "hull", at: v3(p.x, p.y, WATER_Z), len, beam, h, mat: "hull", topMat, heading, sheer }; },
    box: (dx, dy, w, d, z, h, mat, facade) => ({ kind: "poly", footprint: [local(dx, dy), local(dx + w, dy), local(dx + w, dy + d), local(dx, dy + d)], z, h, mat, ...(facade ? { facade } : {}) }),
    cyl: (dx, dy, z, r, h, mat) => { const p = local(dx, dy); return { kind: "cylinder", at: v3(p.x, p.y, z), r, h, mat, sides: 8 }; },
    dot: (dx, dy, z, r, color) => { const p = local(dx, dy); return { kind: "dot", at: v3(p.x, p.y, z), r, color }; },
    poly: (pts, color, alpha) => ({ kind: "poly", pts: pts.map(([dx, dy, z]) => { const p = local(dx, dy); return v3(p.x, p.y, z); }), color, alpha }),
  };
}

function cargo(k: Kit, spec: ShipSpec, solids: Solid[], lights: Accent[]): void {
  const deck = WATER_Z + spec.h;
  for (const dx of [8, 18, 28]) solids.push(k.box(dx, -3, 9, 6, deck, 1.2, "rust")); // escotillas
  solids.push(k.box(54, -3.5, 6, 7, deck, 1.2, "hullBlue")); // castillo de proa
  solids.push(k.box(40, -4, 10, 8, deck, 2.4, "whitewash", BRIDGE), k.box(40.5, -3.5, 9, 7, deck + 2.4, 2.4, "whitewash", BRIDGE), k.box(41, -3, 8, 6, deck + 4.8, 2.4, "whitewash", BRIDGE));
  solids.push(k.box(46, -6, 4, 12, deck + 7.2, 2.2, "whitewash", { floors: 1, cols: 4, base: "glass" })); // puente con alerones
  solids.push(k.cyl(43, 0, deck + 7.2, 1.4, 4, "rust"), k.cyl(43, 0, deck + 11.2, 1.6, 0.6, "steel")); // chimenea y tapa
  solids.push(k.box(56, -0.2, 0.4, 0.4, deck + 1.2, 7, "steel"), k.box(54.5, -0.15, 3, 0.3, deck + 7.5, 0.3, "steel")); // mástil y cruceta
  for (const dx of [16, 36]) { solids.push(k.box(dx, 3.2, 0.8, 0.8, deck, 8, "steel")); solids.push(k.box(dx + 0.8, 3.3, 7, 0.6, deck + 6.5, 0.6, "steel")); } // grúas de cubierta
  lights.push(k.dot(56.2, 0, deck + 8.5, 0.7, "magentaMid"), k.dot(46, -6, deck + 9.4, 0.4, "magenta"), k.dot(46, 6, deck + 9.4, 0.4, "cyanMid"));
  lights.push(k.poly([[50.02, -5, deck + 7.6], [50.02, 5, deck + 7.6], [50.02, 5, deck + 8.8], [50.02, -5, deck + 8.8]], "magentaBleed", 0.8)); // ventanas del puente encendidas, cara de proa
}

function tug(k: Kit, spec: ShipSpec, solids: Solid[], lights: Accent[]): void {
  const deck = WATER_Z + spec.h;
  solids.push(k.box(5, -1.75, 4, 3.5, deck, 2.6, "whitewash", { floors: 1, cols: 3, base: "glass" }), k.box(4.8, -1.95, 4.4, 3.9, deck + 2.6, 0.3, "steel"));
  solids.push(k.cyl(3.5, 0, deck, 0.9, 2.5, "rust"));
  solids.push(k.box(9.5, -0.15, 0.3, 0.3, deck + 2.9, 3.5, "steel"));
  for (const dx of [4, 8, 12]) for (const dy of [-2.9, 2.9]) solids.push(k.cyl(dx, dy, deck - 0.6, 0.45, 0.9, "rust")); // defensas
  solids.push(k.cyl(1.5, 0, deck, 0.4, 0.8, "steel")); // bita
  solids.push(k.box(16.5, -0.3, 1, 0.6, deck + 0.4, 0.6, "rust")); // pudding de proa
  lights.push(k.dot(9.65, 0, deck + 6.6, 0.7, "magentaMid"), k.dot(12, -3, deck + 0.4, 0.4, "magenta"), k.dot(12, 3, deck + 0.4, 0.4, "cyanMid"));
}

function barge(k: Kit, spec: ShipSpec, solids: Solid[], lights: Accent[]): void {
  const deck = WATER_Z + spec.h;
  for (let i = 0; i < 5; i++) for (const dy of [-2.6, 0.2]) {
    solids.push(k.box(4 + i * 7, dy, 6, 2.4, deck, 2.6, (i + (dy > 0 ? 1 : 0)) % 2 === 0 ? "rust" : "steel"));
    if (i >= 1 && i <= 3) solids.push(k.box(4 + i * 7, dy, 6, 2.4, deck + 2.6, 2.6, (i + (dy > 0 ? 0 : 1)) % 2 === 0 ? "rust" : "steel"));
  }
  solids.push(k.hull(-10, 10, 5, 2.6, 0.2, "hullBlue")); // empujador pegado a la popa
  const pDeck = WATER_Z + 2.6;
  solids.push(k.box(-6, -1.3, 2.6, 2.6, pDeck, 3, "whitewash", { floors: 1, cols: 2, base: "glass" }), k.cyl(-7.5, 0, pDeck, 0.6, 1.8, "rust"));
  lights.push(k.dot(-4.7, 0, pDeck + 3.3, 0.7, "magentaMid"), k.dot(-6, -2.5, pDeck, 0.4, "magenta"), k.dot(-6, 2.5, pDeck, 0.4, "cyanMid"));
}

function ferry(k: Kit, spec: ShipSpec, solids: Solid[], lights: Accent[]): void {
  const deck = WATER_Z + spec.h;
  solids.push(k.box(3, -3, 20, 6, deck, 2.4, "whitewash", { floors: 1, cols: 6, base: "glass" }));
  solids.push(k.box(6, -2.5, 12, 5, deck + 2.4, 2.2, "whitewash", { floors: 1, cols: 4, base: "glass" }));
  solids.push(k.cyl(8, 0, deck + 4.6, 0.7, 2, "rust"), k.box(15, -0.15, 0.3, 0.3, deck + 4.6, 3, "steel"));
  lights.push(k.dot(15.15, 0, deck + 7.8, 0.7, "magentaMid"), k.dot(22, -3, deck, 0.4, "magenta"), k.dot(22, 3, deck, 0.4, "cyanMid"), k.dot(12, 0, deck + 5, 0.9, "amber"));
}

const BUILD: Record<ShipKind, (k: Kit, spec: ShipSpec, solids: Solid[], lights: Accent[]) => void> = { cargo, tug, barge, ferry };

export function ship(kind: ShipKind, at: Vec2, heading: number): { solids: Solid[]; lights: Accent[] } {
  const spec = SHIP_SPECS[kind], k = kit(at, heading);
  const solids: Solid[] = [k.hull(0, spec.len, spec.beam, spec.h, spec.sheer, spec.topMat)];
  const lights: Accent[] = [];
  BUILD[kind](k, spec, solids, lights);
  return { solids, lights };
}

/** Estela: ola de proa (2, más clara), V de 6 triángulos finos por banda desde el 80 % de la eslora hacia atrás, remolino de popa (3). 17 triángulos a z −0.95. */
export function wake(kind: ShipKind, at: Vec2, heading: number): Tri[] {
  const { len, beam } = SHIP_SPECS[kind], half = beam / 2;
  const c = Math.cos(heading), s = Math.sin(heading);
  const p = (dx: number, dy: number) => v3(at.x + dx * c - dy * s, at.y + dx * s + dy * c, WAKE_Z);
  const tri = (a: [number, number], b: [number, number], d: [number, number], toneOffset = 0): Tri => ({ pts: [p(...a), p(...b), p(...d)], toneOffset });
  const out: Tri[] = [tri([len, 0], [len - 3, -half - 1.2], [len - 3, -half], 1), tri([len, 0], [len - 3, half], [len - 3, half + 1.2], 1)];
  const spread = Math.tan((12 * Math.PI) / 180), stern = kind === "barge" ? -10 : 0, tail = stern - 0.4 * len;
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const x0 = len * 0.8 - ((len * 0.8 - tail) * i) / 6, x1 = len * 0.8 - ((len * 0.8 - tail) * (i + 1)) / 6;
    const y0 = side * (half + (len * 0.8 - x0) * spread), y1 = side * (half + (len * 0.8 - x1) * spread);
    out.push(tri([x0, y0], [x1, y1], [x1, y1 + side * 0.8], i === 0 ? 1 : 0));
  }
  for (const [l, w] of [[3, 1.2], [5, 2], [7, 2.8]] as const) out.push(tri([stern, 0], [stern - l, -w], [stern - l, w]));
  return out;
}
```

En `sea.ts:91` el pecio: `{ kind: "hull", ..., mat: "hull", topMat: "rust", heading: WRECK.heading }`; en `sea.test.ts:11` agregar `"deck"` a `SEA_MATS`.

En `sea-anim.ts`, `shipFrame`: reemplazar el cálculo de `wake` por `const wakeTris = wake(SHIPS[k]!.kind, p, p.heading);` y devolver `wake: [{ kind: "ground", mat: "foam", tris: wakeTris }]` (importar `wake` de `./ships`; borrar el helper `local` de la estela vieja).

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Si `sea-anim.test.ts` cuenta triángulos de estela (4), actualizar a 17. Si el test de profundidad de la ruta (`ROUTE` contra sólidos estáticos) falla, la causa es la caja del casco (solo cambió en z: `h · 1.25`); `isBehind` compara también z, así que un sólido estático bajo que se superponga en pantalla puede pasar a "adelante": revisar cuál es antes de mover nada; si es la boya `BUOYS[0]`, correr la boya 6 u al norte (`y 74`), no la ruta.

- [ ] **Step 5: Mirar** `world.html` tecla `3` con captura y recorte de los barcos: proa en punta, dos colores de casco, ventanas en la superestructura, estela en V.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ships.ts src/scenes/ships.test.ts src/scenes/sea.ts src/scenes/sea.test.ts src/scenes/sea-anim.ts src/scenes/sea-anim.test.ts
git commit -m "feat(scenes): flota con casco lofteado, superestructuras con ventanas, empujador de la barcaza, lancha y estelas en V"
```

### Task 8: La lancha de la feria en `sea-anim.ts`

**Files:**
- Modify: `src/scenes/sea-anim.ts`, `src/scenes/sea-anim.test.ts`, `src/scenes/sea-animator.ts`, `src/scenes/sea-animator.test.ts`

**Interfaces:**
- Produces: `FERRY_ROUTE: readonly [Vec2, Vec2] = [{ x: 248, y: −288 }, { x: 229, y: −84 }]` (punta del futuro muelle de la feria y orilla de la bahía frente al muelle de graneles; ambos puntos están en agua hoy: `bayWater`), `FERRY_SPEED = 3`, `FERRY_PAUSE_MS = 4000`; `SeaAnim.ferry(): ShipFrame` (alpha 1 siempre); `SeaChanges.ferry: boolean`; capas `sea.ferry`, `sea.ferryWake`, `sea.ferryLights`.

- [ ] **Step 1: Tests** (agregar a `sea-anim.test.ts`)

```ts
  it("la lancha va del muelle de la feria al de graneles y vuelve, parando 4 s en cada punta, siempre sobre agua y nunca detrás de un sólido estático", () => {
    const { anim } = setup(false);
    const [a, b] = FERRY_ROUTE, L = Math.hypot(b.x - a.x, b.y - a.y);
    const f0 = anim.ferry();
    expect(f0.alpha).toBe(1);
    const hull0 = f0.solids.find((s) => s.kind === "hull")!;
    expect(hull0.kind === "hull" && hull0.at).toMatchObject({ x: a.x, y: a.y });
    anim.tick(FERRY_PAUSE_MS + 100); // arranca
    const seen: { x: number; y: number }[] = [];
    for (let t = 0; t < (2 * L) / FERRY_SPEED + 10; t += 1) { anim.tick(1000); const h = anim.ferry().solids.find((s) => s.kind === "hull")!; if (h.kind === "hull") seen.push({ x: h.at.x, y: h.at.y }); }
    expect(seen.some((p) => Math.hypot(p.x - b.x, p.y - b.y) < FERRY_SPEED)).toBe(true); // llegó al otro muelle
    expect(seen.some((p) => Math.hypot(p.x - a.x, p.y - a.y) < FERRY_SPEED)).toBe(true); // y volvió
    for (const p of seen) expect(depthAt(p.x, p.y)).toBeGreaterThanOrEqual(6);
    const statics = world(7).solids.filter((s) => !isFlat(s));
    for (let t = 0; t <= 1; t += 0.05) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const box = bounds({ kind: "hull", at: v3(p.x, p.y, -1), len: 26, beam: 7, h: 3, mat: "hull" });
      for (const s of statics) { const sb = bounds(s); if (overlaps(screenBounds(box), screenBounds(sb))) expect(isBehind(box, sb)).toBe(false); }
    }
  });
```

Imports: `FERRY_ROUTE, FERRY_SPEED, FERRY_PAUSE_MS` de `./sea-anim`; `depthAt` de `./depth-map`; `bounds, isFlat` de `../iso/solids`; `isBehind, overlaps, screenBounds` de `../iso/depth`; `v3` de `../iso/geometry`; `world` de `./world`. En `sea-animator.test.ts` sumar `"sea.ferry", "sea.ferryWake", "sea.ferryLights"` a los ids esperados.

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar** en `sea-anim.ts`

```ts
export const FERRY_ROUTE: readonly [Vec2, Vec2] = [{ x: 248, y: -288 }, { x: 229, y: -84 }];
export const FERRY_SPEED = 3, FERRY_PAUSE_MS = 4000;
```

Estado dentro de `createSeaAnim`:

```ts
  const [fa, fb] = FERRY_ROUTE, ferryLen = Math.hypot(fb.x - fa.x, fb.y - fa.y);
  const ferryHeadings = [Math.atan2(fb.y - fa.y, fb.x - fa.x), Math.atan2(fa.y - fb.y, fa.x - fb.x)] as const;
  let ferryDist = 0, ferryDir = 1, ferryPause = FERRY_PAUSE_MS;
  const ferryFrame = (): ShipFrame => {
    const t = ferryDist / ferryLen, p = { x: fa.x + (fb.x - fa.x) * t, y: fa.y + (fb.y - fa.y) * t }, heading = ferryDir > 0 ? ferryHeadings[0] : ferryHeadings[1];
    const built = buildShip("ferry", p, heading);
    return { solids: built.solids, lights: built.lights, wake: [{ kind: "ground", mat: "foam", tris: wake("ferry", p, heading) }], alpha: 1 };
  };
```

En `tick`, después de mover los barcos:

```ts
      if (ferryPause > 0) ferryPause -= dtMs;
      else {
        ferryDist += (ferryDir * FERRY_SPEED * dtMs) / 1000; c.ferry = true;
        if (ferryDist >= ferryLen) { ferryDist = ferryLen; ferryDir = -1; ferryPause = FERRY_PAUSE_MS; }
        else if (ferryDist <= 0) { ferryDist = 0; ferryDir = 1; ferryPause = FERRY_PAUSE_MS; }
      }
```

`SeaChanges` gana `ferry: boolean` (false en `none`); exponer `ferry: ferryFrame`. Con `reducedMotion`, frame 0 = en el muelle de la feria, proa al sur.

En `sea-animator.ts`: `layers["sea.ferry"] = () => { const f = anim.ferry(); return { kind: "solid", solids: f.solids }; }`, `sea.ferryWake` (`water`, `f.wake`), `sea.ferryLights` (`accent`, `f.lights`); en `tick`, si `c.ferry` agregar los tres ids.

- [ ] **Step 4: Correr `npm test`**. Si falla la aserción de "nunca detrás": correr los dos extremos de la ruta hacia el este de a 6 u en x y volver a probar (el sur puede quedar en `(235, −84)`). No sacar la lancha.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sea-anim.ts src/scenes/sea-anim.test.ts src/scenes/sea-animator.ts src/scenes/sea-animator.test.ts
git commit -m "feat(scenes): la lancha de la feria va y viene por la bahía"
```

### Task 9: Medición de los barcos

- [ ] **Step 1: Medir** `world.html` como en la Task 5 (peor redibujo). Los barcos se redibujan cada tick; si el peor redibujo supera 15 ms y el agua ya está en su variante final, agregar `SHIP_STEP_MS = 66` a `sea-anim.ts`: `tick` acumula `dtMs` en `shipClock` y solo marca `ships`/`ferry` cuando cruza un múltiplo de `SHIP_STEP_MS` (los `dists` siguen avanzando con el `dtMs` real). Test: dos `tick(20)` seguidos devuelven `ships: false` y el cuarto `true`.

- [ ] **Step 2: Anotar** las cifras en la spec (Desvíos) y commitear con `docs:`.

---

# Parte C — Distrito tecnológico (reemplaza al suburbio)

### Task 10: `campus()` compartido y manzanas del distrito tecnológico

**Files:**
- Modify: `src/scenes/city-pieces.ts`, `src/scenes/district.ts` (borrar `campus`, importarlo)
- Create: `src/scenes/tech.ts`, `src/scenes/tech.test.ts`

**Interfaces:**
- Produces (`city-pieces.ts`): `campus(out: Solid[], ground: Solid[], accents: Accent[], rng: Rng, r: Rect, x: number, y: number, w: number, d: number): void` (la función de `district.ts` tal cual, con `r: Rect` en vez de `b: Block`; `tiles(rng, r, ...)` ya acepta `Rect`).
- Produces (`tech.ts`): `TechScene { ground; solids; accents; towers: Tower[]; signs: Accent[]; telecom: Vec3 }` con `Tower = { box: Solid & { kind: "prism" }; facade: Facade }` (el cuerpo principal de cada torre, para las ventanas animadas); `TOWER_D = 60`, `CAMPUS_D = 160`, `MAX_TECH_H = 20`, `TELECOM = { x: −114, y: 242 }`, `ARENA = { x: 102, y: 448 }`, `AUDITORIUM = { x: 12, y: 352 }`, `TECH_MATS`; `tech(rng): TechScene`.
- Consumes: `suburbBlocks`, `SprawlBlock`, `SUBURB_COLS`, `REACH`, `GREEN_BELT` (`sprawl-grid.ts`); `prism`, `tiles`, `lamp`, `plazaTone`, `brokenTone`, `PLINTH_H` (`city-pieces.ts`); `jungle` (`flora.ts`); `BOULEVARD`, `BLOCK_W`, `CITY_EDGE`, `SIDEWALK`, `WEST_QUAY` (`city-grid.ts`).

- [ ] **Step 1: Mover `campus`**

Cortar la función `campus` de `district.ts` (con su comentario) y pegarla en `city-pieces.ts` como `export function campus(out, ground, accents, rng, r: Rect, x, y, w, d)`; en `district.ts` importar `campus` de `./city-pieces` y llamarla igual (`campus(solids, ground, accents, rng, b, ix, iy, iw, id)`). `city-pieces.ts` necesita importar `Accent`, `Rng`, `Rect`, `jungle` no (campus usa conos sueltos). Correr `npm test` → PASS sin cambios (los tests del distrito no miran de dónde viene `campus`). Commit `refactor(scenes): campus() en city-pieces para compartirlo con el distrito tecnológico`.

- [ ] **Step 2: Test de `tech.ts`**

```ts
import { describe, expect, it } from "vitest";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { WORLD, ZONE_SPLIT_Y, worldZoneAt } from "../map/geo";
import type { Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { suburbBlocks } from "./sprawl-grid";
import { ARENA, AUDITORIUM, MAX_TECH_H, TECH_MATS, TELECOM, tech } from "./tech";
import { bleedTerrainAt, terrainAt } from "./terrain";

const scene = () => tech(createRng(7));
const groundAt = (x: number, y: number) => (x >= WORLD.x0 && x < WORLD.x1 && y >= WORLD.y0 && y < WORLD.y1 ? terrainAt(x, y) : bleedTerrainAt(x, y));
const inBlock = (x: Solid, b: { x: number; y: number }) => { const bb = bounds(x); return bb.min.x >= b.x - 0.5 && bb.max.x <= b.x + 24.5 && bb.min.y >= b.y - 0.5 && bb.max.y <= b.y + 18.5; };

describe("tech", () => {
  it("es determinístico, cae en Resume con materiales del distrito y dentro del presupuesto", () => {
    expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    const s = scene();
    const raised = s.solids.filter((x) => !isFlat(x));
    expect(raised.length).toBeGreaterThan(400); expect(raised.length).toBeLessThan(1200);
    for (const x of s.solids) {
      const b = bounds(x);
      expect(b.min.y).toBeGreaterThanOrEqual(ZONE_SPLIT_Y);
      expect(worldZoneAt(b.min.x, b.min.y)).toBe("cv");
      expect(TECH_MATS).toContain(x.mat);
    }
  });

  it("nada apoya en agua; nada no esbelto supera MAX_TECH_H + zócalo", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (x.kind !== "cone") expect(["water", "river", "sea", "shore", "abyss"]).not.toContain(groundAt(b.min.x, b.min.y));
      const slender = (x.kind === "prism" && x.w <= 3 && x.d <= 3) || (x.kind === "cylinder" && x.r <= 3);
      if (!slender) expect(b.max.z).toBeLessThanOrEqual(MAX_TECH_H + 1.5);
    }
  });

  it("todo edificio tiene ventanas: cada prisma de altura ≥ 3 lleva fachada, salvo remates, cornisas y equipos", () => {
    const s = scene();
    const buildings = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.h >= 3 && x.w >= 4 && x.d >= 4 && x.mat !== "leafDark" && x.mat !== "paving" && x.mat !== "plaza");
    expect(buildings.length).toBeGreaterThan(80);
    for (const b of buildings) expect(b.facade).toBeDefined();
  });

  it("torres cerca del contenido, campus en el medio, laboratorios con paneles solares lejos; parques", () => {
    const s = scene();
    const near = suburbBlocks().filter((b) => b.dist < 60), far = suburbBlocks().filter((b) => b.dist >= 160);
    expect(near.length).toBeGreaterThan(5); expect(far.length).toBeGreaterThan(5);
    expect(s.towers.length).toBeGreaterThanOrEqual(near.length * 0.6);
    for (const t of s.towers) { expect(t.box.mat).toBe("curtain"); expect(t.box.h).toBeGreaterThanOrEqual(12); expect(t.box.h).toBeLessThanOrEqual(MAX_TECH_H); }
    expect(s.solids.filter((x) => x.kind === "ramp" && x.mat === "glass").length).toBeGreaterThan(40); // paneles solares
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "officeDark" && x.h === 5 && x.w === 20).length).toBeGreaterThan(3); // naves de laboratorio
    expect(s.ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThan(5); // parques y campus
    expect(s.signs.length).toBeGreaterThan(10);
    for (const a of s.signs) expect(a.kind === "poly" && a.color).toBe("amber");
  });

  it("hitos: torre de telecomunicaciones con tres platos, arena con torres de luz, auditorio de vidrio con cubierta de cobre; avenida y muro de ribera", () => {
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.mat === "steel" && x.h === 0.4 && inBlock(x, TELECOM))).toHaveLength(3);
    expect(s.telecom.z).toBeGreaterThan(20);
    expect(s.solids.some((x) => x.kind === "poly" && x.mat === "stone" && inBlock(x, ARENA))).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 12 && x.mat === "steel" && inBlock(x, ARENA))).toHaveLength(4);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "curtain" && x.sides === 12 && inBlock(x, AUDITORIUM))).toBe(true);
    expect(s.solids.some((x) => x.kind === "cone" && x.mat === "copper" && inBlock(x, AUDITORIUM))).toBe(true);
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "plaza" && x.at.z === -1 && x.d > 200)).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "leafDark" && x.h === 0.3 && x.w === 24).length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 3: Correr** → FAIL (módulo inexistente).

- [ ] **Step 4: Implementar `tech.ts`**

```ts
import type { Accent } from "../iso/accent";
import type { Facade } from "../iso/facade";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { WORLD, ZONE_SPLIT_Y } from "../map/geo";
import { BLOCK_W, BOULEVARD, CITY_EDGE, SIDEWALK, WEST_QUAY } from "./city-grid";
import { PLINTH_H, brokenTone, campus, lamp, plazaTone, prism, tiles } from "./city-pieces";
import { jungle } from "./flora";
import { GREEN_BELT, REACH, SUBURB_COLS, suburbBlocks, type SprawlBlock } from "./sprawl-grid";

/**
 * Distrito tecnológico de Resume: la ciudad sigue hacia el oeste y el sur del
 * distrito sobre la misma grilla, como un parque de oficinas y campus: torres
 * de muro cortina cerca del contenido, campus de startups después, naves de
 * laboratorio y centros de datos con paneles solares al final. Tres hitos:
 * torre de telecomunicaciones, arena, auditorio. Todo edificio tiene fachada.
 * Solo existe con el mundo entero (vive sobre el sangrado).
 * Spec: docs/superpowers/specs/2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md §3.
 */
export interface Tower { box: Solid & { kind: "prism" }; facade: Facade }
export interface TechScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; towers: Tower[]; signs: Accent[]; telecom: Vec3 }

export const TOWER_D = 60, CAMPUS_D = 160;
export const MAX_TECH_H = 20;
export const TELECOM = { x: -114, y: 242 } as const;
export const ARENA = { x: 102, y: 448 } as const;
export const AUDITORIUM = { x: 12, y: 352 } as const;
export const TECH_MATS: readonly Material[] = ["office", "officeDark", "glass", "curtain", "paving", "plaza", "stone", "copper", "concrete", "leaf", "leafDark", "steel", "rust"];
const CURTAIN_WINDOW = { w: 0.85, h: 0.8 } as const;
const LAB_FACADE: Facade = { floors: 1, cols: 1, base: "glass" };

type Kind = "tower" | "campus" | "atrium" | "lab" | "park" | "telecom" | "arena" | "auditorium";

const strip = (path: Vec2[], width: number, z: number, mat: Material): Solid => ({ kind: "strip", path, width, z, mat });

function pickKind(rng: Rng, b: SprawlBlock): Kind {
  if (b.x === TELECOM.x && b.y === TELECOM.y) return "telecom";
  if (b.x === ARENA.x && b.y === ARENA.y) return "arena";
  if (b.x === AUDITORIUM.x && b.y === AUDITORIUM.y) return "auditorium";
  if (rng.chance(0.12)) return "park";
  if (b.dist < TOWER_D) return "tower";
  if (b.dist < CAMPUS_D) return rng.chance(0.5) ? "campus" : "atrium";
  return "lab";
}

/** Cartel luminoso: caja oscura con un poly ámbar en su cara sur. Devuelve el acento para animarlo. */
function sign(out: Solid[], x: number, y: number, z: number, w: number, h: number): Accent {
  out.push(prism(x, y, z, w, 0.4, h, "officeDark"));
  return { kind: "poly", pts: [v3(x + 0.3, y + 0.42, z + 0.2), v3(x + w - 0.3, y + 0.42, z + 0.2), v3(x + w - 0.3, y + 0.42, z + h - 0.2), v3(x + 0.3, y + 0.42, z + h - 0.2)], color: "amber", alpha: 1 };
}

/** Torre de muro cortina en uno o dos cuerpos, con helipuerto o terraza verde y cartel de azotea. */
function tower(out: Solid[], accents: Accent[], signs: Accent[], towers: Tower[], rng: Rng, b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const h = rng.int(12, MAX_TECH_H), bw = rng.int(12, 16), bd = rng.int(10, 13);
  const bx = b.x + (b.w - bw) / 2, by = b.y + (b.d - bd) / 2;
  const tiers = rng.chance(0.5) ? 2 : 1, th0 = tiers === 2 ? Math.round(h * 0.7) : h;
  const facade: Facade = { floors: Math.max(2, Math.round(th0 / 3)), cols: Math.max(2, Math.round(bw / 2.5)), window: CURTAIN_WINDOW, base: "glass" };
  const box = prism(bx, by, PLINTH_H, bw, bd, th0, "curtain", { facade });
  out.push(box); towers.push({ box, facade });
  out.push(prism(bx - 0.3, by - 0.3, PLINTH_H + th0, bw + 0.6, bd + 0.6, 0.3, "officeDark"));
  let z = PLINTH_H + th0 + 0.3, tw = bw, td = bd, tx = bx, ty = by;
  if (tiers === 2) {
    const th1 = h - th0; tw = bw - 4; td = bd - 4; tx = bx + 2; ty = by + 2;
    out.push(prism(tx, ty, z, tw, td, th1, "curtain", { facade: { floors: Math.max(1, Math.round(th1 / 3)), cols: Math.max(2, Math.round(tw / 2.5)), window: CURTAIN_WINDOW } }));
    out.push(prism(tx - 0.3, ty - 0.3, z + th1, tw + 0.6, td + 0.6, 0.3, "officeDark"));
    z += th1 + 0.3;
  }
  if (rng.chance(0.5)) { out.push({ kind: "cylinder", at: v3(tx + tw / 2, ty + td / 2, z), r: 2.5, h: 0.3, mat: "paving", sides: 8 }); accents.push({ kind: "dot", at: v3(tx + tw / 2, ty + td / 2, z + 0.3), r: 0.6, color: "amberMid" }); }
  else { out.push(prism(tx + 0.5, ty + 0.5, z, tw - 1, td - 1, 0.3, "leafDark")); for (let k = 0, n = rng.int(3, 5); k < n; k++) out.push({ kind: "cone", at: v3(tx + 1.5 + rng.next() * (tw - 3), ty + 1.5 + rng.next() * (td - 3), z + 0.3), r: 1, h: 2, mat: "leaf" }); }
  signs.push(sign(out, tx + tw / 2 - 3, ty + td - 0.4, z, 6, 1.6)); // cartel de azotea en el borde sur
  if (h >= 18) accents.push({ kind: "dot", at: v3(tx + tw, ty, z + 0.5), r: 0.5, color: "amberMid" });
  if (rng.chance(0.5)) lamp(out, accents, b.x + b.w - 1, b.y - 1.5, 0);
}

/** Atrio: dos losas de muro cortina unidas por un atrio de vidrio más bajo, sobre una plaza de baldosas con cartel de pie. */
function atrium(out: Solid[], ground: Solid[], signs: Accent[], rng: Rng, b: SprawlBlock): void {
  ground.push(tiles(rng, b, 0.05, "plaza", plazaTone));
  const ix = b.x + SIDEWALK + 0.5, iy = b.y + SIDEWALK, h = rng.int(6, 9);
  const facade: Facade = { floors: Math.max(2, Math.round(h / 3)), cols: 3, window: CURTAIN_WINDOW, base: "glass" };
  out.push(prism(ix, iy, 0.05, 9, 13, PLINTH_H, "paving"), prism(ix + 12, iy, 0.05, 9, 13, PLINTH_H, "paving"));
  out.push(prism(ix, iy, PLINTH_H, 9, 13, h, "curtain", { facade }), prism(ix + 12, iy, PLINTH_H, 9, 13, h, "curtain", { facade }));
  out.push(prism(ix + 9, iy + 1, PLINTH_H, 3, 11, 4, "glass", { facade: { floors: 1, cols: 1, base: "glass" } }));
  for (const [dx, dy] of [[2, 15], [19, 15], [8, 16], [13, 16]] as const) out.push({ kind: "cone", at: v3(b.x + dx, b.y + dy, 0.05), r: 1.1, h: 2.5, mat: "leaf" });
  out.push(prism(b.x + b.w - 5, b.y + b.d - 3, 0.05, 0.4, 0.4, 2, "officeDark"));
  signs.push(sign(out, b.x + b.w - 6.3, b.y + b.d - 3, 2.05, 3, 1.2)); // cartel de pie
}

/** Nave de laboratorio o centro de datos: banda de vidrio por pared, equipos en el techo, campo solar y estacionamiento. */
function lab(out: Solid[], rng: Rng, b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK;
  out.push(prism(ix, iy, PLINTH_H, 20, 13, 5, "officeDark", { facade: LAB_FACADE }));
  for (let k = 0, n = rng.int(4, 6); k < n; k++) out.push(prism(ix + 1 + k * 3.5, iy + 2 + (k % 2) * 6, PLINTH_H + 5, 1.5, 1.5, 1, "steel"));
  for (let x = ix; x + 3 <= ix + 20; x += 4) for (let y = iy + 13.4; y + 1.6 <= b.y + b.d - SIDEWALK; y += 2.2) out.push({ kind: "ramp", at: v3(x, y, PLINTH_H), w: 3, d: 1.6, h: 0.5, mat: "glass", dir: "s" });
  for (let k = 0, n = rng.int(6, 8); k < n; k++) out.push(prism(b.x + 1 + k * 3, b.y + b.d + 0.3, 0, 2.2, 1.4, 1.2, rng.chance(0.5) ? "steel" : "rust")); // autos en el cordón sur
}

/** Plaza de barrio: suelo de selva facetado, senderos en cruz y conos (igual que en el suburbio). */
function park(out: Solid[], ground: Solid[], rng: Rng, b: SprawlBlock): void {
  ground.push(tiles(rng, b, 0.05, "leafDark", brokenTone));
  ground.push(strip([{ x: b.x + b.w / 2, y: b.y }, { x: b.x + b.w / 2, y: b.y + b.d }], 1, 0.08, "paving"));
  ground.push(strip([{ x: b.x, y: b.y + b.d / 2 }, { x: b.x + b.w, y: b.y + b.d / 2 }], 1, 0.08, "paving"));
  jungle(out, rng, { x0: b.x + 2, x1: b.x + b.w - 2, y0: b.y + 2, y1: b.y + b.d - 2 }, rng.int(5, 8), 0.05);
}

/** Torre de telecomunicaciones: base de hormigón, mástil esbelto, tres platos y luz en la punta. */
function telecom(out: Solid[], b: SprawlBlock): Vec3 {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
  out.push(prism(cx - 2, cy - 2, PLINTH_H, 4, 4, 2, "concrete"), prism(cx - 0.5, cy - 0.5, PLINTH_H + 2, 1, 1, 20, "steel"));
  for (const z of [10, 14, 18]) out.push({ kind: "cylinder", at: v3(cx + 1.2, cy, PLINTH_H + z), r: 1.2, h: 0.4, mat: "steel", sides: 8 });
  return v3(cx, cy, PLINTH_H + 22.2);
}

const octagon = (cx: number, cy: number, rx: number, ry: number): Vec2[] => Array.from({ length: 8 }, (_, i) => { const a = ((i + 0.5) / 8) * Math.PI * 2; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });

/** Arena: anillo octogonal de piedra con el césped encima y cuatro torres de luz (el estadio del suburbio). */
function arena(out: Solid[], accents: Accent[], b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2, h = 5;
  out.push({ kind: "poly", footprint: octagon(cx, cy, 11, 8), z: PLINTH_H, h, mat: "stone" });
  out.push({ kind: "poly", footprint: octagon(cx, cy, 8.5, 5.8), z: PLINTH_H + h, h: 0.3, mat: "leafDark" });
  for (const [dx, dy] of [[-9, -6], [9, -6], [9, 6], [-9, 6]] as const) {
    out.push(prism(cx + dx - 0.3, cy + dy - 0.3, PLINTH_H, 0.6, 0.6, 12, "steel"));
    accents.push({ kind: "dot", at: v3(cx + dx, cy + dy, PLINTH_H + 12), r: 0.9, color: "amber" });
  }
}

/** Auditorio: tambor de muro cortina con cubierta de cobre, marquesina sobre dos columnas y cartel. */
function auditorium(out: Solid[], signs: Accent[], b: SprawlBlock): void {
  out.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  const cx = b.x + b.w / 2, cy = b.y + 8;
  out.push({ kind: "cylinder", at: v3(cx, cy, PLINTH_H), r: 8, h: 8, mat: "curtain", sides: 12 });
  out.push({ kind: "cone", at: v3(cx, cy, PLINTH_H + 8), r: 8.5, h: 2.5, mat: "copper", sides: 12 });
  for (const dx of [-4, 4]) out.push(prism(cx + dx - 0.3, b.y + b.d - 2.3, PLINTH_H, 0.6, 0.6, 3, "steel"));
  out.push(prism(cx - 5, b.y + b.d - 4, PLINTH_H + 3, 10, 3, 0.4, "officeDark"));
  signs.push(sign(out, cx - 3, b.y + b.d - 1.4, PLINTH_H + 3.4, 6, 1.2));
}

/** La avenida del distrito sigue hacia el oeste: cordones, cantero central con árboles y faroles. */
function avenue(ground: Solid[], solids: Solid[], accents: Accent[]): void {
  const x0 = SUBURB_COLS[SUBURB_COLS.length - 1]!, x1 = CITY_EDGE.west;
  for (const y of [BOULEVARD.y0 - 0.3, BOULEVARD.y1 + 0.3]) ground.push(strip([{ x: x0, y }, { x: x1, y }], 0.4, 0.05, "paving"));
  for (const x of SUBURB_COLS) {
    solids.push(prism(x, BOULEVARD.y0, 0, BLOCK_W, BOULEVARD.y1 - BOULEVARD.y0, 0.3, "leafDark"));
    for (const dx of [4, 12, 20]) solids.push({ kind: "cone", at: v3(x + dx, BOULEVARD.y0 + 2, 0.3), r: 1.5, h: 4, mat: "leaf" });
    lamp(solids, accents, x + 12, BOULEVARD.y0 - 5.3, 0);
  }
}

/** El muro de la ribera oeste sigue al sur del distrito hasta donde llega el suburbio. */
function quay(solids: Solid[]): void {
  const { x0, x1 } = WEST_QUAY;
  solids.push(prism(x0, CITY_EDGE.south, -1, x1 - x0, WORLD.y1 + REACH.s - CITY_EDGE.south, 1.6, "plaza"));
  for (let y = CITY_EDGE.south + 8; y < WORLD.y1 + REACH.s; y += 16) solids.push({ kind: "cylinder", at: v3(x0 + 3, y, 0.6), r: 0.4, h: 0.8, mat: "rust", sides: 6 });
}

export function tech(rng: Rng): TechScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [], towers: Tower[] = [], signs: Accent[] = [];
  let telecomTop = v3(TELECOM.x, TELECOM.y, 0);
  for (const b of suburbBlocks()) {
    switch (pickKind(rng, b)) {
      case "tower": tower(solids, accents, signs, towers, rng, b); break;
      case "campus": { const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK; campus(solids, ground, accents, rng, b, ix, iy, b.w - 2 * SIDEWALK, b.d - 2 * SIDEWALK); break; }
      case "atrium": atrium(solids, ground, signs, rng, b); break;
      case "lab": lab(solids, rng, b); break;
      case "park": park(solids, ground, rng, b); break;
      case "telecom": telecomTop = telecom(solids, b); break;
      case "arena": arena(solids, accents, b); break;
      case "auditorium": auditorium(solids, signs, b); break;
    }
  }
  avenue(ground, solids, accents);
  quay(solids);
  jungle(solids, rng, { x0: -238, x1: WORLD.x0 - 2, y0: ZONE_SPLIT_Y + 2, y1: GREEN_BELT.y1 - 2 }, 14);
  return { ground, solids, accents, towers, signs, telecom: telecomTop };
}
```

Nota: los carteles (`signs`) **no** van en `accents`: los dibuja solo la capa animada `tech.signs` (Task 12), que con `reducedMotion` queda en el frame 0 (alpha 1). Así no se pintan dos veces. El cartel del `campus` compartido sí va en `accents` (es estático, no pulsa). La luz de la torre de telecomunicaciones tampoco va en `accents`: la pone la capa `tech.telecom`.

- [ ] **Step 5: Correr `npx vitest run src/scenes/tech.test.ts`** → PASS. Si el presupuesto (< 1 200 elevados) se pasa, reducir paneles solares a filas cada 3 u.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/city-pieces.ts src/scenes/district.ts src/scenes/tech.ts src/scenes/tech.test.ts
git commit -m "feat(scenes): distrito tecnológico de Resume: torres de muro cortina, campus y atrios, laboratorios con paneles solares, telecom, arena y auditorio"
```

### Task 11: `tech` en el mundo; borrar el suburbio

**Files:**
- Modify: `src/scenes/world.ts`, `src/scenes/world.test.ts:31-32`, `README.md`
- Delete: `src/scenes/suburb.ts`, `src/scenes/suburb.test.ts`

- [ ] **Step 1: Test** — en `world.test.ts` líneas 31–32 cambiar `suburb` por `tech`:

```ts
    expect(w.hinterland).not.toBeNull(); expect(w.tech).not.toBeNull();
    expect(world(7, { zones: ["portfolio", "cv", "blog"] }).tech).toBeNull();
```

- [ ] **Step 2: Implementar** — en `world.ts`: `import { tech, type TechScene } from "./tech";`, campo `tech: TechScene | null` en `WorldScene` (borrar `suburb`), `su = tech(zoneRng(seed, "cv", 2))` y devolver `tech: su`. Borrar `suburb.ts` y `suburb.test.ts` (`git rm`). En `README.md` reemplazar la frase de `suburb.ts` por `tech.ts` (distrito tecnológico de Resume al oeste y al sur de la ciudad) y sumar la spec nueva a la lista.

- [ ] **Step 3: Correr `npm test && npm run typecheck`** → PASS. `grep -rn suburb src` solo debe encontrar `suburbBlocks`/`SUBURB_*` de `sprawl-grid` (la grilla conserva el nombre).

- [ ] **Step 4: Mirar** `world.html` tecla `2`: la extensión se lee como oficinas y campus con ventanas; ninguna casa a dos aguas sin ventanas.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/world.ts src/scenes/world.test.ts README.md
git rm src/scenes/suburb.ts src/scenes/suburb.test.ts
git commit -m "feat(scenes): el distrito tecnológico reemplaza al suburbio en el mundo"
```

### Task 12: Animación del distrito (`tech-anim.ts`, `tech-animator.ts`)

**Files:**
- Create: `src/scenes/tech-anim.ts`, `src/scenes/tech-anim.test.ts`, `src/scenes/tech-animator.ts`, `src/scenes/tech-animator.test.ts`
- Modify: `src/lab/page.ts`

**Interfaces:**
- Produces: `TECH_BLINK_GAP_MS: [4000, 9000]`, `SIGN_PERIOD_MS = 3000`, `SIGN_STEP_MS = 150`, `TELECOM_STEP_MS = 100`; `createTechAnim(scene: TechScene, rng, opts): TechAnim` con `{ windows(): Accent[]; signs(): Accent[]; telecom(): Accent; tick(dtMs): { windows: boolean; signs: boolean; telecom: boolean } }`; `techAnimator(scene, rng, opts): Animator` con ids `tech.windows`, `tech.signs`, `tech.telecom`.
- Consumes: `TechScene.towers/signs/telecom`, `facadeAccents(walls, facade, color)` y `tessellate` para las paredes visibles del cuerpo.

- [ ] **Step 1: Tests** (`tech-anim.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { tech } from "./tech";
import { SIGN_PERIOD_MS, SIGN_STEP_MS, TECH_BLINK_GAP_MS, createTechAnim } from "./tech-anim";

const setup = (reducedMotion = false) => { const scene = tech(createRng(7)); return { scene, anim: createTechAnim(scene, createRng(3), { reducedMotion }) }; };

describe("tech-anim", () => {
  it("frame 0: cada torre tiene un piso encendido (ventanas ámbar en sus caras visibles), carteles a alpha 1, luz de telecom", () => {
    const { scene, anim } = setup();
    const w = anim.windows();
    expect(w.length).toBeGreaterThanOrEqual(scene.towers.length);
    for (const a of w) expect(a).toMatchObject({ kind: "poly", color: "amber" });
    expect(anim.signs().every((a) => a.kind === "poly" && a.alpha === 1)).toBe(true);
    expect(anim.telecom()).toMatchObject({ kind: "dot", color: "amber" });
  });
  it("cada 4..9 s una torre cambia o apaga su piso; los carteles pulsan con período 3 s; la luz pulsa cada 100 ms", () => {
    const { anim } = setup();
    const before = JSON.stringify(anim.windows());
    let changed = false;
    for (let t = 0; t < TECH_BLINK_GAP_MS[1] + 100; t += 100) if (anim.tick(100).windows) changed = true;
    expect(changed).toBe(true);
    expect(JSON.stringify(anim.windows())).not.toBe(before);
    const a0 = anim.signs()[0]!.kind === "poly" ? anim.signs()[0]!.alpha : 1;
    anim.tick(SIGN_PERIOD_MS / 2);
    const a1 = anim.signs()[0]!.kind === "poly" ? anim.signs()[0]!.alpha : 1;
    expect(a1).not.toBe(a0);
    expect(anim.tick(SIGN_STEP_MS).signs).toBe(true);
    expect(anim.tick(100).telecom).toBe(true);
  });
  it("con reduced-motion no cambia nada", () => {
    const { anim } = setup(true);
    for (let i = 0; i < 100; i++) expect(anim.tick(100)).toEqual({ windows: false, signs: false, telecom: false });
  });
});
```

`tech-animator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { tech } from "./tech";
import { techAnimator } from "./tech-animator";

describe("techAnimator", () => {
  it("expone ventanas, carteles y telecom; con reduced-motion no devuelve ids", () => {
    const a = techAnimator(tech(createRng(7)), createRng(3), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["tech.signs", "tech.telecom", "tech.windows"]);
    expect(a.layer("tech.windows").kind).toBe("accent");
    expect(techAnimator(tech(createRng(7)), createRng(3), { reducedMotion: true }).tick(1000).size).toBe(0);
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `tech-anim.ts`**

```ts
import type { Accent } from "../iso/accent";
import { facadeAccents } from "../iso/facade";
import { v3 } from "../iso/geometry";
import { tessellate } from "../iso/solids";
import type { Rng } from "../map/seed";
import type { TechScene } from "./tech";

/**
 * El distrito tecnológico de noche, sin Pixi: cada torre tiene un piso
 * encendido y cada 4..9 s una torre al azar lo cambia de piso o lo apaga;
 * los carteles ámbar pulsan (alpha 0.6..1, período 3 s) y la luz de la torre
 * de telecomunicaciones respira. Frame 0 = todo encendido y quieto.
 */
export const TECH_BLINK_GAP_MS: [number, number] = [4000, 9000];
export const SIGN_PERIOD_MS = 3000, SIGN_STEP_MS = 150, TELECOM_STEP_MS = 100;
const TELECOM_R = 0.8, TELECOM_PULSE = 0.3, TELECOM_PERIOD = 1200;

export interface TechAnimChanges { windows: boolean; signs: boolean; telecom: boolean }
export interface TechAnim { windows(): Accent[]; signs(): Accent[]; telecom(): Accent; tick(dtMs: number): TechAnimChanges }

export function createTechAnim(scene: TechScene, rng: Rng, opts: { reducedMotion: boolean }): TechAnim {
  const walls = scene.towers.map((t) => tessellate(t.box).filter((f) => Math.abs(f.normal.z) < 1e-6 && f.mat === "curtain" && f.toneOffset === 0)); // paredes visibles, sin las caras de fachada
  const lit: (number | null)[] = scene.towers.map((t) => rng.int(1, t.facade.floors - 1));
  const nextGap = () => rng.int(TECH_BLINK_GAP_MS[0], TECH_BLINK_GAP_MS[1]);
  let clock = 0, blinkTimer = nextGap(), signStep = 0, telecomStep = 0;
  const signAlpha = () => 0.8 + 0.2 * Math.sin((2 * Math.PI * (clock % SIGN_PERIOD_MS)) / SIGN_PERIOD_MS);
  return {
    windows: () => scene.towers.flatMap((t, k) => (lit[k] === null ? [] : facadeAccents(walls[k]!, { ...t.facade, litFloor: lit[k]! }, "amber"))),
    signs: () => scene.signs.map((a) => (a.kind === "poly" ? { ...a, alpha: opts.reducedMotion ? 1 : signAlpha() } : a)),
    telecom: () => ({ kind: "dot", at: v3(scene.telecom.x, scene.telecom.y, scene.telecom.z), r: TELECOM_R + TELECOM_PULSE * (1 + Math.sin(clock / TELECOM_PERIOD)), color: "amber" }),
    tick(dtMs) {
      const c: TechAnimChanges = { windows: false, signs: false, telecom: false };
      if (opts.reducedMotion || dtMs <= 0 || scene.towers.length === 0) return c;
      clock += dtMs;
      blinkTimer -= dtMs;
      if (blinkTimer <= 0) {
        blinkTimer = nextGap();
        const k = rng.int(0, scene.towers.length - 1), floors = scene.towers[k]!.facade.floors;
        lit[k] = rng.chance(0.3) ? null : rng.int(1, floors - 1);
        c.windows = true;
      }
      const ss = Math.floor(clock / SIGN_STEP_MS); if (ss !== signStep) { signStep = ss; c.signs = true; }
      const ts = Math.floor(clock / TELECOM_STEP_MS); if (ts !== telecomStep) { telecomStep = ts; c.telecom = true; }
      return c;
    },
  };
}
```

Nota sobre `walls`: `tessellate(prism con facade)` devuelve la pared y, después, sus caras de fachada (ventanas `glass` con `toneOffset 0` y losas con `toneOffset −1`); el filtro `f.mat === "curtain" && f.toneOffset === 0` deja solo las dos paredes visibles. `facadeAccents` necesita `litFloor` dentro de la fachada; el `windowPatches` de la planta baja con `base: "glass"` da una sola banda: por eso `lit` va de 1 a `floors − 1`.

`tech-animator.ts`:

```ts
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { TechScene } from "./tech";
import { createTechAnim } from "./tech-anim";

/** Adapta el distrito tecnológico al contrato `Animator`: tres capas de acentos. */
export function techAnimator(scene: TechScene, rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createTechAnim(scene, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    "tech.windows": () => ({ kind: "accent", accents: anim.windows() }),
    "tech.signs": () => ({ kind: "accent", accents: anim.signs() }),
    "tech.telecom": () => ({ kind: "accent", accents: [anim.telecom()] }),
  };
  return {
    ids: Object.keys(layers),
    layer: (id) => layers[id]!(),
    tick(dtMs) { const c = anim.tick(dtMs), out = new Set<string>(); if (c.windows) out.add("tech.windows"); if (c.signs) out.add("tech.signs"); if (c.telecom) out.add("tech.telecom"); return out; },
  };
}
```

En `page.ts`: `if (scene.tech) animators.push(techAnimator(scene.tech, createRng(SEED + 5), { reducedMotion }));`.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS.

- [ ] **Step 5: Mirar** tecla `2` durante 10 s: ventanas que cambian, carteles que respiran.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/tech-anim.ts src/scenes/tech-anim.test.ts src/scenes/tech-animator.ts src/scenes/tech-animator.test.ts src/lab/page.ts
git commit -m "feat(scenes): el distrito tecnológico se anima: pisos encendidos, carteles que pulsan, luz de telecom"
```

### Task 13: Medición del distrito

- [ ] **Step 1: Medir** `world.html` (primer dibujo, polígonos, peor redibujo) como en la Task 5.
- [ ] **Step 2: Decidir** (spec §8.2): si el primer dibujo > 170 ms, los campus y atrios pasan a fachada `{ floors: 1, cols: 1, base: "glass" }` (una banda por pared) y se vuelve a medir; las torres conservan la fachada completa.
- [ ] **Step 3: Anotar** en la spec (Desvíos) y commitear `docs:`.

---

# Parte D — Norte industrial y feria

### Task 14: Geografía: `REACH.n`, `FAIR`, tierra `"fair"` de arena

**Files:**
- Modify: `src/scenes/sprawl-grid.ts`, `src/scenes/sprawl-grid.test.ts`, `src/scenes/terrain.ts`, `src/scenes/terrain.test.ts`

**Interfaces:**
- Produces: `REACH.n = 16 * CELL_BLEED`; `Built = "industrial" | "urban" | "fair"`; `FAIR = { x0: 84, y0: −348, y1: −204 }`; `bayShoreX(y) = riverCenter(y) − RIVER_HALF`; `fairAt(x, y): boolean`; `BleedTerrain` gana `"fair"` (material `sand`, plano).

- [ ] **Step 1: Tests**

En `sprawl-grid.test.ts`, test `builtAt` agregar:

```ts
    expect(builtAt(150, -300)).toBe("fair");
    expect(builtAt(100, -220)).toBe("fair");
    expect(builtAt(40, -300)).toBe("industrial");   // al oeste de la feria
    expect(builtAt(150, -400)).toBeNull();          // más allá del alcance nuevo
    expect(builtAt(240, -300)).toBeNull();          // bahía
    expect(fairAt(150, -300)).toBe(true); expect(fairAt(150, -100)).toBe(false);
    expect(bayShoreX(-300)).toBe(riverCenter(-300) - RIVER_HALF);
```

y en el test de la selva bajar los umbrales: `bleedGreen / bleed < 0.07` y `allGreen / all < 0.06` (título: "… a lo sumo el 7 % del sangrado y el 6 % del total"). En `terrain.test.ts` agregar:

```ts
  it("la feria es arena plana en el sangrado norte", () => {
    expect(bleedTerrainAt(150, -300)).toBe("fair");
    const m = buildTerrain(createRng(7));
    const sand = m.bleed.find((s) => s.kind === "ground" && s.mat === "sand");
    expect(sand && sand.kind === "ground" && sand.tris.length).toBeGreaterThan(50);
    for (const t of tris(sand!)) for (const p of t.pts) expect(Math.abs(p.z)).toBeLessThanOrEqual(0.1);
  });
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar**

`sprawl-grid.ts`:

```ts
export type Built = "industrial" | "urban" | "fair";
export const REACH = { n: 16 * CELL_BLEED, w: 8 * CELL_BLEED, s: 16 * CELL_BLEED } as const;
/** La feria: franja de arena al norte de la fábrica hasta la orilla de la bahía. Bordes alineados a la grilla del sangrado (anclada en (−402, −438)). */
export const FAIR = { x0: 84, y0: -348, y1: -204 } as const;
/** Orilla oeste de la bahía para cada y (≈ 212..277 en la franja de la feria). */
export const bayShoreX = (y: number): number => riverCenter(y) - RIVER_HALF;
```

En `builtAt`, justo antes del `return y < ZONE_SPLIT_Y ? ...`:

```ts
  if (y < WORLD.y0 && x >= FAIR.x0 && y >= FAIR.y0 && y < FAIR.y1) return "fair";
```

y `export const fairAt = (x: number, y: number): boolean => builtAt(x, y) === "fair";`.

`terrain.ts`: `BleedTerrain` gana `"fair"`; `BLEED_MAT` gana `fair: "sand"`; `BLEED_BUILT` gana `"fair"`; `tris` de `buildBleed` gana la clave `sand: []`. `bleedTerrainAt` no cambia (devuelve lo que diga `builtAt`).

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Si la selva del sangrado da más del 7 %, imprimir el porcentaje y revisar que `REACH.n` haya subido (el norte visible tiene que ser tierra construida hasta `y −348`).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/sprawl-grid.ts src/scenes/sprawl-grid.test.ts src/scenes/terrain.ts src/scenes/terrain.test.ts
git commit -m "feat(terrain): la tierra construida llega a y −348 y la feria es una franja de arena sobre la bahía"
```

### Task 15: Central térmica, calle y estacionamiento en `hinterland.ts`

**Files:**
- Modify: `src/scenes/hinterland.ts`, `src/scenes/hinterland.test.ts`, `src/lab/page.ts`

**Interfaces:**
- Produces: `HinterlandScene.stacks: Vec3[]` (puntas de las dos chimeneas), `POWER = { x: 34, y: −276, w: 40, d: 16 }`, `COOLING = { x: 20, y: −236, r: 8 }`, `PARKING = { x: 50, y: −236, w: 34, d: 24 }`.
- Consumes: `inCoverQuad`, `COVER_MARGIN`, `factoryAnimator` (recibe los `stacks` sumados).

- [ ] **Step 1: Tests** (agregar a `hinterland.test.ts`)

```ts
  it("central térmica al norte: sala con fachada, dos chimeneas humeantes, torre de refrigeración, transformadores; calle y estacionamiento; todo dentro del cover y sobre tierra industrial", () => {
    const s = scene();
    expect(s.stacks).toHaveLength(2);
    for (const st of s.stacks) expect(st.z).toBeGreaterThanOrEqual(26);
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "concrete" && x.w === POWER.w && x.d === POWER.d && x.facade)).toBe(true);
    expect(s.solids.filter((x) => x.kind === "cylinder" && x.mat === "concrete" && x.r === 2 && x.h === 26)).toHaveLength(2);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "concrete" && x.r === COOLING.r && x.sides === 14)).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "steel" && x.w === 3 && x.d === 2 && x.h === 3)).toHaveLength(6);
    expect(s.ground.some((g) => g.kind === "strip" && g.mat === "road" && g.width === 6)).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.h === 1.2 && x.w === 2.2 && bounds(x).min.x >= PARKING.x && bounds(x).max.x <= PARKING.x + PARKING.w).length).toBeGreaterThanOrEqual(10);
    const north = s.solids.filter((x) => bounds(x).max.y < -204 && !isFlat(x));
    expect(north.length).toBeGreaterThan(30); expect(north.length).toBeLessThanOrEqual(250);
    for (const x of north) { const b = bounds(x); expect(inCoverQuad((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, 16 / 9, 30)).toBe(true); }
  });
```

Importar `POWER, COOLING, PARKING` de `./hinterland`, `inCoverQuad` de `../map/geo`. En el test de presupuesto existente subir el tope de `600` a `850`.

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar** (agregar a `hinterland.ts`)

```ts
import { inCoverQuad } from "../map/geo";
import { COVER_MARGIN } from "./sprawl-grid";

export const POWER = { x: 34, y: -276, w: 40, d: 16 } as const;
export const STACKS_N = [{ x: 78, y: -270 }, { x: 78, y: -260 }] as const;
export const COOLING = { x: 20, y: -236, r: 8 } as const;
export const PARKING = { x: 50, y: -236, w: 34, d: 24 } as const;
export const ROAD_Y = -212;
const inCover = (x: number, y: number): boolean => inCoverQuad(x, y, 16 / 9, COVER_MARGIN);

/** Central térmica: sala de turbinas, dos chimeneas (las puntas van a `stacks`), torre de refrigeración, carbón con cinta, transformadores. */
function powerPlant(out: Solid[], accents: Accent[], stacks: Vec3[], rng: Rng): void {
  const { x, y, w, d } = POWER;
  if (onIndustrial(x, y, w, d) && inCover(x + w / 2, y + d / 2)) out.push({ kind: "prism", at: v3(x, y, 0), w, d, h: 12, mat: "concrete", facade: { floors: 1, cols: 5 } });
  for (const s of STACKS_N) { out.push(prism(s.x - 2.5, s.y - 2.5, 0, 5, 5, 2, "concrete")); out.push({ kind: "cylinder", at: v3(s.x, s.y, 2), r: 2, h: 26, mat: "concrete", sides: 10 }); stacks.push(v3(s.x, s.y, 28)); }
  out.push({ kind: "cylinder", at: v3(COOLING.x, COOLING.y, 0), r: COOLING.r, h: 12, mat: "concrete", sides: 14 }, { kind: "cylinder", at: v3(COOLING.x, COOLING.y, 12), r: COOLING.r - 1.5, h: 4, mat: "concrete", sides: 14 });
  for (let i = 0; i < 3; i++) out.push({ kind: "cone", at: v3(10 + i * 9, -252 + (i % 2) * 4, 0), r: rng.int(5, 6), h: 3, mat: "rust", sides: 7 }); // carbón
  for (let cx = 14; cx <= 34; cx += 8) out.push(prism(cx - 0.2, -255.2, 0, 0.4, 0.4, 4, "steel")); // postes de la cinta
  out.push(strip([{ x: 12, y: -255 }, { x: 36, y: -255 }], 0.8, 4, "steel")); // la cinta es plana: `strip` a z 4 (se pinta en el suelo; los postes la sostienen visualmente)
  for (let i = 0; i < 6; i++) { const tx = 40 + (i % 3) * 10, ty = -252 + Math.floor(i / 3) * 6; out.push(prism(tx, ty, 0, 3, 2, 3, "steel")); for (const dx of [0.5, 1.5, 2.5]) out.push({ kind: "cylinder", at: v3(tx + dx, ty + 1, 3), r: 0.4, h: 1, mat: "rust", sides: 6 }); }
  for (const [fx, fy, fw, fd] of [[38, -254, 32, 0.3], [38, -240, 32, 0.3], [38, -254, 0.3, 14], [70, -254, 0.3, 14]] as const) out.push(prism(fx, fy, 0, fw, fd, 1.2, "steel")); // cerco
  for (const [lx, ly] of [[38, -256], [72, -238]] as const) lamp(out, accents, lx, ly);
}

/** Calle de la central a la feria, camiones esperando y el estacionamiento de la feria del lado industrial. */
function fairRoad(out: Solid[], accents: Accent[], rng: Rng): void {
  out.push(strip([{ x: 0, y: ROAD_Y }, { x: 84, y: ROAD_Y }], 6, 0.1, "road"));
  for (const x of [4, 32, 60]) lamp(out, accents, x, ROAD_Y - 4);
  for (const x of [8, 18, 28]) { out.push(prism(x, ROAD_Y + 3.5, 0, 6, 2.4, 2.8, "rust")); out.push(prism(x + 6, ROAD_Y + 3.5, 0, 2, 2.4, 2.2, "steel")); }
  const { x, y, w, d } = PARKING;
  out.push(prism(x, y, 0, w, d, 0.3, "paving"));
  for (let i = 0; i < 12; i++) { const px = x + 2 + (i % 6) * 5, py = y + 3 + Math.floor(i / 6) * 10; if (rng.chance(0.8)) out.push(prism(px, py, 0.3, 2.2, 1.4, 1.2, rng.chance(0.5) ? "steel" : "rust")); }
}
```

Nota sobre la cinta: `strip` es plana y se pinta en la capa de suelo, debajo de los sólidos; a z 4 se proyecta más arriba que el suelo y los postes quedan "delante": alcanza para leerse como cinta elevada. En `hinterland()`: `const stacks: Vec3[] = []; ... powerPlant(solids, accents, stacks, rng); fairRoad(solids, accents, rng);` y devolver `{ ground: solids.filter(strip), solids: solids.filter(no strip), accents, stacks }` como hoy (el filtro final manda la calle a `ground`); agregar `stacks: Vec3[]` a `HinterlandScene`. `lamp`, `strip` y `prism` ya existen en el archivo.

Estacionamiento: para que 12 autos con `chance(0.8)` den ≥ 10 con el seed 7, si el test falla por uno o dos, quitar el `chance` (todos los lugares ocupados).

En `page.ts`: `if (scene.factory) animators.push(factoryAnimator({ ...scene.factory, stacks: [...scene.factory.stacks, ...(scene.hinterland?.stacks ?? [])] }, createRng(SEED + 4), { reducedMotion }));`.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/hinterland.ts src/scenes/hinterland.test.ts src/lab/page.ts
git commit -m "feat(scenes): central térmica humeante, calle y estacionamiento al norte de la fábrica"
```

### Task 16: Sólido `wheel` (anillo vertical de frente a la cámara)

**Files:**
- Modify: `src/iso/solids.ts`, `src/iso/solids.test.ts`

**Interfaces:**
- Produces: `Solid` `wheel` = `{ kind: "wheel"; at: Vec3; r: number; width: number; mat: Material; sides: number; angle: number; gondolas?: { mat: Material; w: number; d: number; h: number } }`; `WHEEL_U = { x: 1/√2, y: −1/√2, z: 0 }`, `WHEEL_NORMAL = { x: 1/√2, y: 1/√2, z: 0 }`, `wheelPoint(at, angle, rho): Vec3`.

- [ ] **Step 1: Test**

```ts
  it("wheel: anillo vertical en el plano (1, −1, 0) con rayos, cubo y góndolas colgando; girar mueve las góndolas y todo el anillo cumple x + y = const", () => {
    const w: Solid = { kind: "wheel", at: v3(100, 50, 17), r: 14, width: 1.2, mat: "steel", sides: 16, angle: 0, gondolas: { mat: "rust", w: 1.6, d: 1.2, h: 1.4 } };
    const faces = tessellateAll(w);
    expect(faces.filter((f) => f.mat === "steel").length).toBe(16 + 16 + 1); // sectores, rayos, cubo
    for (const f of faces.filter((f) => f.mat === "steel")) { expect(f.tone).toBe("top"); for (const p of f.pts) expect(p.x + p.y).toBeCloseTo(150, 6); }
    expect(faces.filter((f) => f.mat === "rust").length).toBe(16 * 6);
    const b = bounds(w);
    expect(b.max.z).toBeCloseTo(31, 6); expect(b.min.z).toBeLessThan(3.1);
    const top0 = tessellateAll(w).filter((f) => f.mat === "rust").flatMap((f) => f.pts).sort((p, q) => q.z - p.z)[0]!;
    const top1 = tessellateAll({ ...w, angle: Math.PI / 16 }).filter((f) => f.mat === "rust").flatMap((f) => f.pts).sort((p, q) => q.z - p.z)[0]!;
    expect(Math.hypot(top0.x - top1.x, top0.y - top1.y)).toBeGreaterThan(1);
    expect(tessellate(w).filter((f) => f.mat === "steel").length).toBe(33); // mira a la cámara: nada se descarta
  });
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar** en `solids.ts`

```ts
  | { kind: "wheel"; at: Vec3; r: number; width: number; mat: Material; sides: number; angle: number; gondolas?: { mat: Material; w: number; d: number; h: number } }
```

```ts
const SQ = Math.SQRT1_2;
/** El plano de la rueda: `u` es horizontal en pantalla (mundo (1, −1)); la normal mira a la cámara. */
export const WHEEL_U: Vec3 = { x: SQ, y: -SQ, z: 0 };
export const WHEEL_NORMAL: Vec3 = { x: SQ, y: SQ, z: 0 };
export const wheelPoint = (at: Vec3, a: number, rho: number): Vec3 => v3(at.x + WHEEL_U.x * rho * Math.cos(a), at.y + WHEEL_U.y * rho * Math.cos(a), at.z + rho * Math.sin(a));

/** Rueda de frente a la cámara: llanta en sectores, rayos, cubo (todos en el plano, tono `top`) y góndolas como prismas colgados de la llanta. */
function wheel(s: Solid & { kind: "wheel" }): Face[] {
  const flat = (pts: Vec3[]): Face => ({ pts, normal: WHEEL_NORMAL, mat: s.mat, tone: shadeTone(WHEEL_NORMAL), toneOffset: 3 });
  const out: Face[] = [];
  const hub = s.r * 0.12, inner = s.r - s.width, half = s.width / 6;
  for (let k = 0; k < s.sides; k++) {
    const a0 = s.angle + (2 * Math.PI * k) / s.sides, a1 = s.angle + (2 * Math.PI * (k + 1)) / s.sides;
    out.push(flat([wheelPoint(s.at, a0, inner), wheelPoint(s.at, a1, inner), wheelPoint(s.at, a1, s.r), wheelPoint(s.at, a0, s.r)]));
    const px = -Math.sin(a0) * half, pz = Math.cos(a0) * half; // perpendicular al rayo dentro del plano
    const off = (p: Vec3, sgn: number): Vec3 => v3(p.x + WHEEL_U.x * px * sgn, p.y + WHEEL_U.y * px * sgn, p.z + pz * sgn);
    const i0 = wheelPoint(s.at, a0, hub), i1 = wheelPoint(s.at, a0, inner);
    out.push(flat([off(i0, -1), off(i1, -1), off(i1, 1), off(i0, 1)]));
  }
  out.push(flat(Array.from({ length: 8 }, (_, k) => wheelPoint(s.at, s.angle + (2 * Math.PI * k) / 8, hub))));
  if (s.gondolas) {
    const g = s.gondolas;
    for (let k = 0; k < s.sides; k++) {
      const p = wheelPoint(s.at, s.angle + (2 * Math.PI * (k + 0.5)) / s.sides, s.r - s.width / 2);
      out.push(...extrude(rect(p.x - g.w / 2, p.y - g.d / 2, g.w, g.d), p.z - g.h, g.h, g.mat));
    }
  }
  return out;
}
```

En `tessellateAll`: `case "wheel": return wheel(s);`. `isFlat` no cambia (la rueda proyecta sombra y se ordena como sólido). `tessellate` filtra por `dot(normal, VIEW_DIR) > 0`: `WHEEL_NORMAL · VIEW_DIR > 0`, así los 33 planos pasan.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Si `depth.test.ts` o `light.test.ts` iteran todos los `kind` con un `switch` exhaustivo, agregar el caso (`bounds` y `shadowPolygon` ya usan `tessellateAll`).

- [ ] **Step 5: Commit**

```bash
git add src/iso/solids.ts src/iso/solids.test.ts
git commit -m "feat(iso): sólido wheel: anillo vertical de frente a la cámara con rayos y góndolas"
```

### Task 17: La feria (`fair.ts`) y su lugar en el mundo

**Files:**
- Create: `src/scenes/fair.ts`, `src/scenes/fair.test.ts`
- Modify: `src/scenes/world.ts`, `src/scenes/world.test.ts`, `README.md`

**Interfaces:**
- Produces: `FairScene { ground; solids; accents; wheelAxis: Vec3; coaster: Vec3[]; drop: { at: Vec3; h: number }; arcadeSigns: [Accent, Accent] }`; constantes `WHEEL = { x: 150, y: −300, r: 14, hub: 17, sides: 16 }`, `COASTER = { x0: 94, x1: 156, y0: −262, y1: −232 }`, `COASTER_PROFILE` (24 alturas), `DROP = { x: 120, y: −328, h: 24 }`, `PIER = { y: −282, d: 10, len: 46 }`, `BOARDWALK_W = 8`, `FAIR_MATS`; builders puros para el animador: `wheelSolid(angle): Solid`, `coasterPath(): Vec3[]` (24 puntos con z, cerrado por el animador), `trainSolids(dist): Solid[]`, `dropSolids(z): Solid[]`; `fair(rng): FairScene`; `WorldScene.fair: FairScene | null`.
- Consumes: `fairAt`, `bayShoreX`, `bayWater`, `FAIR` (`sprawl-grid.ts`); `wheel` (`solids.ts`); `prism`-like helpers propios.

- [ ] **Step 1: Tests** (`fair.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { isBehind, overlaps, screenBounds } from "../iso/depth";
import { bounds, isFlat, type Solid } from "../iso/solids";
import { worldZoneAt } from "../map/geo";
import type { Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { COASTER_PROFILE, DROP, FAIR_MATS, WHEEL, coasterPath, dropSolids, fair, trainSolids, wheelSolid } from "./fair";
import { FAIR, bayWater, fairAt } from "./sprawl-grid";
import { bleedTerrainAt } from "./terrain";

const scene = () => fair(createRng(7));
const slender = (s: Solid) => (s.kind === "cylinder" && s.r <= 3) || (s.kind === "prism" && ((s.w <= 3 && s.d <= 3) || s.h <= 1)) || (s.kind === "poly" && s.h <= 1);

describe("fair", () => {
  it("es determinística, cae en Portfolio sobre la franja de la feria con sus materiales y dentro del presupuesto", () => {
    expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    const s = scene();
    const raised = s.solids.filter((x) => !isFlat(x));
    expect(raised.length).toBeGreaterThan(250); expect(raised.length).toBeLessThanOrEqual(700);
    expect(s.accents.length).toBeLessThanOrEqual(120);
    for (const x of s.solids) {
      const b = bounds(x);
      expect(FAIR_MATS).toContain(x.mat);
      expect(worldZoneAt(b.min.x, b.min.y)).toBe("portfolio");
      expect(b.min.x).toBeGreaterThanOrEqual(FAIR.x0 - 0.5); expect(b.min.y).toBeGreaterThanOrEqual(FAIR.y0); expect(b.max.y).toBeLessThanOrEqual(FAIR.y1 + 0.5);
    }
  });

  it("nada apoya en agua salvo el muelle, sus pilotes y el pabellón; nada no esbelto supera 18", () => {
    for (const x of scene().solids) {
      const b = bounds(x), cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
      const pier = x.kind === "prism" && x.mat === "deck" && x.at.z === -1;
      const onPier = b.min.y >= -282.5 && b.max.y <= -271 && b.min.x > 200; // pilotes (lado sur), guirnalda y pabellón sobre el muelle
      if (!pier && !onPier && x.kind !== "cone") expect(bayWater(cx, cy)).toBe(false);
      if (!slender(x)) expect(b.max.z).toBeLessThanOrEqual(18.5);
    }
  });

  it("paseo de madera con faroles, muelle con pabellón y guirnalda, ≥ 8 puestos a dos aguas, carrusel, arcades con fachada, autitos, sombrillas, portada", () => {
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "deck" && x.d === 18 && x.h === 0.6).length).toBeGreaterThanOrEqual(6);
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "deck" && x.at.z === -1 && x.w === 46)).toBe(true);
    expect(s.solids.some((x) => x.kind === "cylinder" && x.mat === "whitewash" && x.r === 5 && x.sides === 8)).toBe(true);
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "gable" && x.w === 4 && x.d === 3).length).toBeGreaterThanOrEqual(8);
    expect(s.solids.some((x) => x.kind === "cone" && x.mat === "whitewash" && x.r === 7)).toBe(true); // carrusel
    expect(s.solids.some((x) => x.kind === "prism" && x.mat === "whitewash" && x.w === 24 && x.facade)).toBe(true); // arcades
    expect(s.solids.filter((x) => x.kind === "cone" && x.r === 1.6).length).toBeGreaterThanOrEqual(10); // sombrillas
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "stone" && x.h === 6)).toHaveLength(2); // portada
    expect(s.solids.filter((x) => x.kind === "hull").length).toBeGreaterThanOrEqual(3); // botes varados
    expect(s.accents.filter((a) => a.kind === "dot").length).toBeGreaterThan(30);
    expect(new Set(s.accents.map((a) => a.color)).size).toBeGreaterThanOrEqual(3); // ámbar, cian y magenta
  });

  it("vuelta al mundo: eje a 17, r 14, 16 góndolas; nada estático queda delante de ella en pantalla", () => {
    const s = scene();
    const w = wheelSolid(0);
    expect(w).toMatchObject({ kind: "wheel", r: WHEEL.r, sides: WHEEL.sides, at: { x: WHEEL.x, y: WHEEL.y, z: WHEEL.hub } });
    expect(bounds(w).max.z).toBeCloseTo(31, 6);
    const wb = bounds(w);
    for (const x of s.solids) { const sb = bounds(x); if (overlaps(screenBounds(wb), screenBounds(sb))) expect(isBehind(wb, sb)).toBe(false); }
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "steel" && x.h === 17)).toHaveLength(2); // columnas detrás del plano
  });

  it("montaña rusa: 24 segmentos con z entre 4 y 14, subida al principio; el tren y la góndola se arman a cualquier distancia/altura", () => {
    const path = coasterPath();
    expect(path).toHaveLength(24);
    expect(COASTER_PROFILE.slice(0, 6)).toEqual([4, 6, 8, 10, 12, 14]);
    for (const p of path) { expect(p.z).toBeGreaterThanOrEqual(4); expect(p.z).toBeLessThanOrEqual(14); expect(fairAt(p.x, p.y)).toBe(true); }
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "poly" && x.mat === "rail").length).toBe(48); // dos rieles por segmento
    expect(s.solids.filter((x) => x.kind === "prism" && x.mat === "rust" && x.w === 0.5).length).toBe(24); // columnas
    for (const d of [0, 10, 50, 120, 183]) { const t = trainSolids(d); expect(t).toHaveLength(6); for (const x of t) expect(bounds(x).min.z).toBeGreaterThanOrEqual(3.9); }
    expect(dropSolids(1)).toHaveLength(9);
    expect(bounds(dropSolids(DROP.h - 3)[0]!).max.z).toBeLessThanOrEqual(DROP.h + 1);
  });

  it("todo el suelo de la feria es arena", () => {
    for (const [x, y] of [[100, -330], [150, -250], [200, -300], [120, -210]] as const) expect(bleedTerrainAt(x, y)).toBe("fair");
  });
});
```

En `world.test.ts` agregar junto a `tech`: `expect(w.fair).not.toBeNull();` y con filtro `.fair` es `null`.

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `fair.ts`**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { AccentColor, Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { FAIR, bayShoreX, bayWater, fairAt } from "./sprawl-grid";

/**
 * La feria de la playa, al norte de la fábrica sobre la bahía (estética
 * Coney Island): paseo de madera con faroles, muelle con pabellón, vuelta al
 * mundo, montaña rusa de madera, carrusel, torre de caída, salón de arcades,
 * puestos, autitos chocadores, sombrillas, portada. Es el único lugar con
 * acentos de los tres colores. Las piezas que se mueven (rueda, tren, góndola
 * de la torre) las arma el animador con los builders puros de acá.
 * Spec: docs/superpowers/specs/2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md §4.3.
 */
export interface FairScene { ground: Solid[]; solids: Solid[]; accents: Accent[]; wheelAxis: Vec3; coaster: Vec3[]; drop: { at: Vec3; h: number }; arcadeSigns: [Accent, Accent] }

export const WHEEL = { x: 150, y: -300, r: 14, hub: 17, sides: 16 } as const;
export const COASTER = { x0: 94, x1: 156, y0: -262, y1: -232 } as const;
export const COASTER_PROFILE: readonly number[] = [4, 6, 8, 10, 12, 14, 13, 9, 5, 4, 6, 9, 12, 10, 6, 4, 5, 8, 11, 8, 5, 4, 4, 4];
export const DROP = { x: 120, y: -328, h: 24 } as const;
export const PIER = { y: -282, d: 10, len: 46 } as const;
export const BOARDWALK_W = 8;
export const CAROUSEL = { x: 178, y: -248 } as const;
export const ARCADE = { x: 96, y: -228 } as const;
export const FAIR_MATS: readonly Material[] = ["deck", "whitewash", "rust", "steel", "copper", "stone", "concrete", "plaza", "paving", "sand", "rail", "glass", "hull", "leaf", "leafDark"];
const BOOTH_MATS: readonly Material[] = ["whitewash", "rust", "copper"];
const WATER_Z = -1;

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, extra: { roof?: "gable"; facade?: { floors: number; cols: number; base?: "glass" } } = {}): Solid => ({ kind: "prism", at: v3(x, y, z), w, d, h, mat, ...extra });
const cyl = (x: number, y: number, z: number, r: number, h: number, mat: Material, sides = 8): Solid => ({ kind: "cylinder", at: v3(x, y, z), r, h, mat, sides });
const cone = (x: number, y: number, z: number, r: number, h: number, mat: Material, sides = 8): Solid => ({ kind: "cone", at: v3(x, y, z), r, h, mat, sides });
const dot = (x: number, y: number, z: number, r: number, color: AccentColor): Accent => ({ kind: "dot", at: v3(x, y, z), r, color });
/** Cartel: poly de luz en un plano vertical paralelo al eje x (cara sur), de `x0..x1` y `z0..z1`. */
const sign = (x0: number, x1: number, y: number, z0: number, z1: number, color: AccentColor, alpha = 1): Accent => ({ kind: "poly", pts: [v3(x0, y, z0), v3(x1, y, z0), v3(x1, y, z1), v3(x0, y, z1)], color, alpha });
/** Caja rotada `heading` con centro en (cx, cy): para vías, vigas y autos del tren. */
const rotBox = (cx: number, cy: number, len: number, wid: number, heading: number, z: number, h: number, mat: Material): Solid => {
  const c = Math.cos(heading), s = Math.sin(heading), hl = len / 2, hw = wid / 2;
  const p = (dx: number, dy: number): Vec2 => ({ x: cx + dx * c - dy * s, y: cy + dx * s + dy * c });
  return { kind: "poly", footprint: [p(-hl, -hw), p(hl, -hw), p(hl, hw), p(-hl, hw)], z, h, mat };
};
const onFair = (x: number, y: number, w: number, d: number): boolean => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].every(([px, py]) => fairAt(px!, py!));

// ---------------------------------------------------------------- builders para el animador

export function wheelSolid(angle: number): Solid {
  return { kind: "wheel", at: v3(WHEEL.x, WHEEL.y, WHEEL.hub), r: WHEEL.r, width: 1.2, mat: "steel", sides: WHEEL.sides, angle, gondolas: { mat: "rust", w: 1.6, d: 1.2, h: 1.4 } };
}

/** Circuito rectangular de 24 puntos (sentido horario desde la esquina SO, por el lado sur hacia el este) con la z de `COASTER_PROFILE`. */
export function coasterPath(): Vec3[] {
  const { x0, x1, y0, y1 } = COASTER, w = x1 - x0, d = y1 - y0, per = 2 * (w + d);
  return COASTER_PROFILE.map((z, k) => {
    let t = (per * k) / COASTER_PROFILE.length;
    if (t < w) return v3(x0 + t, y1, z); t -= w;
    if (t < d) return v3(x1, y1 - t, z); t -= d;
    if (t < w) return v3(x1 - t, y0, z); t -= w;
    return v3(x0, y0 + t, z);
  });
}

const segs = (): { a: Vec3; b: Vec3; len: number; heading: number }[] => { const p = coasterPath(); return p.map((a, k) => { const b = p[(k + 1) % p.length]!; return { a, b, len: Math.hypot(b.x - a.x, b.y - a.y), heading: Math.atan2(b.y - a.y, b.x - a.x) }; }); };
export const coasterLength = (): number => segs().reduce((n, s) => n + s.len, 0);

/** Punto y rumbo del circuito a `dist` del inicio (z interpolada). */
export function coasterAt(dist: number): { x: number; y: number; z: number; heading: number; seg: number } {
  const ss = segs(), L = coasterLength();
  let d = ((dist % L) + L) % L;
  for (let k = 0; k < ss.length; k++) { const s = ss[k]!; if (d <= s.len) { const t = d / s.len; return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, z: s.a.z + (s.b.z - s.a.z) * t, heading: s.heading, seg: k }; } d -= s.len; }
  const s = ss[ss.length - 1]!; return { x: s.b.x, y: s.b.y, z: s.b.z, heading: s.heading, seg: ss.length - 1 };
}

/** Tres autos del tren a `dist`, `dist − 2.6`, `dist − 5.2` sobre la vía: caja `rust` y asiento `steel`. */
export function trainSolids(dist: number): Solid[] {
  const out: Solid[] = [];
  for (let i = 0; i < 3; i++) { const p = coasterAt(dist - i * 2.6); out.push(rotBox(p.x, p.y, 2.2, 1.4, p.heading, p.z + 0.25, 1, "rust"), rotBox(p.x, p.y, 1.6, 1, p.heading, p.z + 1.25, 0.4, "steel")); }
  return out;
}

/** Góndola de la torre de caída a la altura `z`: anillo `rust` con ocho asientos. */
export function dropSolids(z: number): Solid[] {
  const out: Solid[] = [cyl(DROP.x, DROP.y, z, 2.4, 1.4, "rust")];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; out.push(prism(DROP.x + 2.6 * Math.cos(a) - 0.3, DROP.y + 2.6 * Math.sin(a) - 0.3, z + 1.4, 0.6, 0.6, 0.8, "steel")); }
  return out;
}

// ---------------------------------------------------------------- escena estática

function boardwalk(out: Solid[], accents: Accent[]): void {
  for (let y = -336; y < -208; y += 18) {
    const x = Math.min(bayShoreX(y), bayShoreX(y + 9), bayShoreX(y + 18)) - 16; // la orilla se corre hasta 25 u en 18 de largo: el tramo entero queda en arena
    if (!onFair(x, y, BOARDWALK_W, 18)) continue;
    out.push(prism(x, y, 0, BOARDWALK_W, 18, 0.6, "deck"));
    for (let py = y + 3; py < y + 18; py += 6) out.push(prism(x + BOARDWALK_W - 0.4, py, 0.6, 0.3, 0.3, 1, "steel")); // baranda del lado del agua
    out.push(prism(x + 0.6, y + 9, 0.6, 0.4, 0.4, 4, "steel")); accents.push(dot(x + 0.8, y + 9.2, 4.6, 0.7, "amber"));
    out.push(prism(x + 2, y + 4, 0.6, 2, 0.6, 0.5, "deck"));
  }
}

function pier(out: Solid[], accents: Accent[]): void {
  const x0 = bayShoreX(PIER.y + PIER.d / 2) - 16 + BOARDWALK_W - 2, y = PIER.y;
  out.push(prism(x0, y, WATER_Z, PIER.len, PIER.d, 1.8, "deck"));
  for (let px = x0 + 4; px < x0 + PIER.len; px += 8) out.push(cyl(px, y + PIER.d + 0.4, WATER_Z, 0.4, 1.4, "rust", 6)); // pilotes del lado visible (sur)
  for (let px = x0 + 2; px < x0 + PIER.len - 8; px += 4) for (const py of [y + 0.5, y + PIER.d - 0.5]) { out.push(prism(px - 0.15, py - 0.15, 0.8, 0.3, 0.3, 3, "steel")); accents.push(dot(px, py, 3.8, 0.35, "amber")); }
  const cx = x0 + PIER.len - 5, cy = y + PIER.d / 2;
  out.push(cyl(cx, cy, 0.8, 5, 4, "whitewash", 8), cone(cx, cy, 4.8, 5.6, 2.5, "copper", 8));
  accents.push(dot(cx, cy, 7.5, 1, "magenta"));
}

function wheelSupport(out: Solid[], accents: Accent[]): void {
  const s = Math.SQRT1_2, { x, y } = WHEEL;
  for (const su of [-1, 1]) out.push(prism(x + su * 2.5 * s - 1.5 * s - 0.4, y - su * 2.5 * s - 1.5 * s - 0.4, 0, 0.8, 0.8, 17, "steel")); // dos columnas detrás del plano (lado −(1,1))
  out.push(rotBox(x - 1.2 * s, y - 1.2 * s, 6, 0.8, -Math.PI / 4, 16.6, 0.8, "steel")); // viga del eje, detrás
  out.push(prism(x - 5, y - 3, 0, 10, 6, 0.6, "concrete"));
  out.push(prism(x + 6, y + 8, 0, 3, 3, 2.5, "whitewash", { roof: "gable" })); accents.push(sign(x + 6.3, x + 8.7, y + 11.02, 0.8, 1.8, "amber"));
  accents.push(dot(x, y, WHEEL.hub, 0.9, "amber"));
}

function coaster(out: Solid[]): void {
  const path = coasterPath(), n = path.length;
  for (let k = 0; k < n; k++) {
    const a = path[k]!, b = path[(k + 1) % n]!, len = Math.hypot(b.x - a.x, b.y - a.y), heading = Math.atan2(b.y - a.y, b.x - a.x), zm = (a.z + b.z) / 2;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, px = -Math.sin(heading), py = Math.cos(heading);
    for (const side of [-1, 1]) out.push(rotBox(cx + px * side, cy + py * side, len, 0.3, heading, zm, 0.25, "rail"));
    out.push(prism(a.x - 0.25, a.y - 0.25, 0, 0.5, 0.5, a.z, "rust")); // columna
    out.push(rotBox(a.x, a.y, 2.4, 0.4, heading + Math.PI / 2, a.z - 0.3, 0.3, "deck")); // travesaño
    out.push(rotBox(cx, cy, len, 0.3, heading, Math.min(a.z, b.z) / 2, 0.3, "rust")); // celosía
  }
  const s = path[0]!; // estación sobre el primer segmento
  for (const [dx, dy] of [[0, -3], [8, -3], [0, 1], [8, 1]] as const) out.push(prism(s.x + dx, s.y + dy, 0, 0.4, 0.4, 7, "steel"));
  out.push(prism(s.x, s.y - 3, 7, 8, 4, 0.3, "whitewash"));
}

function carousel(out: Solid[], accents: Accent[]): void {
  const { x, y } = CAROUSEL;
  out.push(cyl(x, y, 0, 6, 0.6, "stone", 12));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; out.push(cyl(x + 4.5 * Math.cos(a), y + 4.5 * Math.sin(a), 0.6, 0.25, 3, "steel", 6)); accents.push(dot(x + 6.5 * Math.cos(a), y + 6.5 * Math.sin(a), 3.4, 0.3, "amber")); }
  out.push(cone(x, y, 3.6, 7, 3, "whitewash", 12), cone(x, y, 6.6, 1.2, 1.5, "copper", 8));
}

function dropTower(out: Solid[], accents: Accent[]): void {
  out.push(prism(DROP.x - 2, DROP.y - 2, 0, 4, 4, 0.6, "concrete"), prism(DROP.x - 0.5, DROP.y - 0.5, 0.6, 1, 1, DROP.h, "steel"));
  accents.push(dot(DROP.x, DROP.y, DROP.h + 0.8, 0.8, "cyan"));
}

function arcade(out: Solid[]): [Accent, Accent] {
  const { x, y } = ARCADE;
  out.push(prism(x, y, 0, 24, 12, 6, "whitewash", { facade: { floors: 1, cols: 5, base: "glass" } }));
  out.push(prism(x - 1, y + 12, 4, 26, 2, 0.4, "copper"), prism(x, y + 12, 3.6, 24, 1.5, 0.2, "rust"));
  out.push(prism(x + 7, y + 11, 6, 10, 0.4, 2.4, "steel"));
  return [sign(x + 7.3, x + 16.7, y + 11.42, 6.3, 8.1, "magenta"), sign(x + 7.3, x + 16.7, y + 11.42, 6.3, 8.1, "amber")]; // los dibuja solo la capa animada `fair.signs`
}

function booths(out: Solid[], accents: Accent[]): void {
  for (let k = 0; k < 8; k++) {
    const y = -330 + k * 12, x = bayShoreX(y + 1.5) - 16 - 6;
    if (!onFair(x, y, 4, 3)) continue;
    out.push(prism(x, y, 0, 4, 3, 2.8, BOOTH_MATS[k % 3]!, { roof: "gable" }));
    accents.push(sign(x + 0.8, x + 3.2, y + 3.02, 1.2, 2, "amber"));
    accents.push(dot(x + 2, y + 3.2, 2.9, 0.4, k % 3 === 2 ? "magenta" : "cyan"));
  }
}

function bumperCars(out: Solid[], accents: Accent[]): void {
  const x = 130, y = -230;
  out.push(prism(x, y, 0, 14, 10, 0.3, "plaza"));
  for (const [dx, dy] of [[0, 0], [7, 0], [14, 0], [0, 10], [7, 10], [14, 10], [0, 5], [14, 5]] as const) out.push(prism(x + dx - 0.2, y + dy - 0.2, 0.3, 0.4, 0.4, 4, "steel"));
  out.push(prism(x - 0.3, y - 0.3, 4.3, 14.6, 10.6, 0.4, "steel"), prism(x - 0.3, y + 10, 3.7, 14.6, 0.3, 0.6, "rust"));
  for (let i = 0; i < 6; i++) out.push(prism(x + 1.5 + (i % 3) * 4, y + 2 + Math.floor(i / 3) * 4, 0.3, 1.8, 1.2, 0.8, i % 2 === 0 ? "rust" : "steel"));
  for (let i = 0; i < 6; i++) accents.push(dot(x + 2 + (i % 3) * 5, y + 2.5 + Math.floor(i / 3) * 5, 3.6, 0.4, "cyan"));
}

function beach(out: Solid[], rng: Rng): void {
  let placed = 0, tries = 0;
  while (placed < 12 && tries++ < 200) {
    const y = rng.int(-334, -212), x = bayShoreX(y) - rng.int(3, 7);
    if (!fairAt(x, y) || bayWater(x, y)) continue;
    out.push(prism(x - 0.12, y - 0.12, 0, 0.25, 0.25, 2, "steel"), cone(x, y, 2, 1.6, 0.7, rng.chance(0.5) ? "whitewash" : "rust", 8));
    placed++;
  }
  for (let k = 0; k < 4; k++) { const y = -320 + k * 28, x = bayShoreX(y) - 9; if (fairAt(x, y)) out.push({ kind: "hull", at: v3(x, y, 0), len: 5, beam: 1.8, h: 0.8, mat: "whitewash", heading: rng.next() * Math.PI, sheer: 0.3 }); }
}

function gate(out: Solid[], accents: Accent[]): void {
  for (const x of [86, 93]) out.push(prism(x, -215.5, 0, 1.5, 1.5, 6, "stone"));
  out.push(prism(85.75, -215.5, 6, 9, 1.5, 1, "copper"));
  accents.push(sign(86.5, 93.5, -213.98, 6.1, 7, "amber"));
  for (const [y0, y1] of [[FAIR.y0 + 8, -218], [-208, FAIR.y1]] as const) if (y1 > y0) out.push(prism(FAIR.x0, y0, 0, 0.3, y1 - y0, 1.2, "steel"));
}

export function fair(rng: Rng): FairScene {
  const solids: Solid[] = [], accents: Accent[] = [];
  boardwalk(solids, accents);
  pier(solids, accents);
  wheelSupport(solids, accents);
  coaster(solids);
  carousel(solids, accents);
  dropTower(solids, accents);
  const arcadeSigns = arcade(solids);
  booths(solids, accents);
  bumperCars(solids, accents);
  beach(solids, rng);
  gate(solids, accents);
  return { ground: [], solids, accents, wheelAxis: v3(WHEEL.x, WHEEL.y, WHEEL.hub), coaster: coasterPath(), drop: { at: v3(DROP.x, DROP.y, 1), h: DROP.h }, arcadeSigns };
}
```

Notas: el `prism` local admite `facade` como objeto literal (`Facade` acepta `floors`, `cols`, `base`); si TypeScript se queja del tipo, importar `Facade` y tiparlo. Las columnas de la rueda: ambas están del lado `−(1, 1)` del plano (detrás en pantalla) para que el `wheel` animado, que se dibuja después de lo estático, nunca tape algo que debería estar delante. El cerco oeste deja el hueco de la portada (`−218..−208`).

`world.ts`: `import { fair, type FairScene } from "./fair";`, campo `fair: FairScene | null`, en el bloque `if (!opts.zones)`: `fa2 = fair(zoneRng(seed, "portfolio", 3))` y concatenar `ground/solids/accents`; devolver `fair: fa2`. `README.md`: sumar `fair.ts` (la feria sobre la bahía al norte de la fábrica) y la central térmica a la descripción de los márgenes.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Ajustes esperables: si algún puesto o tramo del paseo cae en agua (`onFair` falla), se saltea solo; si el conteo de tramos del paseo da menos de 6, correr el paseo 2 u hacia tierra (`− 18` en vez de `− 16`). Si el test "nada delante de la rueda" falla por la taquilla, moverla a `y + 10`.

- [ ] **Step 5: Mirar** `world.html` tecla `4` y `1`: la feria se ve entera al norte, el paseo sigue la orilla, el muelle entra en la bahía, la rueda (todavía quieta, sin capa animada: no se ve hasta la Task 18) — verificar el resto.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/fair.ts src/scenes/fair.test.ts src/scenes/world.ts src/scenes/world.test.ts README.md
git commit -m "feat(scenes): la feria de la playa: paseo, muelle, montaña rusa, carrusel, arcades, puestos, autitos, portada"
```

### Task 18: Animación de la feria (`fair-anim.ts`, `fair-animator.ts`)

**Files:**
- Create: `src/scenes/fair-anim.ts`, `src/scenes/fair-anim.test.ts`, `src/scenes/fair-animator.ts`, `src/scenes/fair-animator.test.ts`
- Modify: `src/lab/page.ts`

**Interfaces:**
- Produces: `WHEEL_PERIOD_MS = 40000`, `WHEEL_STEP_MS = 250`, `WHEEL_LIGHT_STEP_MS = 150`, `TRAIN_SPEED = 9`, `TRAIN_LIFT_SPEED = 3`, `DROP_CYCLE_MS = 8000`, `DROP_STEP_MS = 100`, `SIGN_ALT_MS = 500`; `createFairAnim(scene: FairScene, opts): FairAnim` con `{ wheel(): Solid[]; wheelLights(): Accent[]; train(): Solid[]; drop(): Solid[]; signs(): Accent[]; angle(): number; trainDist(): number; dropZ(): number; tick(dtMs): FairChanges }`, `FairChanges = { wheel; lights; train; drop; signs }` (booleans); `fairAnimator(scene, opts): Animator` con ids `fair.wheel`, `fair.wheelLights`, `fair.train`, `fair.drop`, `fair.signs`.
- Consumes: `wheelSolid`, `trainSolids`, `dropSolids`, `coasterAt`, `coasterLength`, `WHEEL`, `DROP`, `wheelPoint` (`solids.ts`).

- [ ] **Step 1: Tests** (`fair-anim.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { bounds } from "../iso/solids";
import { createRng } from "../map/seed";
import { DROP, coasterAt, coasterLength, fair } from "./fair";
import { DROP_CYCLE_MS, WHEEL_PERIOD_MS, WHEEL_STEP_MS, createFairAnim } from "./fair-anim";

const setup = (reducedMotion = false) => createFairAnim(fair(createRng(7)), { reducedMotion });

describe("fair-anim", () => {
  it("la rueda da una vuelta en 40 s y se redibuja cada 250 ms; cuatro luces de la llanta encendidas a la vez", () => {
    const a = setup();
    expect(a.angle()).toBe(0);
    expect(a.tick(WHEEL_STEP_MS).wheel).toBe(true); expect(a.tick(50).wheel).toBe(false);
    for (let t = 0; t < WHEEL_PERIOD_MS - WHEEL_STEP_MS - 50; t += 500) a.tick(500);
    expect(a.angle()).toBeGreaterThan(6.2); expect(a.angle()).toBeLessThan(2 * Math.PI);
    expect(a.wheelLights()).toHaveLength(4);
    expect(a.wheel()[0]!.kind).toBe("wheel");
  });
  it("el tren nunca sale de la vía, sube despacio y baja rápido", () => {
    const a = setup();
    const L = coasterLength();
    let prev = a.trainDist(), prevSeg = coasterAt(prev).seg;
    for (let t = 0; t < 60; t++) {
      a.tick(1000);
      const d = a.trainDist(), p = coasterAt(d);
      const moved = ((d - prev) % L + L) % L; prev = d;
      expect(moved).toBeGreaterThan(0); expect(moved).toBeLessThanOrEqual(9.01);
      if (prevSeg < 6 && p.seg < 6) expect(moved).toBeLessThanOrEqual(3.01); // la velocidad se decide al arrancar el tick
      prevSeg = p.seg;
      for (const s of a.train()) { const b = bounds(s); expect(Math.abs((b.min.z + b.max.z) / 2 - p.z)).toBeLessThan(2.5); }
    }
  });
  it("la góndola sube 6 s, espera 1 s, cae en 0.6 s y vuelve a la base al final del ciclo", () => {
    const a = setup();
    expect(a.dropZ()).toBe(1);
    for (let t = 0; t < 6000; t += 100) a.tick(100);
    expect(a.dropZ()).toBeCloseTo(DROP.h - 3, 1);
    a.tick(1000); expect(a.dropZ()).toBeCloseTo(DROP.h - 3, 1);
    a.tick(600); expect(a.dropZ()).toBeCloseTo(1, 1);
    a.tick(DROP_CYCLE_MS - 7600); expect(a.dropZ()).toBeCloseTo(1, 1);
    expect(a.drop()).toHaveLength(9);
  });
  it("los carteles del salón alternan cada 500 ms; con reduced-motion nada cambia y la rueda tiene sus 4 luces fijas", () => {
    const a = setup();
    const s0 = a.signs()[0]!.color; a.tick(500); expect(a.signs()[0]!.color).not.toBe(s0);
    const r = setup(true);
    expect(r.tick(1000)).toEqual({ wheel: false, lights: false, train: false, drop: false, signs: false });
    expect(r.wheelLights()).toHaveLength(4); expect(r.angle()).toBe(0);
  });
});
```

`fair-animator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { fair } from "./fair";
import { fairAnimator } from "./fair-animator";

describe("fairAnimator", () => {
  it("expone rueda, luces, tren, torre y carteles; con reduced-motion no devuelve ids", () => {
    const a = fairAnimator(fair(createRng(7)), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["fair.drop", "fair.signs", "fair.train", "fair.wheel", "fair.wheelLights"]);
    expect(a.layer("fair.wheel").kind).toBe("solid"); expect(a.layer("fair.wheelLights").kind).toBe("accent");
    expect(a.tick(250).has("fair.wheel")).toBe(true);
    expect(fairAnimator(fair(createRng(7)), { reducedMotion: true }).tick(1000).size).toBe(0);
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `fair-anim.ts`**

```ts
import type { Accent } from "../iso/accent";
import { wheelPoint, type Solid } from "../iso/solids";
import { DROP, WHEEL, coasterAt, coasterLength, dropSolids, trainSolids, wheelSolid, type FairScene } from "./fair";

/**
 * La feria en movimiento, sin Pixi: la vuelta al mundo gira (una vuelta cada
 * 40 s) con cuatro luces que corren por la llanta, el tren recorre el
 * circuito (lento en la subida, rápido después), la góndola de la torre sube,
 * espera y cae, y los dos carteles del salón alternan. Frame 0 = rueda en 0,
 * tren en la estación, góndola abajo, cuatro luces fijas, cartel magenta.
 */
export const WHEEL_PERIOD_MS = 40000, WHEEL_STEP_MS = 250, WHEEL_LIGHT_STEP_MS = 150, WHEEL_LIT = 4;
export const TRAIN_SPEED = 9, TRAIN_LIFT_SPEED = 3, LIFT_SEGMENTS = 6;
export const DROP_CYCLE_MS = 8000, DROP_STEP_MS = 100, DROP_RISE_MS = 6000, DROP_HOLD_MS = 1000, DROP_FALL_MS = 600;
export const SIGN_ALT_MS = 500;

export interface FairChanges { wheel: boolean; lights: boolean; train: boolean; drop: boolean; signs: boolean }
export interface FairAnim { wheel(): Solid[]; wheelLights(): Accent[]; train(): Solid[]; drop(): Solid[]; signs(): Accent[]; angle(): number; trainDist(): number; dropZ(): number; tick(dtMs: number): FairChanges }

/** Altura de la góndola sobre la base dentro del ciclo: subida lineal, pausa, caída cuadrática, pausa. */
export function dropEase(ms: number): number {
  const t = ms % DROP_CYCLE_MS;
  if (t < DROP_RISE_MS) return t / DROP_RISE_MS;
  if (t < DROP_RISE_MS + DROP_HOLD_MS) return 1;
  const f = (t - DROP_RISE_MS - DROP_HOLD_MS) / DROP_FALL_MS;
  return f < 1 ? 1 - f * f : 0;
}

export function createFairAnim(scene: FairScene, opts: { reducedMotion: boolean }): FairAnim {
  const L = coasterLength(), base = scene.drop.at.z, top = DROP.h - 3;
  let clock = 0, wheelStep = 0, lightStep = 0, dropStep = 0, signStep = 0, dist = 0;
  const angle = () => (opts.reducedMotion ? 0 : (2 * Math.PI * (clock % WHEEL_PERIOD_MS)) / WHEEL_PERIOD_MS);
  const dropZ = () => base + (top - base) * (opts.reducedMotion ? 0 : dropEase(clock));
  return {
    wheel: () => [wheelSolid(angle())],
    wheelLights: () => Array.from({ length: WHEEL.sides }, (_, k) => k).filter((k) => (k + lightStep) % WHEEL.sides < WHEEL_LIT).map((k) => { const p = wheelPoint(scene.wheelAxis, angle() + (2 * Math.PI * (k + 0.5)) / WHEEL.sides, WHEEL.r - 0.6); return { kind: "dot" as const, at: p, r: 0.4, color: "magenta" as const }; }),
    train: () => trainSolids(dist),
    drop: () => dropSolids(dropZ()),
    signs: () => [scene.arcadeSigns[signStep % 2]!],
    angle, trainDist: () => dist, dropZ,
    tick(dtMs) {
      const c: FairChanges = { wheel: false, lights: false, train: false, drop: false, signs: false };
      if (opts.reducedMotion || dtMs <= 0) return c;
      clock += dtMs;
      const ws = Math.floor(clock / WHEEL_STEP_MS); if (ws !== wheelStep) { wheelStep = ws; c.wheel = true; c.lights = true; }
      const ls = Math.floor(clock / WHEEL_LIGHT_STEP_MS); if (ls !== lightStep) { lightStep = ls; c.lights = true; }
      const speed = coasterAt(dist).seg < LIFT_SEGMENTS ? TRAIN_LIFT_SPEED : TRAIN_SPEED;
      dist = (dist + (speed * dtMs) / 1000) % L; c.train = true;
      const ds = Math.floor(clock / DROP_STEP_MS); if (ds !== dropStep) { dropStep = ds; c.drop = true; }
      const ss = Math.floor(clock / SIGN_ALT_MS); if (ss !== signStep) { signStep = ss; c.signs = true; }
      return c;
    },
  };
}
```

`fair-animator.ts`:

```ts
import type { AnimLayer, Animator } from "./animator";
import type { FairScene } from "./fair";
import { createFairAnim } from "./fair-anim";

/** Adapta la feria al contrato `Animator`: rueda, tren y góndola como sólidos animados; luces y carteles como acentos. */
export function fairAnimator(scene: FairScene, opts: { reducedMotion: boolean }): Animator {
  const anim = createFairAnim(scene, opts);
  const layers: Record<string, () => AnimLayer> = {
    "fair.wheel": () => ({ kind: "solid", solids: anim.wheel() }),
    "fair.wheelLights": () => ({ kind: "accent", accents: anim.wheelLights() }),
    "fair.train": () => ({ kind: "solid", solids: anim.train() }),
    "fair.drop": () => ({ kind: "solid", solids: anim.drop() }),
    "fair.signs": () => ({ kind: "accent", accents: anim.signs() }),
  };
  return {
    ids: Object.keys(layers),
    layer: (id) => layers[id]!(),
    tick(dtMs) { const c = anim.tick(dtMs), out = new Set<string>(); if (c.wheel) out.add("fair.wheel"); if (c.lights) out.add("fair.wheelLights"); if (c.train) out.add("fair.train"); if (c.drop) out.add("fair.drop"); if (c.signs) out.add("fair.signs"); return out; },
  };
}
```

`page.ts`: `if (scene.fair) animators.push(fairAnimator(scene.fair, { reducedMotion }));`.

- [ ] **Step 4: Correr `npm test && npm run typecheck`** → PASS. Si el test del tren falla en la aserción de z por 2.5 en la bajada más brusca (14 → 13 → 9), subir la tolerancia a 3.

- [ ] **Step 5: Mirar** `world.html` tecla `4` 15 s: la rueda gira de frente con luces corriendo, el tren sube y baja, la góndola cae, los carteles alternan, las chimeneas de la central humean.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/fair-anim.ts src/scenes/fair-anim.test.ts src/scenes/fair-animator.ts src/scenes/fair-animator.test.ts src/scenes/fair.ts src/lab/page.ts
git commit -m "feat(scenes): la feria se mueve: vuelta al mundo con luces, tren de la montaña rusa, torre de caída, carteles"
```

### Task 19: Capturas, medición final y documentación

**Files:**
- Modify: spec (`Estado`, "Desvíos de la implementación"), `README.md`, este plan (`## Estado`).

- [ ] **Step 1: Capturas** de `world.html` con teclas `4`, `1`, `2`, `3` (viewport `1600 900 2`) y recortes: la feria, el distrito tecnológico, los barcos, el agua del sur. Revisar contra la spec §9 (criterios 1–4) y anotar PASS/FAIL por ítem.
- [ ] **Step 2: Medir** `world.html` (primer dibujo, polígonos, peor redibujo) dos veces; comparar con las metas de §8. Si el peor redibujo supera 15 ms, aplicar en orden las tres decisiones gateadas (§8.1 agua, §8.3 barcos, §8.2 fachadas) y volver a medir después de cada una.
- [ ] **Step 3: Documentar**: en la spec, `**Estado:** implementada (fecha)` y la sección `### Desvíos de la implementación` bajo §2 con: cifras antes/después, variantes elegidas, desvíos de coordenadas (paseo, ruta de la lancha, taquilla), cualquier umbral de test que se haya movido. En `README.md`, la lista de escenas (`tech.ts`, `fair.ts`, central en `hinterland.ts`) y la spec nueva. En este plan, `## Estado: implementado (fecha)` con el resumen de desvíos, como en los planes anteriores.
- [ ] **Step 4: `npm test && npm run typecheck && npm run build`** → verdes; `dist/` sin `lab/`.
- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-15-mundo-3-tecnologico-feria-agua-barcos-design.md docs/superpowers/plans/2026-09-15-mundo-3-tecnologico-feria-agua-barcos.md README.md
git commit -m "docs: Mundo 3 implementado: estado, medidas y desvíos"
```

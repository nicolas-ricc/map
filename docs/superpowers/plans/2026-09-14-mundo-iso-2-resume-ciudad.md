# Mundo isométrico, parte 2: Resume, la ciudad de oficinas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enchufar la zona Resume al mundo del laboratorio: una ciudad de oficinas en grilla sobre las dos riberas del estuario, unida por un puente, con la torre de 30 y su piso encendido como landmark, malecón contra el mar, manzana derrumbada, selva que la devora, tres animaciones de acentos y una página `lab/resume.html`.

**Architecture:** Un módulo puro `src/scenes/city-grid.ts` fija la grilla (columnas, filas, avenida, plaza, puente, malecón, derrumbe, cráteres) y es la única fuente para el terreno (`cityTerrainAt`) y la escena (`city.ts`). El terreno de la ciudad es asfalto plano; cada manzana es un zócalo (prisma chato de `paving`) con contenido elegido por `rng` entre cuatro tipos. `city-anim.ts` (puro, con estado) y `city-animator.ts` (adaptador al contrato `Animator`) mueven solo acentos. `world.ts` concatena la ciudad y `src/lab/page.ts` arma cualquier página del laboratorio en una llamada.

**Tech Stack:** TypeScript strict, Vite 8, pixi.js 8.20 (solo en `src/lab/`), Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-14-resume-ciudad-design.md` (y `2026-09-14-mundo-isometrico-design.md` §4 "Rulings de la parte 1").

## Global Constraints

- `src/iso/` y `src/scenes/` **no importan `pixi.js`** (`src/iso/pixi-free.test.ts` lo verifica). Solo `src/lab/runtime.ts` y `src/lab/draw.ts` tocan Pixi.
- Proyección: `sx = x - y`, `sy = (x + y) / 2 - z * Z_SCALE`, `Z_SCALE = 1.4`. `x` este, `y` sur, `z` arriba. Cámara al SE: las paredes visibles de un prisma son la **este** (normal +x) y la **sur** (normal +y).
- **Ningún literal `0x......` (seis dígitos hex) fuera de `palette.ts`, `palette-iso.ts` y `seed.ts`** (`palette-guard.test.ts`). Un seed como `0xc0ffee` también dispara el guard.
- Mundo: `WORLD_W = 560`, `WORLD_H = 270`. Resume es x 0..344, y 146..270 (`ZONE_SPLIT_X = 344`, `ZONE_SPLIT_Y = 146`). `CELL = 6`.
- Materiales de la ciudad: `office`, `officeDark`, `glass`, `asphalt`, `paving`, `plaza` (exclusivos) y `leaf`, `leafDark`, `water`, `steel`, `rust` (compartidos). **Nada de `slab`, `concrete`, `road`, `rail`, `sand`, `hull`, `deck`, `whitewash`, `foam`** en la ciudad. No se crean materiales ni colores.
- Acentos de la ciudad: solo `amber`, `amberMid`, `amberBleed`.
- Alturas: la torre landmark mide 30; ningún **edificio** (prisma con fachada) supera 18; ningún otro sólido de la ciudad supera z 21 (detalle de techo sobre un edificio de 16). `SHADOW_MAX_H = 18` ya tapa las sombras.
- El laboratorio **no entra en `dist/`**: nada en `build.rollupOptions.input`; `scripts/prerender.ts` no menciona `lab`.
- Texto y comentarios en español. Commits con prefijos `feat:`, `test:`, `refactor:`, `docs:`. `npm test` y `npm run typecheck` verdes al final de cada task.
- Con `reducedMotion: true` un `Animator` nunca devuelve ids en `tick` y sus capas quedan en el frame 0.
- Rng: `createRng(seed)` da `{ next(), int(min, max), chance(p), pick(arr) }` (`src/map/seed.ts`). Toda escena y animación son deterministas por seed.

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/map/geo.ts` | modificar | + `CELL`, `QUAY_X`, `QUAY_W`, `BOTTOM`, `DOCK`, `eastBank` (mudados desde `shipyard.ts` y `terrain.ts`) |
| `src/scenes/shipyard.ts` | modificar | importa y re-exporta esas constantes; `jungle()` pasa a usar `flora.ts` |
| `src/scenes/flora.ts` | crear | `jungle(out, rng, rect, n, z?)`: conos de selva, receta compartida |
| `src/scenes/city-grid.ts` | crear | constantes de la grilla, `blocks()`, `estuaryEast(y)`, `inCrater(x, y)`, `Rect`, `Block` |
| `src/scenes/terrain.ts` | modificar | `asphalt` reemplaza a `paving`; `cityTerrainAt` lee `city-grid.ts`; `estuaryEast` se va de acá |
| `src/scenes/city.ts` | crear | `city(rng): CityScene`, funciones por sector |
| `src/scenes/city-anim.ts` | crear | `createCityAnim`: parpadeo, papeles, antena (puro, con estado) |
| `src/scenes/city-animator.ts` | crear | `cityAnimator(scene, rng, opts): Animator` con ids `city.lit`, `city.papers`, `city.antenna` |
| `src/scenes/world.ts` | modificar | `city: CityScene \| null`, `LANDMARKS.cv = (129, 227, 0)` |
| `src/lab/page.ts` | crear | `bootWorldPage(zones, frame)`: arma escena + animadores y llama a `bootLab` |
| `src/lab/portfolio.ts`, `src/lab/world.ts` | modificar | entradas de dos líneas |
| `src/lab/resume.ts`, `lab/resume.html` | crear | página de Resume (zonas `portfolio` + `cv`, encuadre `cv`) |
| Tests | crear/modificar | `flora.test.ts`, `city-grid.test.ts`, `terrain.test.ts`, `city.test.ts`, `city-anim.test.ts`, `city-animator.test.ts`, `world.test.ts`, `lab-excluded.test.ts` |
| Docs | modificar | spec de Resume (desvíos), spec del mundo (estado), README (laboratorio), este plan (estado) |

**Desvíos respecto de la spec, decididos al planificar** (se documentan en la Task 8):

- Columnas este en x 280 y 310 (no 276 y 306) y malecón en 334..344 (no 330..344): con 276 la manzana de la fila 218..236 quedaba a menos de una calle del agua (`estuaryEast(236) ≈ 272.5`). El cráter este pasa a (307, 224) para caer en la calle 304..310. El puente llega a x 276 (la calle del anillo este es 274..280).
- La plaza no es un prisma: sus baldosas son un `ground` de `plaza` a nivel de calle (z 0.05) con `toneOffset`, rodeado por un cordón de cuatro prismas finos; la torre apoya a z 0. Motivo: un `ground` se dibuja antes que los sólidos, así que no puede pintarse sobre el techo de un prisma. Las manzanas devoradas usan el mismo esquema (`ground` de `leafDark` + losas de zócalo sueltas).
- La cornisa no usa `toneOffset` (un prisma no lo tiene): se hace con el material contrario (`officeDark` sobre `office` y viceversa).
- La escalera del malecón se abre hacia adentro (x 338..344) para no pisar la zona Blog.
- El parpadeo apaga el piso durante **un tick** (el siguiente `tick` lo vuelve a encender), no 100 ms fijos: así "nunca dos frames apagados seguidos" es verificable con cualquier `dt`.

---

### Task 1: Mudar las constantes del astillero a `geo.ts` y extraer `flora.ts`

**Files:**
- Modify: `src/map/geo.ts`
- Modify: `src/scenes/shipyard.ts:24-42` (constantes) y `src/scenes/shipyard.ts:218-230` (`jungle`)
- Modify: `src/scenes/terrain.ts:1-15` (imports, `CELL`)
- Create: `src/scenes/flora.ts`
- Test: `src/scenes/flora.test.ts`

**Interfaces:**
- Produces: en `src/map/geo.ts`: `export const CELL = 6`, `QUAY_X = 198`, `QUAY_W = 4`, `BOTTOM = 142`, `DOCK = { x: 120, y: 6, w: 72, d: 24, depth: 6 } as const`, `eastBank(y: number): number`. `shipyard.ts` los re-exporta (sus tests y `terrain.test.ts` siguen importándolos de ahí). `terrain.ts` re-exporta `CELL`.
- Produces: en `src/scenes/flora.ts`: `interface Rect { x0: number; x1: number; y0: number; y1: number }` y `jungle(out: Solid[], rng: Rng, rect: Rect, n: number, z = 0.4): void`.

- [ ] **Step 1: Escribir el test de `flora.ts`**

`src/scenes/flora.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Solid } from "../iso/solids";
import { createRng } from "../map/seed";
import { jungle } from "./flora";

describe("flora", () => {
  it("pone n conos de selva dentro del rectángulo, a la altura pedida", () => {
    const out: Solid[] = [];
    jungle(out, createRng(7), { x0: 10, x1: 20, y0: 30, y1: 40 }, 8, 0.2);
    expect(out).toHaveLength(8);
    for (const s of out) {
      expect(s.kind).toBe("cone");
      if (s.kind !== "cone") continue;
      expect(["leaf", "leafDark"]).toContain(s.mat);
      expect(s.at.x).toBeGreaterThanOrEqual(10); expect(s.at.x).toBeLessThanOrEqual(20);
      expect(s.at.y).toBeGreaterThanOrEqual(30); expect(s.at.y).toBeLessThanOrEqual(40);
      expect(s.at.z).toBe(0.2);
      expect(s.r).toBeGreaterThanOrEqual(2); expect(s.r).toBeLessThanOrEqual(4);
      expect(s.h).toBeGreaterThanOrEqual(5); expect(s.h).toBeLessThanOrEqual(9);
    }
  });
  it("es determinística y por defecto apoya a z 0.4", () => {
    const a: Solid[] = [], b: Solid[] = [];
    jungle(a, createRng(3), { x0: 0, x1: 5, y0: 0, y1: 5 }, 3);
    jungle(b, createRng(3), { x0: 0, x1: 5, y0: 0, y1: 5 }, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.every((s) => s.kind === "cone" && s.at.z === 0.4)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `npx vitest run src/scenes/flora.test.ts`
Expected: FAIL, `Cannot find module './flora'`.

- [ ] **Step 3: Crear `flora.ts`**

```ts
import { v3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";

export interface Rect { x0: number; x1: number; y0: number; y1: number }

/**
 * Selva compartida por todas las zonas: `n` conos con r 2..4 y h 5..9, 60 % en
 * `leaf` y el resto en `leafDark`, con la base a `z`. El orden de llamadas al
 * rng (material, x, y, r, h) es el que tenía shipyard.ts: no cambia su salida.
 */
export function jungle(out: Solid[], rng: Rng, rect: Rect, n: number, z = 0.4): void {
  for (let i = 0; i < n; i++) {
    const mat = rng.chance(0.6) ? "leaf" : "leafDark";
    out.push({ kind: "cone", at: v3(rng.int(rect.x0, rect.x1), rng.int(rect.y0, rect.y1), z), r: rng.int(2, 4), h: rng.int(5, 9), mat });
  }
}
```

- [ ] **Step 4: Mudar las constantes a `geo.ts`**

Al final de `src/map/geo.ts` agregar:

```ts
// ---------------------------------------------------------------- astillero (lo comparte el terreno)

/** Lado de la grilla de terreno. Vive acá para que city-grid.ts y terrain.ts lo compartan sin importarse. */
export const CELL = 6;
// Ruling del controller: 198 (no 200) porque es múltiplo de CELL = 6; con 200
// la celda 198..204 tiene centro 201 (agua) pero vértices en x=198, rompiendo
// la propiedad "todo el agua tiene x >= QUAY_X".
export const QUAY_X = 198, QUAY_W = 4;
export const BOTTOM = 142;
export const DOCK = { x: 120, y: 6, w: 72, d: 24, depth: 6 } as const; // alineado a CELL
export const eastBank = (y: number): number => riverCenter(y) + RIVER_HALF;
```

En `src/scenes/shipyard.ts` borrar las definiciones de `QUAY_X`, `QUAY_W`, `BOTTOM`, `DOCK` y `eastBank` (y el comentario del ruling, que ahora vive en `geo.ts`) y cambiar el import de geo por:

```ts
import { BOTTOM, DOCK, MOUTH_Y, QUAY_W, QUAY_X, eastBank } from "../map/geo";
export { BOTTOM, DOCK, QUAY_W, QUAY_X, eastBank };
```

(si `tsc` avisa que `RIVER_HALF` o `riverCenter` ya no se usan en `shipyard.ts`, quitarlos del import; si se usan, dejarlos.)

Reemplazar la función `jungle` de `shipyard.ts` por una que delega en `flora.ts` con los mismos rectángulos y cantidades:

```ts
import { jungle as flora } from "./flora";

function jungle(out: Solid[], rng: Rng): void {
  const cluster = (x0: number, x1: number, y0: number, y1: number, n: number) => flora(out, rng, { x0, x1, y0, y1 }, n);
  cluster(3, 39, 102, 125, 10);   // SO, al norte de las vías (r ≤ 4: nunca las pisa)
  cluster(3, 39, 139, 143, 4);    // SO, al sur de las vías
  cluster(332, 340, 26, 94, 6);   // borde este, entre la bahía y la punta
  cluster(332, 340, 136, 143, 2); // al sur de la punta
  cluster(301, 328, 127, 143, 6); // al sur de los galpones, sin pisar la base de la punta (x ≥ 330)
}
```

En `src/scenes/terrain.ts` cambiar los imports: quitar `import { BOTTOM, DOCK, QUAY_X, eastBank } from "./shipyard";`, agregar `BOTTOM, CELL, DOCK, QUAY_X, eastBank` al import de `../map/geo`, y reemplazar `export const CELL = 6;` por `export { CELL };`.

- [ ] **Step 5: Correr todo**

Run: `npm test && npm run typecheck`
Expected: todo verde (239 + 2 tests). `shipyard.test` sigue pasando porque el orden de llamadas al rng no cambió.

- [ ] **Step 6: Commit**

```bash
git add src/map/geo.ts src/scenes/shipyard.ts src/scenes/terrain.ts src/scenes/flora.ts src/scenes/flora.test.ts
git commit -m "refactor(scenes): constantes del astillero en geo.ts y selva compartida en flora.ts"
```

---

### Task 2: `city-grid.ts`, la grilla determinista

**Files:**
- Create: `src/scenes/city-grid.ts`
- Test: `src/scenes/city-grid.test.ts`

**Interfaces:**
- Consumes: `CELL`, `QUAY_X`, `ZONE_SPLIT_Y`, `eastBank` de `src/map/geo.ts`.
- Produces (todo exportado desde `src/scenes/city-grid.ts`):
  - `interface Rect { x: number; y: number; w: number; d: number }`
  - `BLOCK_W = 24`, `BLOCK_D = 18`, `STREET = 6`, `SIDEWALK = 1.5`
  - `WEST_COLS = [12, 42, 72, 102, 132, 162]`, `EAST_COLS = [280, 310]`, `ROWS = [164, 188, 218, 242]`
  - `AVENUE = { y0: 206, y1: 218 }`, `BOULEVARD = { y0: 210, y1: 214 }`
  - `WEST_QUAY = { x0: 192, x1: 198 }`, `EAST_RING = { x0: 274, x1: 280 }`, `CITY_EDGE = { west: 12, north: 158, south: 266 }`
  - `PLAZA: Rect = { x: 102, y: 218, w: 54, d: 18 }`, `TOWER: Rect = { x: 121, y: 220, w: 16, d: 14 }`
  - `BRIDGE = { x0: 192, x1: 276, y0: 207, y1: 217, z: 1.2, deckH: 0.6 }`, `MALECON = { x0: 334, x1: 344, y0: 158, y1: 266, z: 0.6 }`
  - `COLLAPSED: Rect = { x: 280, y: 242, w: 24, d: 18 }`
  - `CRATERS: readonly { x: number; y: number; r: number }[] = [{ x: 60, y: 185, r: 5 }, { x: 150, y: 239, r: 6 }, { x: 307, y: 224, r: 5 }]`
  - `ESTUARY_FLARE = 0.35`, `estuaryEast(y: number): number`
  - `type BlockKind = "block" | "plaza" | "collapsed"`, `interface Block extends Rect { bank: "west" | "east"; row: number; kind: BlockKind }`
  - `blocks(): Block[]`, `inCrater(x: number, y: number): boolean`, `inBlock(x: number, y: number): boolean`

- [ ] **Step 1: Escribir los tests**

`src/scenes/city-grid.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { QUAY_X, ZONE_SPLIT_X, ZONE_SPLIT_Y } from "../map/geo";
import { AVENUE, BLOCK_D, BLOCK_W, BRIDGE, CITY_EDGE, COLLAPSED, CRATERS, EAST_RING, MALECON, PLAZA, ROWS, STREET, TOWER, WEST_QUAY, blocks, estuaryEast, inBlock, inCrater } from "./city-grid";

const overlaps = (a: { x: number; y: number; w: number; d: number }, b: { x: number; y: number; w: number; d: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

describe("city-grid", () => {
  it("hay al menos 30 manzanas, una plaza y un derrumbe, y ninguna se pisa con otra", () => {
    const bs = blocks();
    expect(bs.length).toBeGreaterThanOrEqual(30);
    expect(bs.filter((b) => b.kind === "plaza")).toHaveLength(1);
    expect(bs.filter((b) => b.kind === "collapsed")).toHaveLength(1);
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) expect(overlaps(bs[i]!, bs[j]!)).toBe(false);
  });

  it("entre manzanas vecinas queda al menos una calle", () => {
    for (const a of blocks()) for (const b of blocks()) {
      if (a === b) continue;
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gapY = Math.max(b.y - (a.y + a.d), a.y - (b.y + b.d));
      expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(STREET);
    }
  });

  it("toda manzana cae en tierra de la ciudad: lejos del estuario, dentro de los bordes", () => {
    for (const b of blocks()) {
      expect(b.x).toBeGreaterThanOrEqual(CITY_EDGE.west);
      expect(b.y).toBeGreaterThanOrEqual(CITY_EDGE.north + STREET);
      expect(b.y + b.d).toBeLessThanOrEqual(CITY_EDGE.south - STREET);
      if (b.bank === "west") expect(b.x + b.w).toBeLessThanOrEqual(WEST_QUAY.x0 - STREET);
      else {
        expect(b.x + b.w).toBeLessThanOrEqual(MALECON.x0);
        if (b.kind !== "collapsed") expect(b.x).toBeGreaterThanOrEqual(estuaryEast(b.y + b.d) + STREET);
      }
    }
    // el derrumbe es la única manzana que el agua toca
    expect(COLLAPSED.x).toBeLessThan(estuaryEast(COLLAPSED.y + COLLAPSED.d) + STREET);
  });

  it("la avenida separa las filas 2 y 3 y el puente la cruza de muelle a anillo", () => {
    expect(ROWS[1] + BLOCK_D).toBe(AVENUE.y0);
    expect(ROWS[2]).toBe(AVENUE.y1);
    expect(BRIDGE.x0).toBe(WEST_QUAY.x0);
    expect(BRIDGE.x1).toBe(EAST_RING.x1 - STREET);
    expect(BRIDGE.y0).toBeGreaterThanOrEqual(AVENUE.y0);
    expect(BRIDGE.y1).toBeLessThanOrEqual(AVENUE.y1);
    expect(estuaryEast(BRIDGE.y1)).toBeLessThan(BRIDGE.x1); // el puente llega a tierra
  });

  it("la plaza y la torre están en su lugar y la torre entra en la plaza", () => {
    expect(blocks().find((b) => b.kind === "plaza")).toMatchObject(PLAZA);
    expect(PLAZA.y).toBe(AVENUE.y1);
    expect(overlaps(TOWER, PLAZA)).toBe(true);
    expect(TOWER.x).toBeGreaterThan(PLAZA.x); expect(TOWER.x + TOWER.w).toBeLessThan(PLAZA.x + PLAZA.w);
    expect(TOWER.y).toBeGreaterThan(PLAZA.y); expect(TOWER.y + TOWER.d).toBeLessThan(PLAZA.y + PLAZA.d);
  });

  it("los cráteres están sobre calles, no sobre manzanas", () => {
    expect(CRATERS).toHaveLength(3);
    for (const c of CRATERS) {
      expect(inBlock(c.x, c.y)).toBe(false);
      expect(inCrater(c.x, c.y)).toBe(true);
      expect(inCrater(c.x + c.r + 1, c.y)).toBe(false);
    }
    expect(inBlock(PLAZA.x + 1, PLAZA.y + 1)).toBe(true);
  });

  it("el estuario hereda el canal en la costura y se abre hacia el sur", () => {
    expect(estuaryEast(ZONE_SPLIT_Y)).toBeGreaterThan(QUAY_X + 30);
    expect(estuaryEast(ZONE_SPLIT_Y)).toBeLessThan(QUAY_X + 60);
    expect(estuaryEast(260) - estuaryEast(ZONE_SPLIT_Y)).toBeCloseTo((260 - ZONE_SPLIT_Y) * 0.35, 6);
    expect(estuaryEast(270)).toBeLessThan(ZONE_SPLIT_X - 40);
    expect(BLOCK_W).toBe(24);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/city-grid.test.ts`
Expected: FAIL, `Cannot find module './city-grid'`.

- [ ] **Step 3: Escribir `city-grid.ts`**

```ts
import { CELL, QUAY_X, ZONE_SPLIT_Y, eastBank } from "../map/geo";

/**
 * Grilla de Resume, la ciudad de oficinas. Módulo puro y sin rng: es la única
 * fuente de verdad para el terreno (cityTerrainAt) y para la escena (city.ts),
 * así el asfalto y los zócalos no pueden desalinearse. Coordenadas de mundo.
 * Spec: docs/superpowers/specs/2026-09-14-resume-ciudad-design.md §2.
 */
export interface Rect { x: number; y: number; w: number; d: number }

export const BLOCK_W = 24, BLOCK_D = 18, STREET = 6;
export const SIDEWALK = 1.5; // vereda libre dentro del zócalo

export const WEST_COLS = [12, 42, 72, 102, 132, 162] as const;
export const EAST_COLS = [280, 310] as const;
export const ROWS = [164, 188, 218, 242] as const;

export const AVENUE = { y0: 206, y1: 218 } as const;
export const BOULEVARD = { y0: 210, y1: 214 } as const;
export const WEST_QUAY = { x0: 192, x1: QUAY_X } as const;   // muro de contención de la ribera oeste
export const EAST_RING = { x0: 274, x1: 280 } as const;      // calle que bordea la ribera este
export const CITY_EDGE = { west: 12, north: 158, south: 266 } as const; // selva más allá

export const PLAZA: Rect = { x: 102, y: 218, w: 54, d: 18 }; // une dos columnas de la fila sur de la avenida
export const TOWER: Rect = { x: 121, y: 220, w: 16, d: 14 }; // centrada en (129, 227)
export const BRIDGE = { x0: 192, x1: 276, y0: 207, y1: 217, z: 1.2, deckH: 0.6 } as const;
export const MALECON = { x0: 334, x1: 344, y0: 158, y1: 266, z: 0.6 } as const;
export const COLLAPSED: Rect = { x: 280, y: 242, w: 24, d: 18 }; // el estuario ya llega a x ≈ 281 en y 260
export const CRATERS: readonly { x: number; y: number; r: number }[] = [{ x: 60, y: 185, r: 5 }, { x: 150, y: 239, r: 6 }, { x: 307, y: 224, r: 5 }];

/**
 * Ruling de la parte 1: el estuario hereda el ancho del canal del astillero en
 * la última fila de celdas antes de la costura (centro y = 141) y se abre
 * hacia el sur, en vez de seguir el meandro de riverCenter.
 */
const SEAM_CY = Math.floor(ZONE_SPLIT_Y / CELL) * CELL - CELL / 2;
export const ESTUARY_FLARE = 0.35; // cuánto se abre la ribera este por unidad hacia el sur
export const estuaryEast = (y: number): number => eastBank(SEAM_CY) + Math.max(0, y - ZONE_SPLIT_Y) * ESTUARY_FLARE;

export type BlockKind = "block" | "plaza" | "collapsed";
export interface Block extends Rect { bank: "west" | "east"; row: number; kind: BlockKind }

export function blocks(): Block[] {
  const out: Block[] = [];
  ROWS.forEach((y, row) => {
    for (const x of WEST_COLS) {
      if (y === PLAZA.y && x >= PLAZA.x && x < PLAZA.x + PLAZA.w) continue; // la plaza une esas dos
      out.push({ x, y, w: BLOCK_W, d: BLOCK_D, bank: "west", row, kind: "block" });
    }
    for (const x of EAST_COLS) {
      const kind: BlockKind = x === COLLAPSED.x && y === COLLAPSED.y ? "collapsed" : "block";
      out.push({ x, y, w: BLOCK_W, d: BLOCK_D, bank: "east", row, kind });
    }
  });
  out.push({ ...PLAZA, bank: "west", row: 2, kind: "plaza" });
  return out;
}

export function inCrater(x: number, y: number): boolean {
  return CRATERS.some((c) => Math.hypot(x - c.x, y - c.y) <= c.r);
}

export function inBlock(x: number, y: number): boolean {
  return blocks().some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d);
}
```

- [ ] **Step 4: Correr los tests**

Run: `npx vitest run src/scenes/city-grid.test.ts && npm run typecheck`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/city-grid.ts src/scenes/city-grid.test.ts
git commit -m "feat(scenes): grilla determinista de la ciudad de Resume"
```

---

### Task 3: Terreno de la ciudad: asfalto, ribera este y cráteres

**Files:**
- Modify: `src/scenes/terrain.ts` (tipo `Terrain`, `cityTerrainAt`, tablas `BASE_Z`/`JITTER`/`MAT`, `buildTerrain`)
- Modify: `src/scenes/terrain.test.ts:30-34`
- Test: `src/scenes/terrain.test.ts`

**Interfaces:**
- Consumes: `CITY_EDGE`, `EAST_RING`, `estuaryEast`, `inCrater` de `city-grid.ts`.
- Produces: `Terrain` pasa a ser `"slab" | "water" | "east" | "jungle" | "dock" | "asphalt" | "sea" | "shore" | "headland" | "reef"` (sin `paving`). `TerrainMesh.ground` incluye el `ground` de `asphalt`. Sin cambios de firma.

- [ ] **Step 1: Ajustar y ampliar los tests**

En `src/scenes/terrain.test.ts` reemplazar el `it("ciudad: cinturón de selva junto al astillero, río y pavimento", …)` por:

```ts
  it("ciudad: cinturón de selva, estuario, ribera este de selva, cráteres y asfalto", () => {
    expect(terrainAt(50, ZONE_SPLIT_Y + 4)).toBe("jungle");   // cinturón
    expect(terrainAt(5, 200)).toBe("jungle");                  // borde oeste
    expect(terrainAt(100, 268)).toBe("jungle");                // borde sur
    expect(terrainAt(255, 200)).toBe("water");                 // estuario
    expect(terrainAt(268, 200)).toBe("jungle");                // ribera este, antes del anillo
    expect(terrainAt(290, 200)).toBe("asphalt");               // ciudad del este
    expect(terrainAt(60, 185)).toBe("jungle");                 // cráter
    expect(terrainAt(50, 200)).toBe("asphalt");
    expect(terrainAt(340, 200)).toBe("asphalt");               // bajo el malecón
    expect(terrainAt(ZONE_SPLIT_X, 200)).toBe("shore");        // la costura este sigue siendo mar
  });
  it("en la zona cv solo hay asfalto, selva y agua", () => {
    const seen = new Set<string>();
    for (let y = ZONE_SPLIT_Y + 3; y < WORLD_H; y += CELL) for (let x = 3; x < ZONE_SPLIT_X; x += CELL) seen.add(terrainAt(x, y));
    expect([...seen].sort()).toEqual(["asphalt", "jungle", "water"]);
  });
```

Y en el describe de `buildTerrain` agregar:

```ts
  it("el asfalto es casi plano y sale como su propio ground", () => {
    const m = buildTerrain(createRng(7), ["cv"]);
    const asphalt = m.ground.filter((g) => g.kind === "ground" && g.mat === "asphalt").flatMap(tris);
    expect(asphalt.length).toBeGreaterThan(600);
    expect(asphalt.every((t) => t.pts.every((p) => Math.abs(p.z) <= 0.1 || terrainAt(p.x, p.y) !== "asphalt"))).toBe(true);
    expect(m.ground.some((g) => g.kind === "ground" && g.mat === "paving")).toBe(false);
  });
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/terrain.test.ts`
Expected: FAIL en los tests nuevos (`paving` en vez de `asphalt`, ribera este no es selva).

- [ ] **Step 3: Implementar en `terrain.ts`**

Cambiar el tipo:

```ts
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "asphalt" | "sea" | "shore" | "headland" | "reef";
```

Borrar `SEAM_CY`, `ESTUARY_FLARE` y `estuaryEast` de `terrain.ts` (ahora viven en `city-grid.ts`) e importar:

```ts
import { CITY_EDGE, EAST_RING, estuaryEast, inCrater } from "./city-grid";
```

Reemplazar `cityTerrainAt`:

```ts
/**
 * La ciudad: el terreno es la calle (asfalto plano); las manzanas son zócalos
 * que pone city.ts. Selva en los bordes del diorama, en la ribera este del
 * estuario (hasta la calle del anillo) y en los cráteres que rompen el asfalto.
 */
export function cityTerrainAt(x: number, y: number): Terrain {
  if (x >= QUAY_X && x <= estuaryEast(y)) return "water";
  if (y < CITY_EDGE.north || y >= CITY_EDGE.south || x < CITY_EDGE.west) return "jungle";
  if (x > QUAY_X && x < EAST_RING.x0) return "jungle";
  if (inCrater(x, y)) return "jungle";
  return "asphalt";
}
```

En las tablas reemplazar la entrada `paving` por `asphalt`: `BASE_Z` → `asphalt: 0`, `JITTER` → `asphalt: 0.1`, `MAT` → `asphalt: "asphalt"`. En `buildTerrain`, en la lista `ground`, reemplazar `ground("paving")` por `ground("asphalt")`. Dejar `JUNGLE_BELT` solo si algo más lo usa; si no, borrarlo (el cinturón ahora sale de `CITY_EDGE.north`).

- [ ] **Step 4: Correr todo**

Run: `npm test && npm run typecheck`
Expected: verde. Si `world.test` o `shipyard-anim.test` se quejan de conteos, no deberían: la ciudad no cambia el astillero.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/terrain.ts src/scenes/terrain.test.ts
git commit -m "feat(terrain): asfalto, ribera este y cráteres en la zona de la ciudad"
```

---

### Task 4: `city.ts`, primera tanda: zócalos, manzanas, plaza y torre

**Files:**
- Create: `src/scenes/city.ts`
- Test: `src/scenes/city.test.ts`

**Interfaces:**
- Consumes: `city-grid.ts` (todo), `flora.ts` `jungle`, `src/iso/facade.ts` `facadeAccents`, `isWall`, `windowPatches`, `src/iso/solids.ts` `tessellate`, `Solid`, `Tri`, `src/iso/geometry.ts` `v3`, `centroid`.
- Produces:

```ts
export const PLINTH_H = 0.3, TOWER_H = 30, MAX_BUILDING_H = 18;
export interface CityScene {
  ground: Solid[];   // baldosas de la plaza, suelo de manzanas devoradas, carriles (Task 5)
  solids: Solid[];
  accents: Accent[]; // faroles y derrame; NO las ventanas encendidas ni la antena (las anima city-anim)
  tower: { litWindows: Accent[]; antenna: Vec3; paperWindow: Vec3 };
}
export function city(rng: Rng): CityScene;
```

- [ ] **Step 1: Escribir los tests de la primera tanda**

`src/scenes/city.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, type Solid } from "../iso/solids";
import { ZONE_SPLIT_X, ZONE_SPLIT_Y, WORLD_H } from "../map/geo";
import { allIsoColors, type Material } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { PLAZA, TOWER, blocks, inBlock, inCrater } from "./city-grid";
import { MAX_BUILDING_H, PLINTH_H, TOWER_H, city, type CityScene } from "./city";

const scene = (): CityScene => city(createRng(7));
const all = (s: CityScene): Solid[] => [...s.ground, ...s.solids];
const inRect = (b: { min: { x: number; y: number }; max: { x: number; y: number } }, r: { x: number; y: number; w: number; d: number }) =>
  b.min.x >= r.x - 1e-6 && b.max.x <= r.x + r.w + 1e-6 && b.min.y >= r.y - 1e-6 && b.max.y <= r.y + r.d + 1e-6;
const isTowerPiece = (s: Solid) => { const b = bounds(s); return b.min.x >= TOWER.x - 2 && b.max.x <= TOWER.x + TOWER.w + 2 && b.min.y >= TOWER.y - 2 && b.max.y <= TOWER.y + TOWER.d + 2; };

const CITY_MATS: readonly Material[] = ["office", "officeDark", "glass", "asphalt", "paving", "plaza", "leaf", "leafDark", "water", "steel", "rust"];

describe("city", () => {
  it("es determinística por seed", () => {
    expect(JSON.stringify(city(createRng(7)))).toBe(JSON.stringify(city(createRng(7))));
    expect(JSON.stringify(city(createRng(7)))).not.toBe(JSON.stringify(city(createRng(8))));
  });

  it("todo cae en la zona Resume salvo la selva del cinturón, y usa solo materiales de la ciudad", () => {
    for (const s of all(scene())) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1); expect(b.max.x).toBeLessThanOrEqual(ZONE_SPLIT_X + 1);
      expect(b.max.y).toBeLessThanOrEqual(WORLD_H + 1);
      if (s.kind !== "cone") expect(b.min.y).toBeGreaterThanOrEqual(ZONE_SPLIT_Y - 1);
      expect(CITY_MATS).toContain(s.mat);
      if (s.mat === "steel" || s.mat === "rust") expect(["prism", "cylinder"]).toContain(s.kind); // solo mobiliario y autos
    }
  });

  it("hay un zócalo por manzana construida y los edificios apoyan sobre él", () => {
    const s = scene();
    const plinths = s.solids.filter((x) => x.kind === "prism" && x.mat === "paving" && x.h === PLINTH_H && x.at.z === 0);
    expect(plinths.length).toBeGreaterThanOrEqual(25);
    const buildings = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.facade !== undefined);
    expect(buildings.length).toBeGreaterThanOrEqual(25);
    for (const b of buildings) {
      if (isTowerPiece(b)) continue;
      expect(b.at.z).toBe(PLINTH_H);
      expect(b.h).toBeLessThanOrEqual(MAX_BUILDING_H);
      expect(b.h).toBeGreaterThanOrEqual(4);
      expect(blocks().some((blk) => inRect(bounds(b), blk))).toBe(true); // dentro de una manzana
    }
  });

  it("la torre mide 30 sobre la plaza, tiene fachada 8×4 con el piso 5 encendido, y nada más supera 21", () => {
    const s = scene();
    const tower = s.solids.find((x): x is Solid & { kind: "prism" } => x.kind === "prism" && x.h === TOWER_H)!;
    expect(tower).toBeDefined();
    expect(tower.mat).toBe("officeDark");
    expect(tower.facade).toMatchObject({ floors: 8, cols: 4, litFloor: 5, base: "portico" });
    expect(inRect(bounds(tower), PLAZA)).toBe(true);
    expect(s.tower.litWindows.length).toBe(8); // 4 columnas × 2 paredes visibles
    expect(s.tower.litWindows.every((a) => a.kind === "poly" && a.color === "amber")).toBe(true);
    expect(s.tower.antenna.z).toBeGreaterThan(TOWER_H + 5);
    expect(s.tower.paperWindow.x).toBeCloseTo(TOWER.x + TOWER.w, 6); // pared este
    for (const x of s.solids) if (!isTowerPiece(x)) expect(bounds(x).max.z).toBeLessThanOrEqual(21);
  });

  it("frente a la torre ningún edificio supera 10 ni nada llega a 15 (las ventanas encendidas se pintan arriba de todo)", () => {
    for (const x of scene().solids) {
      const b = bounds(x);
      if (!(b.min.y >= 242 && b.min.x >= 96 && b.max.x <= 162)) continue;
      if (x.kind === "prism" && x.facade) expect(x.h).toBeLessThanOrEqual(10);
      expect(b.max.z).toBeLessThanOrEqual(15);
    }
  });

  it("la plaza tiene baldosas rotas y las manzanas devoradas, selva sobre su suelo", () => {
    const s = scene();
    const plaza = s.ground.filter((g) => g.kind === "ground" && g.mat === "plaza");
    expect(plaza).toHaveLength(1);
    const tris = plaza[0]!.kind === "ground" ? plaza[0]!.tris : [];
    expect(tris.length).toBe((PLAZA.w / 6) * (PLAZA.d / 6) * 2);
    expect(tris.some((t) => (t.toneOffset ?? 0) !== 0)).toBe(true);
    expect(s.ground.filter((g) => g.kind === "ground" && g.mat === "leafDark").length).toBeGreaterThanOrEqual(3);
  });

  it("ningún cono pisa asfalto fuera de cráteres, manzanas y la ribera; los acentos son ámbar", () => {
    const s = scene();
    for (const c of s.solids) {
      if (c.kind !== "cone") continue;
      const onCity = c.at.x >= 12 && c.at.x < 334 && c.at.y >= 158 && c.at.y < 266 && !(c.at.x > 198 && c.at.x < 274);
      if (onCity) expect(inBlock(c.at.x, c.at.y) || inCrater(c.at.x, c.at.y) || (c.at.y >= 210 && c.at.y <= 214)).toBe(true);
    }
    expect(s.accents.length).toBeGreaterThan(6);
    expect(s.accents.every((a) => a.color.startsWith("amber"))).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList(all(s))) expect(colors.has(i.color)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/city.test.ts`
Expected: FAIL, `Cannot find module './city'`.

- [ ] **Step 3: Escribir `city.ts` (primera tanda)**

```ts
import type { Accent } from "../iso/accent";
import { facadeAccents, isWall, windowPatches, type Facade } from "../iso/facade";
import { centroid, v3, type Vec2, type Vec3 } from "../iso/geometry";
import { tessellate, type Solid, type Tri } from "../iso/solids";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { BLOCK_D, BLOCK_W, PLAZA, SIDEWALK, TOWER, blocks, type Block, type Rect } from "./city-grid";
import { jungle } from "./flora";

/**
 * Resume: ciudad de oficinas en grilla, tragada por la selva, partida por el
 * estuario. El terreno (terrain.ts) es el asfalto; acá van los zócalos de cada
 * manzana, los edificios con fachada, la plaza con la torre del piso encendido,
 * y después (segunda tanda) avenida, puente, malecón, derrumbe, autos y selva.
 * Spec: docs/superpowers/specs/2026-09-14-resume-ciudad-design.md.
 */
export const PLINTH_H = 0.3;
export const TOWER_H = 30;
export const MAX_BUILDING_H = 18;
const FLOOR_H = 3;
const TILE = 6; // baldosa de la plaza y del suelo devorado

export interface CityScene {
  ground: Solid[];   // baldosas de la plaza, suelo de manzanas devoradas, carriles
  solids: Solid[];
  accents: Accent[]; // faroles y derrame de luz; las ventanas encendidas y la antena las anima city-anim
  tower: { litWindows: Accent[]; antenna: Vec3; paperWindow: Vec3 };
}

type Prism = Solid & { kind: "prism" };
type Extra = { roof?: "flat" | "gable" | "step"; facade?: Facade };

// ---------------------------------------------------------------- piezas

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, extra: Extra = {}): Prism => {
  const p: Prism = { kind: "prism", at: v3(x, y, z), w, d, h, mat };
  if (extra.roof) p.roof = extra.roof;
  if (extra.facade) p.facade = extra.facade;
  return p;
};

/** Suelo facetado de baldosas: `TILE`×`TILE`, un tercio con toneOffset ±1 (baldosas rotas). */
function tiles(rng: Rng, r: Rect, z: number, mat: Material): Solid {
  const tris: Tri[] = [];
  const off = (): number => (rng.chance(1 / 3) ? rng.pick([-1, 1]) : 0);
  for (let x = r.x; x < r.x + r.w; x += TILE) for (let y = r.y; y < r.y + r.d; y += TILE) {
    const w = Math.min(TILE, r.x + r.w - x), d = Math.min(TILE, r.y + r.d - y);
    const a = v3(x, y, z), b = v3(x + w, y, z), c = v3(x + w, y + d, z), dd = v3(x, y + d, z);
    tris.push({ pts: [a, b, c], toneOffset: off() }, { pts: [a, c, dd], toneOffset: off() });
  }
  return { kind: "ground", mat, tris };
}

function lamp(solids: Solid[], accents: Accent[], x: number, y: number, z: number): void {
  solids.push(prism(x, y, z, 0.6, 0.6, 5, "steel"));
  accents.push({ kind: "dot", at: v3(x + 0.3, y + 0.3, z + 5), r: 0.6, color: "amber" });
}

// ---------------------------------------------------------------- edificios

/** Prisma con fachada, cornisa de material contrario y un detalle de techo. `z` es la base (el zócalo). */
function building(out: Solid[], rng: Rng, x: number, y: number, z: number, w: number, d: number, h: number, mat: Material, roof?: "step"): void {
  const facade: Facade = { floors: Math.max(1, Math.round(h / FLOOR_H)), cols: rng.int(2, 4), base: rng.chance(0.5) ? "glass" : "portico" };
  out.push(prism(x, y, z, w, d, h, mat, roof ? { roof, facade } : { facade }));
  const cornice: Material = mat === "office" ? "officeDark" : "office";
  const top = z + h + (roof === "step" ? h * 0.35 : 0);
  out.push(prism(x - 0.5, y - 0.5, top, w + 1, d + 1, 0.4, cornice));
  roofDetail(out, rng, x, y, w, d, top + 0.4);
}

function roofDetail(out: Solid[], rng: Rng, x: number, y: number, w: number, d: number, z: number): void {
  const cx = x + w / 2, cy = y + d / 2;
  switch (rng.int(0, 3)) {
    case 0: // tanque de agua sobre cuatro postes
      for (const [dx, dy] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]] as const) out.push(prism(cx + dx - 0.15, cy + dy - 0.15, z, 0.3, 0.3, 1.2, "steel"));
      out.push({ kind: "cylinder", at: v3(cx, cy, z + 1.2), r: 1.2, h: 2, mat: "rust", sides: 6 });
      return;
    case 1: out.push(prism(x + 1, y + 1, z, 4, 3, 2, "officeDark")); return; // sala de máquinas
    case 2: out.push({ kind: "cylinder", at: v3(x + w - 1.5, y + 1.5, z), r: 0.2, h: 4, mat: "steel", sides: 4 }); return; // antena
    default: for (const [dx, dy] of [[2, 2], [w - 2, d - 2]] as const) out.push({ kind: "cone", at: v3(x + dx, y + dy, z), r: 1.2, h: 2.5, mat: "leaf" }); // terraza con selva
  }
}

type BlockType = "tower" | "pair" | "low" | "eaten";

function pickType(rng: Rng, maxH: number): BlockType {
  const r = rng.next();
  const t: BlockType = r < 0.3 ? "tower" : r < 0.6 ? "pair" : r < 0.8 ? "low" : "eaten";
  return t === "tower" && maxH < 12 ? "pair" : t;
}

/** Una manzana común: zócalo más contenido por rng. `maxH` topa la altura (fila frente a la torre). */
function block(solids: Solid[], ground: Solid[], rng: Rng, b: Block, maxH: number): void {
  const type = pickType(rng, maxH);
  const ix = b.x + SIDEWALK, iy = b.y + SIDEWALK, iw = b.w - 2 * SIDEWALK, id = b.d - 2 * SIDEWALK; // huella útil 21×15
  if (type === "eaten") {
    ground.push(tiles(rng, b, 0.05, "leafDark"));
    solids.push(prism(b.x, b.y, 0, 10, 8, PLINTH_H, "paving"), prism(b.x + 14, b.y + 10, 0, 10, 8, PLINTH_H, "paving"));
    if (rng.chance(0.5)) solids.push(prism(b.x, b.y + 12, 0, 8, 6, PLINTH_H, "paving"));
    solids.push(prism(b.x + 3, b.y + 9, 0.05, 5, 4, rng.int(2, 3), "officeDark")); // ruina
    jungle(solids, rng, { x0: b.x + 2, x1: b.x + b.w - 2, y0: b.y + 2, y1: b.y + b.d - 2 }, rng.int(6, 9), 0.05);
    return;
  }
  solids.push(prism(b.x, b.y, 0, b.w, b.d, PLINTH_H, "paving"));
  if (type === "tower") {
    const w = rng.int(12, 14), d = rng.int(10, 12), h = rng.int(12, Math.min(16, maxH));
    building(solids, rng, ix + (iw - w) / 2, iy + (id - d) / 2, PLINTH_H, w, d, h, "office");
  } else if (type === "pair") {
    const y = iy + (id - 13) / 2;
    building(solids, rng, ix, y, PLINTH_H, 9, 13, rng.int(7, Math.min(10, maxH)), "office");
    building(solids, rng, ix + 11, y, PLINTH_H, 9, 13, rng.int(7, Math.min(10, maxH)), rng.chance(0.5) ? "officeDark" : "office");
  } else {
    const h = rng.int(4, 6);
    building(solids, rng, ix, iy, PLINTH_H, iw, 7, h, "office", "step");
    building(solids, rng, ix, iy + 7, PLINTH_H, 7, 8, h, "office");
    for (const [dx, dy] of [[15, 12], [19, 14]] as const) solids.push({ kind: "cone", at: v3(b.x + dx, b.y + dy, PLINTH_H), r: 1.5, h: 3, mat: "leaf" });
  }
}

/** Ruling: frente a la torre (fila sur, x 96..162) nada supera 10 para que sus ventanas encendidas no floten sobre otro edificio. */
const maxHeightFor = (b: Block): number => (b.row === 3 && b.x >= 96 && b.x + b.w <= 162 ? 10 : MAX_BUILDING_H);

// ---------------------------------------------------------------- plaza y torre

function plazaAndTower(solids: Solid[], ground: Solid[], accents: Accent[], rng: Rng): CityScene["tower"] {
  ground.push(tiles(rng, PLAZA, 0.05, "plaza"));
  // cordón: cuatro prismas finos alrededor de la plaza
  solids.push(prism(PLAZA.x, PLAZA.y, 0, PLAZA.w, 0.6, PLINTH_H, "plaza"), prism(PLAZA.x, PLAZA.y + PLAZA.d - 0.6, 0, PLAZA.w, 0.6, PLINTH_H, "plaza"));
  solids.push(prism(PLAZA.x, PLAZA.y, 0, 0.6, PLAZA.d, PLINTH_H, "plaza"), prism(PLAZA.x + PLAZA.w - 0.6, PLAZA.y, 0, 0.6, PLAZA.d, PLINTH_H, "plaza"));

  const facade: Facade = { floors: 8, cols: 4, litFloor: 5, base: "portico" };
  const tower = prism(TOWER.x, TOWER.y, 0, TOWER.w, TOWER.d, TOWER_H, "officeDark", { facade });
  solids.push(tower);
  solids.push(prism(TOWER.x - 0.5, TOWER.y - 0.5, TOWER_H, TOWER.w + 1, TOWER.d + 1, 0.4, "office"));       // cornisa
  solids.push(prism(TOWER.x + 5, TOWER.y + 5, TOWER_H + 0.4, 6, 4, 2.5, "officeDark"));                     // sala de máquinas
  const mast = v3(TOWER.x + 8, TOWER.y + 7, TOWER_H + 2.9);
  solids.push({ kind: "cylinder", at: mast, r: 0.3, h: 5, mat: "steel", sides: 4 });                        // antena
  // selva trepando: conos en la base y dos prismas finos sobre las aristas NO y SE
  for (const [dx, dy] of [[-1.5, -1.5], [TOWER.w + 1.5, -1.5], [TOWER.w + 1.5, TOWER.d + 1.5], [-1.5, TOWER.d + 1.5]] as const) solids.push({ kind: "cone", at: v3(TOWER.x + dx, TOWER.y + dy, 0.05), r: 2.5, h: 6, mat: "leaf" });
  solids.push(prism(TOWER.x - 0.6, TOWER.y - 0.6, 0, 0.6, 0.6, 12, "leaf"), prism(TOWER.x + TOWER.w, TOWER.y + TOWER.d, 0, 0.6, 0.6, 12, "leaf"));
  // ventanas del piso encendido, solo en las paredes que mira la cámara (este y sur)
  const walls = tessellate(tower).filter((f) => isWall(f) && f.mat === "officeDark" && f.toneOffset === 0);
  const litWindows = facadeAccents(walls, facade, "amber");
  const east = walls.find((f) => f.normal.x > 0.5)!;
  const paperWindow = centroid(windowPatches(east, facade, facade.litFloor!)[facade.cols - 1]!);
  // derrame de luz en la plaza, bancos y faroles
  for (const [x, y] of [[TOWER.x - 3, TOWER.y + TOWER.d + 3], [TOWER.x + TOWER.w + 3, TOWER.y + TOWER.d + 3], [TOWER.x + TOWER.w + 3, TOWER.y - 3], [TOWER.x - 3, TOWER.y - 3]] as const) accents.push({ kind: "dot", at: v3(x, y, 0.1), r: 3, color: "amberBleed" });
  for (const [x, y] of [[PLAZA.x + 4, PLAZA.y + 3], [PLAZA.x + PLAZA.w - 6, PLAZA.y + 3], [PLAZA.x + 4, PLAZA.y + PLAZA.d - 3.6], [PLAZA.x + PLAZA.w - 6, PLAZA.y + PLAZA.d - 3.6]] as const) solids.push(prism(x, y, 0.05, 2, 0.6, 0.5, "paving"));
  lamp(solids, accents, PLAZA.x + 2, PLAZA.y + PLAZA.d / 2, 0.05);
  lamp(solids, accents, PLAZA.x + PLAZA.w - 2.6, PLAZA.y + PLAZA.d / 2, 0.05);
  return { litWindows, antenna: v3(mast.x, mast.y, mast.z + 5), paperWindow };
}

// ---------------------------------------------------------------- escena

export function city(rng: Rng): CityScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  for (const b of blocks()) if (b.kind === "block") block(solids, ground, rng, b, maxHeightFor(b));
  const tower = plazaAndTower(solids, ground, accents, rng);
  return { ground, solids, accents, tower };
}
```

- [ ] **Step 4: Correr los tests de la primera tanda**

Run: `npx vitest run src/scenes/city.test.ts && npm run typecheck`
Expected: PASS salvo el test de acentos (`accents.length > 6`: por ahora hay 6: 4 derrames + 2 faroles) → cambiar temporalmente ese umbral a `>= 6`; la Task 5 lo vuelve a `> 6`. El test "ningún cono pisa asfalto" pasa porque todavía no hay boulevard ni selva de bordes.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/city.ts src/scenes/city.test.ts
git commit -m "feat(scenes): ciudad de Resume, primera tanda: zócalos, manzanas, plaza y torre"
```

---

### Task 5: `city.ts`, segunda tanda: avenida, puente, muelle, malecón, derrumbe, autos, faroles y selva

**Files:**
- Modify: `src/scenes/city.ts`
- Modify: `src/scenes/city.test.ts`

**Interfaces:**
- Consumes: `AVENUE`, `BOULEVARD`, `BRIDGE`, `CITY_EDGE`, `COLLAPSED`, `CRATERS`, `EAST_COLS`, `EAST_RING`, `MALECON`, `ROWS`, `STREET`, `WEST_COLS`, `WEST_QUAY`, `estuaryEast`, `inCrater` de `city-grid.ts`; `QUAY_X`, `ZONE_SPLIT_Y` de `geo.ts`.
- Produces: `CityScene` sin cambios de forma; `ground` suma los `strip` de carriles y sendas.

- [ ] **Step 1: Agregar tests**

En `src/scenes/city.test.ts` volver el umbral de acentos a `> 6` y agregar dentro del `describe("city")`:

```ts
  it("avenida: boulevard, carriles, sendas y semáforos; faroles solo en avenida, puente, plaza y malecón", () => {
    const s = scene();
    const strips = s.ground.filter((g) => g.kind === "strip");
    expect(strips.length).toBeGreaterThan(60);
    expect(strips.every((g) => g.kind === "strip" && g.mat === "paving" && g.z > 0 && g.z < 0.1)).toBe(true);
    const boulevard = s.solids.filter((x) => x.kind === "prism" && x.mat === "leafDark");
    expect(boulevard.length).toBeGreaterThanOrEqual(8);
    expect(boulevard.every((x) => bounds(x).min.y >= 210 && bounds(x).max.y <= 214)).toBe(true);
    const lamps = s.accents.filter((a) => a.kind === "dot" && a.color === "amber");
    expect(lamps.length).toBeGreaterThanOrEqual(20);
    for (const l of lamps) {
      if (l.kind !== "dot") continue;
      const onAvenue = l.at.y >= 203 && l.at.y <= 221, onMalecon = l.at.x >= 334, onPlaza = inRect({ min: l.at, max: l.at }, PLAZA);
      expect(onAvenue || onMalecon || onPlaza).toBe(true);
    }
  });

  it("puente: tablero sobre el agua de muelle a anillo, pilotes hasta el fondo, rampas en las cabeceras", () => {
    const s = scene();
    const deck = s.solids.find((x) => x.kind === "prism" && x.mat === "asphalt" && x.w > 60)!;
    expect(deck.kind === "prism" && deck.at.x).toBe(192);
    expect(deck.kind === "prism" && deck.at.x + deck.w).toBe(276);
    expect(deck.kind === "prism" && deck.at.z).toBe(1.2);
    const piers = s.solids.filter((x) => x.kind === "prism" && x.mat === "plaza" && x.at.z === -1 && x.at.y === 207);
    expect(piers).toHaveLength(4);
    const ramps = s.solids.filter((x) => x.kind === "ramp" && x.mat === "asphalt" && x.at.y === 207);
    expect(ramps.map((r) => r.kind === "ramp" && r.dir).sort()).toEqual(["e", "w"]);
  });

  it("muelle oeste y malecón: muros desde el agua, parapeto, escaleras dentro de la zona", () => {
    const s = scene();
    const walls = s.solids.filter((x) => x.kind === "prism" && x.at.z === -1 && x.d > 30);
    expect(walls.length).toBeGreaterThanOrEqual(4); // dos tramos por lado
    expect(walls.some((x) => x.kind === "prism" && x.mat === "plaza" && x.at.x === 192)).toBe(true);
    expect(walls.some((x) => x.kind === "prism" && x.mat === "paving" && x.at.x === 334)).toBe(true);
    const parapet = s.solids.filter((x) => x.kind === "prism" && x.at.x >= 342 && x.h === 0.8);
    expect(parapet.length).toBeGreaterThanOrEqual(2);
    const stairs = s.solids.filter((x) => x.kind === "ramp" && x.at.z === -1);
    expect(stairs.length).toBeGreaterThanOrEqual(2);
    for (const st of stairs) expect(bounds(st).max.x).toBeLessThanOrEqual(ZONE_SPLIT_X);
  });

  it("derrumbe: rampa al agua y bloques hundidos; el resto de la ciudad no tiene nada bajo z 0 salvo muros y pilotes", () => {
    const s = scene();
    const sunk = s.solids.filter((x) => x.kind === "prism" && x.mat === "officeDark" && x.at.z < 0);
    expect(sunk.length).toBeGreaterThanOrEqual(3);
    for (const b of sunk) expect(b.kind === "prism" && b.at.y).toBeGreaterThanOrEqual(240);
    expect(s.solids.some((x) => x.kind === "ramp" && x.mat === "asphalt" && x.dir === "w" && x.at.y === 242)).toBe(true);
  });

  it("autos pegados al cordón, en calles E-O, nunca sobre un cráter", () => {
    const s = scene();
    const cars = s.solids.filter((x): x is Solid & { kind: "prism" } => x.kind === "prism" && (x.mat === "steel" || x.mat === "rust") && x.h === 1.2);
    expect(cars.length).toBeGreaterThanOrEqual(20);
    for (const c of cars) {
      expect(inBlock(c.at.x + 1.5, c.at.y + 0.75)).toBe(false);
      expect(inCrater(c.at.x + 1.5, c.at.y + 0.75)).toBe(false);
    }
  });

  it("selva: cinturón norte, bordes oeste y sur, ribera este y cráteres, más de 60 conos", () => {
    const s = scene();
    const cones = s.solids.filter((x) => x.kind === "cone" && (x.mat === "leaf" || x.mat === "leafDark"));
    expect(cones.length).toBeGreaterThan(60);
    expect(cones.some((c) => c.kind === "cone" && c.at.y < 158)).toBe(true);           // cinturón
    expect(cones.some((c) => c.kind === "cone" && c.at.x < 12)).toBe(true);            // borde oeste
    expect(cones.some((c) => c.kind === "cone" && c.at.x > 198 && c.at.x < 274)).toBe(true); // ribera este
    for (const cr of CRATERS) expect(cones.some((c) => c.kind === "cone" && inCrater(c.at.x, c.at.y) && Math.hypot(c.at.x - cr.x, c.at.y - cr.y) <= cr.r)).toBe(true);
  });
```

Agregar `CRATERS` al import de `./city-grid` en el test.

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/city.test.ts`
Expected: FAIL en los seis tests nuevos.

- [ ] **Step 3: Implementar la segunda tanda en `city.ts`**

Ampliar el import de `city-grid`:

```ts
import { AVENUE, BLOCK_D, BLOCK_W, BOULEVARD, BRIDGE, CITY_EDGE, COLLAPSED, CRATERS, EAST_COLS, EAST_RING, MALECON, PLAZA, ROWS, SIDEWALK, STREET, TOWER, WEST_COLS, WEST_QUAY, blocks, estuaryEast, inCrater, type Block, type Rect } from "./city-grid";
import { QUAY_X, ZONE_SPLIT_Y } from "../map/geo";
```

Agregar helpers y sectores antes de `export function city`:

```ts
const strip = (path: Vec2[], width: number, mat: Material): Solid => ({ kind: "strip", path, width, z: 0.02, mat });

/** Carril discontinuo (tramo 3, hueco 2) a lo largo de una calle N-S (x fijo) o E-O (y fijo). */
function dashes(out: Solid[], from: Vec2, to: Vec2): void {
  const len = Math.hypot(to.x - from.x, to.y - from.y), ux = (to.x - from.x) / len, uy = (to.y - from.y) / len;
  for (let s = 0; s + 3 <= len; s += 5) out.push(strip([{ x: from.x + ux * s, y: from.y + uy * s }, { x: from.x + ux * (s + 3), y: from.y + uy * (s + 3) }], 0.4, "paving"));
}

// ---------------------------------------------------------------- calles y avenida

function streets(ground: Solid[], solids: Solid[], accents: Accent[]): void {
  const westX = [...WEST_COLS.map((x) => x + BLOCK_W + STREET / 2)];            // centros de las calles N-S del oeste (39..189)
  const eastX = [EAST_RING.x0 + STREET / 2, EAST_COLS[0] + BLOCK_W + STREET / 2]; // 277, 307
  for (const cx of [...westX, ...eastX]) {
    dashes(ground, { x: cx, y: CITY_EDGE.north }, { x: cx, y: AVENUE.y0 });
    dashes(ground, { x: cx, y: AVENUE.y1 }, { x: cx, y: CITY_EDGE.south });
  }
  const rowsY = [CITY_EDGE.north + STREET / 2, ...ROWS.slice(1).map((y) => y - STREET / 2), CITY_EDGE.south - STREET / 2].filter((y) => y < AVENUE.y0 || y > AVENUE.y1); // 161, 185, 239, 263
  for (const cy of rowsY) {
    dashes(ground, { x: CITY_EDGE.west, y: cy }, { x: WEST_QUAY.x0, y: cy });
    dashes(ground, { x: EAST_RING.x0, y: cy }, { x: MALECON.x0, y: cy });
  }
  // avenida: doble línea continua a cada lado del boulevard, sendas en cada cruce, boulevard por tramo de manzana
  for (const [x0, x1] of [[CITY_EDGE.west, WEST_QUAY.x0], [EAST_RING.x1, MALECON.x0]] as const) {
    ground.push(strip([{ x: x0, y: BOULEVARD.y0 - 0.3 }, { x: x1, y: BOULEVARD.y0 - 0.3 }], 0.4, "paving"));
    ground.push(strip([{ x: x0, y: BOULEVARD.y1 + 0.3 }, { x: x1, y: BOULEVARD.y1 + 0.3 }], 0.4, "paving"));
  }
  for (const cx of [...westX, ...eastX]) for (let k = -2; k <= 2; k++) ground.push(strip([{ x: cx + k, y: AVENUE.y0 }, { x: cx + k, y: AVENUE.y1 }], 0.5, "paving"));
  for (const x of [...WEST_COLS, ...EAST_COLS]) {
    solids.push(prism(x, BOULEVARD.y0, 0, BLOCK_W, BOULEVARD.y1 - BOULEVARD.y0, 0.3, "leafDark"));
    for (const dx of [4, 12, 20]) solids.push({ kind: "cone", at: v3(x + dx, BOULEVARD.y0 + 2, 0.3), r: 1.5, h: 4, mat: "leaf" });
  }
  // semáforos apagados en las esquinas de la avenida, faroles cada 12 u sobre la vereda norte
  for (const cx of [...westX, ...eastX]) for (const [x, y] of [[cx - 3.5, AVENUE.y0 - 1], [cx + 3, AVENUE.y1 + 0.5]] as const) {
    solids.push(prism(x, y, PLINTH_H, 0.3, 0.3, 4, "steel"), prism(x - 0.1, y - 0.1, PLINTH_H + 4, 0.5, 0.5, 1.2, "officeDark"));
  }
  for (let x = CITY_EDGE.west + 6; x < WEST_QUAY.x0 - 6; x += 12) lamp(solids, accents, x, AVENUE.y0 - 1.3, PLINTH_H);
  for (let x = EAST_RING.x1 + 6; x < MALECON.x0 - 6; x += 12) lamp(solids, accents, x, AVENUE.y0 - 1.3, PLINTH_H);
}

// ---------------------------------------------------------------- puente, muelle oeste y malecón

function bridge(solids: Solid[], accents: Accent[]): void {
  const { x0, x1, y0, y1, z, deckH } = BRIDGE;
  const top = z + deckH, d = y1 - y0;
  solids.push(prism(x0, y0, z, x1 - x0, d, deckH, "asphalt"));
  solids.push({ kind: "ramp", at: v3(x0 - STREET, y0, 0), w: STREET, d, h: top, mat: "asphalt", dir: "w" });
  solids.push({ kind: "ramp", at: v3(x1, y0, 0), w: STREET, d, h: top, mat: "asphalt", dir: "e" });
  for (let x = x0 + 18; x < x1; x += 18) solids.push(prism(x - 1, y0, -1, 2, d, z + 1, "plaza")); // pilotes: 210, 228, 246, 264
  solids.push(prism(x0, y0, top, x1 - x0, 0.3, 0.8, "officeDark"), prism(x0, y1 - 0.3, top, x1 - x0, 0.3, 0.8, "officeDark")); // barandas
  lamp(solids, accents, x0 + 30, y0 + 0.4, top);
  lamp(solids, accents, x1 - 30, y1 - 1, top);
  solids.push(prism(x0 + 40, y0 + 1.5, top, 3, 1.5, 1.2, "steel"), prism(x0 + 58, y1 - 3, top, 3, 1.5, 1.2, "rust")); // autos detenidos
}

function westQuay(solids: Solid[]): void {
  const { x0, x1 } = WEST_QUAY, w = x1 - x0;
  solids.push(prism(x0, CITY_EDGE.north, -1, w, 194 - CITY_EDGE.north, 1.6, "plaza"), prism(x0, 200, -1, w, CITY_EDGE.south - 200, 1.6, "plaza"));
  solids.push({ kind: "ramp", at: v3(x0, 194, -1), w, d: 6, h: 1.6, mat: "plaza", dir: "e" }); // escalera al agua
  for (const y of [192, 201]) solids.push({ kind: "cylinder", at: v3(x0 + 3, y, 0.6), r: 0.4, h: 0.8, mat: "rust", sides: 6 });
}

function malecon(solids: Solid[], accents: Accent[]): void {
  const { x0, x1, y0, y1, z } = MALECON, w = x1 - x0, stairsY = 227;
  solids.push(prism(x0, y0, -1, w, stairsY - y0, z + 1, "paving"), prism(x0, stairsY + 6, -1, w, y1 - stairsY - 6, z + 1, "paving"));
  solids.push({ kind: "ramp", at: v3(x1 - 6, stairsY, -1), w: 6, d: 6, h: z + 1, mat: "paving", dir: "e" }); // escalera, hacia adentro de la zona
  solids.push(prism(x0, stairsY, -1, w - 6, 6, z + 1, "paving"));
  solids.push(prism(x1 - 1.5, y0, z, 1.5, stairsY - y0, 0.8, "paving"), prism(x1 - 1.5, stairsY + 6, z, 1.5, y1 - stairsY - 6, 0.8, "paving")); // parapeto
  for (const y of [170, 200, 245, 258]) solids.push(prism(x0 + 2, y, z, 2, 0.6, 0.5, "paving")); // bancos
  for (const y of [180, 210, 250]) lamp(solids, accents, x1 - 3, y, z);
  for (const y of [stairsY - 1.5, stairsY + 6.5]) solids.push({ kind: "cylinder", at: v3(x1 - 3, y, z), r: 0.4, h: 0.8, mat: "rust", sides: 6 });
}

// ---------------------------------------------------------------- derrumbe, cráteres, selva, autos

function collapsed(solids: Solid[], rng: Rng): void {
  const c = COLLAPSED;
  solids.push({ kind: "ramp", at: v3(c.x, c.y, -1.2), w: 12, d: c.d, h: 1.5, mat: "asphalt", dir: "w" }); // la mitad oeste se hunde en el estuario
  solids.push(prism(c.x + 12, c.y, 0, 12, c.d, PLINTH_H, "paving"));
  solids.push(prism(c.x + 14, c.y + 4, PLINTH_H, 8, 10, rng.int(2, 3), "officeDark")); // ruina sin fachada
  for (const [x, y, z, w, d] of [[c.x - 12, c.y + 6, -0.5, 3, 3], [c.x - 8, c.y + 12, -0.7, 4, 3], [c.x - 4, c.y + 2, -0.4, 3, 4]] as const) solids.push(prism(x, y, z, w, d, 1.5, "officeDark"));
}

function greenery(solids: Solid[], rng: Rng): void {
  jungle(solids, rng, { x0: 3, x1: 340, y0: ZONE_SPLIT_Y + 1, y1: CITY_EDGE.north - 2 }, 30);           // cinturón de costura
  jungle(solids, rng, { x0: 2, x1: CITY_EDGE.west - 3, y0: CITY_EDGE.north, y1: CITY_EDGE.south }, 12);  // borde oeste
  jungle(solids, rng, { x0: CITY_EDGE.west, x1: 330, y0: CITY_EDGE.south, y1: 267 }, 14);                 // borde sur (r ≤ 4: no sale del mundo)
  for (let y = ROWS[0]; y < COLLAPSED.y; y += 8) {                                                        // ribera este del estuario
    const x0 = Math.ceil(estuaryEast(y + 6)) + 2, x1 = EAST_RING.x0 - 3;
    if (x1 - x0 >= 2) jungle(solids, rng, { x0, x1, y0: y, y1: y + 6 }, rng.int(1, 2));
  }
  for (const c of CRATERS) { // cuadrado inscripto (0.7·r): todo cono queda dentro del círculo
    const k = Math.floor(c.r * 0.7);
    jungle(solids, rng, { x0: c.x - k, x1: c.x + k, y0: c.y - k, y1: c.y + k }, rng.int(4, 6), 0.2);
  }
}

function cars(solids: Solid[], rng: Rng): void {
  for (const b of blocks()) {
    if (b.kind === "plaza") continue;
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const x = b.x + rng.int(2, b.w - 5);
      const y = rng.chance(0.5) ? b.y + b.d + 0.4 : b.y - 1.9; // vereda sur o norte de la manzana
      if (y < CITY_EDGE.north || y + 1.5 > CITY_EDGE.south) continue;
      if (y >= AVENUE.y0 - 2 && y <= AVENUE.y1) continue;      // la avenida no tiene autos en el cordón
      if (inCrater(x + 1.5, y + 0.75) || CRATERS.some((c) => Math.hypot(x + 1.5 - c.x, y + 0.75 - c.y) <= c.r + 2)) continue;
      solids.push(prism(x, y, 0, 3, 1.5, 1.2, rng.chance(0.6) ? "steel" : "rust"));
    }
  }
}
```

Y reemplazar `city()`:

```ts
export function city(rng: Rng): CityScene {
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  for (const b of blocks()) if (b.kind === "block") block(solids, ground, rng, b, maxHeightFor(b));
  const tower = plazaAndTower(solids, ground, accents, rng);
  streets(ground, solids, accents);
  bridge(solids, accents);
  westQuay(solids);
  malecon(solids, accents);
  collapsed(solids, rng);
  greenery(solids, rng);
  cars(solids, rng);
  return { ground, solids, accents, tower };
}
```

- [ ] **Step 4: Correr los tests y ajustar umbrales solo si el conteo real lo justifica**

Run: `npx vitest run src/scenes/city.test.ts && npm run typecheck`
Expected: PASS. Los conos del boulevard (y 210..214) y los de cráter (cuadrado inscripto) ya cumplen "ningún cono pisa asfalto".

- [ ] **Step 5: Commit**

```bash
git add src/scenes/city.ts src/scenes/city.test.ts
git commit -m "feat(scenes): ciudad de Resume, segunda tanda: avenida, puente, malecón, derrumbe, autos y selva"
```

---

### Task 6: `city-anim.ts` y `city-animator.ts`

**Files:**
- Create: `src/scenes/city-anim.ts`, `src/scenes/city-animator.ts`
- Test: `src/scenes/city-anim.test.ts`, `src/scenes/city-animator.test.ts`

**Interfaces:**
- Consumes: `CityScene["tower"]` de `city.ts`; `Animator`, `AnimLayer` de `animator.ts`.
- Produces:

```ts
// city-anim.ts
export const BLINK_GAP_MS: [number, number] = [4000, 9000];
export const PAPER_SPEED = 4 / 1000;   // u por ms
export const PAPER_RANGE = 30;         // u antes de reciclar
export const PAPER_AMP = 1.5, PAPER_PERIOD_MS = 2000;
export const ANTENNA_STEP_MS = 100;
export interface CityAnimChanges { lit: boolean; papers: boolean; antenna: boolean }
export interface CityAnim { lit(): Accent[]; papers(): Accent[]; antenna(): Accent; tick(dtMs: number): CityAnimChanges }
export function createCityAnim(tower: CityScene["tower"], rng: Rng, opts: { reducedMotion: boolean }): CityAnim;
// city-animator.ts
export function cityAnimator(scene: CityScene, rng: Rng, opts: { reducedMotion: boolean }): Animator; // ids: "city.lit", "city.papers", "city.antenna"
```

- [ ] **Step 1: Escribir los tests**

`src/scenes/city-anim.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Accent } from "../iso/accent";
import { createRng } from "../map/seed";
import { city } from "./city";
import { ANTENNA_STEP_MS, PAPER_RANGE, createCityAnim } from "./city-anim";

const setup = (reducedMotion = false) => {
  const tower = city(createRng(7)).tower;
  return { tower, anim: createCityAnim(tower, createRng(3), { reducedMotion }) };
};
const dot = (a: Accent): Extract<Accent, { kind: "dot" }> => { if (a.kind !== "dot") throw new Error("se esperaba dot"); return a; };

describe("city-anim", () => {
  it("frame 0: piso encendido, papeles en la ventana, antena a radio 1.1", () => {
    const { tower, anim } = setup();
    expect(anim.lit()).toEqual(tower.litWindows);
    expect(anim.papers().length).toBeGreaterThanOrEqual(5);
    expect(anim.papers().length).toBeLessThanOrEqual(8);
    for (const p of anim.papers()) expect(dot(p).at).toEqual(tower.paperWindow);
    expect(dot(anim.antenna()).r).toBeCloseTo(1.1, 6);
    expect(dot(anim.antenna()).color).toBe("amberMid");
  });

  it("el piso se apaga de a un tick, nunca dos seguidos, y se apaga al menos 5 veces en 60 s", () => {
    const { anim } = setup();
    let offs = 0, prevOff = false;
    for (let t = 0; t < 60000; t += 33) {
      anim.tick(33);
      const off = anim.lit().length === 0;
      expect(off && prevOff).toBe(false);
      if (off) offs++;
      prevOff = off;
    }
    expect(offs).toBeGreaterThanOrEqual(5);
    expect(offs).toBeLessThanOrEqual(16);
  });

  it("los papeles nunca se alejan más de PAPER_RANGE de la ventana y derivan al ENE", () => {
    const { tower, anim } = setup();
    let movedEast = false;
    for (let t = 0; t < 20000; t += 33) {
      const c = anim.tick(33);
      expect(c.papers).toBe(true);
      for (const p of anim.papers()) {
        const d = dot(p).at;
        expect(Math.hypot(d.x - tower.paperWindow.x, d.y - tower.paperWindow.y)).toBeLessThanOrEqual(PAPER_RANGE + 1e-6);
        expect(d.x).toBeGreaterThanOrEqual(tower.paperWindow.x - 1e-6);
        expect(d.y).toBeLessThanOrEqual(tower.paperWindow.y + 1e-6);
        if (d.x > tower.paperWindow.x + 10) movedEast = true;
      }
    }
    expect(movedEast).toBe(true);
  });

  it("la antena pulsa entre 0.8 y 1.4 y solo reporta cambio cada ANTENNA_STEP_MS", () => {
    const { anim } = setup();
    let changes = 0;
    for (let t = 0; t < 10000; t += 33) {
      if (anim.tick(33).antenna) changes++;
      const r = dot(anim.antenna()).r;
      expect(r).toBeGreaterThanOrEqual(0.8 - 1e-6); expect(r).toBeLessThanOrEqual(1.4 + 1e-6);
    }
    expect(changes).toBeGreaterThan(10000 / ANTENNA_STEP_MS - 5);
    expect(changes).toBeLessThanOrEqual(10000 / ANTENNA_STEP_MS + 1);
  });

  it("con reduced-motion nada cambia", () => {
    const { tower, anim } = setup(true);
    for (let t = 0; t < 5000; t += 33) expect(anim.tick(33)).toEqual({ lit: false, papers: false, antenna: false });
    expect(anim.lit()).toEqual(tower.litWindows);
    for (const p of anim.papers()) expect(dot(p).at).toEqual(tower.paperWindow);
  });
});
```

`src/scenes/city-animator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { city } from "./city";
import { cityAnimator } from "./city-animator";

describe("city-animator", () => {
  it("expone tres capas de acentos y solo devuelve las que cambiaron", () => {
    const a = cityAnimator(city(createRng(7)), createRng(3), { reducedMotion: false });
    expect([...a.ids].sort()).toEqual(["city.antenna", "city.lit", "city.papers"]);
    for (const id of a.ids) expect(a.layer(id).kind).toBe("accent");
    const changed = a.tick(33);
    expect(changed.has("city.papers")).toBe(true);
    expect(changed.has("city.lit")).toBe(false); // primer tick: todavía encendido
  });
  it("con reduced-motion no devuelve ids", () => {
    const a = cityAnimator(city(createRng(7)), createRng(3), { reducedMotion: true });
    expect(a.tick(1000).size).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/scenes/city-anim.test.ts src/scenes/city-animator.test.ts`
Expected: FAIL, módulos inexistentes.

- [ ] **Step 3: Escribir `city-anim.ts`**

```ts
import type { Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import type { Rng } from "../map/seed";
import type { CityScene } from "./city";

/**
 * Las tres animaciones de la ciudad, sin Pixi y con estado propio: el piso
 * encendido parpadea (se apaga un tick cada 4..9 s), papeles salen volando de
 * una ventana hacia el ENE y la luz de la antena pulsa. Frame 0 = todo quieto
 * y encendido; con reduced-motion se queda ahí.
 */
export const BLINK_GAP_MS: [number, number] = [4000, 9000];
export const PAPER_SPEED = 4 / 1000; // u por ms
export const PAPER_RANGE = 30;
export const PAPER_AMP = 1.5;
export const PAPER_PERIOD_MS = 2000;
export const ANTENNA_STEP_MS = 100;
const ANTENNA_BASE_R = 0.8, ANTENNA_PULSE_R = 0.3, ANTENNA_PERIOD = 1200; // r = 0.8 + 0.3·(1 + sin(t / 1200))
const ENE = { x: 0.92, y: -0.38 }; // unidad: este-noreste (y crece al sur)

export interface CityAnimChanges { lit: boolean; papers: boolean; antenna: boolean }
export interface CityAnim { lit(): Accent[]; papers(): Accent[]; antenna(): Accent; tick(dtMs: number): CityAnimChanges }

const NONE: CityAnimChanges = { lit: false, papers: false, antenna: false };

export function createCityAnim(tower: CityScene["tower"], rng: Rng, opts: { reducedMotion: boolean }): CityAnim {
  const w = tower.paperWindow;
  const nextGap = (): number => rng.int(BLINK_GAP_MS[0], BLINK_GAP_MS[1]);

  let clock = 0;
  let off = false;
  let blinkTimer = nextGap();
  let antennaStep = 0;
  const papers = Array.from({ length: rng.int(5, 8) }, () => ({ dist: 0, phase: rng.next() * Math.PI * 2 }));

  const paperAt = (p: { dist: number; phase: number }): Accent => ({
    kind: "dot",
    at: v3(w.x + ENE.x * p.dist, w.y + ENE.y * p.dist, w.z + (p.dist === 0 ? 0 : PAPER_AMP * Math.sin((clock / PAPER_PERIOD_MS) * Math.PI * 2 + p.phase))),
    r: 0.4,
    color: "amberMid",
  });
  const antennaR = (): number => ANTENNA_BASE_R + ANTENNA_PULSE_R * (1 + Math.sin((antennaStep * ANTENNA_STEP_MS) / ANTENNA_PERIOD));

  return {
    lit: () => (off ? [] : tower.litWindows),
    papers: () => papers.map(paperAt),
    antenna: () => ({ kind: "dot", at: tower.antenna, r: antennaR(), color: "amberMid" }),
    tick(dtMs) {
      if (opts.reducedMotion || dtMs <= 0) return NONE;
      clock += dtMs;
      const c: CityAnimChanges = { lit: false, papers: true, antenna: false };

      // parpadeo: un tick apagado, después una pausa nueva
      if (off) { off = false; blinkTimer = nextGap(); c.lit = true; }
      else { blinkTimer -= dtMs; if (blinkTimer <= 0) { off = true; c.lit = true; } }

      for (const p of papers) {
        p.dist += PAPER_SPEED * dtMs;
        if (p.dist >= PAPER_RANGE) { p.dist = 0; p.phase = rng.next() * Math.PI * 2; }
      }

      const step = Math.floor(clock / ANTENNA_STEP_MS);
      if (step !== antennaStep) { antennaStep = step; c.antenna = true; }
      return c;
    },
  };
}
```

Nota: en el frame 0 los papeles están todos en la ventana (`dist = 0`, sin seno); `tick` reporta `papers: true` cada vez que avanza el reloj porque siempre se mueven.

- [ ] **Step 4: Escribir `city-animator.ts`**

```ts
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { CityScene } from "./city";
import { createCityAnim } from "./city-anim";

/** Adapta las tres animaciones de la ciudad al contrato `Animator`. Todas son capas de acentos. */
export function cityAnimator(scene: CityScene, rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createCityAnim(scene.tower, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    "city.lit": () => ({ kind: "accent", accents: anim.lit() }),
    "city.papers": () => ({ kind: "accent", accents: anim.papers() }),
    "city.antenna": () => ({ kind: "accent", accents: [anim.antenna()] }),
  };
  return {
    ids: Object.keys(layers),
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs);
      const out = new Set<string>();
      if (c.lit) out.add("city.lit");
      if (c.papers) out.add("city.papers");
      if (c.antenna) out.add("city.antenna");
      return out;
    },
  };
}
```

- [ ] **Step 5: Correr todo**

Run: `npm test && npm run typecheck`
Expected: verde. El test de parpadeo cuenta entre 5 y 16 apagones en 60 s (gap 4..9 s); si con el seed 3 sale fuera del rango, revisar `nextGap`, no el test.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/city-anim.ts src/scenes/city-anim.test.ts src/scenes/city-animator.ts src/scenes/city-animator.test.ts
git commit -m "feat(scenes): animaciones de la ciudad: parpadeo, papeles y antena"
```

---

### Task 7: `world.ts`, `page.ts`, `lab/resume.html` y capturas

**Files:**
- Modify: `src/scenes/world.ts`, `src/scenes/world.test.ts`
- Create: `src/lab/page.ts`, `src/lab/resume.ts`, `lab/resume.html`
- Modify: `src/lab/portfolio.ts`, `src/lab/world.ts`, `src/lab/lab-excluded.test.ts`

**Interfaces:**
- Produces: `WorldScene.city: CityScene | null`; `LANDMARKS.cv = v3(129, 227, 0)`; `bootWorldPage(zones: readonly WorldZone[] | undefined, frame: WorldZone | "all"): void` en `src/lab/page.ts`.

- [ ] **Step 1: Ampliar `world.test.ts`**

Reemplazar el test `"filtrar por zona deja fuera lo demás"` y agregar dos más:

```ts
  it("filtrar por zona deja fuera lo demás", () => {
    const w = world(7, { zones: ["cv"] });
    expect(w.shipyard).toBeNull();
    expect(w.city).not.toBeNull();
    expect(w.solids.length).toBeGreaterThan(250);
    expect(w.terrain.sea.kind === "ground" && w.terrain.sea.tris).toEqual([]);
    const b = world(7, { zones: ["blog"] });
    expect(b.city).toBeNull();
    expect(b.solids).toEqual([]);
  });

  it("el mundo entero trae astillero y ciudad, y el landmark de Resume cae en la torre", () => {
    const w = world(7);
    expect(w.city).not.toBeNull();
    expect(w.solids.length).toBeGreaterThan(550);
    const tower = w.solids.find((s) => s.kind === "prism" && s.h === 30)!;
    const b = bounds(tower);
    expect(LANDMARKS.cv.x).toBeGreaterThan(b.min.x); expect(LANDMARKS.cv.x).toBeLessThan(b.max.x);
    expect(LANDMARKS.cv.y).toBeGreaterThan(b.min.y); expect(LANDMARKS.cv.y).toBeLessThan(b.max.y);
  });

  it("la ciudad y el astillero no comparten materiales de construcción", () => {
    const w = world(7);
    const mats = (zone: "portfolio" | "cv") => new Set(w.solids.filter((s) => worldZoneAt(bounds(s).min.x, Math.max(bounds(s).min.y, 0)) === zone && s.kind !== "cone").map((s) => s.mat));
    const shared = [...mats("portfolio")].filter((m) => mats("cv").has(m));
    expect(shared.sort()).toEqual(["rust", "steel"]);
  });
```

En el test `"con todas las zonas trae el astillero y el terreno completo"` subir `w.solids.length` a `> 550`.

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run src/scenes/world.test.ts`
Expected: FAIL (`w.city` es `undefined`).

- [ ] **Step 3: Modificar `world.ts`**

```ts
import type { Accent } from "../iso/accent";
import { v3, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { WorldZone } from "../map/geo";
import { createRng, type Rng } from "../map/seed";
import { city, type CityScene } from "./city";
import { shipyard, type Scene } from "./shipyard";
import { buildTerrain, type TerrainMesh } from "./terrain";

/**
 * El mundo entero: terreno compartido más una escena por zona. Cada escena
 * recibe su propio Rng derivado del seed, así retocar una no reordena las otras.
 * Blog se enchufa acá cuando exista (plan 3).
 */
export interface WorldScene {
  terrain: TerrainMesh;
  ground: Solid[];
  solids: Solid[];
  accents: Accent[];
  landmarks: Record<WorldZone, Vec3>;
  shipyard: Scene | null;
  city: CityScene | null;
}

const ALL_ZONES: readonly WorldZone[] = ["portfolio", "cv", "blog"];
const ZONE_INDEX: Record<WorldZone, number> = { portfolio: 1, cv: 2, blog: 3 };

/** Grúa pórtico, torre de oficinas, faro. Coordenadas de mundo; la reintegración proyecta con project(). */
export const LANDMARKS: Record<WorldZone, Vec3> = {
  portfolio: v3(150, 50, 0),
  cv: v3(129, 227, 0),
  blog: v3(396, 118, 0),
};

export function zoneRng(seed: number, zone: WorldZone): Rng {
  return createRng(seed * 31 + ZONE_INDEX[zone]);
}

export function world(seed: number, opts: { zones?: readonly WorldZone[] } = {}): WorldScene {
  const zones = opts.zones ?? ALL_ZONES;
  const terrain = buildTerrain(createRng(seed), zones);
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  let sy: Scene | null = null, ct: CityScene | null = null;
  if (zones.includes("portfolio")) {
    sy = shipyard(zoneRng(seed, "portfolio"));
    ground.push(...sy.ground); solids.push(...sy.solids); accents.push(...sy.accents);
  }
  if (zones.includes("cv")) {
    ct = city(zoneRng(seed, "cv"));
    ground.push(...ct.ground); solids.push(...ct.solids); accents.push(...ct.accents);
  }
  return { terrain, ground, solids, accents, landmarks: LANDMARKS, shipyard: sy, city: ct };
}
```

- [ ] **Step 4: Crear `src/lab/page.ts` y reducir las entradas**

`src/lab/page.ts`:

```ts
import type { WorldZone } from "../map/geo";
import { createRng } from "../map/seed";
import type { Animator } from "../scenes/animator";
import { cityAnimator } from "../scenes/city-animator";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { world } from "../scenes/world";
import { bootLab } from "./runtime";

const SEED = 7;

/** Una página del laboratorio: el mundo (o algunas zonas), sus animadores y el encuadre inicial. */
export function bootWorldPage(zones: readonly WorldZone[] | undefined, frame: WorldZone | "all"): void {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = world(SEED, zones ? { zones } : {});
  const animators: Animator[] = [];
  if (scene.shipyard) animators.push(shipyardAnimator(scene.shipyard, [scene.terrain.river], createRng(SEED + 1), { reducedMotion }));
  if (scene.city) animators.push(cityAnimator(scene.city, createRng(SEED + 2), { reducedMotion }));
  void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV, frame });
}
```

`src/lab/portfolio.ts`:

```ts
import { bootWorldPage } from "./page";

bootWorldPage(["portfolio"], "portfolio");
```

`src/lab/world.ts`:

```ts
import { bootWorldPage } from "./page";

bootWorldPage(undefined, "all");
```

`src/lab/resume.ts`:

```ts
import { bootWorldPage } from "./page";

// El astillero entra para ver la costura de selva y el estuario que la ciudad hereda.
bootWorldPage(["portfolio", "cv"], "cv");
```

`lab/resume.html` (copia de `lab/world.html` con título, aria-label y entry propios):

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Lab: Resume isométrico</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #171423; /* = ISO_COLORS.sky en src/map/palette-iso.ts */ }
      #lab-host { width: 100%; height: 100%; }
      #lab-host canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="lab-host" aria-label="Resume isométrico: la ciudad de oficinas y el astillero. Teclas 0..3 encuadran mundo, Portfolio, Resume, Blog."></div>
    <script type="module" src="/src/lab/resume.ts"></script>
  </body>
</html>
```

En `src/lab/lab-excluded.test.ts` cambiar `["portfolio", "world"]` por `["portfolio", "resume", "world"]`.

- [ ] **Step 5: Correr todo y el build**

Run: `npm test && npm run typecheck && npm run build && ls dist | grep -c lab`
Expected: tests verdes, typecheck verde, build ok y `0` (el laboratorio no entra en `dist/`). Si `npm run build` falla por `content/blog.generated.json` ausente, correr `npm run feed` primero.

- [ ] **Step 6: Capturas y presupuesto**

Levantar `npx vite --port 5199 --strictPort` en background. Con `agent-browser` (ver `~/.claude/projects/-home-nicolasr-Projects-mapa/memory/mapa-worktree-and-lab-quirks.md`): `agent-browser set viewport 1600 900 2`, abrir `http://localhost:5199/map/lab/resume.html` (o `127.0.0.1` si `vite.config.ts` fija `host`), esperar 3 s, `agent-browser screenshot resume.png`; después abrir `/map/lab/world.html`, screenshot `world.png`, `agent-browser press 2`, screenshot `world-cv.png`. Leer en la consola del navegador (`agent-browser console` o el log de `[lab] primer dibujo`) que el primer dibujo esté bajo 150 ms y el peor redibujo bajo 3 ms.

Revisar en las capturas, y corregir en `city.ts` si algo falla:
- El estuario se ve continuo en y = 146; el cinturón de selva tapa la costura.
- Ningún zócalo flota sobre el agua ni sobre la selva de la ribera este.
- El tablero del puente queda por encima del agua y los pilotes se ven tocarla.
- El muro del malecón tapa el talud de la costura este (no se ve una línea de asfalto contra el mar).
- Las ventanas encendidas están sobre las paredes este y sur de la torre y nada las tapa.
- Los papeles salen de la pared este y se alejan hacia arriba a la derecha de la pantalla.

Publicar las tres capturas como artifact (una página con las tres imágenes embebidas como data URIs) y guardar los PNG en el scratchpad, no en el repo.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/world.ts src/scenes/world.test.ts src/lab/page.ts src/lab/portfolio.ts src/lab/world.ts src/lab/resume.ts lab/resume.html src/lab/lab-excluded.test.ts
git commit -m "feat(lab): la ciudad de Resume entra al mundo; página lab/resume.html y helper de páginas"
```

---

### Task 8: Documentación

**Files:**
- Modify: `docs/superpowers/specs/2026-09-14-resume-ciudad-design.md` (estado y desvíos)
- Modify: `docs/superpowers/specs/2026-09-14-mundo-isometrico-design.md` (estado, §5, §6 sendero)
- Modify: `README.md` (laboratorio)
- Modify: `docs/superpowers/plans/2026-09-14-mundo-iso-2-resume-ciudad.md` (estado)

- [ ] **Step 1: Spec de Resume**

Cambiar `**Estado:**` a `implementada (2026-09-14)` y agregar al final de §1 una tabla "Desvíos de la implementación" con las cinco entradas de la sección "Desvíos respecto de la spec" de este plan (columnas este 280/310 y malecón 334, cráter (307, 224), puente hasta 276; plaza y manzanas devoradas como `ground` a nivel de calle; cornisa por material contrario; escalera del malecón hacia adentro; parpadeo de un tick) más cualquier otro que haya surgido en las Tasks 4..7. Actualizar §2 (tabla de tramos y piezas fijas) con los números finales.

- [ ] **Step 2: Spec del mundo**

- `**Estado:**` → `partes 1 y 2 implementadas; Blog pendiente (plan 3)`.
- Al principio de §5 agregar: "Bajado a detalle e implementado en `2026-09-14-resume-ciudad-design.md`; ese documento manda donde difiera de esta sección."
- En §6, "Sendero de `paving`" → "Sendero de `rock` (ruling de la spec de Resume: `paving` es exclusivo de la ciudad)".
- En "Rulings de la parte 1", en el punto del río, agregar que `estuaryEast` vive ahora en `src/scenes/city-grid.ts`.

- [ ] **Step 3: README**

En "Laboratorio isométrico" agregar `/map/lab/resume.html` (ciudad más astillero, encuadre en Resume) junto a `portfolio.html`, y la spec nueva a la lista de specs.

- [ ] **Step 4: Estado de este plan**

Agregar debajo del header, como en el plan 1, una sección `## Estado: implementado (fecha, PR)` con lo hecho distinto del plan y lo que queda para el plan 3 (Blog): mar animado, sendero de `rock`, barcos saliendo de la desembocadura, y el helper `bootWorldPage` ya listo para `lab/blog.html`.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-14-resume-ciudad-design.md docs/superpowers/specs/2026-09-14-mundo-isometrico-design.md docs/superpowers/plans/2026-09-14-mundo-iso-2-resume-ciudad.md
git commit -m "docs: Resume implementado; estado de specs, README del laboratorio y desvíos del plan 2"
```

---

## Cierre

Al terminar la Task 8: `npm test`, `npm run typecheck`, `npm run build && ls dist | grep -c lab` → `0`. Abrir `/map/lab/world.html` y verificar con las teclas `0`..`2` que el mundo, el astillero y la ciudad encuadran. Después, la skill `superpowers:finishing-a-development-branch` decide cómo integrar la rama.

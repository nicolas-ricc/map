# Reintegración del mundo isométrico al sitio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `/map/` muestre el mundo isométrico completo (el de `lab/world.html`) con la interacción del sitio: hover que enciende una zona y vela las otras, clic o Enter que encaja la zona y abre el panel, URL por zona, teclado, móvil; y que el mapa pixel-art viejo desaparezca del repo.

**Architecture:** Un módulo nuevo `src/world/` absorbe lo que hoy vive en `src/lab/` (runtime de capas, armado de escena y animadores, encuadre) y suma dos módulos puros: `veil.ts` (celdas por zona para velar, objetivos de alpha) y `view.ts` (cámara cover por aspecto del host, zona encajada, clamp al sangrado, unproject para el hit test). `src/main.ts` monta `buildStage` en Pixi, mueve la `Camera` existente con `coverView`/`zoneView`, hace el hover con `worldZoneAt` sobre el puntero unproyectado y posiciona los links del `<nav id="zonas">` sobre los landmarks proyectados. El laboratorio queda como páginas finas sobre `src/world/`. Al final se borra `src/map/` viejo y se recortan `zones.ts`, `geo.ts` y `camera.ts`.

**Tech Stack:** TypeScript strict, Vite 8, pixi.js 8 (`src/world/stage.ts`, `src/lab/page.ts`, `src/main.ts`), Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-15-reintegracion-mundo-iso-design.md` (más `2026-09-09-mapa-rpg-sitio-personal-design.md` §5 para la interacción que se conserva).

## Global Constraints

- Parte de `main` con `worktree-mundo-2` ya mergeado. Si el worktree nuevo sale de `origin/main`, primero `git reset --hard main` (ver memoria del repo). `npm ci` y `npm run feed` antes de `typecheck`.
- `src/iso/` y `src/scenes/` **no importan `pixi.js`** (`src/iso/pixi-free.test.ts`). `src/world/` sí puede (`stage.ts`); `veil.ts`, `view.ts`, `assemble.ts` y `frame.ts` no lo necesitan y no lo importan.
- **Ningún literal `0x......` fuera de `palette-iso.ts` y `seed.ts`** (`palette-guard.test.ts`; al borrar `palette.ts` sale de `EXEMPT`). Los colores de los rótulos van en CSS (`#7cf5ff`, `#ffc457`, `#ff5ee0`, los `core` de `ISO_COLORS`).
- Proyección: `sx = x − y`, `sy = (x + y) / 2 − 1.4 z`. Inversa a z 0: `x = sx / 2 + sy`, `y = sy − sx / 2`.
- Sangrado: rectángulo `WORLD ± BLEED` = `x −402..912`, `y −438..714` (1314 × 1152, múltiplos de `CELL_BLEED = 18`, grilla anclada en `(−402, −438)`).
- `worldZoneAt(x, y)` (`src/map/geo.ts`) es la única fuente de verdad de "a qué zona pertenece un punto" (geográfica: la punta del faro es Portfolio). `ZoneId` (`src/map/zones.ts`) y `WorldZone` (`src/map/geo.ts`) son la misma unión `"portfolio" | "cv" | "blog"`.
- Constantes de la spec: `VEIL_ALPHA = 0.45`, `ACCENT_DIM = 0.35`, lerp de alpha `min(1, dt / 120)`, margen de la zona encajada `0.04`, `maxFPS = 30`.
- El laboratorio **no entra en `dist/`** (`lab-excluded.test.ts`); las cuatro páginas `lab/*.html` no cambian.
- Texto y comentarios en español. Commits `feat:`, `test:`, `refactor:`, `docs:`. `npm test` y `npm run typecheck` verdes al final de cada task. Git en el worktree: comandos sueltos, sin `git -C`, sin heredocs, sin cadenas `&&` con git.
- Capturas: `npx vite --port 5199` en segundo plano; `agent-browser set viewport 1600 900 2`; `agent-browser open http://localhost:5199/map/` (`localhost`, no `127.0.0.1`); `agent-browser screenshot out.png`; `agent-browser console` para leer los logs. Recortar con `magick in.png -crop WxH+X+Y +repage out.png`.
- Medición (spec §5): en `/map/` con `import.meta.env.DEV`, leer `[mapa] primer dibujo: N ms, P polígonos estáticos` (dos cargas, tomar la segunda) y `[mapa] peor redibujo en 5 s: N ms` (tres líneas, tomar la mayor). Metas: primer dibujo ≤ 200 ms, peor redibujo ≤ 15 ms.

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/world/frame.ts` (+ `frame.test.ts`) | mover desde `src/lab/draw.ts` | `zoneFrame`, `coverFrame`, `fitTransform`, `drawLayer`, `drawAccents`; `Frame` (antes `LabFrame`) |
| `src/world/view.ts` (+ test) | crear | `View`, `unproject`, `pointerToWorld`, `coverView`, `clampToBleed`, `zoneView`, `viewCorners` (puro) |
| `src/world/veil.ts` (+ test) | crear | `VEIL_ALPHA`, `ACCENT_DIM`, `WORLD_ZONES`, `veilCells`, `veilPolygons`, `focusAlphas` (puro) |
| `src/world/assemble.ts` (+ test) | crear desde `src/lab/page.ts` | `SEED`, `ZonedAnimator`, `assembleWorld` |
| `src/world/stage.ts` | crear desde `src/lab/runtime.ts` | `buildStage`: capas Pixi, velos, acentos por zona, `setFocus`, `tick` |
| `src/lab/page.ts` | modificar | `bootWorldPage` sobre `assembleWorld` + `buildStage`; teclas `0`..`5`; log |
| `src/lab/runtime.ts`, `src/lab/draw.ts`, `src/lab/draw.test.ts` | borrar | absorbidos por `src/world/` |
| `src/main.ts` | reescribir | boot del sitio sobre `src/world/`; hover, clic, rótulos, cámara |
| `index.html` | modificar | `data-zone` en los links del nav; `<p id="titulo">` |
| `src/style.css` | modificar | rótulos sobre el canvas, título, sin `pixelated`, sin reglas de los divs de Pixi |
| `src/camera.ts` (+ test) | modificar | sin `coverTransform` ni `ZOOM` ni `MAP_*` |
| `src/map/zones.ts` (+ test) | recortar | `ZoneId`, `ZONE_IDS`, `Accent`, `ZoneDef { id, name, accent }`, `ZONES`, `zoneById` |
| `src/map/geo.ts` (+ test) | recortar | sin `MAP_W`, `MAP_H`, `coastX`, `splitX`, `isWater` |
| `src/map/{build-world,zone-node,terrain,terrain-portfolio,landmarks,ambient,canvas,ops,paint,pixelfont,brightness,palette}.ts`, `src/title-sign.ts` y sus tests | borrar | mapa pixel-art viejo |
| `src/map/palette-guard.test.ts` | modificar | `EXEMPT` sin `map/palette.ts` |
| `README.md`, spec | modificar | estado, medidas, desvíos |

---

### Task 1: `src/world/frame.ts` (mover `lab/draw.ts`)

**Files:**
- Move: `src/lab/draw.ts` → `src/world/frame.ts`; `src/lab/draw.test.ts` → `src/world/frame.test.ts`
- Modify: `src/lab/runtime.ts:7`, `src/lab/page.ts:13`

**Interfaces:**
- Produces: `export type Frame = WorldZone | "all" | "cover"`, `zoneFrame(frame: Frame): RenderItem[]`, `coverFrame(aspect: number): RenderItem[]`, `fitTransform(items: RenderItem[], width: number, height: number, margin = 0.04): Fit`, `interface Fit { x; y; scale }`, `drawLayer(g, items, layer)`, `drawAccents(g, accents)`. Sin cambios de comportamiento.

- [ ] **Step 1: Mover los archivos con git**

```bash
git mv src/lab/draw.ts src/world/frame.ts
git mv src/lab/draw.test.ts src/world/frame.test.ts
```

- [ ] **Step 2: Renombrar `LabFrame` → `Frame` y arreglar imports**

En `src/world/frame.ts`: `export type Frame = WorldZone | "all" | "cover";` y `zoneFrame(frame: Frame)`. Los imports relativos no cambian de profundidad (`../iso/...`, `../map/geo`).

En `src/world/frame.test.ts`: `import { coverFrame, fitTransform, zoneFrame } from "./frame";`.

En `src/lab/runtime.ts`: `import { drawAccents, drawLayer, fitTransform, type Frame, zoneFrame } from "../world/frame";` y reemplazar `LabFrame` por `Frame` en `LabOptions`, `KEY_ZONE` y la variable `frame`.

En `src/lab/page.ts`: `import type { Frame } from "../world/frame";` y `bootWorldPage(zones, frame: Frame)`.

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm test -- src/world src/lab`
Expected: verde; `frame.test.ts` corre con sus 5 tests.

- [ ] **Step 4: Commit**

```bash
git add -A src/lab src/world
git commit -m "refactor(world): lab/draw.ts pasa a world/frame.ts; LabFrame es Frame"
```

---

### Task 2: `src/world/view.ts` — cámara pura

**Files:**
- Create: `src/world/view.ts`, `src/world/view.test.ts`

**Interfaces:**
- Consumes: `coverFrame`, `zoneFrame`, `fitTransform` de `./frame`; `WORLD`, `BLEED` de `../map/geo`; `project` de `../iso/project`.
- Produces:
  ```ts
  export interface View { x: number; y: number; scale: number }   // = CameraState de src/camera.ts
  export const VIEW_INSET = 3;        // unidades de mundo que el viewport se queda adentro del sangrado
  export const ZONE_MIN_ZOOM = 1.01;  // escala mínima de zoneView relativa a coverView
  export function unproject(sx: number, sy: number): { x: number; y: number };
  export function pointerToWorld(v: View, px: number, py: number): { x: number; y: number };
  export function viewCorners(v: View, w: number, h: number): { x: number; y: number }[];  // 4 esquinas del viewport en mundo, z 0
  export function coverView(w: number, h: number): View;
  export function clampToBleed(v: View, w: number, h: number): View;
  export function zoneView(zone: WorldZone, w: number, h: number): View;
  ```

- [ ] **Step 1: Escribir los tests**

`src/world/view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { v3 } from "../iso/geometry";
import { project } from "../iso/project";
import { BLEED, WORLD, type WorldZone } from "../map/geo";
import { VIEW_INSET, clampToBleed, coverView, pointerToWorld, unproject, viewCorners, zoneView } from "./view";

const X0 = WORLD.x0 - BLEED.x, X1 = WORLD.x1 + BLEED.x, Y0 = WORLD.y0 - BLEED.y, Y1 = WORLD.y1 + BLEED.y;
const insideBleed = (p: { x: number; y: number }, inset = 0, tol = 1e-6) =>
  p.x >= X0 + inset - tol && p.x <= X1 - inset + tol && p.y >= Y0 + inset - tol && p.y <= Y1 - inset + tol;
const SIZES: [number, number][] = [[1600, 900], [1200, 900], [390, 693], [2100, 900], [640, 900], [390, 338]];

describe("unproject", () => {
  it("invierte project a z 0", () => {
    for (const [x, y] of [[0, 0], [150, 50], [-402, 714], [912, -438]] as const) {
      const s = project(v3(x, y, 0));
      const w = unproject(s.x, s.y);
      expect(w.x).toBeCloseTo(x, 9); expect(w.y).toBeCloseTo(y, 9);
    }
  });
  it("pointerToWorld invierte la cámara", () => {
    const v = { x: 123, y: -45, scale: 1.7 };
    const s = project(v3(129, 227, 0));
    const w = pointerToWorld(v, s.x * v.scale + v.x, s.y * v.scale + v.y);
    expect(w.x).toBeCloseTo(129, 9); expect(w.y).toBeCloseTo(227, 9);
  });
});

describe("coverView", () => {
  it.each(SIZES)("%i×%i: llena el host y sus cuatro esquinas quedan dentro del sangrado", (w, h) => {
    const v = coverView(w, h);
    expect(v.scale).toBeGreaterThan(0);
    for (const c of viewCorners(v, w, h)) expect(insideBleed(c)).toBe(true);
  });
  it("16:9 es el mismo encuadre que la tecla 4 del lab (coverFrame 16/9 sin margen)", () => {
    const v = coverView(1600, 900);
    // el rectángulo cover proyectado mide exactamente 1600 de ancho a esta escala
    const corners = viewCorners(v, 1600, 900);
    const sx = corners.map((c) => project(v3(c.x, c.y, 0)).x);
    expect((Math.max(...sx) - Math.min(...sx)) * v.scale).toBeCloseTo(1600, 6);
  });
});

describe("clampToBleed", () => {
  it("deja quieta una vista que ya está adentro", () => {
    const v = coverView(1600, 900);
    // el centro del cover a escala doble: el viewport es la mitad del cover, centrado; sigue adentro
    const z = { x: v.x * 2 - 800, y: v.y * 2 - 450, scale: v.scale * 2 };
    for (const p of viewCorners(z, 1600, 900)) expect(insideBleed(p, VIEW_INSET)).toBe(true);
    expect(clampToBleed(z, 1600, 900)).toEqual(z);
  });
  it("corre una vista que se sale, es idempotente y el resultado queda adentro con VIEW_INSET", () => {
    const v = coverView(1600, 900);
    const out = { x: v.x + 5000, y: v.y - 3000, scale: v.scale * 2 };
    const c = clampToBleed(out, 1600, 900);
    expect(c.scale).toBe(out.scale);
    for (const p of viewCorners(c, 1600, 900)) expect(insideBleed(p, VIEW_INSET)).toBe(true);
    expect(clampToBleed(c, 1600, 900)).toEqual(c);
  });
  it("si el viewport no cabe a esa escala devuelve coverView", () => {
    const v = coverView(1600, 900);
    expect(clampToBleed({ x: 0, y: 0, scale: v.scale / 2 }, 1600, 900)).toEqual(v);
  });
});

describe("zoneView", () => {
  const zones: WorldZone[] = ["portfolio", "cv", "blog"];
  it.each(SIZES)("%i×%i: nunca por debajo de cover y siempre dentro del sangrado", (w, h) => {
    const cover = coverView(w, h);
    for (const z of zones) {
      const v = zoneView(z, w, h);
      expect(v.scale).toBeGreaterThanOrEqual(cover.scale);
      for (const p of viewCorners(v, w, h)) expect(insideBleed(p, VIEW_INSET)).toBe(true);
    }
  });
  it("en móvil (390×338) la zona entera entra: la escala supera la cover", () => {
    expect(zoneView("portfolio", 390, 338).scale).toBeGreaterThan(coverView(390, 338).scale * 1.05);
  });
  it("en la columna angosta (640×900) el landmark de la zona queda visible", () => {
    const v = zoneView("cv", 640, 900);
    const s = project(v3(129, 227, 0)); // torre de oficinas
    const px = s.x * v.scale + v.x, py = s.y * v.scale + v.y;
    expect(px).toBeGreaterThan(0); expect(px).toBeLessThan(640);
    expect(py).toBeGreaterThan(0); expect(py).toBeLessThan(900);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test -- src/world/view`
Expected: FAIL, `Cannot find module './view'`.

- [ ] **Step 3: Implementar `src/world/view.ts`**

```ts
import { BLEED, WORLD, type WorldZone } from "../map/geo";
import { coverFrame, fitTransform, zoneFrame } from "./frame";

/** Estado de cámara del contenedor del mundo: `pantalla = mundo_proyectado × scale + (x, y)`. Igual a CameraState. */
export interface View { x: number; y: number; scale: number }

/** Unidades de mundo que el viewport se queda adentro del rectángulo del sangrado: el borde del terreno está a z −1 (agua) o 0.6 ± 0.8 (lomas), ±1.4 px respecto del paralelogramo a z 0. */
export const VIEW_INSET = 3;
/** zoneView nunca baja de coverView × esto: con el inset, un viewport exactamente a escala cover no cabe. */
export const ZONE_MIN_ZOOM = 1.01;

const X0 = WORLD.x0 - BLEED.x + VIEW_INSET, X1 = WORLD.x1 + BLEED.x - VIEW_INSET;
const Y0 = WORLD.y0 - BLEED.y + VIEW_INSET, Y1 = WORLD.y1 + BLEED.y - VIEW_INSET;

/** Inversa de project() a z 0 (la misma que usa coverQuad). */
export function unproject(sx: number, sy: number): { x: number; y: number } {
  return { x: sx / 2 + sy, y: sy - sx / 2 };
}

/** Punto del host (px desde la esquina del canvas) → mundo a z 0, con la cámara. */
export function pointerToWorld(v: View, px: number, py: number): { x: number; y: number } {
  return unproject((px - v.x) / v.scale, (py - v.y) / v.scale);
}

export function viewCorners(v: View, w: number, h: number): { x: number; y: number }[] {
  return [[0, 0], [w, 0], [w, h], [0, h]].map(([px, py]) => pointerToWorld(v, px!, py!));
}

/** Encuadre cover: el rectángulo del aspecto del host inscripto en el sangrado (coverQuad) llena el host exacto. Sin cielo. */
export function coverView(w: number, h: number): View {
  return fitTransform(coverFrame(w / h), w, h, 0);
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Corre la vista lo mínimo para que las cuatro esquinas del viewport queden
 * dentro del rectángulo del sangrado (con VIEW_INSET). Como unproject es
 * lineal, la x de mundo de cada esquina es `cX − a` y la y es `cY − b`, con
 * `a = (v.x/2 + v.y)/s`, `b = (v.y − v.x/2)/s` y (cX, cY) fijos por esquina:
 * las restricciones son dos intervalos independientes sobre a y b. Si un
 * intervalo es vacío el viewport no cabe a esa escala y se devuelve coverView.
 */
export function clampToBleed(v: View, w: number, h: number): View {
  const s = v.scale;
  const aMin = (w / 2 + h) / s - X1, aMax = -X0;
  const bMin = h / s - Y1, bMax = -w / (2 * s) - Y0;
  if (aMin > aMax || bMin > bMax) return coverView(w, h);
  const a = clamp((v.x / 2 + v.y) / s, aMin, aMax), b = clamp((v.y - v.x / 2) / s, bMin, bMax);
  const x = s * (a - b), y = (s * (a + b)) / 2;
  // sin ruido de coma flotante cuando ya estaba adentro
  return Math.abs(x - v.x) < 1e-9 && Math.abs(y - v.y) < 1e-9 ? { ...v } : { x, y, scale: s };
}

function frameCenter(zone: WorldZone): { x: number; y: number } {
  const pts = zoneFrame(zone)[0]!.pts;
  const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** La caja de la zona encajada con margen 4 %; si eso queda por debajo de cover × ZONE_MIN_ZOOM, esa escala centrada en la caja. Siempre dentro del sangrado. */
export function zoneView(zone: WorldZone, w: number, h: number): View {
  const floor = coverView(w, h).scale * ZONE_MIN_ZOOM;
  const fit = fitTransform(zoneFrame(zone), w, h, 0.04);
  if (fit.scale >= floor) return clampToBleed(fit, w, h);
  const c = frameCenter(zone);
  return clampToBleed({ x: w / 2 - c.x * floor, y: h / 2 - c.y * floor, scale: floor }, w, h);
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- src/world/view`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/view.ts src/world/view.test.ts
git commit -m "feat(world): view.ts: cover por aspecto del host, zona encajada, clamp al sangrado, unproject"
```

---

### Task 3: `src/world/veil.ts` — celdas por zona y objetivos de alpha

**Files:**
- Create: `src/world/veil.ts`, `src/world/veil.test.ts`

**Interfaces:**
- Consumes: `WORLD`, `BLEED`, `CELL`, `CELL_BLEED`, `worldZoneAt`, `WorldZone` de `../map/geo`; `project`, `v3`.
- Produces:
  ```ts
  export const VEIL_ALPHA = 0.45;
  export const ACCENT_DIM = 0.35;
  export const WORLD_ZONES: readonly WorldZone[];              // ["portfolio", "cv", "blog"]
  export interface VeilCell { zone: WorldZone; x: number; y: number; size: number }
  export function veilCells(): VeilCell[];
  export function veilPolygons(): Record<WorldZone, number[][]>;   // pts proyectados [x0,y0,x1,y1,...] por celda
  export interface FocusAlphas { veil: number; accents: number }
  export function focusAlphas(focus: WorldZone | null): Record<WorldZone, FocusAlphas>;
  export function accentZone(a: Accent): WorldZone;
  ```

- [ ] **Step 1: Escribir los tests**

`src/world/veil.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { v3 } from "../iso/geometry";
import { BLEED, CELL, CELL_BLEED, WORLD, worldZoneAt } from "../map/geo";
import { ACCENT_DIM, VEIL_ALPHA, accentZone, focusAlphas, veilCells, veilPolygons } from "./veil";

describe("veilCells", () => {
  const cells = veilCells();
  it("cubren contenido + sangrado sin huecos ni solapes", () => {
    const area = cells.reduce((s, c) => s + c.size * c.size, 0);
    expect(area).toBe((WORLD.x1 - WORLD.x0 + 2 * BLEED.x) * (WORLD.y1 - WORLD.y0 + 2 * BLEED.y));
    for (const c of cells) expect([CELL, CELL_BLEED]).toContain(c.size);
  });
  it("cada celda está en la zona de su centro según worldZoneAt", () => {
    for (const c of cells) expect(c.zone).toBe(worldZoneAt(c.x + c.size / 2, c.y + c.size / 2));
  });
  it("las costuras se subdividen a 6: hay celdas chicas cerca de x 344 e y 146 y ninguna lejos", () => {
    const small = cells.filter((c) => c.size === CELL);
    expect(small.length).toBeGreaterThan(50);
    expect(small.some((c) => Math.abs(c.x - 344) < 40)).toBe(true);
    expect(small.some((c) => Math.abs(c.y - 146) < 40 && c.x < 300)).toBe(true);
    expect(cells.filter((c) => c.size === CELL_BLEED && c.x < -300 && c.y < -300).length).toBeGreaterThan(20);
  });
  it("la punta del faro y su arrecife son Portfolio, el mar abierto es Blog", () => {
    const at = (x: number, y: number) => cells.find((c) => x >= c.x && x < c.x + c.size && y >= c.y && y < c.y + c.size)!.zone;
    expect(at(380, 118)).toBe("portfolio");
    expect(at(404, 118)).toBe("portfolio");
    expect(at(500, 200)).toBe("blog");
    expect(at(-30, 300)).toBe("cv");
  });
});

describe("veilPolygons", () => {
  it("un cuadrilátero proyectado por celda, repartido por zona", () => {
    const polys = veilPolygons();
    const total = polys.portfolio.length + polys.cv.length + polys.blog.length;
    expect(total).toBe(veilCells().length);
    for (const z of ["portfolio", "cv", "blog"] as const) { expect(polys[z].length).toBeGreaterThan(100); for (const p of polys[z]) expect(p).toHaveLength(8); }
  });
});

describe("focusAlphas", () => {
  it("sin foco nada se vela", () => {
    expect(focusAlphas(null)).toEqual({ portfolio: { veil: 0, accents: 1 }, cv: { veil: 0, accents: 1 }, blog: { veil: 0, accents: 1 } });
  });
  it("con foco en cv, las otras dos se velan y sus acentos bajan", () => {
    const a = focusAlphas("cv");
    expect(a.cv).toEqual({ veil: 0, accents: 1 });
    expect(a.portfolio).toEqual({ veil: VEIL_ALPHA, accents: ACCENT_DIM });
    expect(a.blog).toEqual({ veil: VEIL_ALPHA, accents: ACCENT_DIM });
  });
});

describe("accentZone", () => {
  it("un punto por su posición, un polígono por su primer vértice, en mundo", () => {
    expect(accentZone({ kind: "dot", at: v3(10, 10, 5), r: 1, color: "cyan" })).toBe("portfolio");
    expect(accentZone({ kind: "poly", pts: [v3(500, 200, 0), v3(10, 10, 0)], color: "magenta" })).toBe("blog");
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test -- src/world/veil`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar `src/world/veil.ts`**

```ts
import type { Accent } from "../iso/accent";
import { v3 } from "../iso/geometry";
import { project } from "../iso/project";
import { BLEED, CELL, CELL_BLEED, WORLD, worldZoneAt, type WorldZone } from "../map/geo";

/** Alpha del velo (color cielo) sobre una zona no enfocada. */
export const VEIL_ALPHA = 0.45;
/** Alpha de los acentos (luces) de una zona no enfocada. */
export const ACCENT_DIM = 0.35;
export const WORLD_ZONES: readonly WorldZone[] = ["portfolio", "cv", "blog"];

export interface VeilCell { zone: WorldZone; x: number; y: number; size: number }

const CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]] as const;

/**
 * Celdas de contenido + sangrado, cada una en una sola zona: 18 u donde las
 * cuatro esquinas y el centro coinciden en zona, 6 u (clasificadas por su
 * centro) donde no. Es la misma verdad que el hit test (worldZoneAt).
 */
export function veilCells(): VeilCell[] {
  const x0 = WORLD.x0 - BLEED.x, y0 = WORLD.y0 - BLEED.y, x1 = WORLD.x1 + BLEED.x, y1 = WORLD.y1 + BLEED.y;
  const out: VeilCell[] = [];
  for (let y = y0; y < y1; y += CELL_BLEED) for (let x = x0; x < x1; x += CELL_BLEED) {
    const zone = worldZoneAt(x + CELL_BLEED / 2, y + CELL_BLEED / 2);
    const uniform = CORNERS.every(([i, j]) => worldZoneAt(x + i * CELL_BLEED, y + j * CELL_BLEED) === zone);
    if (uniform) { out.push({ zone, x, y, size: CELL_BLEED }); continue; }
    for (let sy = y; sy < y + CELL_BLEED; sy += CELL) for (let sx = x; sx < x + CELL_BLEED; sx += CELL)
      out.push({ zone: worldZoneAt(sx + CELL / 2, sy + CELL / 2), x: sx, y: sy, size: CELL });
  }
  return out;
}

/** Cada celda como cuadrilátero proyectado a z 0, agrupado por zona. Las celdas no se solapan: una Graphics por zona con alpha global no oscurece dos veces. */
export function veilPolygons(): Record<WorldZone, number[][]> {
  const polys: Record<WorldZone, number[][]> = { portfolio: [], cv: [], blog: [] };
  for (const c of veilCells()) {
    const pts: number[] = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) { const p = project(v3(c.x + dx * c.size, c.y + dy * c.size, 0)); pts.push(p.x, p.y); }
    polys[c.zone].push(pts);
  }
  return polys;
}

export interface FocusAlphas { veil: number; accents: number }

/** Objetivos de alpha por zona para un foco (hover o zona activa): las otras dos se velan y apagan sus luces. */
export function focusAlphas(focus: WorldZone | null): Record<WorldZone, FocusAlphas> {
  const out = {} as Record<WorldZone, FocusAlphas>;
  for (const z of WORLD_ZONES) {
    const dim = focus !== null && focus !== z;
    out[z] = { veil: dim ? VEIL_ALPHA : 0, accents: dim ? ACCENT_DIM : 1 };
  }
  return out;
}

/** Zona de un acento por geografía: la posición del punto o el primer vértice del polígono. */
export function accentZone(a: Accent): WorldZone {
  const p = a.kind === "dot" ? a.at : a.pts[0]!;
  return worldZoneAt(p.x, p.y);
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- src/world/veil`
Expected: PASS. Si "las costuras se subdividen" falla en la aserción de `y 146` por el umbral, mirar qué celdas chicas hay (`console.log(small.slice(0, 20))`) y ajustar solo la ventana del test (nunca el algoritmo).

- [ ] **Step 5: Commit**

```bash
git add src/world/veil.ts src/world/veil.test.ts
git commit -m "feat(world): veil.ts: celdas por zona para el velo, objetivos de alpha, zona de un acento"
```

---

### Task 4: `src/world/assemble.ts` — escena y animadores etiquetados

**Files:**
- Create: `src/world/assemble.ts`, `src/world/assemble.test.ts`
- Modify: `src/lab/page.ts` (usa `assembleWorld`)

**Interfaces:**
- Consumes: `world`, `WorldScene` de `../scenes/world`; los siete animadores de `../scenes/*-animator`; `createRng` de `../map/seed`; `Animator` de `../scenes/animator`.
- Produces:
  ```ts
  export const SEED = 7;
  export type ZonedAnimator = Animator & { zone: WorldZone | null };
  export interface Assembled { scene: WorldScene; animators: ZonedAnimator[] }
  export function assembleWorld(zones: readonly WorldZone[] | undefined, opts: { reducedMotion: boolean }): Assembled;
  ```

- [ ] **Step 1: Escribir el test**

`src/world/assemble.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assembleWorld } from "./assemble";

describe("assembleWorld", () => {
  it("el mundo entero trae los siete animadores, cada uno con su zona; el agua no tiene zona", () => {
    const { scene, animators } = assembleWorld(undefined, { reducedMotion: true });
    expect(scene.terrain.bleed.length).toBeGreaterThan(0);
    const zones = animators.map((a) => a.zone);
    expect(zones.filter((z) => z === null)).toHaveLength(1);
    expect(zones.filter((z) => z === "portfolio")).toHaveLength(3); // astillero, fábrica, feria
    expect(zones.filter((z) => z === "cv")).toHaveLength(2);        // ciudad, tech
    expect(zones.filter((z) => z === "blog")).toHaveLength(1);      // mar
    const water = animators.find((a) => a.zone === null)!;
    expect(water.claims?.length ?? 0).toBeGreaterThan(0);
  });
  it("con reducedMotion ningún animador redibuja", () => {
    const { animators } = assembleWorld(undefined, { reducedMotion: true });
    for (const a of animators) expect(a.tick(1000).size).toBe(0);
  });
  it("con filtro de zonas solo vienen los animadores de esas zonas más el agua", () => {
    const { animators } = assembleWorld(["portfolio"], { reducedMotion: true });
    expect(new Set(animators.map((a) => a.zone))).toEqual(new Set([null, "portfolio"]));
    expect(animators.filter((a) => a.zone === "portfolio")).toHaveLength(2); // sin la feria (vive en el sangrado)
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test -- src/world/assemble`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar `src/world/assemble.ts`**

Se copia la lógica de `src/lab/page.ts` (mismos seeds `SEED + 1..5`) y se etiqueta cada animador con `Object.assign` (no spread: los animadores pueden cerrar sobre `this`).

```ts
import type { WorldZone } from "../map/geo";
import { createRng } from "../map/seed";
import type { Animator } from "../scenes/animator";
import { cityAnimator } from "../scenes/city-animator";
import { factoryAnimator } from "../scenes/factory-animator";
import { fairAnimator } from "../scenes/fair-animator";
import { seaAnimator } from "../scenes/sea-animator";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { techAnimator } from "../scenes/tech-animator";
import { waterAnimator } from "../scenes/water-animator";
import { world, type WorldScene } from "../scenes/world";

export const SEED = 7;

/** Un animador con la zona cuyas luces atenúa el velo; `null` (el agua) nunca se atenúa. */
export type ZonedAnimator = Animator & { zone: WorldZone | null };
export interface Assembled { scene: WorldScene; animators: ZonedAnimator[] }

const tag = (a: Animator, zone: WorldZone | null): ZonedAnimator => Object.assign(a, { zone });

/** El mundo (o algunas zonas) y sus animadores, con los seeds del laboratorio. */
export function assembleWorld(zones: readonly WorldZone[] | undefined, opts: { reducedMotion: boolean }): Assembled {
  const { reducedMotion } = opts;
  const scene = world(SEED, zones ? { zones } : {});
  const animators: ZonedAnimator[] = [tag(waterAnimator(scene.terrain, { reducedMotion }), null)];
  if (scene.shipyard) animators.push(tag(shipyardAnimator(scene.shipyard, createRng(SEED + 1), { reducedMotion }), "portfolio"));
  if (scene.city) animators.push(tag(cityAnimator(scene.city, createRng(SEED + 2), { reducedMotion }), "cv"));
  if (scene.factory) animators.push(tag(factoryAnimator({ ...scene.factory, stacks: [...scene.factory.stacks, ...(scene.hinterland?.stacks ?? [])] }, createRng(SEED + 4), { reducedMotion }), "portfolio"));
  if (scene.tech) animators.push(tag(techAnimator(scene.tech, createRng(SEED + 5), { reducedMotion }), "cv"));
  if (scene.fair) animators.push(tag(fairAnimator(scene.fair, { reducedMotion }), "portfolio"));
  if (scene.sea) animators.push(tag(seaAnimator(scene.sea, { reducedMotion }), "blog"));
  return { scene, animators };
}
```

- [ ] **Step 4: Usar `assembleWorld` desde el lab**

`src/lab/page.ts` queda:

```ts
import { assembleWorld } from "../world/assemble";
import type { Frame } from "../world/frame";
import type { WorldZone } from "../map/geo";
import { bootLab } from "./runtime";

/** Una página del laboratorio: el mundo (o algunas zonas), sus animadores y el encuadre inicial. */
export function bootWorldPage(zones: readonly WorldZone[] | undefined, frame: Frame): void {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { scene, animators } = assembleWorld(zones, { reducedMotion });
  void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV, frame });
}
```

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npm test -- src/world src/lab`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/world/assemble.ts src/world/assemble.test.ts src/lab/page.ts
git commit -m "feat(world): assemble.ts arma el mundo y etiqueta cada animador con su zona; el lab lo usa"
```

---

### Task 5: `src/world/stage.ts` — capas Pixi con velos y luces por zona

**Files:**
- Create: `src/world/stage.ts`
- Modify: `src/lab/page.ts` (usa `buildStage`, teclas, log)
- Delete: `src/lab/runtime.ts`

**Interfaces:**
- Consumes: `buildRenderList`, `SHADOW_BAND_ALPHA` de `../iso/render-list`; `ISO_COLORS`; `drawLayer`, `drawAccents` de `./frame`; `veilPolygons`, `focusAlphas`, `accentZone`, `WORLD_ZONES` de `./veil`; `ZonedAnimator`.
- Produces:
  ```ts
  export interface Stage {
    container: Container;
    /** polígonos estáticos (para el log) */
    staticCount: number;
    /** zona enfocada (hover o activa) o null: mueve los objetivos de alpha de velos y acentos */
    setFocus(zone: WorldZone | null): void;
    /** corre los animadores, redibuja lo que devuelvan y avanza el lerp de alpha */
    tick(dtMs: number): void;
  }
  export function buildStage(scene: WorldScene, animators: ZonedAnimator[]): Stage;
  ```

- [ ] **Step 1: Escribir `src/world/stage.ts`**

Es `bootLab` de `src/lab/runtime.ts` sin `Application`, sin teclas ni `fit`, más velos, acentos estáticos por zona y `setFocus`. Orden de capas, de abajo hacia arriba: sangrado, agua, suelo, sombra, núcleo, sólidos estáticos, sólidos animados, **velos**, acentos estáticos por zona, acentos animados.

```ts
import { AlphaFilter, Container, Graphics } from "pixi.js";
import type { Accent } from "../iso/accent";
import { SHADOW_BAND_ALPHA, buildRenderList } from "../iso/render-list";
import type { WorldZone } from "../map/geo";
import { ISO_COLORS } from "../map/palette-iso";
import type { AnimLayer } from "../scenes/animator";
import type { WorldScene } from "../scenes/world";
import type { ZonedAnimator } from "./assemble";
import { drawAccents, drawLayer } from "./frame";
import { WORLD_ZONES, accentZone, focusAlphas, veilPolygons } from "./veil";

export interface Stage {
  container: Container;
  staticCount: number;
  setFocus(zone: WorldZone | null): void;
  tick(dtMs: number): void;
}

/** Constante de tiempo del lerp de alpha (velo y luces): min(1, dt / LERP_MS). */
const LERP_MS = 120;

interface AccentGraphics { g: Graphics; zone: WorldZone | null; base: number }

/**
 * Arma las capas de una escena del mundo. Orden, de abajo hacia arriba: sangrado,
 * agua (estática más animada), suelo, banda completa de sombras, núcleo de
 * sombras, sólidos estáticos, sólidos animados, velos (uno por zona), acentos
 * estáticos (uno por zona) y una Graphics por capa de acentos animada.
 */
export function buildStage(scene: WorldScene, animators: ZonedAnimator[]): Stage {
  const container = new Container();
  const gBleed = new Graphics(), gGround = new Graphics(), gShadow = new Graphics(), gCore = new Graphics(), gSolid = new Graphics();
  const waterSlot = new Container(), shadowSlot = new Container(), coreSlot = new Container(), solidSlot = new Container(), veilSlot = new Container(), accentSlot = new Container();
  // cada banda de sombra es una unión: el filtro aplica el alpha al conjunto,
  // no a cada polígono, así dos sombras superpuestas no se oscurecen dos veces
  shadowSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  coreSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  shadowSlot.addChild(gShadow);
  coreSlot.addChild(gCore);
  container.addChild(gBleed, waterSlot, gGround, shadowSlot, coreSlot, gSolid, solidSlot, veilSlot, accentSlot);

  const { terrain } = scene;
  drawLayer(gBleed, buildRenderList(terrain.bleed), "ground");
  const staticItems = buildRenderList([...terrain.ground, ...scene.ground, ...scene.solids]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gCore, staticItems, "shadowCore");
  drawLayer(gSolid, staticItems, "solid");

  // velos: una Graphics por zona, color cielo, alpha animado desde 0
  const veils = {} as Record<WorldZone, Graphics>;
  const polys = veilPolygons();
  for (const z of WORLD_ZONES) {
    const g = new Graphics();
    for (const p of polys[z]) g.poly(p, true).fill(ISO_COLORS.sky);
    g.alpha = 0;
    veils[z] = g;
    veilSlot.addChild(g);
  }

  // acentos estáticos repartidos por zona (worldZoneAt de su posición)
  const accents: AccentGraphics[] = [];
  const byZone: Record<WorldZone, Accent[]> = { portfolio: [], cv: [], blog: [] };
  for (const a of scene.accents) byZone[accentZone(a)].push(a);
  for (const z of WORLD_ZONES) {
    const g = new Graphics();
    g.blendMode = "add";
    drawAccents(g, byZone[z]);
    accentSlot.addChild(g);
    accents.push({ g, zone: z, base: 1 });
  }

  // agua estática: todo cuerpo de agua que ningún animador reclame (camino de reserva)
  const animatedWater = new Set(animators.flatMap((a) => [...(a.claims ?? []), ...a.ids.flatMap((id) => { const l = a.layer(id); return l.kind === "water" ? l.water : []; })]));
  const staticWater = new Graphics();
  waterSlot.addChild(staticWater);
  drawLayer(staticWater, buildRenderList([...terrain.water, terrain.foam].filter((w) => !animatedWater.has(w))), "ground");

  // una Graphics (o par) por capa animada
  const redraw = new Map<string, () => void>();
  for (const a of animators) for (const id of a.ids) {
    const kind = a.layer(id).kind;
    if (kind === "water") {
      const g = new Graphics();
      waterSlot.addChild(g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "water" }; drawLayer(g, buildRenderList(l.water), "ground"); g.alpha = l.alpha ?? 1; });
    } else if (kind === "solid") {
      const gs = new Graphics(), gc = new Graphics(), g = new Graphics();
      shadowSlot.addChild(gs); coreSlot.addChild(gc); solidSlot.addChild(g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "solid" }; const items = buildRenderList(l.solids); drawLayer(gs, items, "shadow"); drawLayer(gc, items, "shadowCore"); drawLayer(g, items, "solid"); const al = l.alpha ?? 1; gs.alpha = gc.alpha = g.alpha = al; });
    } else {
      const g = new Graphics();
      g.blendMode = "add";
      accentSlot.addChild(g);
      const entry: AccentGraphics = { g, zone: a.zone, base: 1 };
      accents.push(entry);
      // el alpha propio de la capa (barcos que se desvanecen) se guarda; el alpha final lo pone el lerp
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "accent" }; drawAccents(g, l.accents); entry.base = l.alpha ?? 1; });
    }
    redraw.get(id)!();
  }

  // lerp de alpha: objetivos por zona (focusAlphas) y valores actuales
  let target = focusAlphas(null);
  const current: Record<WorldZone, { veil: number; accents: number }> = { portfolio: { veil: 0, accents: 1 }, cv: { veil: 0, accents: 1 }, blog: { veil: 0, accents: 1 } };
  const applyAlphas = (): void => {
    for (const z of WORLD_ZONES) veils[z].alpha = current[z].veil;
    for (const e of accents) e.g.alpha = e.base * (e.zone ? current[e.zone].accents : 1);
  };

  return {
    container,
    staticCount: staticItems.length,
    setFocus(zone) { target = focusAlphas(zone); },
    tick(dtMs) {
      for (const a of animators) for (const id of a.tick(dtMs)) redraw.get(id)?.();
      const k = Math.min(1, dtMs / LERP_MS);
      for (const z of WORLD_ZONES) {
        current[z].veil += (target[z].veil - current[z].veil) * k;
        current[z].accents += (target[z].accents - current[z].accents) * k;
      }
      applyAlphas();
    },
  };
}
```

- [ ] **Step 2: Reescribir `src/lab/page.ts` sobre `buildStage` y borrar `runtime.ts`**

```ts
import { Application } from "pixi.js";
import type { WorldZone } from "../map/geo";
import { ISO_COLORS } from "../map/palette-iso";
import { assembleWorld } from "../world/assemble";
import { coverFrame, fitTransform, type Frame, zoneFrame } from "../world/frame";
import { buildStage } from "../world/stage";
import { WORLD_ZONES } from "../world/veil";

const KEY_ZONE: Record<string, Frame> = { "0": "all", "1": "portfolio", "2": "cv", "3": "blog", "4": "cover" };

/**
 * Una página del laboratorio: el mundo (o algunas zonas), sus animadores y el
 * encuadre inicial. Teclas 0..3 encuadran mundo, Portfolio, Resume y Blog; 4
 * el cover 16:9; 5 rota el foco (velo) entre ninguno, Portfolio, Resume y Blog.
 */
export function bootWorldPage(zones: readonly WorldZone[] | undefined, frame: Frame): void {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const log = import.meta.env.DEV;
  const { scene, animators } = assembleWorld(zones, { reducedMotion });
  void boot();

  async function boot(): Promise<void> {
    const app = new Application();
    await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
    host.appendChild(app.canvas);
    app.ticker.maxFPS = 30;

    const t0 = performance.now();
    const stage = buildStage(scene, animators);
    app.stage.addChild(stage.container);
    if (log) console.info(`[lab] primer dibujo: ${(performance.now() - t0).toFixed(1)} ms, ${stage.staticCount} polígonos estáticos`);

    let current = frame;
    const fit = (): void => {
      // cover toca el borde del sangrado en sus cuatro esquinas: con margen se asoma el cielo justo ahí.
      const items = current === "cover" ? coverFrame(16 / 9) : zoneFrame(current);
      const f = fitTransform(items, host.clientWidth, host.clientHeight, current === "cover" ? 0 : undefined);
      stage.container.position.set(f.x, f.y);
      stage.container.scale.set(f.scale);
    };
    fit();
    app.renderer.on("resize", fit);
    const focusCycle: (WorldZone | null)[] = [null, ...WORLD_ZONES];
    let focusIdx = 0;
    window.addEventListener("keydown", (e) => {
      const z = KEY_ZONE[e.key];
      if (z) { current = z; fit(); }
      if (e.key === "5") { focusIdx = (focusIdx + 1) % focusCycle.length; stage.setFocus(focusCycle[focusIdx]!); }
    });

    let worst = 0, since = 0;
    app.ticker.add((ticker) => {
      const t = performance.now();
      stage.tick(ticker.deltaMS);
      const dt = performance.now() - t;
      worst = Math.max(worst, dt);
      since += ticker.deltaMS;
      if (log && since > 5000) { console.info(`[lab] peor redibujo en 5 s: ${worst.toFixed(2)} ms`); worst = 0; since = 0; }
    });
  }
}
```

```bash
git rm src/lab/runtime.ts
```

- [ ] **Step 3: Verificar typecheck y tests**

Run: `npm run typecheck && npm test`
Expected: verde. `pixi-free.test.ts` sigue verde (no mira `src/world`).

- [ ] **Step 4: Verificar el lab a ojo**

```bash
npx vite --port 5199   # en segundo plano
agent-browser set viewport 1600 900 2
agent-browser open http://localhost:5199/map/lab/world.html
agent-browser press 4
agent-browser screenshot /tmp/claude-1000/.../lab-cover.png
agent-browser press 5
agent-browser screenshot /tmp/claude-1000/.../lab-focus-portfolio.png
agent-browser press 5
agent-browser screenshot /tmp/claude-1000/.../lab-focus-cv.png
agent-browser console
```

Expected: `lab-cover.png` idéntico en contenido al cover de Mundo 3 (sin cielo, agua ondulando, feria arriba). `lab-focus-portfolio.png`: ciudad, distrito tecnológico y mar velados (más oscuros, luces apagadas), astillero, fábrica, hinterland y feria a pleno; la punta del faro sin velo. `lab-focus-cv.png`: lo inverso. Consola: `[lab] primer dibujo` y `[lab] peor redibujo` presentes; anotar los números.

- [ ] **Step 5: Commit**

```bash
git add -A src/lab src/world
git commit -m "feat(world): stage.ts arma las capas con velos y luces por zona; el lab corre sobre buildStage (tecla 5 rota el foco)"
```

---

### Task 6: `src/main.ts`, `index.html`, `src/style.css` — el sitio monta el mundo iso

**Files:**
- Rewrite: `src/main.ts`
- Modify: `index.html:20-26`, `src/style.css`

**Interfaces:**
- Consumes: `assembleWorld`, `buildStage`, `coverView`, `zoneView`, `pointerToWorld`, `worldZoneAt`, `LANDMARKS` (`src/scenes/world.ts`), `project`, `Camera` (`src/camera.ts`, sin cambios todavía), `showMap`/`showZone`, `renderContent`, router.
- Produces: el sitio funcionando sobre el mundo iso. El mapa viejo sigue en el repo pero nadie lo importa (se borra en Task 7).

- [ ] **Step 1: `index.html`: el nav adentro de `#canvas-host`, `data-zone` en los links, el título**

El `<nav id="zonas">` se muda adentro de `#canvas-host` (así `position: absolute; inset: 0` es exactamente el canvas). Queda:

```html
      <div id="canvas-host" aria-label="Mapa">
        <div id="hud" hidden>
          <a id="back" href="/map/">← Volver al mapa</a>
          <h1 id="zone-title" aria-hidden="true"></h1>
        </div>
        <p id="titulo" aria-hidden="true">Nicolás Riccomini</p>
        <nav id="zonas" aria-label="Zonas">
          <ul>
            <li><a href="/map/portfolio/" data-zone="portfolio">Portfolio</a></li>
            <li><a href="/map/cv/" data-zone="cv">Resume</a></li>
            <li><a href="/map/blog/" data-zone="blog">Blog</a></li>
          </ul>
        </nav>
      </div>
      <main id="content" hidden></main>
```

`scripts/inject.ts` no toca ninguno de estos marcadores; `scripts/inject.test.ts` sigue verde.

- [ ] **Step 2: `src/style.css`: rótulos, título, sin pixelated**

Reemplazar la línea `#canvas-host canvas { display: block; image-rendering: pixelated; }` por `#canvas-host canvas { display: block; }`.

Borrar el bloque de los divs de accesibilidad de Pixi (`#canvas-host > div > button:focus-visible { ... }` y su comentario).

Reemplazar el bloque `#zonas { position: absolute; width: 1px; ... }` y las reglas `.no-canvas #zonas*` por:

```css
/* Rótulos de zona: el nav existe siempre en el DOM (links crawleables y navegables
   sin JS) y es la capa de etiquetas sobre el canvas: main.ts posiciona cada link
   sobre el landmark proyectado de su zona en cada frame. Los links son los
   controles accesibles del mapa: orden de tab natural, foco visible nativo. */
#zonas { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
#zonas ul { list-style: none; margin: 0; padding: 0; }
#zonas a {
  position: absolute; left: 0; top: 0; pointer-events: auto; will-change: transform;
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; text-decoration: none;
  text-shadow: 0 0 6px #000, 0 1px 2px #000; transition: opacity 200ms ease;
}
#zonas a[data-zone="portfolio"] { color: #7cf5ff; }
#zonas a[data-zone="cv"] { color: #ffc457; }
#zonas a[data-zone="blog"] { color: #ff5ee0; }
#zonas a:hover, #zonas a:focus-visible { text-decoration: underline; text-underline-offset: 0.3em; filter: brightness(1.25); }
#zonas a:focus-visible { outline: 2px solid var(--fg); outline-offset: 4px; }
#zonas a.dim { opacity: 0.35; }
#titulo { position: absolute; left: 1rem; bottom: 0.75rem; margin: 0; z-index: 1; pointer-events: none; font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #ffc457; text-shadow: 0 0 6px #000, 0 1px 2px #000; transition: opacity 200ms ease; }
body.zone #titulo { opacity: 0; }
.no-canvas, .no-canvas body { height: auto; overflow: auto; }
/* sin canvas el host solo aloja el nav, en flujo */
.no-canvas #canvas-host { height: auto; overflow: visible; }
.no-canvas #canvas-host canvas, .no-canvas #hud, .no-canvas #titulo { display: none; }
.no-canvas #app { display: block; height: auto; }
.no-canvas #content { opacity: 1; }
.no-canvas #zonas { position: static; pointer-events: auto; padding: 2rem clamp(1rem, 4vw, 3rem) 0; }
.no-canvas #zonas ul { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.no-canvas #zonas a { position: static; transform: none !important; font-size: 1.1rem; letter-spacing: 0; text-transform: none; text-decoration: underline; }
```

- [ ] **Step 3: Reescribir `src/main.ts`**

```ts
import { Application } from "pixi.js";
import blogJson from "../content/blog.json";
import cvJson from "../content/cv.json";
import portfolioJson from "../content/portfolio.json";
import feed from "../content/blog.generated.json";
import { Camera } from "./camera";
import { mergeBlogFeed } from "./content/blog-feed";
import { renderContent } from "./content/render";
import type { ZoneContent } from "./content/types";
import { v3 } from "./iso/geometry";
import { project } from "./iso/project";
import { worldZoneAt } from "./map/geo";
import { ISO_COLORS } from "./map/palette-iso";
import { zoneById, type ZoneId } from "./map/zones";
import { pathForZone, zoneFromPath } from "./router";
import { LANDMARKS } from "./scenes/world";
import { showMap, showZone } from "./views";
import { assembleWorld } from "./world/assemble";
import { buildStage } from "./world/stage";
import { coverView, pointerToWorld, zoneView, type View } from "./world/view";

const CONTENT: Record<ZoneId, ZoneContent> = {
  portfolio: portfolioJson as ZoneContent,
  cv: cvJson as ZoneContent,
  blog: mergeBlogFeed(blogJson as ZoneContent, feed.items),
};

/** Altura (mundo) a la que cuelga el rótulo sobre el pie del landmark: por encima de la torre (30). */
const LABEL_Z = 34;

async function boot(): Promise<void> {
  const host = document.getElementById("canvas-host") as HTMLDivElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const log = import.meta.env.DEV;

  const app = new Application();
  await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  const t0 = performance.now();
  const { scene, animators } = assembleWorld(undefined, { reducedMotion: reduced });
  const stage = buildStage(scene, animators);
  app.stage.addChild(stage.container);
  if (log) console.info(`[mapa] primer dibujo: ${(performance.now() - t0).toFixed(1)} ms, ${stage.staticCount} polígonos estáticos`);

  let current: ZoneId | null = zoneFromPath(location.pathname);
  /** zona bajo el puntero o con un link enfocado; en vista activa manda `current` */
  let hot: ZoneId | null = null;

  const labels = new Map<ZoneId, HTMLAnchorElement>();
  for (const a of document.querySelectorAll<HTMLAnchorElement>("#zonas a[data-zone]")) labels.set(a.dataset.zone as ZoneId, a);

  const placeLabels = (v: View): void => {
    for (const [id, a] of labels) {
      const l = LANDMARKS[id];
      const p = project(v3(l.x, l.y, LABEL_Z));
      a.style.transform = `translate(${(p.x * v.scale + v.x).toFixed(1)}px, ${(p.y * v.scale + v.y).toFixed(1)}px) translate(-50%, -100%)`;
    }
  };

  const camera = new Camera((s) => { stage.container.position.set(s.x, s.y); stage.container.scale.set(s.scale); placeLabels(s); }, { reducedMotion: reduced });

  const targetFor = (id: ZoneId | null): View => {
    const w = host.clientWidth, h = host.clientHeight;
    return id ? zoneView(id, w, h) : coverView(w, h);
  };

  const refreshFocus = (): void => { stage.setFocus(current ?? hot); };

  function render(id: ZoneId | null, animate: boolean): void {
    if (id) {
      const prerendered = document.body.dataset.zone === id && document.getElementById("content")!.childElementCount > 0;
      showZone(id, zoneById(id).name, prerendered ? null : renderContent(CONTENT[id]));
    } else {
      showMap();
    }
    for (const [lid, a] of labels) a.classList.toggle("dim", id !== null && id !== lid);
    refreshFocus();
    const t = targetFor(id);
    if (animate) void camera.tweenTo(t); else camera.jumpTo(t);
  }

  function navigate(id: ZoneId | null, push: boolean): void {
    // clic sobre la zona ya activa (o "volver" estando en el mapa): sin entrada de
    // historial duplicada. popstate no pasa por acá: setea current antes de render.
    if (id === current) return;
    current = id;
    if (push) history.pushState({ zone: id }, "", pathForZone(id));
    render(id, true);
  }

  // hover y clic sobre el canvas: puntero → mundo a z 0 → zona por geografía
  const zoneUnder = (e: PointerEvent | MouseEvent): ZoneId => {
    const r = app.canvas.getBoundingClientRect();
    const p = pointerToWorld(camera.state, e.clientX - r.left, e.clientY - r.top);
    return worldZoneAt(p.x, p.y);
  };
  app.canvas.style.cursor = "pointer";
  app.canvas.addEventListener("pointermove", (e) => { const z = zoneUnder(e); if (z !== hot) { hot = z; refreshFocus(); } });
  app.canvas.addEventListener("pointerleave", () => { hot = null; refreshFocus(); });
  app.canvas.addEventListener("click", (e) => navigate(zoneUnder(e), true));

  // los links del nav son los controles accesibles: foco o hover encienden su zona
  for (const [id, a] of labels) {
    a.addEventListener("mouseenter", () => { hot = id; refreshFocus(); });
    a.addEventListener("focus", () => { hot = id; refreshFocus(); });
    a.addEventListener("mouseleave", () => { hot = null; refreshFocus(); });
    a.addEventListener("blur", () => { hot = null; refreshFocus(); });
    a.addEventListener("click", (e) => { e.preventDefault(); navigate(id, true); });
  }

  // El host cambia de tamaño por CSS durante la transición: seguirlo frame a frame.
  new ResizeObserver(() => {
    app.resize();
    const t = targetFor(current);
    if (camera.isTweening) camera.retarget(t); else camera.jumpTo(t);
  }).observe(host);

  window.addEventListener("popstate", () => { current = zoneFromPath(location.pathname); render(current, true); });
  document.getElementById("back")!.addEventListener("click", (e) => { e.preventDefault(); navigate(null, true); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) navigate(null, true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) app.ticker.stop(); else app.ticker.start(); });

  let worst = 0, since = 0;
  app.ticker.add((ticker) => {
    camera.tick(performance.now());
    const t = performance.now();
    stage.tick(ticker.deltaMS);
    if (log) {
      worst = Math.max(worst, performance.now() - t);
      since += ticker.deltaMS;
      if (since > 5000) { console.info(`[mapa] peor redibujo en 5 s: ${worst.toFixed(2)} ms`); worst = 0; since = 0; }
    }
  });

  // El primer render (sobre todo en una carga directa de /cv/) no debe animar: la clase
  // .zone recién se aplica acá, después del primer paint, y la grilla animaría sola.
  const root = document.documentElement;
  root.classList.add("no-anim");
  render(current, false);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));
}

boot().catch((e: unknown) => {
  // Sin canvas (WebGL caído, init fallido) el sitio sigue siendo navegable: el CSS
  // de .no-canvas revela el <nav id="zonas"> y el contenido prerenderizado.
  console.error(e);
  document.documentElement.classList.add("no-canvas");
});
```

- [ ] **Step 4: Verificar typecheck, tests y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: verde; `dist/` con `index.html`, `portfolio/`, `cv/`, `blog/`, `404.html`, sin `lab/`.

- [ ] **Step 5: Verificar en el browser**

```bash
npx vite --port 5199   # en segundo plano (si no está corriendo)
agent-browser set viewport 1600 900 2
agent-browser open http://localhost:5199/map/
agent-browser screenshot .../site-cover.png
agent-browser hover "canvas" (o mover el puntero a 300,300 sobre el canvas)
agent-browser screenshot .../site-hover.png
agent-browser click "text=Resume"
agent-browser screenshot .../site-cv.png
agent-browser press Escape
agent-browser screenshot .../site-back.png
agent-browser console
```

Expected, en orden: cover sin cielo con los tres rótulos sobre grúa pórtico, torre y faro y el título abajo a la izquierda; con el puntero sobre el astillero, ciudad y mar velados; tras el clic, URL `/map/cv/`, columna izquierda con la ciudad y el distrito encajados, sin cielo, panel a la derecha, título oculto, rótulos de Portfolio y Blog al 35 %; tras Escape, de vuelta al cover. Consola sin errores; `[mapa] primer dibujo` y `[mapa] peor redibujo` presentes.

Móvil: `agent-browser set viewport 390 844 2`, `open http://localhost:5199/map/`, captura; `click "text=Portfolio"`, captura. Expected: cover sin cielo (mar al sur, aceptado por la spec §3.6); zona en la franja de 40vh sin cielo.

Teclado: `agent-browser press Tab` ×3 con capturas: el foco visible pasa por Portfolio, Resume, Blog y cada uno vela a los otros; `press Enter` abre la zona enfocada.

Carga directa: `npm run preview` (puerto que imprima) y `open http://localhost:PUERTO/map/cv/`: arranca en dos columnas con la cámara ya en la zona y sin animar.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts index.html src/style.css
git commit -m "feat(sitio): el mapa es el mundo isométrico: cover por aspecto, hover por geografía, rótulos HTML sobre los landmarks"
```

---

### Task 7: Borrar el mapa viejo y recortar `zones.ts`, `geo.ts`, `camera.ts`

**Files:**
- Delete: `src/map/build-world.ts`, `zone-node.ts`, `terrain.ts`, `terrain.test.ts`, `terrain-portfolio.ts`, `terrain-portfolio.test.ts`, `landmarks.ts`, `landmarks.test.ts`, `ambient.ts`, `canvas.ts`, `ops.ts`, `ops.test.ts`, `paint.ts`, `pixelfont.ts`, `pixelfont.test.ts`, `brightness.ts`, `brightness.test.ts`, `palette.ts`, `palette.test.ts`, `src/title-sign.ts`
- Modify: `src/map/zones.ts`, `src/map/zones.test.ts`, `src/map/geo.ts`, `src/map/geo.test.ts`, `src/camera.ts`, `src/camera.test.ts`, `src/map/palette-guard.test.ts`

**Interfaces:**
- Produces: `src/map/zones.ts`:
  ```ts
  export type ZoneId = "portfolio" | "cv" | "blog";
  export const ZONE_IDS: readonly ZoneId[];
  export type Accent = "cyan" | "amber" | "magenta";
  export interface ZoneDef { id: ZoneId; name: string; accent: Accent }
  export const ZONES: readonly ZoneDef[];
  export function zoneById(id: ZoneId): ZoneDef;
  ```
  `src/camera.ts` exporta `Camera`, `CameraState`, `DURATION_MS`, `easeOutCubic`.

- [ ] **Step 1: Borrar los archivos**

```bash
git rm src/map/build-world.ts src/map/zone-node.ts src/map/terrain.ts src/map/terrain.test.ts src/map/terrain-portfolio.ts src/map/terrain-portfolio.test.ts src/map/landmarks.ts src/map/landmarks.test.ts src/map/ambient.ts src/map/canvas.ts src/map/ops.ts src/map/ops.test.ts src/map/paint.ts src/map/pixelfont.ts src/map/pixelfont.test.ts src/map/brightness.ts src/map/brightness.test.ts src/map/palette.ts src/map/palette.test.ts src/title-sign.ts
```

Si alguno de esos tests no existe (`ls src/map`), sacarlo de la lista.

- [ ] **Step 2: Recortar `src/map/zones.ts`**

```ts
export type ZoneId = "portfolio" | "cv" | "blog";
export const ZONE_IDS: readonly ZoneId[] = ["portfolio", "cv", "blog"];

/** Color de luz artificial de una zona (los `core` de ISO_COLORS; en CSS, los rótulos). */
export type Accent = "cyan" | "amber" | "magenta";

export interface ZoneDef {
  id: ZoneId;
  name: string;
  accent: Accent;
}

/** Las tres zonas en orden de tab. La geografía (qué punto es de qué zona) vive en geo.ts (worldZoneAt). */
export const ZONES: readonly ZoneDef[] = [
  { id: "portfolio", name: "Portfolio", accent: "cyan" },
  { id: "cv", name: "Resume", accent: "amber" },
  { id: "blog", name: "Blog", accent: "magenta" },
];

export function zoneById(id: ZoneId): ZoneDef {
  const z = ZONES.find((z) => z.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}
```

`src/map/zones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ZONES, ZONE_IDS, zoneById } from "./zones";

describe("zones", () => {
  it("hay tres zonas con ids únicos en orden portfolio, cv, blog", () => {
    expect(ZONES.map((z) => z.id)).toEqual(["portfolio", "cv", "blog"]);
    expect(ZONE_IDS).toEqual(["portfolio", "cv", "blog"]);
  });
  it("cada zona tiene nombre y acento propios", () => {
    expect(new Set(ZONES.map((z) => z.accent)).size).toBe(3);
    expect(zoneById("cv")).toEqual({ id: "cv", name: "Resume", accent: "amber" });
  });
  it("una zona desconocida tira", () => {
    expect(() => zoneById("x" as never)).toThrow(/desconocida/);
  });
});
```

- [ ] **Step 3: Recortar `src/map/geo.ts`**

Borrar `MAP_W`, `MAP_H`, `coastX`, `splitX`, `isWater` y el comentario de cabecera que habla del lienzo (reescribirlo: "Geografía del mundo: río, bahía, punta, cortes de zona, sangrado y cover"). Verificar con `grep -rn "coastX\|splitX\|isWater\b\|MAP_W\|MAP_H" src scripts` que no queda ningún uso (fuera de `isWaterAt` de `terrain-classify.ts`). En `src/map/geo.test.ts`, borrar los tests que los usen (si los hay).

- [ ] **Step 4: Recortar `src/camera.ts` y su test**

Borrar la primera línea (`import { MAP_H, MAP_W } from "./map/zones";`), `export const ZOOM = 2.5;` y la función `coverTransform`. En `src/camera.test.ts`: `import { Camera, DURATION_MS, easeOutCubic } from "./camera";`, borrar el `describe("coverTransform", ...)` y el import de `MAP_*`.

- [ ] **Step 5: `palette-guard.test.ts`**

`const EXEMPT = new Set(["map/palette-iso.ts", "map/seed.ts"]);` y actualizar el comentario ("palette-iso.ts define los colores").

- [ ] **Step 6: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: verde. Si el typecheck marca imports huérfanos (por ejemplo `Accent` de `palette` en algún módulo), arreglarlos apuntando a `zones.ts`. Revisar con `grep -rn "map/palette\"\|title-sign\|build-world\|zone-node" src scripts` que no queda ninguna referencia.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "refactor: se borra el mapa pixel-art; zones.ts, geo.ts y camera.ts quedan solo con lo que usa el mundo iso"
```

---

### Task 8: Medición, QA final, README y spec

**Files:**
- Modify: `README.md` (sección "Laboratorio isométrico" y la intro), `docs/superpowers/specs/2026-09-15-reintegracion-mundo-iso-design.md` (estado, §5 medidas, "Desvíos de la implementación")

- [ ] **Step 1: Medir**

Con `npx vite --port 5199` corriendo y `agent-browser set viewport 1600 900 2`: abrir `http://localhost:5199/map/` dos veces (cerrar y reabrir la pestaña), leer `agent-browser console`, tomar la segunda línea `[mapa] primer dibujo` y la mayor de tres `[mapa] peor redibujo en 5 s` (esperar ~16 s entre lecturas). Mover el puntero sobre el canvas durante la medición del peor redibujo para incluir el lerp del hover. Anotar también `ls -la dist/assets/*.js` y `gzip -c dist/assets/index-*.js | wc -c` tras `npm run build`.

Metas: primer dibujo ≤ 200 ms, peor redibujo ≤ 15 ms. Si el primer dibujo se pasa, el sospechoso es el velo (≈ 5 000 polígonos): probar unir las celdas de 18 en tiras horizontales por fila y zona en `veilCells` (misma cobertura, menos polígonos) y volver a medir; el test de área sigue valiendo.

- [ ] **Step 2: Checklist manual (spec §6) con capturas**

Repetir los pasos 1..8 del §6 de la spec y escribir PASS/FAIL por ítem en la sección "Desvíos de la implementación" de la spec, con el nombre de cada captura. Ítems: cover 16:9 sin cielo y rótulos; hover en cada zona y en la punta del faro; clic en Resume y vuelta; Tab por los tres links y Enter; móvil 390×844 cover y zona; carga directa de `/map/cv/` con `npm run preview`; `prefers-reduced-motion` (`agent-browser` con `emulate media reduced-motion` si lo soporta, si no, anotar "no verificado" y probar en el browser del usuario); `npm test`, `typecheck`, `build`, `dist/` sin `lab/`, los cuatro `lab/*.html` abren.

- [ ] **Step 3: README**

En la intro: "Sitio personal: un mapa isométrico nocturno con tres zonas (Portfolio, Resume, Blog)". En "Laboratorio isométrico": el runtime compartido vive en `src/world/` (`stage.ts`, `assemble.ts`, `frame.ts`, `veil.ts`, `view.ts`); el lab son páginas finas (`src/lab/page.ts`); tecla `5` rota el foco; el sitio usa `coverView(host)` (aspecto del host) y no `coverFrame(16/9)`. Agregar esta spec a la lista de specs.

- [ ] **Step 4: Spec**

`**Estado:** implementada (fecha)`. En §5 pegar las medidas (primer dibujo, peor redibujo, polígonos, gzip) y las líneas de consola crudas. Sección nueva "Desvíos de la implementación" con lo que se apartó del texto (por ejemplo `ZONE_MIN_ZOOM = 1.01` y `VIEW_INSET` en unidades de mundo, `LABEL_Z = 34`, el nav movido adentro de `#canvas-host`, el resultado de la columna angosta: la zona no entra entera y se centra a escala cover).

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-15-reintegracion-mundo-iso-design.md
git commit -m "docs: reintegración implementada: medidas, checklist y desvíos"
```

---

## Self-review

- **Cobertura de la spec:** §2 decisiones → Tasks 2 (cámara), 3+5 (velo/luces), 6 (hit test, rótulos, accesibilidad, renderer, reduced motion), 7 (mapa viejo). §3.1 → Task 7. §3.2 → Task 5. §3.3 → Task 4. §3.4 → Task 1. §3.5 → Task 3. §3.6 → Task 2. §3.7/3.8 → Task 6. §3.9 → Tasks 4 y 5. §5 → Task 8. §6 tests → Tasks 2, 3, 4, 7; manual → Tasks 5, 6, 8. §7 criterios → Task 8.
- **Desvíos ya conocidos respecto de la spec** (anotar en Task 8): `clampToBleed` usa un inset en unidades de mundo (`VIEW_INSET = 3`) y `zoneView` un piso de `cover × 1.01`; `stage.test.ts` de la spec no existe: la lógica de alpha se testea en `focusAlphas` (puro) y el resto a ojo en el lab; el `<nav>` se mueve adentro de `#canvas-host`.
- **Tipos consistentes:** `View` ≡ `CameraState` (misma forma, `Camera.tweenTo` acepta `View`). `ZonedAnimator` definido en Task 4, usado en Task 5. `Frame` (Task 1) usado en Tasks 4, 5. `WORLD_ZONES`, `focusAlphas`, `veilPolygons`, `accentZone` (Task 3) usados en Task 5. `staticCount` (Task 5) usado en Tasks 5 y 6. `LANDMARKS` (existente en `src/scenes/world.ts`, `Record<WorldZone, Vec3>`) usado en Task 6.

# Sitio personal como mapa RPG — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sitio estático con un mapa RPG pixel art nocturno (PixiJS v8) cuyas tres zonas iluminadas (Portfolio, Currículum, Blog) llevan, con zoom de cámara y sin recarga, a una vista de dos columnas con el contenido de cada zona.

**Architecture:** Toda la lógica de dibujo es pura y produce listas de `PixelOp` (rectángulos con color) que un único módulo aplica a `Graphics`; eso hace testeable en Node el terreno, la fuente y los landmarks. El terreno se pinta una vez a un `RenderTexture` de 480x270 escalado con nearest-neighbor. Un `Container` raíz hace de cámara. Las vistas (mapa / zona) son clases CSS en `<body>` más un router sobre la History API. El contenido es JSON validado en build y renderizado a HTML tanto en el prerender (Node) como en el cliente.

**Tech Stack:** Vite 6+, TypeScript 5, pixi.js 8.x, Vitest, tsx (scripts Node en TS), GitHub Actions + GitHub Pages. Sin framework de UI, sin librería de tweens, sin fuentes web, sin binarios de arte.

**Spec:** `docs/superpowers/specs/2026-09-09-mapa-rpg-sitio-personal-design.md`

## Global Constraints

- Lienzo lógico del mapa: **480x270** px, coordenadas enteras.
- Paleta: exactamente **16 colores**, todos en `src/map/palette.ts`; ningún literal hex fuera de ese archivo (los tests lo verifican).
- JS total **< 200 KB gzip**; ningún asset binario de arte; sin web fonts.
- Zonas v1 y sus ids exactos: `portfolio`, `cv`, `blog`. Rutas: `/`, `/portfolio/`, `/cv/`, `/blog/`.
- Tween de cámara: **500 ms**, ease-out cúbico; con `prefers-reduced-motion: reduce` duración 0.
- Todo el texto visible en español. Nombres de zona: "Portfolio", "Currículum", "Blog".
- Commits pequeños, uno por task como mínimo, con prefijos `feat:`, `test:`, `chore:`, `docs:`.
- `npm test` y `npm run build` deben pasar al final de cada task.
- No usar `DOMContainer` (experimental). El HTML se posiciona con CSS.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/map/ops.ts` | Tipo `PixelOp`, `applyOps(g, ops)`, `opsBounds(ops)` |
| `src/map/palette.ts` | 16 colores nombrados, `ACCENTS` por zona |
| `src/map/seed.ts` | PRNG determinístico `createRng(seed)` |
| `src/map/pixelfont.ts` | Glifos 3x5, `textOps(text, x, y, color)`, `textWidth(text)` |
| `src/map/zones.ts` | `ZONES`, `ZoneDef`, `pointInPolygon` |
| `src/map/terrain.ts` | `buildTerrain(seed, zones)` → ops estáticos + 2 frames de río |
| `src/map/landmarks.ts` | `landmarkFrames(zoneId)` → `PixelOp[][]`, `glowOps(accent)` |
| `src/map/canvas.ts` | Renderiza ops a `RenderTexture`/`Texture` (browser) |
| `src/map/zone-node.ts` | `ZoneNode`: container por zona con estados idle/hot/active/dim |
| `src/map/ambient.ts` | Luciérnagas, flicker, swap de frames del río |
| `src/camera.ts` | `coverTransform`, `Camera` con tween inyectable |
| `src/router.ts` | `zoneFromPath`, `pathForZone` |
| `src/content/types.ts` | Tipos del JSON de contenido |
| `src/content/validate.ts` | `validateContent(data)` → errores |
| `src/content/render.ts` | `renderContent(zone)` → HTML string |
| `src/views.ts` | `showMap()`, `showZone(id)`: clases en body, monta HTML |
| `src/main.ts` | Arranque, wiring de eventos, resize, popstate |
| `src/style.css` | Layout de las dos vistas, transiciones, reduced-motion |
| `content/*.json` | Contenido editable |
| `scripts/validate-content.ts` | Falla el build si un JSON es inválido |
| `scripts/fetch-blog-feed.ts` | RSS → `content/blog.generated.json` |
| `scripts/prerender.ts` | `dist/index.html` → `dist/<zona>/index.html` con contenido |
| `.github/workflows/deploy.yml` | Build y publicación a Pages |

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`, `public/.nojekyll`

**Interfaces:**
- Produces: proyecto que compila con `npm run build`, corre tests con `npm test` y sirve con `npm run dev`. `index.html` con `<div id="app"><div id="canvas-host"></div><main id="content" hidden></main></div>`.

- [ ] **Step 1: Inicializar npm e instalar dependencias**

```bash
cd ~/Projects/mapa
npm init -y
npm pkg set name="mapa" type="module" private=true
npm pkg set scripts.dev="vite" scripts.build="vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.typecheck="tsc --noEmit"
npm install pixi.js@^8
npm install -D vite typescript vitest tsx @types/node
```

- [ ] **Step 2: Configuración**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "scripts", "vite.config.ts", "vitest.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: { target: "es2022", sourcemap: false },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"], environment: "node" },
});
```

`.gitignore`:
```
node_modules
dist
content/blog.generated.json
```

`public/.nojekyll`: archivo vacío (GitHub Pages no debe procesar con Jekyll).

- [ ] **Step 3: HTML, CSS y main mínimos**

`index.html`:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Nicolás Riccomini: portfolio, currículum y blog." />
    <title>Nicolás Riccomini</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body data-zone="">
    <div id="app">
      <div id="canvas-host" aria-label="Mapa"></div>
      <main id="content" hidden></main>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css` (base; el layout de vistas se completa en la Task 12):
```css
:root {
  color-scheme: dark;
  --bg: #0b1620;
  --fg: #e6edf3;
  --muted: #9aa7b2;
}
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
#app { height: 100%; }
#canvas-host { position: relative; width: 100%; height: 100%; overflow: hidden; }
#canvas-host canvas { display: block; image-rendering: pixelated; }
```

`src/main.ts`:
```ts
import { Application } from "pixi.js";

async function boot(): Promise<void> {
  const host = document.getElementById("canvas-host") as HTMLDivElement;
  const app = new Application();
  await app.init({ resizeTo: host, background: 0x0b1620, antialias: false, resolution: 1, roundPixels: true });
  host.appendChild(app.canvas);
}

boot();
```

Nota: `boot()` se llama sin `await` a nivel de módulo a propósito. El top-level await rompe el build de producción en Vite ≤ 6.0.6.

- [ ] **Step 4: Verificar build y test**

Run: `npm run build && npm test`
Expected: `dist/` generado; Vitest reporta "No test files found" con exit code 0 (agregar `passWithNoTests: true` al bloque `test` de `vitest.config.ts` si sale 1).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript + PixiJS + Vitest"
```

---

### Task 2: PRNG determinístico

**Files:**
- Create: `src/map/seed.ts`, `src/map/seed.test.ts`

**Interfaces:**
- Produces: `createRng(seed: number): Rng` con `Rng = { next(): number; int(min: number, max: number): number; chance(p: number): boolean; pick<T>(arr: readonly T[]): T }`. `next()` en [0, 1); `int` inclusivo en ambos extremos.

- [ ] **Step 1: Test**

`src/map/seed.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createRng } from "./seed";

describe("createRng", () => {
  it("es determinístico para la misma seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("cambia con la seed", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("next está en [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int es inclusivo en ambos extremos", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(0, 2));
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it("pick devuelve un elemento del array", () => {
    const rng = createRng(9);
    expect(["a", "b", "c"]).toContain(rng.pick(["a", "b", "c"]));
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- seed`
Expected: FAIL, "Cannot find module './seed'".

- [ ] **Step 3: Implementar (mulberry32)**

`src/map/seed.ts`:
```ts
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)] as (typeof arr)[number],
  };
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- seed`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/map/seed.ts src/map/seed.test.ts
git commit -m "feat: PRNG determinístico mulberry32"
```

---

### Task 3: Paleta y operaciones de píxel

**Files:**
- Create: `src/map/palette.ts`, `src/map/palette.test.ts`, `src/map/ops.ts`, `src/map/ops.test.ts`

**Interfaces:**
- Produces:
  - `PALETTE: Record<PaletteName, number>` con exactamente 16 entradas. `PaletteName` es la unión de los nombres.
  - `Accent = "cyan" | "amber" | "magenta"`; `ACCENTS: Record<Accent, { core: number; mid: number; bleed: number }>`.
  - `PixelOp = { x: number; y: number; w: number; h: number; color: number }` (todo rectángulos; un píxel es w=h=1).
  - `rect(x, y, w, h, color): PixelOp`, `px(x, y, color): PixelOp`.
  - `opsBounds(ops): { minX, minY, maxX, maxY }` (maxX/maxY exclusivos).
  - `applyOps(g: Graphics, ops: PixelOp[]): void` (browser; sin test unitario).

- [ ] **Step 1: Tests**

`src/map/palette.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ACCENTS, PALETTE } from "./palette";

describe("PALETTE", () => {
  it("tiene exactamente 16 colores", () => {
    expect(Object.keys(PALETTE)).toHaveLength(16);
  });
  it("no repite colores", () => {
    const values = Object.values(PALETTE);
    expect(new Set(values).size).toBe(values.length);
  });
  it("cada acento tiene core, mid y bleed dentro de la paleta", () => {
    const all = new Set(Object.values(PALETTE));
    for (const accent of Object.values(ACCENTS)) {
      expect(all.has(accent.core)).toBe(true);
      expect(all.has(accent.mid)).toBe(true);
      expect(all.has(accent.bleed)).toBe(true);
    }
  });
});
```

`src/map/ops.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { opsBounds, px, rect } from "./ops";

describe("ops", () => {
  it("px es un rect de 1x1", () => {
    expect(px(3, 4, 0xff)).toEqual({ x: 3, y: 4, w: 1, h: 1, color: 0xff });
  });
  it("opsBounds cubre todos los rects", () => {
    const b = opsBounds([rect(2, 3, 4, 5, 1), px(10, 1, 1)]);
    expect(b).toEqual({ minX: 2, minY: 1, maxX: 11, maxY: 8 });
  });
  it("opsBounds de lista vacía es cero", () => {
    expect(opsBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- palette ops`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar**

`src/map/palette.ts`:
```ts
export const PALETTE = {
  ground: 0x0b1620,
  road: 0x2a2f3a,
  concrete: 0x3b3550,
  leaf: 0x0f2a1c,
  leafDark: 0x081a12,
  river: 0x060c14,
  rust: 0x5a3320,
  cyan: 0x7cf5ff,
  cyanMid: 0x27b3c9,
  cyanBleed: 0x134a52,
  amber: 0xffc857,
  amberMid: 0xc98a1f,
  amberBleed: 0x4a3a12,
  magenta: 0xff5cd6,
  magentaMid: 0xb8288f,
  magentaBleed: 0x4a1440,
} as const;

export type PaletteName = keyof typeof PALETTE;
export type Accent = "cyan" | "amber" | "magenta";

export const ACCENTS: Record<Accent, { core: number; mid: number; bleed: number }> = {
  cyan: { core: PALETTE.cyan, mid: PALETTE.cyanMid, bleed: PALETTE.cyanBleed },
  amber: { core: PALETTE.amber, mid: PALETTE.amberMid, bleed: PALETTE.amberBleed },
  magenta: { core: PALETTE.magenta, mid: PALETTE.magentaMid, bleed: PALETTE.magentaBleed },
};
```

Cuenta: 7 base (`ground, road, concrete, leaf, leafDark, river, rust`) + 9 acentos = 16. Las sombras se hacen con `ground` sobre `road`/`concrete`.

`src/map/ops.ts`:
```ts
import type { Graphics } from "pixi.js";

export interface PixelOp {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

export function rect(x: number, y: number, w: number, h: number, color: number): PixelOp {
  return { x, y, w, h, color };
}

export function px(x: number, y: number, color: number): PixelOp {
  return { x, y, w: 1, h: 1, color };
}

export function opsBounds(ops: PixelOp[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (ops.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of ops) {
    minX = Math.min(minX, o.x);
    minY = Math.min(minY, o.y);
    maxX = Math.max(maxX, o.x + o.w);
    maxY = Math.max(maxY, o.y + o.h);
  }
  return { minX, minY, maxX, maxY };
}

export function applyOps(g: Graphics, ops: PixelOp[]): void {
  for (const o of ops) g.rect(o.x, o.y, o.w, o.h).fill(o.color);
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- palette ops`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/map/palette.ts src/map/palette.test.ts src/map/ops.ts src/map/ops.test.ts
git commit -m "feat: paleta de 16 colores y operaciones de píxel"
```

---

### Task 4: Fuente bitmap 3x5

**Files:**
- Create: `src/map/pixelfont.ts`, `src/map/pixelfont.test.ts`

**Interfaces:**
- Consumes: `PixelOp`, `px` de `./ops`.
- Produces: `GLYPH_W = 3`, `GLYPH_H = 5`, `textWidth(text: string): number` (3 px por glifo + 1 de separación, sin separación final), `textOps(text: string, x: number, y: number, color: number): PixelOp[]`. Mayúsculas, dígitos, espacio y `.:-!¡`. Las minúsculas se convierten a mayúsculas; tildes se quitan (`Í` → `I`). Caracteres desconocidos se dibujan como espacio.

- [ ] **Step 1: Tests**

`src/map/pixelfont.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { opsBounds } from "./ops";
import { GLYPH_H, GLYPH_W, textOps, textWidth } from "./pixelfont";

describe("pixelfont", () => {
  it("ancho: 3 px por glifo más 1 de separación", () => {
    expect(textWidth("A")).toBe(3);
    expect(textWidth("AB")).toBe(7);
    expect(textWidth("")).toBe(0);
  });

  it("todos los glifos caben en 3x5", () => {
    const ops = textOps("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-!", 0, 0, 1);
    const b = opsBounds(ops);
    expect(b.minX).toBeGreaterThanOrEqual(0);
    expect(b.minY).toBeGreaterThanOrEqual(0);
    expect(b.maxY).toBeLessThanOrEqual(GLYPH_H);
    expect(b.maxX).toBeLessThanOrEqual(textWidth("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-!"));
  });

  it("se desplaza según x, y", () => {
    const b = opsBounds(textOps("I", 10, 20, 1));
    expect(b.minX).toBe(11); // la I ocupa la columna central
    expect(b.minY).toBe(20);
  });

  it("normaliza minúsculas y tildes", () => {
    expect(textOps("currículum", 0, 0, 1)).toEqual(textOps("CURRICULUM", 0, 0, 1));
  });

  it("la letra A tiene la forma esperada", () => {
    const ops = textOps("A", 0, 0, 1).map((o) => `${o.x},${o.y}`).sort();
    expect(ops).toEqual(["0,1", "0,2", "0,3", "0,4", "1,0", "1,2", "2,1", "2,2", "2,3", "2,4"].sort());
  });

  it("dimensiones exportadas", () => {
    expect(GLYPH_W).toBe(3);
    expect(GLYPH_H).toBe(5);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- pixelfont`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

`src/map/pixelfont.ts` (cada glifo son 5 strings de 3 caracteres; `#` píxel encendido):
```ts
import { px, type PixelOp } from "./ops";

export const GLYPH_W = 3;
export const GLYPH_H = 5;

const G: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: [".#.", ".#.", ".#.", ".#.", ".#."],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  N: ["##.", "#.#", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", ".#.", "..#"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", ".#."],
  V: ["#.#", "#.#", "#.#", ".#.", ".#."],
  W: ["#.#", "#.#", "###", "###", "#.#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  "0": [".#.", "#.#", "#.#", "#.#", ".#."],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "##.", "..#", "##."],
  "6": [".##", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "##."],
  ".": ["...", "...", "...", "...", ".#."],
  ":": ["...", ".#.", "...", ".#.", "..."],
  "-": ["...", "...", "###", "...", "..."],
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  "¡": [".#.", "...", ".#.", ".#.", ".#."],
  " ": ["...", "...", "...", "...", "..."],
};

function normalize(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function textWidth(text: string): number {
  const n = normalize(text).length;
  return n === 0 ? 0 : n * GLYPH_W + (n - 1);
}

export function textOps(text: string, x: number, y: number, color: number): PixelOp[] {
  const ops: PixelOp[] = [];
  let cx = x;
  for (const ch of normalize(text)) {
    const glyph = G[ch] ?? G[" "]!;
    glyph.forEach((row, ry) => {
      for (let rx = 0; rx < GLYPH_W; rx++) {
        if (row[rx] === "#") ops.push(px(cx + rx, y + ry, color));
      }
    });
    cx += GLYPH_W + 1;
  }
  return ops;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- pixelfont`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/map/pixelfont.ts src/map/pixelfont.test.ts
git commit -m "feat: fuente bitmap 3x5 como datos"
```

---

### Task 5: Definición de zonas

**Files:**
- Create: `src/map/zones.ts`, `src/map/zones.test.ts`

**Interfaces:**
- Consumes: `Accent` de `./palette`.
- Produces:
  - `MAP_W = 480`, `MAP_H = 270`.
  - `ZoneId = "portfolio" | "cv" | "blog"`; `ZONE_IDS: readonly ZoneId[]` en orden de tabulación.
  - `ZoneDef = { id: ZoneId; name: string; accent: Accent; polygon: number[]; landmark: { x: number; y: number }; label: { x: number; y: number } }`. `polygon` es lista plana `[x0,y0,x1,y1,...]` en coordenadas del lienzo.
  - `ZONES: readonly ZoneDef[]`, `zoneById(id): ZoneDef`.
  - `pointInPolygon(x, y, polygon: number[]): boolean` (ray casting).

- [ ] **Step 1: Tests**

`src/map/zones.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, ZONES, ZONE_IDS, pointInPolygon, zoneById } from "./zones";

describe("zones", () => {
  it("hay tres zonas con ids únicos en orden portfolio, cv, blog", () => {
    expect(ZONES.map((z) => z.id)).toEqual(["portfolio", "cv", "blog"]);
    expect(ZONE_IDS).toEqual(["portfolio", "cv", "blog"]);
  });

  it("los polígonos están dentro del lienzo", () => {
    for (const z of ZONES) {
      for (let i = 0; i < z.polygon.length; i += 2) {
        expect(z.polygon[i]).toBeGreaterThanOrEqual(0);
        expect(z.polygon[i]).toBeLessThanOrEqual(MAP_W);
        expect(z.polygon[i + 1]).toBeGreaterThanOrEqual(0);
        expect(z.polygon[i + 1]).toBeLessThanOrEqual(MAP_H);
      }
    }
  });

  it("el landmark y el cartel de cada zona están dentro de su polígono", () => {
    for (const z of ZONES) {
      expect(pointInPolygon(z.landmark.x, z.landmark.y, z.polygon)).toBe(true);
      expect(pointInPolygon(z.label.x, z.label.y, z.polygon)).toBe(true);
    }
  });

  it("los polígonos no se superponen en sus landmarks", () => {
    for (const a of ZONES) for (const b of ZONES) {
      if (a !== b) expect(pointInPolygon(a.landmark.x, a.landmark.y, b.polygon)).toBe(false);
    }
  });

  it("pointInPolygon en un cuadrado", () => {
    const sq = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(pointInPolygon(5, 5, sq)).toBe(true);
    expect(pointInPolygon(15, 5, sq)).toBe(false);
  });

  it("zoneById devuelve la zona y tira si no existe", () => {
    expect(zoneById("cv").name).toBe("Currículum");
    // @ts-expect-error id inválido
    expect(() => zoneById("nada")).toThrow();
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- zones`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

`src/map/zones.ts`:
```ts
import type { Accent } from "./palette";

export const MAP_W = 480;
export const MAP_H = 270;

export type ZoneId = "portfolio" | "cv" | "blog";
export const ZONE_IDS: readonly ZoneId[] = ["portfolio", "cv", "blog"];

export interface ZoneDef {
  id: ZoneId;
  name: string;
  accent: Accent;
  polygon: number[];
  landmark: { x: number; y: number };
  label: { x: number; y: number };
}

export const ZONES: readonly ZoneDef[] = [
  {
    id: "portfolio",
    name: "Portfolio",
    accent: "cyan",
    polygon: [30, 30, 210, 24, 222, 128, 40, 136],
    landmark: { x: 120, y: 78 },
    label: { x: 92, y: 112 },
  },
  {
    id: "cv",
    name: "Currículum",
    accent: "amber",
    polygon: [36, 152, 226, 146, 232, 252, 44, 258],
    landmark: { x: 130, y: 196 },
    label: { x: 92, y: 236 },
  },
  {
    id: "blog",
    name: "Blog",
    accent: "magenta",
    polygon: [292, 40, 470, 34, 474, 236, 300, 244],
    landmark: { x: 384, y: 128 },
    label: { x: 368, y: 172 },
  },
];

export function zoneById(id: ZoneId): ZoneDef {
  const z = ZONES.find((z) => z.id === id);
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}

export function pointInPolygon(x: number, y: number, polygon: number[]): boolean {
  let inside = false;
  const n = polygon.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i * 2]!, yi = polygon[i * 2 + 1]!;
    const xj = polygon[j * 2]!, yj = polygon[j * 2 + 1]!;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- zones`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/map/zones.ts src/map/zones.test.ts
git commit -m "feat: definición de zonas y point-in-polygon"
```

---

### Task 6: Terreno procedural

**Files:**
- Create: `src/map/terrain.ts`, `src/map/terrain.test.ts`

**Interfaces:**
- Consumes: `createRng` de `./seed`; `PALETTE`, `ACCENTS` de `./palette`; `rect`, `px`, `PixelOp`, `opsBounds` de `./ops`; `ZONES`, `MAP_W`, `MAP_H`, `pointInPolygon` de `./zones`.
- Produces: `buildTerrain(seed: number): Terrain` con `Terrain = { base: PixelOp[]; river: [PixelOp[], PixelOp[]]; zoneOverlay: Record<ZoneId, PixelOp[]> }`.
  - `base`: suelo, cuadrícula rota, cimientos, autopista, vegetación, cables (todo estático).
  - `river`: dos frames de reflejos sobre el río (se alternan cada 400 ms).
  - `zoneOverlay[id]`: el "sangrado" de luz de esa zona sobre la vegetación (color `bleed`), para que se pueda dimear por zona.
  - `SEED = 20260909` exportado como seed por defecto.

- [ ] **Step 1: Tests**

`src/map/terrain.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { opsBounds } from "./ops";
import { PALETTE } from "./palette";
import { SEED, buildTerrain } from "./terrain";
import { MAP_H, MAP_W, ZONE_IDS } from "./zones";

const inBounds = (ops: { x: number; y: number; w: number; h: number }[]) => {
  const b = opsBounds(ops);
  return b.minX >= 0 && b.minY >= 0 && b.maxX <= MAP_W && b.maxY <= MAP_H;
};

describe("buildTerrain", () => {
  it("es determinístico", () => {
    expect(buildTerrain(SEED)).toEqual(buildTerrain(SEED));
  });

  it("cambia con la seed", () => {
    expect(buildTerrain(1).base).not.toEqual(buildTerrain(2).base);
  });

  it("todo cae dentro del lienzo", () => {
    const t = buildTerrain(SEED);
    expect(inBounds(t.base)).toBe(true);
    expect(inBounds(t.river[0])).toBe(true);
    expect(inBounds(t.river[1])).toBe(true);
    for (const id of ZONE_IDS) expect(inBounds(t.zoneOverlay[id])).toBe(true);
  });

  it("el primer op es el suelo completo", () => {
    const first = buildTerrain(SEED).base[0];
    expect(first).toEqual({ x: 0, y: 0, w: MAP_W, h: MAP_H, color: PALETTE.ground });
  });

  it("usa solo colores de la paleta", () => {
    const allowed = new Set<number>(Object.values(PALETTE));
    const t = buildTerrain(SEED);
    const all = [...t.base, ...t.river[0], ...t.river[1], ...ZONE_IDS.flatMap((id) => t.zoneOverlay[id])];
    for (const o of all) expect(allowed.has(o.color)).toBe(true);
  });

  it("tiene densidad razonable y los dos frames de río difieren", () => {
    const t = buildTerrain(SEED);
    expect(t.base.length).toBeGreaterThan(500);
    expect(t.river[0]).not.toEqual(t.river[1]);
    for (const id of ZONE_IDS) expect(t.zoneOverlay[id].length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- terrain`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

`src/map/terrain.ts`:
```ts
import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE } from "./palette";
import { createRng, type Rng } from "./seed";
import { MAP_H, MAP_W, ZONES, pointInPolygon, type ZoneId } from "./zones";

export const SEED = 20260909;

export interface Terrain {
  base: PixelOp[];
  river: [PixelOp[], PixelOp[]];
  zoneOverlay: Record<ZoneId, PixelOp[]>;
}

const clampRect = (x: number, y: number, w: number, h: number, color: number): PixelOp | null => {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(MAP_W, x + w), y1 = Math.min(MAP_H, y + h);
  if (x1 <= x0 || y1 <= y0) return null;
  return rect(x0, y0, x1 - x0, y1 - y0, color);
};

const push = (out: PixelOp[], op: PixelOp | null): void => { if (op) out.push(op); };

/** Camino del río: centro x por cada y, curva suave determinística. */
function riverCenter(y: number): number {
  return Math.round(250 + 26 * Math.sin(y / 38) + 14 * Math.sin(y / 17 + 1.3));
}

function paintGrid(out: PixelOp[], rng: Rng): void {
  const step = 24;
  for (let x = 12; x < MAP_W; x += step) {
    for (let y = 0; y < MAP_H; y += 6) {
      if (rng.chance(0.62)) push(out, clampRect(x, y, 2, 6, PALETTE.road));
    }
  }
  for (let y = 12; y < MAP_H; y += step) {
    for (let x = 0; x < MAP_W; x += 6) {
      if (rng.chance(0.62)) push(out, clampRect(x, y, 6, 2, PALETTE.road));
    }
  }
  // cimientos en las manzanas
  for (let x = 12; x < MAP_W - step; x += step) {
    for (let y = 12; y < MAP_H - step; y += step) {
      if (!rng.chance(0.55)) continue;
      const w = rng.int(6, 14), h = rng.int(6, 14);
      const ox = x + 3 + rng.int(0, step - w - 6), oy = y + 3 + rng.int(0, step - h - 6);
      push(out, clampRect(ox, oy, w, h, PALETTE.concrete));
      push(out, clampRect(ox + 1, oy + h, w, 1, PALETTE.ground)); // sombra
    }
  }
}

function paintRiverBed(out: PixelOp[]): void {
  for (let y = 0; y < MAP_H; y++) {
    const cx = riverCenter(y);
    push(out, clampRect(cx - 7, y, 14, 1, PALETTE.river));
  }
}

function riverReflections(frame: 0 | 1, rng: Rng): PixelOp[] {
  const out: PixelOp[] = [];
  for (let y = 0; y < MAP_H; y += 3) {
    const cx = riverCenter(y);
    const nearest = ZONES.reduce((a, b) =>
      Math.hypot(a.landmark.x - cx, a.landmark.y - y) < Math.hypot(b.landmark.x - cx, b.landmark.y - y) ? a : b);
    const color = ACCENTS[nearest.accent].bleed;
    const dx = rng.int(-5, 5);
    if (rng.chance(0.5)) push(out, clampRect(cx + dx + (frame === 1 ? 1 : 0), y + frame, rng.int(1, 3), 1, color));
  }
  return out;
}

function paintHighway(out: PixelOp[], rng: Rng): void {
  // banda diagonal suave desde la izquierda-abajo hasta el borde derecho (lado Blog)
  const gaps = new Set<number>();
  for (let i = 0; i < 3; i++) gaps.add(rng.int(4, 26));
  for (let seg = 0; seg < 30; seg++) {
    if (gaps.has(seg)) continue;
    const x = seg * 16;
    const y = Math.round(150 - seg * 3.2);
    push(out, clampRect(x, y, 16, 10, PALETTE.concrete));
    push(out, clampRect(x, y + 10, 16, 2, PALETTE.ground));
    push(out, clampRect(x + 2, y + 5, 5, 1, PALETTE.road));
    push(out, clampRect(x + 9, y + 5, 5, 1, PALETTE.road));
    if (seg % 3 === 0) push(out, clampRect(x + 7, y + 10, 2, 8, PALETTE.rust)); // pilar
  }
}

function paintVegetation(out: PixelOp[], rng: Rng): void {
  for (let i = 0; i < 420; i++) {
    const x = rng.int(0, MAP_W), y = rng.int(0, MAP_H);
    if (Math.abs(x - riverCenter(y)) < 10) continue;
    const r = rng.int(3, 7);
    push(out, clampRect(x - r, y - r + 1, r * 2, r * 2 - 2, PALETTE.leafDark));
    push(out, clampRect(x - r + 1, y - r, r * 2 - 2, r * 2, PALETTE.leafDark));
    push(out, clampRect(x - r + 1, y - r + 1, r, r, PALETTE.leaf)); // luz arriba-izquierda
  }
  // enredaderas: líneas verticales finas
  for (let i = 0; i < 90; i++) {
    push(out, clampRect(rng.int(0, MAP_W), rng.int(0, MAP_H), 1, rng.int(3, 9), PALETTE.leaf));
  }
}

function paintCables(out: PixelOp[]): void {
  const pts = ZONES.map((z) => z.landmark);
  const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  for (const [a, b] of pairs) {
    const p = pts[a]!, q = pts[b]!;
    const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 3);
    for (let i = 0; i <= steps; i += 2) {
      const t = i / steps;
      const sag = Math.sin(t * Math.PI) * 6;
      push(out, clampRect(Math.round(p.x + (q.x - p.x) * t), Math.round(p.y + (q.y - p.y) * t + sag), 1, 1, PALETTE.rust));
    }
    // torre caída a mitad de camino
    const mx = Math.round((p.x + q.x) / 2), my = Math.round((p.y + q.y) / 2);
    push(out, clampRect(mx - 4, my + 4, 9, 1, PALETTE.rust));
    push(out, clampRect(mx, my, 1, 5, PALETTE.rust));
  }
}

function zoneBleed(rng: Rng): Record<ZoneId, PixelOp[]> {
  const result = { portfolio: [], cv: [], blog: [] } as Record<ZoneId, PixelOp[]>;
  for (const z of ZONES) {
    const color = ACCENTS[z.accent].bleed;
    for (let i = 0; i < 120; i++) {
      const ang = rng.next() * Math.PI * 2;
      const dist = 8 + rng.next() * 40;
      const x = Math.round(z.landmark.x + Math.cos(ang) * dist);
      const y = Math.round(z.landmark.y + Math.sin(ang) * dist * 0.6);
      if (!pointInPolygon(x, y, z.polygon)) continue;
      result[z.id].push(px(x, y, color));
    }
  }
  return result;
}

export function buildTerrain(seed: number): Terrain {
  const rng = createRng(seed);
  const base: PixelOp[] = [rect(0, 0, MAP_W, MAP_H, PALETTE.ground)];
  paintGrid(base, rng);
  paintRiverBed(base);
  paintHighway(base, rng);
  paintVegetation(base, rng);
  paintCables(base);
  const zoneOverlay = zoneBleed(rng);
  const riverRng = createRng(seed ^ 0x5eed);
  const river: [PixelOp[], PixelOp[]] = [riverReflections(0, riverRng), riverReflections(1, riverRng)];
  return { base, river, zoneOverlay };
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- terrain`
Expected: PASS (6 tests). Si "el sangrado tiene > 10 ops" falla para alguna zona, subir el 120 de `zoneBleed` a 200.

- [ ] **Step 5: Commit**

```bash
git add src/map/terrain.ts src/map/terrain.test.ts
git commit -m "feat: terreno procedural determinístico"
```

---

### Task 7: Landmarks y glow procedurales

**Files:**
- Create: `src/map/landmarks.ts`, `src/map/landmarks.test.ts`

**Interfaces:**
- Consumes: `rect`, `px`, `PixelOp`, `opsBounds` de `./ops`; `PALETTE`, `ACCENTS`, `Accent` de `./palette`; `textOps` de `./pixelfont`; `ZoneId` de `./zones`.
- Produces:
  - `LANDMARK_SIZE = 40` (cada frame cabe en 40x40, origen en 0,0; el ancla visual es el centro inferior).
  - `landmarkFrames(id: ZoneId): PixelOp[][]` con 2 o 3 frames.
  - `glowOps(accent: Accent): PixelOp[]` — rombo concéntrico de 48x28 con `bleed` afuera y `mid` adentro, origen 0,0.
  - `GLOW_W = 48`, `GLOW_H = 28`.

- [ ] **Step 1: Tests**

`src/map/landmarks.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { GLOW_H, GLOW_W, LANDMARK_SIZE, glowOps, landmarkFrames } from "./landmarks";
import { opsBounds } from "./ops";
import { PALETTE } from "./palette";
import { ZONE_IDS } from "./zones";

describe("landmarks", () => {
  const allowed = new Set<number>(Object.values(PALETTE));

  for (const id of ZONE_IDS) {
    it(`${id}: 2-3 frames, dentro de ${LANDMARK_SIZE}x${LANDMARK_SIZE}, colores de paleta, frames distintos`, () => {
      const frames = landmarkFrames(id);
      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames.length).toBeLessThanOrEqual(3);
      for (const f of frames) {
        const b = opsBounds(f);
        expect(b.minX).toBeGreaterThanOrEqual(0);
        expect(b.minY).toBeGreaterThanOrEqual(0);
        expect(b.maxX).toBeLessThanOrEqual(LANDMARK_SIZE);
        expect(b.maxY).toBeLessThanOrEqual(LANDMARK_SIZE);
        for (const o of f) expect(allowed.has(o.color)).toBe(true);
      }
      expect(frames[0]).not.toEqual(frames[1]);
    });
  }

  it("glow cabe en GLOW_W x GLOW_H y usa mid y bleed", () => {
    const ops = glowOps("cyan");
    const b = opsBounds(ops);
    expect(b.maxX).toBeLessThanOrEqual(GLOW_W);
    expect(b.maxY).toBeLessThanOrEqual(GLOW_H);
    const colors = new Set(ops.map((o) => o.color));
    expect(colors.has(PALETTE.cyanMid)).toBe(true);
    expect(colors.has(PALETTE.cyanBleed)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- landmarks`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

`src/map/landmarks.ts`:
```ts
import { px, rect, type PixelOp } from "./ops";
import { ACCENTS, PALETTE, type Accent } from "./palette";
import { textOps } from "./pixelfont";
import type { ZoneId } from "./zones";

export const LANDMARK_SIZE = 40;
export const GLOW_W = 48;
export const GLOW_H = 28;

const G = PALETTE.ground, R = PALETTE.rust, C = PALETTE.concrete, RD = PALETTE.road;

/** Portfolio: torre de containers + grúa + taller con chispas. */
function portfolio(): PixelOp[][] {
  const base: PixelOp[] = [
    // containers apilados (3 niveles, desfasados)
    rect(6, 30, 18, 6, R), rect(7, 31, 16, 1, G),
    rect(9, 24, 18, 6, C), rect(10, 25, 16, 1, G),
    rect(5, 18, 18, 6, R), rect(6, 19, 16, 1, G),
    // grúa: mástil y brazo
    rect(28, 6, 2, 30, RD), rect(14, 6, 24, 2, RD), rect(14, 8, 1, 6, RD), // cable
    // taller a la derecha, con puerta iluminada
    rect(26, 28, 12, 8, C), rect(30, 31, 4, 5, ACCENTS.cyan.mid), rect(31, 32, 2, 4, ACCENTS.cyan.core),
    // suelo
    rect(2, 36, 36, 2, RD),
    // luz de la punta de la grúa
    px(37, 6, ACCENTS.cyan.core),
  ];
  const sparksA = [px(29, 26, ACCENTS.cyan.core), px(31, 24, ACCENTS.cyan.core), px(27, 23, ACCENTS.cyan.mid)];
  const sparksB = [px(30, 25, ACCENTS.cyan.core), px(28, 22, ACCENTS.cyan.mid), px(32, 27, ACCENTS.cyan.core)];
  const hookA = [rect(14, 14, 3, 2, RD)];
  const hookB = [rect(14, 15, 3, 2, RD)];
  return [[...base, ...sparksA, ...hookA], [...base, ...sparksB, ...hookB], [...base, ...hookA]];
}

/** CV: edificio de oficinas hundido en la selva, un piso encendido, cartel ABIERTO fallando. */
function cv(): PixelOp[][] {
  const A = ACCENTS.amber;
  const base: PixelOp[] = [
    rect(8, 6, 22, 32, C), rect(8, 6, 22, 1, RD), // edificio
    // ventanas apagadas (4 filas)
    ...[10, 16, 28].flatMap((y) => [rect(11, y, 4, 3, G), rect(17, y, 4, 3, G), rect(23, y, 4, 3, G)]),
    // el único piso encendido
    rect(11, 22, 4, 3, A.core), rect(17, 22, 4, 3, A.mid), rect(23, 22, 4, 3, A.core),
    // selva trepando
    rect(6, 30, 4, 8, PALETTE.leafDark), rect(28, 26, 5, 12, PALETTE.leafDark), rect(29, 27, 2, 3, PALETTE.leaf),
    rect(12, 34, 6, 4, PALETTE.leaf),
    // papeles saliendo por la ventana
    px(31, 23, A.core), px(34, 25, A.mid),
    // suelo
    rect(4, 38, 32, 2, RD),
  ];
  // cartel "ABIERTO" arriba del edificio; en el frame 1 la R se apaga
  const signOn = textOps("ABIERTO", 3, 0, A.core);
  const signFlicker = textOps("ABIE", 3, 0, A.core).concat(textOps("TO", 23, 0, A.core));
  return [[...base, ...signOn], [...base, ...signFlicker]];
}

/** Blog: cartel publicitario gigante sobre pilares, pantalla LED con estática, enredaderas. */
function blog(): PixelOp[][] {
  const M = ACCENTS.magenta;
  const base: PixelOp[] = [
    rect(12, 26, 3, 12, RD), rect(25, 26, 3, 12, RD), // pilares
    rect(4, 8, 32, 18, RD), rect(5, 9, 30, 16, G), // marco y pantalla apagada
    rect(4, 26, 32, 1, C),
    // enredaderas colgando del marco
    rect(6, 26, 1, 6, PALETTE.leaf), rect(33, 26, 1, 9, PALETTE.leaf), rect(20, 26, 1, 4, PALETTE.leafDark),
    rect(0, 36, 40, 2, RD), // autopista debajo
  ];
  const textA = textOps("BLOG", 12, 14, M.core);
  const textB = textOps("BL0G", 12, 14, M.core); // glitch: cero por O
  const staticA = [px(7, 10, M.mid), px(30, 12, M.bleed), px(9, 22, M.bleed), px(28, 21, M.mid), rect(6, 18, 6, 1, M.bleed)];
  const staticB = [px(8, 11, M.bleed), px(31, 10, M.mid), px(12, 23, M.mid), rect(24, 19, 8, 1, M.bleed)];
  const staticC = [rect(5, 12, 30, 1, M.bleed), px(20, 20, M.mid)];
  return [[...base, ...textA, ...staticA], [...base, ...textB, ...staticB], [...base, ...textA, ...staticC]];
}

export function landmarkFrames(id: ZoneId): PixelOp[][] {
  switch (id) {
    case "portfolio": return portfolio();
    case "cv": return cv();
    case "blog": return blog();
  }
}

export function glowOps(accent: Accent): PixelOp[] {
  const a = ACCENTS[accent];
  const out: PixelOp[] = [];
  const cx = GLOW_W / 2, cy = GLOW_H / 2;
  for (let y = 0; y < GLOW_H; y++) {
    const dy = Math.abs(y - cy) / cy;
    const half = Math.round((1 - dy) * cx);
    if (half <= 0) continue;
    out.push(rect(cx - half, y, half * 2, 1, a.bleed));
    const inner = Math.round(half * 0.45);
    if (inner > 0 && dy < 0.5) out.push(rect(cx - inner, y, inner * 2, 1, a.mid));
  }
  return out;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- landmarks`
Expected: PASS (4 tests). Si algún landmark excede 40 px en un eje, ajustar la coordenada señalada por `opsBounds`.

- [ ] **Step 5: Commit**

```bash
git add src/map/landmarks.ts src/map/landmarks.test.ts
git commit -m "feat: landmarks y glow procedurales con frames"
```

---

### Task 8: Cámara

**Files:**
- Create: `src/camera.ts`, `src/camera.test.ts`

**Interfaces:**
- Consumes: `MAP_W`, `MAP_H` de `./map/zones`.
- Produces:
  - `CameraState = { x: number; y: number; scale: number }` (transform a aplicar al contenedor mundo: `position` y `scale` uniforme).
  - `coverTransform(viewW, viewH, focus?: { x: number; y: number; zoom: number }): CameraState`. Sin foco: escala `max(viewW/MAP_W, viewH/MAP_H)`, mapa centrado. Con foco: escala × zoom, y el punto `(focus.x, focus.y)` del mapa queda en el centro de la vista.
  - `easeOutCubic(t: number): number`.
  - `class Camera { constructor(apply: (s: CameraState) => void, opts?: { duration?: number; reducedMotion?: boolean }); readonly state: CameraState; jumpTo(s): void; tweenTo(s): Promise<void>; tick(nowMs: number): void }`. `tick` la llama el ticker con `performance.now()`; los tests le pasan tiempos a mano. Un `tweenTo` nuevo cancela el anterior (la promesa anterior resuelve igual).
  - `ZOOM = 2.5`, `DURATION_MS = 500`.

- [ ] **Step 1: Tests**

`src/camera.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Camera, DURATION_MS, ZOOM, coverTransform, easeOutCubic } from "./camera";
import { MAP_H, MAP_W } from "./map/zones";

describe("coverTransform", () => {
  it("sin foco cubre la vista y centra el mapa", () => {
    const s = coverTransform(MAP_W * 2, MAP_H * 2);
    expect(s).toEqual({ x: 0, y: 0, scale: 2 });
    const wide = coverTransform(MAP_W * 4, MAP_H * 2);
    expect(wide.scale).toBe(4);
    expect(wide.y).toBe((MAP_H * 2 - MAP_H * 4) / 2);
  });

  it("con foco el punto queda en el centro de la vista", () => {
    const view = { w: 1000, h: 600 };
    const s = coverTransform(view.w, view.h, { x: 100, y: 50, zoom: ZOOM });
    expect(100 * s.scale + s.x).toBeCloseTo(view.w / 2);
    expect(50 * s.scale + s.y).toBeCloseTo(view.h / 2);
    expect(s.scale).toBeCloseTo(Math.max(view.w / MAP_W, view.h / MAP_H) * ZOOM);
  });
});

describe("easeOutCubic", () => {
  it("va de 0 a 1 y desacelera", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("Camera", () => {
  it("interpola y termina exactamente en el destino", async () => {
    const applied: { x: number; y: number; scale: number }[] = [];
    const cam = new Camera((s) => applied.push({ ...s }), { duration: 100 });
    cam.jumpTo({ x: 0, y: 0, scale: 1 });
    const done = cam.tweenTo({ x: 100, y: 50, scale: 3 });
    cam.tick(0);
    cam.tick(50);
    expect(cam.state.x).toBeGreaterThan(0);
    expect(cam.state.x).toBeLessThan(100);
    cam.tick(100);
    await done;
    expect(cam.state).toEqual({ x: 100, y: 50, scale: 3 });
    expect(applied.at(-1)).toEqual({ x: 100, y: 50, scale: 3 });
  });

  it("con reducedMotion salta al destino", async () => {
    const cam = new Camera(() => {}, { reducedMotion: true });
    const done = cam.tweenTo({ x: 5, y: 5, scale: 2 });
    cam.tick(0);
    await done;
    expect(cam.state).toEqual({ x: 5, y: 5, scale: 2 });
  });

  it("un tween nuevo cancela el anterior", async () => {
    const cam = new Camera(() => {}, { duration: 100 });
    cam.jumpTo({ x: 0, y: 0, scale: 1 });
    const first = cam.tweenTo({ x: 100, y: 0, scale: 1 });
    cam.tick(0);
    cam.tick(20);
    const second = cam.tweenTo({ x: -100, y: 0, scale: 1 });
    cam.tick(20);
    cam.tick(120);
    await Promise.all([first, second]);
    expect(cam.state.x).toBe(-100);
  });

  it("constantes", () => {
    expect(DURATION_MS).toBe(500);
    expect(ZOOM).toBe(2.5);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- camera`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

`src/camera.ts`:
```ts
import { MAP_H, MAP_W } from "./map/zones";

export const ZOOM = 2.5;
export const DURATION_MS = 500;

export interface CameraState { x: number; y: number; scale: number }

export function coverTransform(viewW: number, viewH: number, focus?: { x: number; y: number; zoom: number }): CameraState {
  const cover = Math.max(viewW / MAP_W, viewH / MAP_H);
  if (!focus) {
    return { x: (viewW - MAP_W * cover) / 2, y: (viewH - MAP_H * cover) / 2, scale: cover };
  }
  const scale = cover * focus.zoom;
  return { x: viewW / 2 - focus.x * scale, y: viewH / 2 - focus.y * scale, scale };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Tween { from: CameraState; to: CameraState; start: number | null; resolve: () => void }

export class Camera {
  state: CameraState = { x: 0, y: 0, scale: 1 };
  private tween: Tween | null = null;
  private readonly duration: number;

  constructor(private readonly apply: (s: CameraState) => void, opts: { duration?: number; reducedMotion?: boolean } = {}) {
    this.duration = opts.reducedMotion ? 0 : opts.duration ?? DURATION_MS;
  }

  jumpTo(s: CameraState): void {
    this.finishTween();
    this.state = { ...s };
    this.apply(this.state);
  }

  tweenTo(to: CameraState): Promise<void> {
    this.finishTween();
    return new Promise((resolve) => {
      this.tween = { from: { ...this.state }, to: { ...to }, start: null, resolve };
    });
  }

  tick(nowMs: number): void {
    const tw = this.tween;
    if (!tw) return;
    if (tw.start === null) tw.start = nowMs;
    const t = this.duration === 0 ? 1 : Math.min(1, (nowMs - tw.start) / this.duration);
    const k = easeOutCubic(t);
    this.state = {
      x: tw.from.x + (tw.to.x - tw.from.x) * k,
      y: tw.from.y + (tw.to.y - tw.from.y) * k,
      scale: tw.from.scale + (tw.to.scale - tw.from.scale) * k,
    };
    if (t >= 1) this.state = { ...tw.to };
    this.apply(this.state);
    if (t >= 1) { this.tween = null; tw.resolve(); }
  }

  private finishTween(): void {
    if (this.tween) { const r = this.tween.resolve; this.tween = null; r(); }
  }
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- camera`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/camera.ts src/camera.test.ts
git commit -m "feat: cámara con cover y tween cancelable"
```

---

### Task 9: Router

**Files:**
- Create: `src/router.ts`, `src/router.test.ts`

**Interfaces:**
- Consumes: `ZoneId`, `ZONE_IDS` de `./map/zones`.
- Produces: `zoneFromPath(pathname: string): ZoneId | null` (acepta con y sin barra final, ignora query/hash), `pathForZone(id: ZoneId | null): string` (`"/"` para null, `"/portfolio/"` etc.).

- [ ] **Step 1: Tests**

`src/router.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { pathForZone, zoneFromPath } from "./router";

describe("router", () => {
  it("mapea paths a zonas", () => {
    expect(zoneFromPath("/")).toBeNull();
    expect(zoneFromPath("/portfolio/")).toBe("portfolio");
    expect(zoneFromPath("/portfolio")).toBe("portfolio");
    expect(zoneFromPath("/cv/index.html")).toBe("cv");
    expect(zoneFromPath("/blog/?x=1")).toBe("blog");
    expect(zoneFromPath("/otra/")).toBeNull();
  });
  it("mapea zonas a paths", () => {
    expect(pathForZone(null)).toBe("/");
    expect(pathForZone("cv")).toBe("/cv/");
  });
  it("es inverso", () => {
    for (const id of ["portfolio", "cv", "blog"] as const) expect(zoneFromPath(pathForZone(id))).toBe(id);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- router`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/router.ts`:
```ts
import { ZONE_IDS, type ZoneId } from "./map/zones";

export function zoneFromPath(pathname: string): ZoneId | null {
  const clean = pathname.split(/[?#]/)[0] ?? "";
  const first = clean.split("/").filter(Boolean)[0];
  if (!first) return null;
  return (ZONE_IDS as readonly string[]).includes(first) ? (first as ZoneId) : null;
}

export function pathForZone(id: ZoneId | null): string {
  return id ? `/${id}/` : "/";
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- router`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/router.ts src/router.test.ts
git commit -m "feat: router URL <-> zona"
```

---

### Task 10: Contenido: tipos, validación, render a HTML, feed del blog

**Files:**
- Create: `src/content/types.ts`, `src/content/validate.ts`, `src/content/validate.test.ts`, `src/content/render.ts`, `src/content/render.test.ts`, `src/content/blog-feed.ts`, `src/content/blog-feed.test.ts`, `content/portfolio.json`, `content/cv.json`, `content/blog.json`

**Interfaces:**
- Consumes: `ZoneId`, `ZONE_IDS` de `../map/zones`.
- Produces:
  - Tipos: `LinkItem { label: string; url: string }`, `ContentItem { titulo: string; descripcion?: string; links: LinkItem[] }`, `ContentSection { subtitulo: string; items: ContentItem[] }`, `ZoneContent { id: ZoneId; titulo: string; descripcion?: string; pdf?: string; secciones: ContentSection[] }`, `FeedItem { title: string; url: string; date: string }`.
  - `validateContent(data: unknown): string[]` — lista de errores con path (`secciones[0].items[1].links[0].url: falta`); vacía si es válido.
  - `renderContent(zone: ZoneContent): string` — HTML: `<h1>`, `<p class="lead">` si hay descripción, `<a class="pdf">` si hay pdf, `<section>` con `<h2>` por sección, `<article>` con `<h3>`, `<p>` y `<ul class="links">`. Todo texto escapado.
  - `escapeHtml(s: string): string`.
  - `mergeBlogFeed(blog: ZoneContent, items: FeedItem[]): ZoneContent` — agrega al final una sección "Últimos posts" con hasta 5 items (fecha en la descripción, formato `YYYY-MM-DD`); si `items` está vacío devuelve `blog` igual.
  - `parseRss(xml: string): FeedItem[]` — extrae `<item><title><link><pubDate>` con regex; fecha normalizada a `YYYY-MM-DD`.

- [ ] **Step 1: Tests**

`src/content/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateContent } from "./validate";

const ok = {
  id: "portfolio",
  titulo: "Portfolio",
  secciones: [{ subtitulo: "Juegos", items: [{ titulo: "X", descripcion: "d", links: [{ label: "Repo", url: "https://x" }] }] }],
};

describe("validateContent", () => {
  it("acepta contenido válido", () => {
    expect(validateContent(ok)).toEqual([]);
  });
  it("rechaza id desconocido y campos faltantes", () => {
    const errs = validateContent({ id: "nada", secciones: [] });
    expect(errs.some((e) => e.startsWith("id"))).toBe(true);
    expect(errs.some((e) => e.startsWith("titulo"))).toBe(true);
  });
  it("señala el path del error anidado", () => {
    const bad = structuredClone(ok) as { secciones: { items: { links: { url?: string }[] }[] }[] };
    delete bad.secciones[0]!.items[0]!.links[0]!.url;
    expect(validateContent(bad)).toEqual(["secciones[0].items[0].links[0].url: falta o no es string"]);
  });
  it("rechaza lo que no es objeto", () => {
    expect(validateContent(null)).toEqual(["raíz: no es un objeto"]);
  });
});
```

`src/content/render.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { escapeHtml, renderContent } from "./render";
import type { ZoneContent } from "./types";

const zone: ZoneContent = {
  id: "cv",
  titulo: "Currículum",
  descripcion: "Quién soy & qué hago",
  pdf: "/cv.pdf",
  secciones: [{ subtitulo: "Experiencia", items: [{ titulo: "Illustrate <dev>", descripcion: "Backend", links: [{ label: "Sitio", url: "https://illustrate.example" }] }] }],
};

describe("renderContent", () => {
  const html = renderContent(zone);
  it("estructura semántica", () => {
    expect(html).toContain("<h1>Currículum</h1>");
    expect(html).toContain('<p class="lead">Quién soy &amp; qué hago</p>');
    expect(html).toContain('<a class="pdf" href="/cv.pdf"');
    expect(html).toContain("<h2>Experiencia</h2>");
    expect(html).toContain("<h3>Illustrate &lt;dev&gt;</h3>");
    expect(html).toContain('<a href="https://illustrate.example"');
    expect(html).toContain('rel="noopener"');
  });
  it("omite lead y pdf si no están", () => {
    const min = renderContent({ id: "blog", titulo: "Blog", secciones: [] });
    expect(min).not.toContain("lead");
    expect(min).not.toContain("pdf");
  });
  it("escapeHtml escapa los cinco caracteres", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
```

`src/content/blog-feed.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mergeBlogFeed, parseRss } from "./blog-feed";
import type { ZoneContent } from "./types";

const rss = `<?xml version="1.0"?><rss><channel><title>Myxomatosis</title>
<item><title>Rawls como puente</title><link>https://myxomatosis.xyz/temas/rawls/</link><pubDate>Tue, 08 Sep 2026 23:41:00 +0000</pubDate></item>
<item><title>A palabras &amp; necias</title><link>https://myxomatosis.xyz/temas/necias/</link><pubDate>Mon, 01 Jun 2026 10:00:00 +0000</pubDate></item>
</channel></rss>`;

describe("parseRss", () => {
  it("extrae items con fecha ISO y entidades decodificadas", () => {
    expect(parseRss(rss)).toEqual([
      { title: "Rawls como puente", url: "https://myxomatosis.xyz/temas/rawls/", date: "2026-09-08" },
      { title: "A palabras & necias", url: "https://myxomatosis.xyz/temas/necias/", date: "2026-06-01" },
    ]);
  });
  it("devuelve vacío si no hay items", () => {
    expect(parseRss("<rss></rss>")).toEqual([]);
  });
});

describe("mergeBlogFeed", () => {
  const blog: ZoneContent = { id: "blog", titulo: "Blog", secciones: [{ subtitulo: "Secciones", items: [] }] };
  it("agrega 'Últimos posts' con máximo 5", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ title: `P${i}`, url: `https://x/${i}`, date: "2026-01-01" }));
    const out = mergeBlogFeed(blog, items);
    expect(out.secciones).toHaveLength(2);
    expect(out.secciones[1]!.subtitulo).toBe("Últimos posts");
    expect(out.secciones[1]!.items).toHaveLength(5);
    expect(out.secciones[1]!.items[0]).toEqual({ titulo: "P0", descripcion: "2026-01-01", links: [{ label: "Leer", url: "https://x/0" }] });
  });
  it("sin items devuelve el mismo contenido", () => {
    expect(mergeBlogFeed(blog, [])).toEqual(blog);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- content`
Expected: FAIL, módulos inexistentes.

- [ ] **Step 3: Implementar**

`src/content/types.ts`:
```ts
import type { ZoneId } from "../map/zones";

export interface LinkItem { label: string; url: string }
export interface ContentItem { titulo: string; descripcion?: string; links: LinkItem[] }
export interface ContentSection { subtitulo: string; items: ContentItem[] }
export interface ZoneContent {
  id: ZoneId;
  titulo: string;
  descripcion?: string;
  pdf?: string;
  secciones: ContentSection[];
}
export interface FeedItem { title: string; url: string; date: string }
```

`src/content/validate.ts`:
```ts
import { ZONE_IDS } from "../map/zones";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

export function validateContent(data: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(data)) return ["raíz: no es un objeto"];
  if (!isStr(data.id) || !(ZONE_IDS as readonly string[]).includes(data.id)) errs.push(`id: debe ser uno de ${ZONE_IDS.join(", ")}`);
  if (!isStr(data.titulo)) errs.push("titulo: falta o no es string");
  if (data.descripcion !== undefined && !isStr(data.descripcion)) errs.push("descripcion: no es string");
  if (data.pdf !== undefined && !isStr(data.pdf)) errs.push("pdf: no es string");
  if (!Array.isArray(data.secciones)) { errs.push("secciones: falta o no es array"); return errs; }
  data.secciones.forEach((sec, i) => {
    const p = `secciones[${i}]`;
    if (!isObj(sec)) { errs.push(`${p}: no es un objeto`); return; }
    if (!isStr(sec.subtitulo)) errs.push(`${p}.subtitulo: falta o no es string`);
    if (!Array.isArray(sec.items)) { errs.push(`${p}.items: falta o no es array`); return; }
    sec.items.forEach((item, j) => {
      const q = `${p}.items[${j}]`;
      if (!isObj(item)) { errs.push(`${q}: no es un objeto`); return; }
      if (!isStr(item.titulo)) errs.push(`${q}.titulo: falta o no es string`);
      if (item.descripcion !== undefined && !isStr(item.descripcion)) errs.push(`${q}.descripcion: no es string`);
      if (!Array.isArray(item.links)) { errs.push(`${q}.links: falta o no es array`); return; }
      item.links.forEach((link, k) => {
        const r = `${q}.links[${k}]`;
        if (!isObj(link)) { errs.push(`${r}: no es un objeto`); return; }
        if (!isStr(link.label)) errs.push(`${r}.label: falta o no es string`);
        if (!isStr(link.url)) errs.push(`${r}.url: falta o no es string`);
      });
    });
  });
  return errs;
}
```

`src/content/render.ts`:
```ts
import type { ContentItem, ContentSection, ZoneContent } from "./types";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderItem(item: ContentItem): string {
  const links = item.links
    .map((l) => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a></li>`)
    .join("");
  const desc = item.descripcion ? `<p>${escapeHtml(item.descripcion)}</p>` : "";
  return `<article><h3>${escapeHtml(item.titulo)}</h3>${desc}<ul class="links">${links}</ul></article>`;
}

function renderSection(sec: ContentSection): string {
  return `<section><h2>${escapeHtml(sec.subtitulo)}</h2>${sec.items.map(renderItem).join("")}</section>`;
}

export function renderContent(zone: ZoneContent): string {
  const lead = zone.descripcion ? `<p class="lead">${escapeHtml(zone.descripcion)}</p>` : "";
  const pdf = zone.pdf ? `<a class="pdf" href="${escapeHtml(zone.pdf)}" download>Descargar CV en PDF</a>` : "";
  return `<h1>${escapeHtml(zone.titulo)}</h1>${lead}${pdf}${zone.secciones.map(renderSection).join("")}`;
}
```

`src/content/blog-feed.ts`:
```ts
import type { FeedItem, ZoneContent } from "./types";

const decode = (s: string): string =>
  s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

export function parseRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item>(.*?)<\/item>/gs)) {
    const body = m[1] ?? "";
    const title = /<title>(.*?)<\/title>/s.exec(body)?.[1];
    const link = /<link>(.*?)<\/link>/s.exec(body)?.[1];
    const pub = /<pubDate>(.*?)<\/pubDate>/s.exec(body)?.[1];
    if (!title || !link) continue;
    const d = pub ? new Date(pub) : null;
    const date = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
    items.push({ title: decode(title), url: decode(link), date });
  }
  return items;
}

export function mergeBlogFeed(blog: ZoneContent, items: FeedItem[]): ZoneContent {
  if (items.length === 0) return blog;
  return {
    ...blog,
    secciones: [
      ...blog.secciones,
      {
        subtitulo: "Últimos posts",
        items: items.slice(0, 5).map((it) => ({ titulo: it.title, descripcion: it.date, links: [{ label: "Leer", url: it.url }] })),
      },
    ],
  };
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- content`
Expected: PASS (11 tests).

- [ ] **Step 5: Contenido inicial**

`content/portfolio.json` (Nicolás lo completa después; esto es un arranque válido con proyectos reales de `~/Projects`):
```json
{
  "id": "portfolio",
  "titulo": "Portfolio",
  "descripcion": "Cosas que construí, en distintos grados de terminadas.",
  "secciones": [
    {
      "subtitulo": "Juegos",
      "items": [
        { "titulo": "politik_tcg", "descripcion": "Trading card game sobre política.", "links": [{ "label": "Repo", "url": "https://github.com/nicolas-ricc/politik_tcg" }] }
      ]
    },
    {
      "subtitulo": "Herramientas",
      "items": [
        { "titulo": "capgate", "descripcion": "Descripción pendiente.", "links": [{ "label": "Repo", "url": "https://github.com/nicolas-ricc/capgate" }] },
        { "titulo": "hammurabi", "descripcion": "Descripción pendiente.", "links": [{ "label": "Repo", "url": "https://github.com/nicolas-ricc/hammurabi" }] }
      ]
    }
  ]
}
```

`content/cv.json`:
```json
{
  "id": "cv",
  "titulo": "Currículum",
  "descripcion": "Ingeniero de software. Backend, sistemas, y últimamente electrónica.",
  "secciones": [
    { "subtitulo": "Experiencia", "items": [ { "titulo": "Illustrate", "descripcion": "Rol y fechas pendientes.", "links": [] } ] },
    { "subtitulo": "Stack", "items": [ { "titulo": "Lenguajes y herramientas", "descripcion": "TypeScript, Python, Go, Linux.", "links": [] } ] },
    { "subtitulo": "Contacto", "items": [ { "titulo": "GitHub", "links": [{ "label": "nicolas-ricc", "url": "https://github.com/nicolas-ricc" }] } ] }
  ]
}
```

`content/blog.json`:
```json
{
  "id": "blog",
  "titulo": "Blog",
  "descripcion": "Myxomatosis: ensayos sobre filosofía, tecnología y lo que ande dando vueltas.",
  "secciones": [
    {
      "subtitulo": "Secciones",
      "items": [
        { "titulo": "Temas", "descripcion": "Ensayos largos.", "links": [{ "label": "myxomatosis.xyz/temas", "url": "https://myxomatosis.xyz/temas/" }] },
        { "titulo": "Portada", "links": [{ "label": "myxomatosis.xyz", "url": "https://myxomatosis.xyz/" }] }
      ]
    }
  ]
}
```

Verificar que los tres pasan la validación con un test rápido en `src/content/validate.test.ts`:
```ts
import blog from "../../content/blog.json";
import cv from "../../content/cv.json";
import portfolio from "../../content/portfolio.json";

it("los JSON del repo son válidos", () => {
  for (const c of [portfolio, cv, blog]) expect(validateContent(c)).toEqual([]);
});
```
(agregar `"resolveJsonModule": true` a `compilerOptions` en `tsconfig.json`).

- [ ] **Step 6: Correr todo y commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/content content tsconfig.json
git commit -m "feat: contenido tipado, validación, render HTML y feed del blog"
```

---

### Task 11: Texturas en el browser (`canvas.ts`)

**Files:**
- Create: `src/map/canvas.ts`

**Interfaces:**
- Consumes: `applyOps`, `PixelOp` de `./ops`; `Renderer`, `Graphics`, `RenderTexture`, `Texture` de `pixi.js`.
- Produces: `opsToTexture(renderer: Renderer, ops: PixelOp[], width: number, height: number): Texture` — renderiza los ops en un `RenderTexture` de `width`x`height` con `scaleMode: "nearest"`. Fondo transparente.

Sin test unitario (necesita WebGL). Se verifica con `npm run typecheck` y visualmente en la Task 13.

- [ ] **Step 1: Implementar**

`src/map/canvas.ts`:
```ts
import { Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { applyOps, type PixelOp } from "./ops";

export function opsToTexture(renderer: Renderer, ops: PixelOp[], width: number, height: number): Texture {
  const g = new Graphics();
  applyOps(g, ops);
  const rt = RenderTexture.create({ width, height, scaleMode: "nearest", antialias: false });
  rt.source.scaleMode = "nearest";
  renderer.render({ container: g, target: rt, clear: true });
  g.destroy();
  return rt;
}
```

- [ ] **Step 2: Typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores. Si `scaleMode` no es aceptado por `RenderTexture.create`, quitarlo de las opciones y dejar solo la asignación a `rt.source.scaleMode`.

```bash
git add src/map/canvas.ts
git commit -m "feat: ops a textura nearest-neighbor"
```

---

### Task 12: `ZoneNode`: contenedor por zona con estados

**Files:**
- Create: `src/map/zone-node.ts`, `src/map/brightness.ts`, `src/map/brightness.test.ts`

**Interfaces:**
- Consumes: `ZoneDef` de `./zones`; `Texture`, `Container`, `Sprite`, `AnimatedSprite`, `Polygon`, `Ticker` de `pixi.js`; `LANDMARK_SIZE`, `GLOW_W`, `GLOW_H` de `./landmarks`.
- Produces:
  - `ZoneState = "idle" | "hot" | "active" | "dim"`.
  - `brightnessTint(b: number): number` — gris uniforme `0xRRGGBB` con `RR=GG=BB=round(255*b)`, `b` acotado a [0,1]. Testeable.
  - `flickerBrightness(elapsedMs: number): number` — arranque de tubo fluorescente: durante los primeros 250 ms alterna 1 / 0.55 cada 50 ms, después 1. Testeable.
  - `IDLE_BRIGHTNESS = 0.6`, `DIM_BRIGHTNESS = 0.35`.
  - `class ZoneNode extends Container` con `constructor(def: ZoneDef, tex: { frames: Texture[]; glow: Texture; label: Texture; overlay: Texture }, onSelect: (id: ZoneId) => void)`, `readonly def`, `setState(s: ZoneState): void`, `get state(): ZoneState`, `tick(ticker: Ticker): void`.
  - Eventos escuchados: `pointerover`/`mouseover` → `hot` si estaba `idle`; `pointerout`/`mouseout` → `idle` si estaba `hot`; `pointertap` → `onSelect(def.id)`. (El sistema de accesibilidad de Pixi despacha `mouseover`/`mouseout` al enfocar/desenfocar con Tab y `pointertap` con Enter; por eso se escuchan ambas variantes.)

- [ ] **Step 1: Tests de la parte pura**

`src/map/brightness.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DIM_BRIGHTNESS, IDLE_BRIGHTNESS, brightnessTint, flickerBrightness } from "./brightness";

describe("brightness", () => {
  it("brightnessTint produce gris uniforme y acota", () => {
    expect(brightnessTint(1)).toBe(0xffffff);
    expect(brightnessTint(0)).toBe(0x000000);
    expect(brightnessTint(0.5)).toBe(0x808080);
    expect(brightnessTint(2)).toBe(0xffffff);
  });
  it("flickerBrightness alterna al principio y se fija en 1", () => {
    expect(flickerBrightness(0)).toBe(1);
    expect(flickerBrightness(60)).toBe(0.55);
    expect(flickerBrightness(120)).toBe(1);
    expect(flickerBrightness(300)).toBe(1);
    expect(flickerBrightness(5000)).toBe(1);
  });
  it("constantes", () => {
    expect(IDLE_BRIGHTNESS).toBe(0.6);
    expect(DIM_BRIGHTNESS).toBe(0.35);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- brightness`
Expected: FAIL.

- [ ] **Step 3: Implementar la parte pura**

`src/map/brightness.ts`:
```ts
export const IDLE_BRIGHTNESS = 0.6;
export const DIM_BRIGHTNESS = 0.35;
export const FLICKER_MS = 250;

export function brightnessTint(b: number): number {
  const v = Math.round(255 * Math.min(1, Math.max(0, b)));
  return (v << 16) | (v << 8) | v;
}

export function flickerBrightness(elapsedMs: number): number {
  if (elapsedMs >= FLICKER_MS) return 1;
  return Math.floor(elapsedMs / 50) % 2 === 0 ? 1 : 0.55;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- brightness`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar `ZoneNode`**

`src/map/zone-node.ts`:
```ts
import { AnimatedSprite, Container, Polygon, Sprite, type Texture, type Ticker } from "pixi.js";
import { DIM_BRIGHTNESS, IDLE_BRIGHTNESS, brightnessTint, flickerBrightness } from "./brightness";
import { GLOW_H } from "./landmarks";
import type { ZoneDef, ZoneId } from "./zones";

export type ZoneState = "idle" | "hot" | "active" | "dim";

export interface ZoneTextures { frames: Texture[]; glow: Texture; label: Texture; overlay: Texture }

export class ZoneNode extends Container {
  private _state: ZoneState = "idle";
  private brightness = IDLE_BRIGHTNESS;
  private hotSince = 0;
  private nextIdleFlicker = 0;
  private readonly overlay: Sprite;
  private readonly glow: Sprite;
  private readonly landmark: AnimatedSprite;
  private readonly labelSprite: Sprite;

  constructor(readonly def: ZoneDef, tex: ZoneTextures, onSelect: (id: ZoneId) => void) {
    super();
    this.overlay = new Sprite(tex.overlay);
    this.glow = new Sprite({ texture: tex.glow, anchor: { x: 0.5, y: 0.5 }, blendMode: "add", alpha: 0.25 });
    this.glow.position.set(def.landmark.x, def.landmark.y - GLOW_H / 4);
    this.landmark = new AnimatedSprite({ textures: tex.frames, autoUpdate: false });
    this.landmark.anchor.set(0.5, 1);
    this.landmark.position.set(def.landmark.x, def.landmark.y);
    this.landmark.animationSpeed = 8 / 60;
    this.labelSprite = new Sprite(tex.label);
    this.labelSprite.position.set(def.label.x, def.label.y);
    this.addChild(this.overlay, this.glow, this.landmark, this.labelSprite);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Polygon(def.polygon);
    this.accessible = true;
    this.accessibleTitle = def.name;
    this.accessibleHint = `Ir a ${def.name}`;
    this.accessibleType = "button";

    const hot = (): void => { if (this._state === "idle") this.setState("hot"); };
    const cool = (): void => { if (this._state === "hot") this.setState("idle"); };
    this.on("pointerover", hot).on("mouseover", hot);
    this.on("pointerout", cool).on("mouseout", cool);
    this.on("pointertap", () => onSelect(def.id));
    this.applyBrightness();
  }

  get state(): ZoneState { return this._state; }

  setState(s: ZoneState): void {
    if (s === this._state) return;
    this._state = s;
    if (s === "hot") this.hotSince = performance.now();
    if (s === "hot" || s === "active") this.landmark.play();
    else this.landmark.gotoAndStop(0);
    this.eventMode = s === "dim" ? "none" : "static";
  }

  tick(ticker: Ticker): void {
    const now = performance.now();
    let target: number;
    switch (this._state) {
      case "hot": target = flickerBrightness(now - this.hotSince); break;
      case "active": target = 1; break;
      case "dim": target = DIM_BRIGHTNESS; break;
      default: target = this.idleWithFlicker(now);
    }
    // lerp suave salvo durante el flicker, que es instantáneo
    const instant = this._state === "hot" && now - this.hotSince < 250;
    this.brightness = instant ? target : this.brightness + (target - this.brightness) * Math.min(1, ticker.deltaMS / 120);
    this.applyBrightness();
    if (this._state === "hot" || this._state === "active") this.landmark.update(ticker);
  }

  private idleWithFlicker(now: number): number {
    if (this.nextIdleFlicker === 0) this.nextIdleFlicker = now + 5000 + Math.random() * 10000;
    if (now > this.nextIdleFlicker) {
      if (now > this.nextIdleFlicker + 80) this.nextIdleFlicker = now + 5000 + Math.random() * 10000;
      return 0.3;
    }
    return IDLE_BRIGHTNESS;
  }

  private applyBrightness(): void {
    const t = brightnessTint(this.brightness);
    this.overlay.tint = t;
    this.landmark.tint = t;
    this.labelSprite.tint = t;
    const glowTarget = this._state === "hot" || this._state === "active" ? 0.9 : this._state === "dim" ? 0 : 0.25;
    this.glow.alpha += (glowTarget - this.glow.alpha) * 0.15;
  }
}
```

- [ ] **Step 6: Typecheck y commit**

Run: `npm run typecheck && npm test`
Expected: sin errores. Si `AnimatedSprite` no acepta `{ textures, autoUpdate }` como objeto, usar `new AnimatedSprite(tex.frames, false)` (segundo argumento `autoUpdate`).

```bash
git add src/map/zone-node.ts src/map/brightness.ts src/map/brightness.test.ts
git commit -m "feat: ZoneNode con estados idle/hot/active/dim y flicker"
```

---

### Task 13: App: mapa, vistas, ruteo y transición

**Files:**
- Create: `src/views.ts`, `src/map/build-world.ts`, `src/title-sign.ts`
- Modify: `src/main.ts`, `src/style.css`, `index.html`, `src/camera.ts`, `src/camera.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `Camera.retarget(to: CameraState): void` y `get isTweening(): boolean` (agregados a `camera.ts`, con test).
  - `buildWorld(renderer: Renderer, onSelect: (id: ZoneId) => void): World` con `World = { container: Container; zones: Record<ZoneId, ZoneNode>; river: [Sprite, Sprite]; tick(ticker): void }`. Construye textura base, overlays, glows, labels, landmarks, cartel de bienvenida.
  - `titleSignOps(): PixelOp[]` en `title-sign.ts` — cartel "BIENVENIDO A" / "NICOLAS RICCOMINI" con marco roto, ubicado en (250, 236) del lienzo.
  - `showMap(): void`, `showZone(id: ZoneId, html: string): void`, `setZoneTitle(name: string)` en `views.ts`.
  - `index.html` gana dentro de `#canvas-host`: `<div id="hud"><a id="back" href="/">← Volver al mapa</a><h1 id="zone-title"></h1></div>`.

- [ ] **Step 1: Test de `retarget` / `isTweening`**

Agregar a `src/camera.test.ts`, dentro de `describe("Camera")`:
```ts
  it("retarget cambia el destino sin reiniciar el tween", async () => {
    const cam = new Camera(() => {}, { duration: 100 });
    cam.jumpTo({ x: 0, y: 0, scale: 1 });
    const done = cam.tweenTo({ x: 100, y: 0, scale: 1 });
    cam.tick(0);
    expect(cam.isTweening).toBe(true);
    cam.retarget({ x: 200, y: 0, scale: 1 });
    cam.tick(100);
    await done;
    expect(cam.state.x).toBe(200);
    expect(cam.isTweening).toBe(false);
  });
```

- [ ] **Step 2: Correr y ver fallar; implementar**

Run: `npm test -- camera` → FAIL (`retarget` no existe).

Agregar a la clase `Camera` en `src/camera.ts`:
```ts
  get isTweening(): boolean { return this.tween !== null; }

  retarget(to: CameraState): void {
    if (this.tween) this.tween.to = { ...to };
  }
```

Run: `npm test -- camera` → PASS.

- [ ] **Step 3: Cartel de bienvenida**

`src/title-sign.ts`:
```ts
import { rect, type PixelOp } from "./map/ops";
import { PALETTE } from "./map/palette";
import { textOps, textWidth } from "./map/pixelfont";

export const TITLE_POS = { x: 250, y: 236 };

export function titleSignOps(): PixelOp[] {
  const l1 = "BIENVENIDO A", l2 = "NICOLAS RICCOMINI";
  const w = Math.max(textWidth(l1), textWidth(l2)) + 6;
  const { x, y } = TITLE_POS;
  return [
    rect(x, y, w, 16, PALETTE.concrete),
    rect(x + w - 9, y, 9, 4, PALETTE.ground), // esquina rota
    rect(x + 4, y + 16, 2, 8, PALETTE.rust), rect(x + w - 6, y + 16, 2, 8, PALETTE.rust), // patas
    ...textOps(l1, x + 3, y + 2, PALETTE.amber),
    ...textOps(l2, x + 3, y + 9, PALETTE.amber),
    // letras caídas al pie
    ...textOps("A", x + w - 14, y + 20, PALETTE.amberMid),
  ];
}
```

- [ ] **Step 4: Construcción del mundo**

`src/map/build-world.ts`:
```ts
import { Container, Sprite, type Renderer, type Ticker } from "pixi.js";
import { titleSignOps } from "../title-sign";
import { opsToTexture } from "./canvas";
import { GLOW_H, GLOW_W, LANDMARK_SIZE, glowOps, landmarkFrames } from "./landmarks";
import { ACCENTS } from "./palette";
import { textOps, textWidth, GLYPH_H } from "./pixelfont";
import { SEED, buildTerrain } from "./terrain";
import { ZoneNode } from "./zone-node";
import { MAP_H, MAP_W, ZONES, type ZoneId } from "./zones";

export interface World {
  container: Container;
  zones: Record<ZoneId, ZoneNode>;
  river: [Sprite, Sprite];
  tick(ticker: Ticker): void;
}

export function buildWorld(renderer: Renderer, onSelect: (id: ZoneId) => void): World {
  const terrain = buildTerrain(SEED);
  const container = new Container();

  container.addChild(new Sprite(opsToTexture(renderer, terrain.base, MAP_W, MAP_H)));
  const river: [Sprite, Sprite] = [
    new Sprite(opsToTexture(renderer, terrain.river[0], MAP_W, MAP_H)),
    new Sprite(opsToTexture(renderer, terrain.river[1], MAP_W, MAP_H)),
  ];
  river[1].visible = false;
  container.addChild(...river);
  container.addChild(new Sprite(opsToTexture(renderer, titleSignOps(), MAP_W, MAP_H)));

  const zones = {} as Record<ZoneId, ZoneNode>;
  for (const def of ZONES) {
    const frames = landmarkFrames(def.id).map((f) => opsToTexture(renderer, f, LANDMARK_SIZE, LANDMARK_SIZE));
    const glow = opsToTexture(renderer, glowOps(def.accent), GLOW_W, GLOW_H);
    const labelOps = textOps(def.name, 0, 0, ACCENTS[def.accent].core);
    const label = opsToTexture(renderer, labelOps, textWidth(def.name), GLYPH_H);
    const overlay = opsToTexture(renderer, terrain.zoneOverlay[def.id], MAP_W, MAP_H);
    const node = new ZoneNode(def, { frames, glow, label, overlay }, onSelect);
    node.tabIndex = ZONES.indexOf(def);
    zones[def.id] = node;
    container.addChild(node);
  }

  let riverClock = 0;
  return {
    container,
    zones,
    river,
    tick(ticker) {
      riverClock += ticker.deltaMS;
      if (riverClock > 400) {
        riverClock = 0;
        river[0].visible = !river[0].visible;
        river[1].visible = !river[0].visible;
      }
      for (const id of Object.keys(zones) as ZoneId[]) zones[id].tick(ticker);
    },
  };
}
```

- [ ] **Step 5: Vistas y HTML**

Reemplazar el `#app` en `index.html`:
```html
    <div id="app">
      <div id="canvas-host" aria-label="Mapa">
        <div id="hud" hidden>
          <a id="back" href="/">← Volver al mapa</a>
          <h1 id="zone-title"></h1>
        </div>
      </div>
      <main id="content" hidden></main>
    </div>
```

`src/views.ts`:
```ts
import type { ZoneId } from "./map/zones";

const body = document.body;
const content = (): HTMLElement => document.getElementById("content")!;
const hud = (): HTMLElement => document.getElementById("hud")!;
const title = (): HTMLElement => document.getElementById("zone-title")!;

export function showMap(): void {
  body.dataset.zone = "";
  body.classList.remove("zone");
  content().hidden = true;
  hud().hidden = true;
  document.title = "Nicolás Riccomini";
}

export function showZone(id: ZoneId, name: string, html: string | null): void {
  body.dataset.zone = id;
  body.classList.add("zone");
  if (html !== null) content().innerHTML = html;
  content().hidden = false;
  hud().hidden = false;
  title().textContent = name;
  document.title = `${name} · Nicolás Riccomini`;
}
```

Agregar a `src/style.css`:
```css
#app { display: grid; grid-template-columns: 1fr 0fr; grid-template-rows: 100%; height: 100%; transition: grid-template-columns 500ms cubic-bezier(0.33, 1, 0.68, 1); }
body.zone #app { grid-template-columns: 2fr 3fr; }
#content { overflow-y: auto; padding: 2rem clamp(1rem, 4vw, 3rem); opacity: 0; transition: opacity 200ms ease 500ms; }
body.zone #content { opacity: 1; }
#content h1 { font-size: 2rem; margin: 0 0 0.5rem; }
#content .lead { color: var(--muted); margin-top: 0; }
#content h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 2rem 0 0.5rem; border-bottom: 1px solid #22303c; }
#content article { padding: 0.75rem 0; }
#content h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
#content p { margin: 0 0 0.5rem; }
#content .links { list-style: none; padding: 0; margin: 0; display: flex; gap: 1rem; flex-wrap: wrap; }
#content a { color: #7cf5ff; }
#content .pdf { display: inline-block; margin: 0.5rem 0 1rem; padding: 0.5rem 1rem; border: 1px solid #7cf5ff; border-radius: 4px; text-decoration: none; }
#hud { position: absolute; inset: 1rem auto auto 1rem; z-index: 2; text-shadow: 0 1px 2px #000; }
#hud a { color: var(--fg); text-decoration: none; font-size: 0.9rem; }
#hud h1 { margin: 0.25rem 0 0; font-size: 1.5rem; }
@media (max-width: 767px) {
  #app { grid-template-columns: 1fr; grid-template-rows: 1fr 0fr; transition-property: grid-template-rows; }
  body.zone #app { grid-template-rows: 40vh 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  #app, #content { transition: none; }
}
```

- [ ] **Step 6: `main.ts` completo**

```ts
import { Application } from "pixi.js";
import blogJson from "../content/blog.json";
import cvJson from "../content/cv.json";
import portfolioJson from "../content/portfolio.json";
import feed from "../content/blog.generated.json";
import { Camera, ZOOM, coverTransform } from "./camera";
import { mergeBlogFeed } from "./content/blog-feed";
import { renderContent } from "./content/render";
import type { ZoneContent } from "./content/types";
import { buildWorld } from "./map/build-world";
import { ZONE_IDS, zoneById, type ZoneId } from "./map/zones";
import { pathForZone, zoneFromPath } from "./router";
import { showMap, showZone } from "./views";

const CONTENT: Record<ZoneId, ZoneContent> = {
  portfolio: portfolioJson as ZoneContent,
  cv: cvJson as ZoneContent,
  blog: mergeBlogFeed(blogJson as ZoneContent, feed.items),
};

async function boot(): Promise<void> {
  const host = document.getElementById("canvas-host") as HTMLDivElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const app = new Application();
  await app.init({ resizeTo: host, background: 0x0b1620, antialias: false, resolution: 1, roundPixels: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  let current: ZoneId | null = zoneFromPath(location.pathname);

  const world = buildWorld(app.renderer, (id) => navigate(id, true));
  app.stage.addChild(world.container);

  const camera = new Camera((s) => { world.container.position.set(s.x, s.y); world.container.scale.set(s.scale); }, { reducedMotion: reduced });

  const targetFor = (id: ZoneId | null) => {
    const w = host.clientWidth, h = host.clientHeight;
    return id ? coverTransform(w, h, { ...zoneById(id).landmark, zoom: ZOOM }) : coverTransform(w, h);
  };

  const applyStates = (id: ZoneId | null): void => {
    for (const z of ZONE_IDS) world.zones[z].setState(id === null ? "idle" : z === id ? "active" : "dim");
  };

  function render(id: ZoneId | null, animate: boolean): void {
    applyStates(id);
    if (id) {
      const prerendered = document.body.dataset.zone === id && document.getElementById("content")!.childElementCount > 0;
      showZone(id, zoneById(id).name, prerendered ? null : renderContent(CONTENT[id]));
    } else {
      showMap();
    }
    const t = targetFor(id);
    if (animate) void camera.tweenTo(t); else camera.jumpTo(t);
  }

  function navigate(id: ZoneId | null, push: boolean): void {
    current = id;
    if (push) history.pushState({ zone: id }, "", pathForZone(id));
    render(id, true);
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

  app.ticker.add((ticker) => { camera.tick(performance.now()); world.tick(ticker); });

  render(current, false);
}

boot();
```

`content/blog.generated.json` no existe todavía: crear uno provisorio `{ "items": [] }` a mano para que compile (la Task 15 lo genera en `prebuild`/`predev`).

- [ ] **Step 7: Verificar en el browser**

Run: `npm run dev` y abrir `http://localhost:5173/`.
Checklist:
- Se ve el mapa nocturno cubriendo la ventana, tres zonas apagadas con sus carteles, cartel de bienvenida abajo a la derecha.
- Hover sobre una zona: parpadeo de arranque y luego queda encendida, landmark animado, cursor pointer.
- Click: URL pasa a `/cv/` (por ejemplo), el canvas se encoge a la izquierda mientras la cámara hace zoom sobre el landmark, la derecha muestra el contenido.
- "Volver al mapa", Esc y el botón atrás vuelven al mapa.
- Abrir `http://localhost:5173/blog/` directo: arranca ya en la vista zona sin animación.
- Tab recorre las tres zonas (se ven encenderse), Enter entra.
- Redimensionar la ventana en ambas vistas: el mapa sigue cubriendo y la zona activa sigue centrada.

Si el a11y con Tab no enciende la zona, verificar que `accessible` esté en `true` y que el canvas esté en el DOM antes del primer render.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: mapa interactivo, vistas y transición a zona"
```

---

### Task 14: Ambiente: luciérnagas

**Files:**
- Create: `src/map/ambient.ts`
- Modify: `src/map/build-world.ts`

**Interfaces:**
- Consumes: `ZONES`, `ACCENTS`, `Graphics`, `Ticker`.
- Produces: `class Fireflies extends Graphics { constructor(); tick(ticker: Ticker, hot: Set<ZoneId>): void }` — 12 puntos por zona orbitando el landmark en una elipse (radio 14x8 px) con fases distintas; alpha 0.3 en reposo y 0.9 si la zona está en `hot`/`active`. Se redibuja cada tick (36 rects: despreciable). `World` expone `hotZones(): Set<ZoneId>`.

- [ ] **Step 1: Implementar**

`src/map/ambient.ts`:
```ts
import { Graphics, type Ticker } from "pixi.js";
import { ACCENTS } from "./palette";
import { ZONES, type ZoneId } from "./zones";

const PER_ZONE = 12;

export class Fireflies extends Graphics {
  private t = 0;
  private readonly phases = Array.from({ length: ZONES.length * PER_ZONE }, (_, i) => (i * 0.61803) % 1);

  tick(ticker: Ticker, hot: Set<ZoneId>): void {
    this.t += ticker.deltaMS / 1000;
    this.clear();
    ZONES.forEach((z, zi) => {
      const color = ACCENTS[z.accent].core;
      const alpha = hot.has(z.id) ? 0.9 : 0.3;
      for (let i = 0; i < PER_ZONE; i++) {
        const ph = this.phases[zi * PER_ZONE + i]! * Math.PI * 2;
        const a = this.t * 0.5 + ph;
        const x = Math.round(z.landmark.x + Math.cos(a) * 14 + Math.sin(a * 2.3) * 3);
        const y = Math.round(z.landmark.y - 10 + Math.sin(a) * 8 + Math.cos(a * 1.7) * 2);
        const blink = 0.5 + 0.5 * Math.sin(this.t * 3 + ph * 4);
        this.rect(x, y, 1, 1).fill({ color, alpha: alpha * blink });
      }
    });
  }
}
```

En `build-world.ts`: crear `const fireflies = new Fireflies()`, agregarlo al `container` después de las zonas, y en `tick` llamar `fireflies.tick(ticker, hot)` donde `hot` es el set de ids cuyo `zones[id].state` es `"hot"` o `"active"`.

- [ ] **Step 2: Verificar visualmente y commit**

Run: `npm run dev`. Deben verse puntitos lentos alrededor de cada luz, más vivos en la zona en hover.

```bash
git add src/map/ambient.ts src/map/build-world.ts
git commit -m "feat: luciérnagas alrededor de las luces"
```

---

### Task 15: Scripts de build: validar, feed del blog, prerender

**Files:**
- Create: `scripts/validate-content.ts`, `scripts/fetch-blog-feed.ts`, `scripts/prerender.ts`, `scripts/inject.ts`, `scripts/inject.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `validateContent`, `parseRss`, `mergeBlogFeed`, `renderContent`, `ZONES`.
- Produces:
  - `injectZone(indexHtml: string, id: ZoneId, name: string, contentHtml: string): string` (puro, en `scripts/inject.ts`): setea `data-zone`, reemplaza `<main id="content" hidden></main>` por `<main id="content">…</main>`, quita `hidden` de `#hud`, pone el título de zona en `#zone-title`, agrega clase `zone` al body y cambia `<title>`.
  - npm scripts: `validate`, `feed`, `prerender`, `prebuild` (= validate + feed), `build` (= vite build + prerender), `predev` (= feed).

- [ ] **Step 1: Test de `injectZone`**

`scripts/inject.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { injectZone } from "./inject";

const index = `<html><head><title>Nicolás Riccomini</title></head><body data-zone=""><div id="hud" hidden><a id="back" href="/">←</a><h1 id="zone-title"></h1></div><main id="content" hidden></main></body></html>`;

describe("injectZone", () => {
  const out = injectZone(index, "cv", "Currículum", "<h1>Currículum</h1>");
  it("inyecta contenido y estado de zona", () => {
    expect(out).toContain('<body data-zone="cv" class="zone">');
    expect(out).toContain('<main id="content"><h1>Currículum</h1></main>');
    expect(out).toContain('<div id="hud">');
    expect(out).toContain('<h1 id="zone-title">Currículum</h1>');
    expect(out).toContain("<title>Currículum · Nicolás Riccomini</title>");
  });
  it("no toca el resto", () => {
    expect(out).toContain('<a id="back" href="/">←</a>');
  });
});
```

- [ ] **Step 2: Correr y ver fallar; implementar**

Run: `npm test -- inject` → FAIL.

`scripts/inject.ts`:
```ts
import type { ZoneId } from "../src/map/zones";

export function injectZone(indexHtml: string, id: ZoneId, name: string, contentHtml: string): string {
  return indexHtml
    .replace('<body data-zone="">', `<body data-zone="${id}" class="zone">`)
    .replace('<main id="content" hidden></main>', `<main id="content">${contentHtml}</main>`)
    .replace('<div id="hud" hidden>', '<div id="hud">')
    .replace('<h1 id="zone-title"></h1>', `<h1 id="zone-title">${name}</h1>`)
    .replace(/<title>.*?<\/title>/, `<title>${name} · Nicolás Riccomini</title>`);
}
```

Run: `npm test -- inject` → PASS.

- [ ] **Step 3: Scripts**

`scripts/validate-content.ts`:
```ts
import { readFileSync } from "node:fs";
import { validateContent } from "../src/content/validate";
import { ZONE_IDS } from "../src/map/zones";

let failed = false;
for (const id of ZONE_IDS) {
  const path = `content/${id}.json`;
  const errs = validateContent(JSON.parse(readFileSync(path, "utf8")));
  if (errs.length) { failed = true; console.error(`${path}:\n  ${errs.join("\n  ")}`); }
}
if (failed) process.exit(1);
console.log("content: ok");
```

`scripts/fetch-blog-feed.ts`:
```ts
import { writeFileSync } from "node:fs";
import { parseRss } from "../src/content/blog-feed";

const FEED_URL = "https://myxomatosis.xyz/index.xml";
const OUT = "content/blog.generated.json";

async function main(): Promise<void> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseRss(await res.text());
    writeFileSync(OUT, JSON.stringify({ items }, null, 2));
    console.log(`feed: ${items.length} posts`);
  } catch (err) {
    console.warn(`feed: no se pudo leer ${FEED_URL} (${(err as Error).message}); sigo sin 'Últimos posts'`);
    writeFileSync(OUT, JSON.stringify({ items: [] }));
  }
}
main();
```

`scripts/prerender.ts`:
```ts
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mergeBlogFeed } from "../src/content/blog-feed";
import { renderContent } from "../src/content/render";
import type { ZoneContent } from "../src/content/types";
import { ZONES } from "../src/map/zones";
import { injectZone } from "./inject";

const index = readFileSync("dist/index.html", "utf8");
const feed = JSON.parse(readFileSync("content/blog.generated.json", "utf8")) as { items: { title: string; url: string; date: string }[] };

for (const z of ZONES) {
  let content = JSON.parse(readFileSync(`content/${z.id}.json`, "utf8")) as ZoneContent;
  if (z.id === "blog") content = mergeBlogFeed(content, feed.items);
  mkdirSync(`dist/${z.id}`, { recursive: true });
  writeFileSync(`dist/${z.id}/index.html`, injectZone(index, z.id, z.name, renderContent(content)));
  console.log(`prerender: /${z.id}/`);
}
copyFileSync("dist/index.html", "dist/404.html"); // GitHub Pages: rutas desconocidas cargan el mapa
```

`package.json` scripts:
```bash
npm pkg set scripts.validate="tsx scripts/validate-content.ts" \
  scripts.feed="tsx scripts/fetch-blog-feed.ts" \
  scripts.prerender="tsx scripts/prerender.ts" \
  scripts.prebuild="npm run validate && npm run feed" \
  scripts.build="vite build && npm run prerender" \
  scripts.predev="npm run feed"
```

- [ ] **Step 4: Verificar el build completo**

Run: `npm run build && ls dist dist/cv && grep -c 'data-zone="cv" class="zone"' dist/cv/index.html`
Expected: `dist/{index.html,404.html,portfolio,cv,blog,assets}`; el grep devuelve 1. Luego `npm run preview` y abrir `/cv/`: carga directo en vista zona, con el contenido visible incluso antes de que arranque el JS.

Presupuesto: `gzip -c dist/assets/*.js | wc -c` debe dar menos de 204800 (200 KB). Si se pasa, revisar que solo se importe desde `pixi.js` lo necesario y que Vite esté en modo producción.

- [ ] **Step 5: Commit**

```bash
git add scripts package.json
git commit -m "feat: validación, feed del blog y prerender de rutas"
```

---

### Task 16: Deploy a GitHub Pages y cierre

**Files:**
- Create: `.github/workflows/deploy.yml`, `public/CNAME`, `README.md`

- [ ] **Step 1: Workflow**

`.github/workflows/deploy.yml`:
```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`public/CNAME`: una sola línea con el subdominio elegido. Provisorio: `yo.myxomatosis.xyz`. **Nicolás confirma el nombre antes del primer deploy.**

- [ ] **Step 2: README**

`README.md`:
```markdown
# mapa

Sitio personal: un mapa RPG pixel art nocturno con tres zonas (Portfolio, Currículum, Blog).

- `npm run dev` — desarrollo (baja el feed del blog primero).
- `npm test` — tests unitarios (Vitest).
- `npm run build` — valida `content/*.json`, baja el feed, buildea y prerenderiza `/portfolio/`, `/cv/`, `/blog/`.

Contenido editable en `content/*.json`. Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.
```

- [ ] **Step 3: Repo remoto y primer deploy**

```bash
gh repo create nicolas-ricc/mapa --public --source=. --remote=origin --push
```
Luego en GitHub: Settings → Pages → Source: "GitHub Actions". En GoDaddy: registro CNAME `yo` → `nicolas-ricc.github.io`. Cuando el DNS propague, en Settings → Pages poner el custom domain y activar "Enforce HTTPS".

- [ ] **Step 4: Checklist final (manual)**

- Lighthouse (móvil) sobre la URL publicada: Performance > 95, Accessibility > 95.
- Teclado: Tab recorre las tres zonas en orden portfolio, cv, blog; Enter entra; Esc vuelve.
- Lector de pantalla: anuncia "Portfolio, botón, Ir a Portfolio" (o equivalente).
- Móvil real: mapa cubre, tap entra, columnas apiladas, scroll del contenido funciona.
- `prefers-reduced-motion` activado en el sistema: sin animaciones, todo instantáneo.
- Carga directa de `/cv/` con JS deshabilitado: el contenido se lee igual.

- [ ] **Step 5: Commit**

```bash
git add .github public/CNAME README.md
git commit -m "chore: deploy a GitHub Pages, CNAME y README"
git push
```

---

## Self-review contra la spec

- **§1 Objetivo / criterios**: presupuesto JS verificado en Task 15 Step 4; pixel art nearest en Task 11; URL por zona en Tasks 9, 13, 15; teclado y lector en Task 12 y checklist Task 16.
- **§3 Estructura**: todos los archivos listados tienen task. `a11y.ts` de la spec quedó absorbido en `zone-node.ts` (propiedades accesibles) y `main.ts` (reduced-motion); no hace falta un módulo aparte.
- **§4 Mundo**: paleta 16 (Task 3), terreno por capas con río animado, autopista, cuadrícula, vegetación y cables (Task 6), zonas y landmarks con chiste (Tasks 5, 7), cartel de bienvenida (Task 13), luciérnagas y flicker (Tasks 12, 14). El humo de chimenea de la spec **no está en el plan**: es decorativo y se puede sumar como un cuarto landmark sin zona en una iteración posterior.
- **§5 Interacción**: estados con flicker de arranque (Task 12), cámara 500 ms ease-out con retarget para seguir el resize del host (Tasks 8, 13), dos columnas y apilado móvil (Task 13 CSS), popstate/Esc/volver (Task 13), carga directa prerenderizada (Task 15), reduced-motion (Tasks 8, 13). Arrastre con un dedo en móvil cuando el mapa queda recortado **no está en el plan**: con `cover` y las zonas dentro del 480x270 el recorte en portrait puede tapar parte de una zona; se evalúa en el checklist móvil y, si molesta, se agrega drag en una iteración.
- **§6 Contenido**: esquema, validación, render, feed con fallback (Tasks 10, 15).
- **§7 Performance**: maxFPS 30, pausa en visibilitychange, textura estática (Tasks 13, 11).
- **§8 Deploy**: Task 16.
- **§9 Testing**: unit tests en Tasks 2-10, 12, 13, 15; build check en Task 15; manual en Tasks 13 y 16.

Nombres verificados entre tasks: `opsToTexture`, `buildTerrain`/`Terrain.zoneOverlay`, `landmarkFrames`, `glowOps`, `ZoneNode.setState/tick/state`, `Camera.tweenTo/jumpTo/retarget/isTweening/tick`, `coverTransform`, `zoneFromPath/pathForZone`, `renderContent`, `mergeBlogFeed`, `parseRss`, `injectZone`, `showMap/showZone`.

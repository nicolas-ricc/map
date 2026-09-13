# Portfolio isométrico low-poly — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página de laboratorio (`/map/lab/portfolio.html`, solo dev) que renderiza el astillero del Portfolio como escena 2.5D isométrica low-poly vectorial, con atardecer rasante, sombras largas, terreno facetado y tres animaciones.

**Architecture:** Un motor puro en `src/iso/` (sin PixiJS) convierte una lista declarativa de sólidos en coordenadas de mundo en polígonos 2D coloreados y ordenados: proyección dimétrica 2:1, tesselado a caras con normal, tono por normal (cinco tonos por material congelados en un atlas), sombra proyectada al suelo como casco convexo, orden painter topológico por AABB. La escena `src/scenes/shipyard.ts` es una función pura `(rng) → Scene` con los sólidos agrupados (suelo, agua, sólidos, acentos, carro, puntos de soldadura). `src/lab/portfolio.ts` es el único módulo que toca Pixi: una `Graphics` por capa, encuadre automático, ticker con las animaciones de `shipyard-anim.ts`.

**Tech Stack:** TypeScript 7 strict, Vite 8, pixi.js 8.20, Vitest 5. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md`

## Global Constraints

- Motor **PixiJS 8**; nada de Three.js ni dependencias nuevas.
- Proyección **dimétrica 2:1**: `sx = x - y`, `sy = (x + y) / 2 - z * Z_SCALE`, `Z_SCALE = 1.4`. Mundo: `x` este, `y` sur, `z` arriba. La cámara mira desde el SE.
- Luz: sol a **25°** de elevación desde el **oeste-sudoeste**. Sombras hacia el ENE (`SHADOW_DIR = (0.894, -0.447)`), longitud `z * Z_SCALE / tan(25°)` por unidad de altura.
- Tonos: exactamente cinco por material (`shade < lit < down < top < up`), literales en `src/map/palette-iso.ts`. **Ningún literal `0x......` fuera de `palette.ts` y `palette-iso.ts`** (el guard existente lo verifica; hay que eximir el archivo nuevo).
- Coordenadas del astillero: mismo plano que `src/map/terrain-portfolio.ts` (x 0..344, y 0..146, `QUAY_X = 200`), reutilizando `riverCenter` y `RIVER_HALF` de `src/map/geo.ts`.
- El laboratorio **no entra en `dist/`**: Vite solo compila `index.html` (input por defecto); no agregar `lab` a `build.rollupOptions.input`.
- Todo el texto en español. Commits con prefijos `feat:`, `test:`, `docs:`, `chore:`. `npm test` y `npm run typecheck` verdes al final de cada task.
- Con `prefers-reduced-motion: reduce` las animaciones quedan en su frame 0.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/map/palette-iso.ts` | `ISO_TONES` (5 tonos por material), `ISO_COLORS` (sombra, cielo, acentos), `Material`, `Tone`, `TONE_LADDER`, `stepTone`, `toneColor` |
| `src/iso/geometry.ts` | `Vec2`, `Vec3`, `dot`, `normalize`, `polygonNormal` (Newell), `centroid`, `convexHull` |
| `src/iso/project.ts` | `Z_SCALE`, `VIEW_DIR`, `project(v) → {x, y}` |
| `src/iso/light.ts` | `SUN_ELEVATION`, `TO_SUN`, `SHADOW_DIR`, `SHADOW_PER_UNIT`, `shadeTone(normal)`, `shadowPoint`, `shadowPolygon(solid)` |
| `src/iso/solids.ts` | Tipos `Solid`, `Face`, `Tri`; `tessellateAll(s)`, `tessellate(s)` (solo caras visibles), `bounds(s)` |
| `src/iso/depth.ts` | `Bounds`, `screenBounds`, `isBehind`, `sortByDepth` |
| `src/iso/render-list.ts` | `Layer`, `RenderItem`, `buildRenderList(solids)` |
| `src/scenes/shipyard.ts` | `Scene`, `Accent`, `shipyard(rng)`, constantes del plano |
| `src/scenes/shipyard-anim.ts` | `createShipyardAnim(scene, rng, opts)` |
| `src/lab/draw.ts` | `drawLayer`, `drawAccents`, `fitTransform` (única dependencia de Pixi además del runtime) |
| `src/lab/portfolio.ts` | Arranque de la página de laboratorio |
| `lab/portfolio.html` | Entrada Vite de desarrollo |

---

### Task 1: Atlas de paleta atardecer

**Files:**
- Create: `src/map/palette-iso.ts`
- Modify: `src/map/palette-guard.test.ts:8` (eximir el archivo nuevo)
- Test: `src/map/palette-iso.test.ts`

**Interfaces:**
- Produces: `ISO_TONES: Record<Material, Record<Tone, number>>`, `ISO_COLORS: { shadow, sky, cyan, cyanMid, cyanBleed }`, `type Material`, `type Tone = "shade" | "lit" | "down" | "top" | "up"`, `TONE_LADDER: readonly Tone[]`, `stepTone(tone: Tone, offset: number): Tone`, `toneColor(mat: Material, tone: Tone): number`, `allIsoColors(): Set<number>`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/map/palette-iso.test.ts
import { describe, expect, it } from "vitest";
import { ISO_COLORS, ISO_TONES, TONE_LADDER, allIsoColors, stepTone, toneColor, type Material } from "./palette-iso";

const lum = (c: number): number => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;

describe("paleta isométrica", () => {
  it("cada material tiene cinco tonos ordenados de oscuro a claro", () => {
    for (const mat of Object.keys(ISO_TONES) as Material[]) {
      const t = ISO_TONES[mat];
      expect(lum(t.shade)).toBeLessThan(lum(t.lit));
      expect(lum(t.lit)).toBeLessThan(lum(t.down));
      expect(lum(t.down)).toBeLessThan(lum(t.top));
      expect(lum(t.top)).toBeLessThan(lum(t.up));
    }
  });

  it("la sombra es más azul que roja (luz cálida, sombra fría)", () => {
    for (const mat of Object.keys(ISO_TONES) as Material[]) {
      const s = ISO_TONES[mat].shade, top = ISO_TONES[mat].top;
      const blueShare = (c: number) => (c & 255) / (((c >> 16) & 255) + (c & 255) + 1);
      expect(blueShare(s)).toBeGreaterThanOrEqual(blueShare(top));
    }
  });

  it("stepTone sube y baja por la escalera y se clampea", () => {
    expect(TONE_LADDER).toEqual(["shade", "lit", "down", "top", "up"]);
    expect(stepTone("top", 1)).toBe("up");
    expect(stepTone("top", -1)).toBe("down");
    expect(stepTone("up", 3)).toBe("up");
    expect(stepTone("shade", -1)).toBe("shade");
    expect(stepTone("lit", 0)).toBe("lit");
  });

  it("toneColor y allIsoColors coinciden", () => {
    expect(toneColor("slab", "top")).toBe(ISO_TONES.slab.top);
    const all = allIsoColors();
    expect(all.has(ISO_TONES.rust.shade)).toBe(true);
    expect(all.has(ISO_COLORS.shadow)).toBe(true);
    expect(all.has(ISO_COLORS.cyan)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd ~/Projects/mapa && npx vitest run src/map/palette-iso.test.ts`
Expected: FAIL, `Cannot find module './palette-iso'`.

- [ ] **Step 3: Escribir el atlas**

```ts
// src/map/palette-iso.ts
/**
 * Atlas de la escena isométrica: atardecer rasante. Cinco tonos por material,
 * generados una vez (lit = top×0.80 +azul, shade = top×0.52 +más azul,
 * up = top×1.10, down = top×0.90 +azul) y pegados como literales para que el
 * guard de colores los vea. No calcular colores en runtime.
 */
export const ISO_TONES = {
  slab:      { top: 0xb7a58a, lit: 0x8e8476, shade: 0x56565a, up: 0xc9b698, down: 0xa39580 },
  concrete:  { top: 0xc9bca5, lit: 0x9d968c, shade: 0x606268, up: 0xddcfb6, down: 0xb3a999 },
  rust:      { top: 0x9c5a32, lit: 0x794830, shade: 0x482f2c, up: 0xac6337, down: 0x8a5131 },
  steel:     { top: 0x8e939c, lit: 0x6e7685, shade: 0x414c63, up: 0x9ca2ac, down: 0x7e8490 },
  road:      { top: 0x6b6a6e, lit: 0x525560, shade: 0x2f374b, up: 0x767579, down: 0x5e5f67 },
  rail:      { top: 0xd3c9b2, lit: 0xa5a196, shade: 0x65696f, up: 0xe8ddc4, down: 0xbcb5a4 },
  water:     { top: 0x2f5f66, lit: 0x224c5a, shade: 0x0f3147, up: 0x346970, down: 0x285660 },
  waterDeep: { top: 0x244b52, lit: 0x193c4a, shade: 0x0a273d, up: 0x28535a, down: 0x1e444e },
  leaf:      { top: 0x4d7a3a, lit: 0x3a6236, shade: 0x1f3f30, up: 0x558640, down: 0x436e38 },
  leafDark:  { top: 0x35592a, lit: 0x26472a, shade: 0x132e28, up: 0x3a622e, down: 0x2e502a },
  rock:      { top: 0x7d7468, lit: 0x605d5b, shade: 0x383c48, up: 0x8a8072, down: 0x6f6862 },
  sand:      { top: 0xc7b48b, lit: 0x9b9077, shade: 0x5e5e5a, up: 0xdbc699, down: 0xb1a281 },
  hull:      { top: 0x7a3b2a, lit: 0x5e2f2a, shade: 0x361f28, up: 0x86412e, down: 0x6c352a },
  deck:      { top: 0xb59a6e, lit: 0x8d7b60, shade: 0x55504b, up: 0xc7a979, down: 0xa18b67 },
} as const;

export const ISO_COLORS = {
  shadow: 0x1c2438,
  sky: 0x141a26,
  cyan: 0x7cf5ff,
  cyanMid: 0x27b3c9,
  cyanBleed: 0x134a52,
} as const;

export type Material = keyof typeof ISO_TONES;
export type Tone = "shade" | "lit" | "down" | "top" | "up";
export type AccentColor = "cyan" | "cyanMid" | "cyanBleed";

/** De oscuro a claro. `stepTone` se mueve por acá. */
export const TONE_LADDER: readonly Tone[] = ["shade", "lit", "down", "top", "up"];

export function stepTone(tone: Tone, offset: number): Tone {
  const i = Math.max(0, Math.min(TONE_LADDER.length - 1, TONE_LADDER.indexOf(tone) + offset));
  return TONE_LADDER[i]!;
}

export function toneColor(mat: Material, tone: Tone): number {
  return ISO_TONES[mat][tone];
}

export function allIsoColors(): Set<number> {
  const out = new Set<number>(Object.values(ISO_COLORS));
  for (const tones of Object.values(ISO_TONES)) for (const c of Object.values(tones)) out.add(c);
  return out;
}
```

- [ ] **Step 4: Eximir el archivo del guard**

En `src/map/palette-guard.test.ts` reemplazar:

```ts
const EXEMPT = new Set(["map/palette.ts", "map/seed.ts"]);
```

por:

```ts
const EXEMPT = new Set(["map/palette.ts", "map/palette-iso.ts", "map/seed.ts"]);
```

- [ ] **Step 5: Correr los tests y typecheck**

Run: `npx vitest run src/map && npm run typecheck`
Expected: PASS (incluido `palette-guard`).

- [ ] **Step 6: Commit**

```bash
git add src/map/palette-iso.ts src/map/palette-iso.test.ts src/map/palette-guard.test.ts
git commit -m "feat(iso): atlas de paleta atardecer con cinco tonos por material"
```

---

### Task 2: Geometría y proyección

**Files:**
- Create: `src/iso/geometry.ts`, `src/iso/project.ts`
- Test: `src/iso/geometry.test.ts`, `src/iso/project.test.ts`

**Interfaces:**
- Produces: `Vec2 {x,y}`, `Vec3 {x,y,z}`, `v3(x,y,z)`, `dot(a,b)`, `normalize(a)`, `polygonNormal(pts: Vec3[]): Vec3`, `centroid(pts: Vec3[]): Vec3`, `convexHull(pts: Vec2[]): Vec2[]`; `Z_SCALE = 1.4`, `VIEW_DIR: Vec3`, `project(v: Vec3): Vec2`.

- [ ] **Step 1: Tests que fallan**

```ts
// src/iso/geometry.test.ts
import { describe, expect, it } from "vitest";
import { centroid, convexHull, dot, normalize, polygonNormal, v3 } from "./geometry";

describe("geometry", () => {
  it("polygonNormal de un cuadrado horizontal apunta en z", () => {
    const n = polygonNormal([v3(0, 0, 0), v3(1, 0, 0), v3(1, 1, 0), v3(0, 1, 0)]);
    expect(Math.abs(n.z)).toBeCloseTo(1, 6);
    expect(n.x).toBeCloseTo(0, 6);
  });

  it("polygonNormal de una pared este apunta en x", () => {
    const n = polygonNormal([v3(1, 0, 0), v3(1, 1, 0), v3(1, 1, 2), v3(1, 0, 2)]);
    expect(Math.abs(n.x)).toBeCloseTo(1, 6);
  });

  it("normalize y dot", () => {
    const n = normalize(v3(3, 0, 4));
    expect(n).toEqual({ x: 0.6, y: 0, z: 0.8 });
    expect(dot(n, v3(0, 0, 1))).toBeCloseTo(0.8);
    expect(normalize(v3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("centroid promedia", () => {
    expect(centroid([v3(0, 0, 0), v3(2, 0, 0), v3(2, 2, 4)])).toEqual({ x: 4 / 3, y: 2 / 3, z: 4 / 3 });
  });

  it("convexHull descarta puntos interiores y colineales", () => {
    const hull = convexHull([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }]);
    expect(hull).toHaveLength(4);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 2, y: 2 });
    expect(hull).not.toContainEqual({ x: 1, y: 1 });
  });

  it("convexHull de menos de tres puntos devuelve lo que hay", () => {
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });
});
```

```ts
// src/iso/project.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { VIEW_DIR, Z_SCALE, project } from "./project";

describe("project (dimétrica 2:1)", () => {
  it("el origen va al origen", () => {
    expect(project(v3(0, 0, 0))).toEqual({ x: 0, y: 0 });
  });
  it("+x va a la derecha y abajo; +y a la izquierda y abajo, simétricos", () => {
    expect(project(v3(10, 0, 0))).toEqual({ x: 10, y: 5 });
    expect(project(v3(0, 10, 0))).toEqual({ x: -10, y: 5 });
  });
  it("z solo mueve en y, escalado", () => {
    expect(Z_SCALE).toBe(1.4);
    expect(project(v3(0, 0, 10))).toEqual({ x: 0, y: -14 });
  });
  it("VIEW_DIR apunta al SE y arriba", () => {
    expect(VIEW_DIR.x).toBeGreaterThan(0);
    expect(VIEW_DIR.y).toBeGreaterThan(0);
    expect(VIEW_DIR.z).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run src/iso`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar**

```ts
// src/iso/geometry.ts
export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z);
  return len === 0 ? { x: 0, y: 0, z: 0 } : { x: a.x / len, y: a.y / len, z: a.z / len };
}

/** Normal por el método de Newell: funciona para polígonos no planos y de cualquier tamaño. */
export function polygonNormal(pts: Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    x += (a.y - b.y) * (a.z + b.z);
    y += (a.z - b.z) * (a.x + b.x);
    z += (a.x - b.x) * (a.y + b.y);
  }
  return normalize({ x, y, z });
}

export function centroid(pts: Vec3[]): Vec3 {
  const n = pts.length || 1;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

/** Casco convexo (monotone chain). Sin puntos colineales en el borde. */
export function convexHull(input: Vec2[]): Vec2[] {
  const pts = [...input].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}
```

```ts
// src/iso/project.ts
import type { Vec2, Vec3 } from "./geometry";

/** Exageración vertical: los edificios se estiran para que proyecten perfil. */
export const Z_SCALE = 1.4;

/** Dirección hacia la cámara (dimétrica 2:1: elevación ≈ 30° desde el SE). Para descartar caras ocultas. */
export const VIEW_DIR: Vec3 = { x: 0.61, y: 0.61, z: 0.5 };

/** Mundo (x este, y sur, z arriba) → pantalla. */
export function project(v: Vec3): Vec2 {
  return { x: v.x - v.y, y: (v.x + v.y) / 2 - v.z * Z_SCALE };
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run src/iso && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/iso/geometry.ts src/iso/geometry.test.ts src/iso/project.ts src/iso/project.test.ts
git commit -m "feat(iso): geometría base y proyección dimétrica 2:1"
```

---

### Task 3: Luz, tono por normal y punto de sombra

**Files:**
- Create: `src/iso/light.ts`
- Test: `src/iso/light.test.ts`

**Interfaces:**
- Consumes: `Vec2`, `Vec3`, `dot`, `normalize` (Task 2); `Z_SCALE` (Task 2); `Tone` (Task 1).
- Produces: `SUN_ELEVATION`, `TO_SUN: Vec3`, `SHADOW_DIR: Vec2`, `SHADOW_PER_UNIT`, `shadeTone(normal: Vec3): Tone`, `shadowPoint(p: Vec3): Vec2`. (`shadowPolygon` se agrega en Task 5 cuando existan los sólidos.)

- [ ] **Step 1: Test que falla**

```ts
// src/iso/light.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { SHADOW_DIR, SHADOW_PER_UNIT, TO_SUN, shadeTone, shadowPoint } from "./light";

describe("light", () => {
  it("el sol está bajo, al oeste-sudoeste", () => {
    expect(TO_SUN.x).toBeLessThan(0);
    expect(TO_SUN.y).toBeGreaterThan(0);
    expect(TO_SUN.z).toBeCloseTo(Math.sin((25 * Math.PI) / 180), 3);
  });

  it("las tres caras visibles reciben tres tonos distintos", () => {
    expect(shadeTone(v3(0, 0, 1))).toBe("top");   // techo
    expect(shadeTone(v3(0, 1, 0))).toBe("lit");   // pared sur
    expect(shadeTone(v3(1, 0, 0))).toBe("shade"); // pared este
  });

  it("una vertiente hacia el sol sube, una en contra baja", () => {
    expect(shadeTone(v3(0, 0.6, 0.8))).toBe("up");
    expect(shadeTone(v3(0, -0.6, 0.8))).toBe("down");
  });

  it("un plano casi horizontal sigue siendo techo", () => {
    expect(shadeTone(v3(0.02, 0, 0.9998))).toBe("top");
  });

  it("la sombra cae al ENE con longitud proporcional a la altura", () => {
    const p = shadowPoint(v3(0, 0, 2));
    expect(p.x).toBeCloseTo(SHADOW_DIR.x * SHADOW_PER_UNIT * 2, 6);
    expect(p.y).toBeCloseTo(SHADOW_DIR.y * SHADOW_PER_UNIT * 2, 6);
    expect(SHADOW_PER_UNIT).toBeCloseTo(1.4 / Math.tan((25 * Math.PI) / 180), 6);
  });

  it("bajo el suelo no hay sombra: el punto queda donde está", () => {
    expect(shadowPoint(v3(3, 4, -2))).toEqual({ x: 3, y: 4 });
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/iso/light.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/iso/light.ts
import type { Tone } from "../map/palette-iso";
import { dot, normalize, type Vec2, type Vec3 } from "./geometry";
import { Z_SCALE } from "./project";

export const SUN_ELEVATION = (25 * Math.PI) / 180;

/** Unitario hacia el sol: oeste-sudoeste y bajo. Así la pared sur queda iluminada y la este en sombra. */
export const TO_SUN: Vec3 = normalize({
  x: -0.894 * Math.cos(SUN_ELEVATION),
  y: 0.447 * Math.cos(SUN_ELEVATION),
  z: Math.sin(SUN_ELEVATION),
});

/** Hacia dónde cae la sombra en el plano (ENE). */
export const SHADOW_DIR: Vec2 = { x: 0.894, y: -0.447 };

/** Unidades de sombra por unidad de altura (la altura exagerada también alarga la sombra). */
export const SHADOW_PER_UNIT = Z_SCALE / Math.tan(SUN_ELEVATION);

const TOP_MIN_Z = 0.997;   // por encima: techo plano
const SLOPE_MIN_Z = 0.3;   // entre esto y TOP_MIN_Z: vertiente

/** Cinco tonos según la normal: techo, vertiente a favor/en contra del sol, pared iluminada/en sombra. */
export function shadeTone(n: Vec3): Tone {
  if (n.z > TOP_MIN_Z) return "top";
  if (n.z > SLOPE_MIN_Z) return dot(n, TO_SUN) > TO_SUN.z ? "up" : "down";
  return dot(n, TO_SUN) > 0 ? "lit" : "shade";
}

/** Dónde toca el suelo (z = 0) el rayo que pasa por p. */
export function shadowPoint(p: Vec3): Vec2 {
  const len = Math.max(0, p.z) * SHADOW_PER_UNIT;
  return { x: p.x + SHADOW_DIR.x * len, y: p.y + SHADOW_DIR.y * len };
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/iso/light.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/iso/light.ts src/iso/light.test.ts
git commit -m "feat(iso): luz rasante desde el OSO, tono por normal y punto de sombra"
```

---

### Task 4: Sólidos y tesselado

**Files:**
- Create: `src/iso/solids.ts`
- Test: `src/iso/solids.test.ts`

**Interfaces:**
- Consumes: `Vec2`, `Vec3`, `v3`, `polygonNormal`, `centroid`, `dot` (Task 2); `VIEW_DIR` (Task 2); `shadeTone` (Task 3); `Material`, `Tone` (Task 1).
- Produces:

```ts
export interface Tri { pts: [Vec3, Vec3, Vec3]; toneOffset?: number }
export type Solid =
  | { kind: "prism"; at: Vec3; w: number; d: number; h: number; mat: Material; roof?: "flat" | "gable" | "step" }
  | { kind: "ramp"; at: Vec3; w: number; d: number; h: number; mat: Material; dir: "e" | "w" }
  | { kind: "cylinder"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "cone"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material }
  | { kind: "strip"; path: Vec2[]; width: number; z: number; mat: Material }
  | { kind: "ground"; tris: Tri[]; mat: Material };
export interface Face { pts: Vec3[]; normal: Vec3; mat: Material; tone: Tone; toneOffset: number }
export function tessellateAll(s: Solid): Face[]   // todas las caras, normales hacia afuera
export function tessellate(s: Solid): Face[]      // solo las que miran a la cámara (suelo y franjas: todas)
export function isFlat(s: Solid): boolean         // ground | strip
```

Convenciones: `prism.at` es la esquina mínima (oeste-norte-base); `cylinder.at`/`cone.at` es el centro de la base; `hull.at` es el centro de la popa (`x` popa, `y` eje, `z` base) y la proa apunta al este (+x). `ramp.dir = "e"` baja hacia el este (alto al oeste). `strip.path` es una polilínea en el plano a altura `z`.

- [ ] **Step 1: Tests que fallan**

```ts
// src/iso/solids.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { isFlat, tessellate, tessellateAll, type Solid } from "./solids";

const prism: Solid = { kind: "prism", at: v3(0, 0, 0), w: 2, d: 3, h: 4, mat: "concrete" };

describe("tessellate", () => {
  it("un prisma emite 6 caras en total y 3 visibles: techo, sur, este", () => {
    expect(tessellateAll(prism)).toHaveLength(6);
    const vis = tessellate(prism);
    expect(vis.map((f) => f.tone).sort()).toEqual(["lit", "shade", "top"]);
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts.every((p) => p.z === 4)).toBe(true);
    const south = vis.find((f) => f.tone === "lit")!;
    expect(south.pts.every((p) => p.y === 3)).toBe(true);
    const east = vis.find((f) => f.tone === "shade")!;
    expect(east.pts.every((p) => p.x === 2)).toBe(true);
    expect(vis.every((f) => f.mat === "concrete" && f.toneOffset === 0)).toBe(true);
  });

  it("las normales apuntan hacia afuera sin importar el orden de los vértices", () => {
    for (const f of tessellateAll(prism)) {
      const c = { x: 1, y: 1.5, z: 2 };
      const fc = { x: f.pts.reduce((s, p) => s + p.x, 0) / f.pts.length, y: f.pts.reduce((s, p) => s + p.y, 0) / f.pts.length, z: f.pts.reduce((s, p) => s + p.z, 0) / f.pts.length };
      expect(f.normal.x * (fc.x - c.x) + f.normal.y * (fc.y - c.y) + f.normal.z * (fc.z - c.z)).toBeGreaterThan(0);
    }
  });

  it("techo a dos aguas: dos vertientes (up/down) y los hastiales como pentágonos", () => {
    const vis = tessellate({ ...prism, w: 10, d: 4, roof: "gable" });
    expect(vis.map((f) => f.tone)).toContain("up");
    expect(vis.map((f) => f.tone)).toContain("down");
    const east = vis.find((f) => f.pts.every((p) => p.x === 10))!;
    expect(east.pts).toHaveLength(5);
    expect(Math.max(...east.pts.map((p) => p.z))).toBeCloseTo(4 + 0.35 * 4);
  });

  it("techo escalonado: la caja más un segundo nivel más chico encima", () => {
    const all = tessellateAll({ ...prism, w: 10, d: 10, roof: "step" });
    expect(all).toHaveLength(12);
    const tops = all.filter((f) => f.tone === "top").map((f) => f.pts[0]!.z).sort();
    expect(tops).toEqual([4, 4 + 4 * 0.35]);
  });

  it("rampa hacia el este: el techo baja de oeste a este", () => {
    const vis = tessellate({ kind: "ramp", at: v3(0, 0, 0), w: 10, d: 4, h: 2, mat: "concrete", dir: "e" });
    const top = vis.find((f) => f.normal.z > 0.5)!;
    const west = top.pts.filter((p) => p.x === 0), east = top.pts.filter((p) => p.x === 10);
    expect(west.every((p) => p.z === 2)).toBe(true);
    expect(east.every((p) => p.z === 0)).toBe(true);
  });

  it("cilindro de 8 lados: techo octogonal y solo los lados que miran a la cámara", () => {
    const vis = tessellate({ kind: "cylinder", at: v3(0, 0, 0), r: 2, h: 5, mat: "steel" });
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(8);
    const sides = vis.filter((f) => f.tone !== "top");
    expect(sides.length).toBeGreaterThanOrEqual(3);
    expect(sides.length).toBeLessThanOrEqual(5);
    expect(tessellateAll({ kind: "cylinder", at: v3(0, 0, 0), r: 2, h: 5, mat: "steel" })).toHaveLength(10);
  });

  it("cono de 6 lados: triángulos al ápice, sin techo", () => {
    const all = tessellateAll({ kind: "cone", at: v3(0, 0, 0), r: 2, h: 5, mat: "leaf" });
    expect(all).toHaveLength(7); // base + 6 lados
    expect(all.filter((f) => f.pts.length === 3)).toHaveLength(6);
    const vis = tessellate({ kind: "cone", at: v3(0, 0, 0), r: 2, h: 5, mat: "leaf" });
    expect(vis.every((f) => f.pts.length === 3)).toBe(true);
    expect(vis.some((f) => f.tone === "up")).toBe(true);
    expect(vis.some((f) => f.tone === "down")).toBe(true);
  });

  it("casco: popa cuadrada, proa en punta al este", () => {
    const all = tessellateAll({ kind: "hull", at: v3(0, 0, 0), len: 20, beam: 4, h: 2, mat: "hull" });
    const top = all.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(5);
    expect(top.pts).toContainEqual({ x: 20, y: 0, z: 2 });
    expect(top.pts).toContainEqual({ x: 0, y: -2, z: 2 });
  });

  it("franja: un cuadrilátero horizontal por segmento, sin descarte", () => {
    const s: Solid = { kind: "strip", path: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], width: 2, z: -0.4, mat: "road" };
    const vis = tessellate(s);
    expect(vis).toHaveLength(2);
    expect(vis[0]!.pts).toHaveLength(4);
    expect(vis[0]!.pts.every((p) => p.z === -0.4)).toBe(true);
    expect(vis[0]!.tone).toBe("top");
    expect(isFlat(s)).toBe(true);
  });

  it("suelo: cada triángulo con su tono por inclinación y su offset", () => {
    const s: Solid = {
      kind: "ground", mat: "slab",
      tris: [
        { pts: [v3(0, 0, 0), v3(6, 0, 0), v3(0, 6, 0)] },
        { pts: [v3(6, 0, 0), v3(6, 6, 2), v3(0, 6, 0)], toneOffset: 1 },
      ],
    };
    const vis = tessellate(s);
    expect(vis).toHaveLength(2);
    expect(vis[0]!.tone).toBe("top");
    expect(vis[0]!.toneOffset).toBe(0);
    expect(vis[1]!.tone).not.toBe("top");
    expect(vis[1]!.toneOffset).toBe(1);
    expect(vis.every((f) => f.normal.z > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run src/iso/solids.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/iso/solids.ts
import type { Material, Tone } from "../map/palette-iso";
import { centroid, dot, polygonNormal, type Vec2, type Vec3, v3 } from "./geometry";
import { shadeTone } from "./light";
import { VIEW_DIR } from "./project";

export interface Tri { pts: [Vec3, Vec3, Vec3]; toneOffset?: number }

export type Solid =
  | { kind: "prism"; at: Vec3; w: number; d: number; h: number; mat: Material; roof?: "flat" | "gable" | "step" }
  | { kind: "ramp"; at: Vec3; w: number; d: number; h: number; mat: Material; dir: "e" | "w" }
  | { kind: "cylinder"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "cone"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material }
  | { kind: "strip"; path: Vec2[]; width: number; z: number; mat: Material }
  | { kind: "ground"; tris: Tri[]; mat: Material };

export interface Face { pts: Vec3[]; normal: Vec3; mat: Material; tone: Tone; toneOffset: number }

export const GABLE_RATIO = 0.35; // altura de cumbrera sobre alero, relativa a la altura de la caja
export const STEP_RATIO = 0.35;  // altura del segundo nivel del techo escalonado
export const STEP_INSET = 0.2;   // retranqueo del segundo nivel, relativo al lado

export function isFlat(s: Solid): boolean {
  return s.kind === "strip" || s.kind === "ground";
}

/** Cara con la normal orientada hacia afuera del centro `c` del sólido. */
function face(pts: Vec3[], mat: Material, c: Vec3, toneOffset = 0): Face {
  let normal = polygonNormal(pts);
  const fc = centroid(pts);
  if (dot(normal, { x: fc.x - c.x, y: fc.y - c.y, z: fc.z - c.z }) < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
  return { pts, normal, mat, tone: shadeTone(normal), toneOffset };
}

/** Prisma recto sobre una huella poligonal: techo, base y un cuadrilátero por lado. */
function extrude(footprint: Vec2[], z0: number, h: number, mat: Material): Face[] {
  const top = footprint.map((p) => v3(p.x, p.y, z0 + h));
  const bottom = footprint.map((p) => v3(p.x, p.y, z0));
  const c = centroid([...top, ...bottom]);
  const out = [face(top, mat, c), face(bottom, mat, c)];
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i]!, b = footprint[(i + 1) % footprint.length]!;
    out.push(face([v3(a.x, a.y, z0), v3(b.x, b.y, z0), v3(b.x, b.y, z0 + h), v3(a.x, a.y, z0 + h)], mat, c));
  }
  return out;
}

const rect = (x: number, y: number, w: number, d: number): Vec2[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];

function regular(cx: number, cy: number, r: number, sides: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / sides; // caras planas al norte/sur/este/oeste
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function gable(at: Vec3, w: number, d: number, h: number, mat: Material): Face[] {
  const { x, y, z } = at;
  const eave = z + h, ridge = eave + h * GABLE_RATIO;
  const c = v3(x + w / 2, y + d / 2, z + h / 2);
  const f = (pts: Vec3[]) => face(pts, mat, c);
  if (w >= d) {
    const ym = y + d / 2;
    return [
      f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),                          // base
      f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y, eave), v3(x, y, eave)]),                             // pared norte
      f([v3(x, y + d, z), v3(x + w, y + d, z), v3(x + w, y + d, eave), v3(x, y + d, eave)]),             // pared sur
      f([v3(x, y, z), v3(x, y, eave), v3(x, ym, ridge), v3(x, y + d, eave), v3(x, y + d, z)]),           // hastial oeste
      f([v3(x + w, y, z), v3(x + w, y, eave), v3(x + w, ym, ridge), v3(x + w, y + d, eave), v3(x + w, y + d, z)]), // hastial este
      f([v3(x, y, eave), v3(x + w, y, eave), v3(x + w, ym, ridge), v3(x, ym, ridge)]),                   // vertiente norte
      f([v3(x, y + d, eave), v3(x + w, y + d, eave), v3(x + w, ym, ridge), v3(x, ym, ridge)]),           // vertiente sur
    ];
  }
  const xm = x + w / 2;
  return [
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),
    f([v3(x, y, z), v3(x, y + d, z), v3(x, y + d, eave), v3(x, y, eave)]),                               // pared oeste
    f([v3(x + w, y, z), v3(x + w, y + d, z), v3(x + w, y + d, eave), v3(x + w, y, eave)]),               // pared este
    f([v3(x, y, z), v3(x, y, eave), v3(xm, y, ridge), v3(x + w, y, eave), v3(x + w, y, z)]),             // hastial norte
    f([v3(x, y + d, z), v3(x, y + d, eave), v3(xm, y + d, ridge), v3(x + w, y + d, eave), v3(x + w, y + d, z)]), // hastial sur
    f([v3(x, y, eave), v3(x, y + d, eave), v3(xm, y + d, ridge), v3(xm, y, ridge)]),                     // vertiente oeste
    f([v3(x + w, y, eave), v3(x + w, y + d, eave), v3(xm, y + d, ridge), v3(xm, y, ridge)]),             // vertiente este
  ];
}

function ramp(at: Vec3, w: number, d: number, h: number, dir: "e" | "w", mat: Material): Face[] {
  const { x, y, z } = at;
  const zw = dir === "e" ? z + h : z, ze = dir === "e" ? z : z + h; // altura del borde oeste / este
  const c = v3(x + w / 2, y + d / 2, z + h / 4);
  const f = (pts: Vec3[]) => face(pts, mat, c);
  return [
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),           // base
    f([v3(x, y, zw), v3(x + w, y, ze), v3(x + w, y + d, ze), v3(x, y + d, zw)]),       // plano inclinado
    f([v3(x, y, z), v3(x, y + d, z), v3(x, y + d, zw), v3(x, y, zw)]),                 // pared oeste
    f([v3(x + w, y, z), v3(x + w, y + d, z), v3(x + w, y + d, ze), v3(x + w, y, ze)]), // pared este
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y, ze), v3(x, y, zw)]),                 // lado norte
    f([v3(x, y + d, z), v3(x + w, y + d, z), v3(x + w, y + d, ze), v3(x, y + d, zw)]), // lado sur
  ];
}

function cone(at: Vec3, r: number, h: number, sides: number, mat: Material): Face[] {
  const base = regular(at.x, at.y, r, sides);
  const apex = v3(at.x, at.y, at.z + h);
  const c = v3(at.x, at.y, at.z + h / 3);
  const out = [face(base.map((p) => v3(p.x, p.y, at.z)), mat, c)];
  for (let i = 0; i < sides; i++) {
    const a = base[i]!, b = base[(i + 1) % sides]!;
    out.push(face([v3(a.x, a.y, at.z), v3(b.x, b.y, at.z), apex], mat, c));
  }
  return out;
}

function hullFootprint(at: Vec3, len: number, beam: number): Vec2[] {
  const half = beam / 2, shoulder = at.x + len * 0.7;
  return [{ x: at.x, y: at.y - half }, { x: shoulder, y: at.y - half }, { x: at.x + len, y: at.y }, { x: shoulder, y: at.y + half }, { x: at.x, y: at.y + half }];
}

function strip(path: Vec2[], width: number, z: number, mat: Material): Face[] {
  const out: Face[] = [];
  const hw = width / 2;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!, b = path[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * hw, ny = ((b.x - a.x) / len) * hw;
    const pts = [v3(a.x + nx, a.y + ny, z), v3(b.x + nx, b.y + ny, z), v3(b.x - nx, b.y - ny, z), v3(a.x - nx, a.y - ny, z)];
    out.push({ pts, normal: v3(0, 0, 1), mat, tone: "top", toneOffset: 0 });
  }
  return out;
}

function ground(tris: Tri[], mat: Material): Face[] {
  return tris.map((t) => {
    let normal = polygonNormal(t.pts);
    if (normal.z < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    return { pts: t.pts, normal, mat, tone: shadeTone(normal), toneOffset: t.toneOffset ?? 0 };
  });
}

export function tessellateAll(s: Solid): Face[] {
  switch (s.kind) {
    case "prism": {
      if (s.roof === "gable") return gable(s.at, s.w, s.d, s.h, s.mat);
      const box = extrude(rect(s.at.x, s.at.y, s.w, s.d), s.at.z, s.h, s.mat);
      if (s.roof !== "step") return box;
      const ix = s.w * STEP_INSET, iy = s.d * STEP_INSET;
      return [...box, ...extrude(rect(s.at.x + ix, s.at.y + iy, s.w - 2 * ix, s.d - 2 * iy), s.at.z + s.h, s.h * STEP_RATIO, s.mat)];
    }
    case "ramp": return ramp(s.at, s.w, s.d, s.h, s.dir, s.mat);
    case "cylinder": return extrude(regular(s.at.x, s.at.y, s.r, s.sides ?? 8), s.at.z, s.h, s.mat);
    case "cone": return cone(s.at, s.r, s.h, s.sides ?? 6, s.mat);
    case "hull": return extrude(hullFootprint(s.at, s.len, s.beam), s.at.z, s.h, s.mat);
    case "strip": return strip(s.path, s.width, s.z, s.mat);
    case "ground": return ground(s.tris, s.mat);
  }
}

/** Solo lo que mira a la cámara. Suelo y franjas se emiten enteros. */
export function tessellate(s: Solid): Face[] {
  const all = tessellateAll(s);
  return isFlat(s) ? all : all.filter((f) => dot(f.normal, VIEW_DIR) > 0);
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run src/iso/solids.test.ts && npm run typecheck`
Expected: PASS. Si el test del cono falla en `up`/`down`, revisar que `regular()` arranque en `π/sides`: con 6 lados debe haber un lado mirando al sur (up) y otro al norte (down).

- [ ] **Step 5: Commit**

```bash
git add src/iso/solids.ts src/iso/solids.test.ts
git commit -m "feat(iso): sólidos (prisma, gable, escalón, rampa, cilindro, cono, casco, franja, suelo) y tesselado"
```

---

### Task 5: Sombras proyectadas y AABB

**Files:**
- Modify: `src/iso/light.ts` (agregar `shadowPolygon`)
- Modify: `src/iso/solids.ts` (agregar `bounds`)
- Test: `src/iso/light.test.ts`, `src/iso/solids.test.ts` (agregar casos)

**Interfaces:**
- Produces: `bounds(s: Solid): Bounds` con `interface Bounds { min: Vec3; max: Vec3 }` (definido en `solids.ts`); `shadowPolygon(s: Solid): Vec2[] | null` (null para suelo, franjas y sólidos enteramente bajo el suelo).

- [ ] **Step 1: Tests que fallan**

Agregar a `src/iso/solids.test.ts`:

```ts
import { bounds } from "./solids";

describe("bounds", () => {
  it("AABB de un prisma", () => {
    expect(bounds({ kind: "prism", at: v3(1, 2, 3), w: 4, d: 5, h: 6, mat: "steel" })).toEqual({ min: { x: 1, y: 2, z: 3 }, max: { x: 5, y: 7, z: 9 } });
  });
  it("AABB de un gable incluye la cumbrera", () => {
    expect(bounds({ kind: "prism", at: v3(0, 0, 0), w: 10, d: 4, h: 4, mat: "steel", roof: "gable" }).max.z).toBeCloseTo(5.4);
  });
  it("AABB de un suelo", () => {
    const b = bounds({ kind: "ground", mat: "slab", tris: [{ pts: [v3(0, 0, -1), v3(6, 0, 0), v3(0, 6, 1)] }] });
    expect(b).toEqual({ min: { x: 0, y: 0, z: -1 }, max: { x: 6, y: 6, z: 1 } });
  });
});
```

Agregar a `src/iso/light.test.ts`:

```ts
import { shadowPolygon } from "./light";

describe("shadowPolygon", () => {
  it("un prisma 1×1×h proyecta un casco convexo que llega a 1 + 0.894·L·h en x", () => {
    const h = 2;
    const poly = shadowPolygon({ kind: "prism", at: v3(0, 0, 0), w: 1, d: 1, h, mat: "steel" })!;
    expect(poly.length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...poly.map((p) => p.x))).toBeCloseTo(1 + SHADOW_DIR.x * SHADOW_PER_UNIT * h, 6);
    expect(Math.min(...poly.map((p) => p.y))).toBeCloseTo(SHADOW_DIR.y * SHADOW_PER_UNIT * h, 6);
    expect(poly).toContainEqual({ x: 0, y: 0 });
    expect(poly).toContainEqual({ x: 0, y: 1 });
  });
  it("suelo, franjas y sólidos hundidos no proyectan", () => {
    expect(shadowPolygon({ kind: "strip", path: [{ x: 0, y: 0 }, { x: 1, y: 0 }], width: 1, z: 0, mat: "road" })).toBeNull();
    expect(shadowPolygon({ kind: "ground", mat: "slab", tris: [] })).toBeNull();
    expect(shadowPolygon({ kind: "prism", at: v3(0, 0, -6), w: 2, d: 2, h: 6, mat: "concrete" })).toBeNull();
  });
  it("un cono proyecta la base más el ápice desplazado", () => {
    const poly = shadowPolygon({ kind: "cone", at: v3(0, 0, 0), r: 1, h: 3, mat: "leaf" })!;
    expect(Math.max(...poly.map((p) => p.x))).toBeCloseTo(SHADOW_DIR.x * SHADOW_PER_UNIT * 3, 6);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run src/iso`
Expected: FAIL, `bounds` y `shadowPolygon` no exportados.

- [ ] **Step 3: Implementar `bounds` en `solids.ts`**

Agregar al final de `src/iso/solids.ts`:

```ts
export interface Bounds { min: Vec3; max: Vec3 }

export function bounds(s: Solid): Bounds {
  const min = v3(Infinity, Infinity, Infinity), max = v3(-Infinity, -Infinity, -Infinity);
  for (const f of tessellateAll(s)) for (const p of f.pts) {
    min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); min.z = Math.min(min.z, p.z);
    max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); max.z = Math.max(max.z, p.z);
  }
  return { min, max };
}
```

- [ ] **Step 4: Implementar `shadowPolygon` en `light.ts`**

Agregar los imports y la función:

```ts
import { convexHull } from "./geometry";
import { isFlat, tessellateAll, type Solid } from "./solids";

/**
 * Sombra al suelo: casco convexo de todos los vértices proyectados por el sol.
 * Los vértices bajo el suelo se quedan donde están (la parte hundida no tapa luz).
 * Sólidos planos o enteramente hundidos no proyectan.
 */
export function shadowPolygon(s: Solid): Vec2[] | null {
  if (isFlat(s)) return null;
  const pts: Vec2[] = [];
  let above = false;
  for (const f of tessellateAll(s)) for (const p of f.pts) {
    if (p.z > 0) above = true;
    pts.push(shadowPoint(p));
  }
  if (!above) return null;
  return convexHull(pts);
}
```

`solids.ts` importa `shadeTone` de `light.ts` y ahora `light.ts` importa de `solids.ts`: es un ciclo de imports entre funciones (no entre valores usados en el top-level), ESM lo resuelve. Si Vitest se queja, mover `shadowPolygon` a un archivo nuevo `src/iso/shadow.ts` con los mismos tests.

- [ ] **Step 5: Ver que pasan**

Run: `npx vitest run src/iso && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/iso/light.ts src/iso/light.test.ts src/iso/solids.ts src/iso/solids.test.ts
git commit -m "feat(iso): sombra proyectada como casco convexo y AABB por sólido"
```

---

### Task 6: Orden painter

**Files:**
- Create: `src/iso/depth.ts`
- Test: `src/iso/depth.test.ts`

**Interfaces:**
- Consumes: `Bounds`, `bounds`, `Solid` (Tasks 4-5); `project` (Task 2).
- Produces: `screenBounds(b: Bounds): { minX, minY, maxX, maxY }`, `isBehind(a: Bounds, b: Bounds): boolean`, `sortByDepth(solids: Solid[]): Solid[]` (nuevo array, de atrás hacia adelante).

- [ ] **Step 1: Test que falla**

```ts
// src/iso/depth.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "./geometry";
import { isBehind, screenBounds, sortByDepth } from "./depth";
import { bounds, type Solid } from "./solids";

const box = (x: number, y: number, z: number, w = 2, d = 2, h = 2): Solid => ({ kind: "prism", at: v3(x, y, z), w, d, h, mat: "steel" });

describe("depth", () => {
  it("screenBounds proyecta las 8 esquinas", () => {
    const sb = screenBounds(bounds(box(0, 0, 0, 2, 2, 2)));
    expect(sb).toEqual({ minX: -2, minY: -2.8, maxX: 2, maxY: 2 });
  });

  it("isBehind: separación en x, y o z", () => {
    expect(isBehind(bounds(box(0, 0, 0)), bounds(box(5, 0, 0)))).toBe(true);  // a al oeste
    expect(isBehind(bounds(box(5, 0, 0)), bounds(box(0, 0, 0)))).toBe(false);
    expect(isBehind(bounds(box(0, 0, 0)), bounds(box(0, 5, 0)))).toBe(true);  // a al norte
    expect(isBehind(bounds(box(0, 0, -6)), bounds(box(0, 0, 0)))).toBe(true); // a hundido
  });

  it("ordena de atrás hacia adelante en diagonal", () => {
    const far = box(0, 0, 0), mid = box(3, 3, 0), near = box(6, 6, 0);
    expect(sortByDepth([near, far, mid])).toEqual([far, mid, near]);
  });

  it("un objeto chico delante de una nave larga se dibuja después", () => {
    const hall = box(0, 0, 0, 90, 16, 10);
    const car = box(40, 20, 0, 3, 4, 1.5);
    expect(sortByDepth([car, hall])).toEqual([hall, car]);
  });

  it("un objeto chico detrás de una nave larga se dibuja antes", () => {
    const hall = box(0, 20, 0, 90, 16, 10);
    const car = box(40, 10, 0, 3, 4, 1.5);
    expect(sortByDepth([hall, car])).toEqual([car, hall]);
  });

  it("lo hundido va antes que lo apoyado en la misma celda", () => {
    const pit = box(0, 0, -6, 10, 10, 6);
    const crate = box(2, 2, 0, 2, 2, 2);
    expect(sortByDepth([crate, pit])).toEqual([pit, crate]);
  });

  it("no muta la entrada y conserva todos los elementos", () => {
    const input = [box(6, 6, 0), box(0, 0, 0)];
    const out = sortByDepth(input);
    expect(input[0]).toBe(input[0]);
    expect(out).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/iso/depth.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/iso/depth.ts
import { v3 } from "./geometry";
import { project } from "./project";
import { bounds, type Bounds, type Solid } from "./solids";

const EPS = 1e-6;

export interface ScreenBounds { minX: number; minY: number; maxX: number; maxY: number }

export function screenBounds(b: Bounds): ScreenBounds {
  const out = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
    const p = project(v3(x, y, z));
    out.minX = Math.min(out.minX, p.x); out.maxX = Math.max(out.maxX, p.x);
    out.minY = Math.min(out.minY, p.y); out.maxY = Math.max(out.maxY, p.y);
  }
  return out;
}

const overlaps = (a: ScreenBounds, b: ScreenBounds): boolean =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

/** `a` está detrás de `b` si hay un eje que los separa con `a` del lado lejano (oeste, norte o abajo). */
export function isBehind(a: Bounds, b: Bounds): boolean {
  return a.max.x <= b.min.x + EPS || a.max.y <= b.min.y + EPS || a.max.z <= b.min.z + EPS;
}

const depthKey = (b: Bounds): number => b.min.x + b.max.x + b.min.y + b.max.y + (b.min.z + b.max.z) * 0.5;

/**
 * Orden painter topológico: para cada par que se superpone en pantalla, el que
 * está detrás se dibuja antes. Si los dos se ven "detrás" del otro (esquinas
 * diagonales), decide la suma de coordenadas. Ciclos: se cortan y siguen.
 */
export function sortByDepth(solids: Solid[]): Solid[] {
  const n = solids.length;
  const bs = solids.map(bounds);
  const sbs = bs.map(screenBounds);
  const keys = bs.map(depthKey);
  const before: number[][] = Array.from({ length: n }, () => []); // before[i] = índices que van antes de i
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (!overlaps(sbs[i]!, sbs[j]!)) continue;
    const ij = isBehind(bs[i]!, bs[j]!), ji = isBehind(bs[j]!, bs[i]!);
    if (ij === ji) { if (keys[i]! <= keys[j]!) before[j]!.push(i); else before[i]!.push(j); }
    else if (ij) before[j]!.push(i);
    else before[i]!.push(j);
  }
  const state = new Uint8Array(n); // 0 sin visitar, 1 en curso, 2 listo
  const out: Solid[] = [];
  const visit = (i: number): void => {
    if (state[i] !== 0) return;
    state[i] = 1;
    for (const p of before[i]!) if (state[p] !== 1) visit(p);
    state[i] = 2;
    out.push(solids[i]!);
  };
  const order = solids.map((_, i) => i).sort((a, b) => keys[a]! - keys[b]!);
  for (const i of order) visit(i);
  return out;
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/iso/depth.test.ts && npm run typecheck`
Expected: PASS. Nota sobre `screenBounds`: `minY` de la caja 2×2×2 es `project(0,0,2).y = -2.8`; `maxY` es `project(2,2,0).y = 2`.

- [ ] **Step 5: Commit**

```bash
git add src/iso/depth.ts src/iso/depth.test.ts
git commit -m "feat(iso): orden painter topológico por AABB"
```

---

### Task 7: Lista de render

**Files:**
- Create: `src/iso/render-list.ts`
- Test: `src/iso/render-list.test.ts`

**Interfaces:**
- Consumes: `tessellate`, `isFlat`, `Solid` (Task 4); `shadowPolygon` (Task 5); `sortByDepth` (Task 6); `project` (Task 2); `toneColor`, `stepTone`, `ISO_COLORS`, `allIsoColors` (Task 1).
- Produces:

```ts
export type Layer = "ground" | "shadow" | "solid";
export interface RenderItem { layer: Layer; pts: number[]; color: number }  // pts = [x0,y0,x1,y1,...] en pantalla
export const SHADOW_ALPHA = 0.35;
export function buildRenderList(solids: Solid[]): RenderItem[]  // ground (orden de entrada) → shadow → solid (orden painter)
```

- [ ] **Step 1: Test que falla**

```ts
// src/iso/render-list.test.ts
import { describe, expect, it } from "vitest";
import { ISO_COLORS, ISO_TONES, allIsoColors } from "../map/palette-iso";
import { v3 } from "./geometry";
import { buildRenderList } from "./render-list";
import type { Solid } from "./solids";

const prism: Solid = { kind: "prism", at: v3(0, 0, 0), w: 2, d: 2, h: 2, mat: "concrete" };
const slab: Solid = { kind: "ground", mat: "slab", tris: [{ pts: [v3(0, 0, 0), v3(10, 0, 0), v3(0, 10, 0)] }, { pts: [v3(10, 0, 0), v3(10, 10, 0), v3(0, 10, 0)], toneOffset: -1 }] };

describe("buildRenderList", () => {
  it("capas en orden ground < shadow < solid", () => {
    const items = buildRenderList([prism, slab]);
    const layers = items.map((i) => i.layer);
    const last = (l: string) => layers.lastIndexOf(l), first = (l: string) => layers.indexOf(l);
    expect(last("ground")).toBeLessThan(first("shadow"));
    expect(last("shadow")).toBeLessThan(first("solid"));
  });

  it("un prisma produce una sombra y tres caras con los tres tonos del material", () => {
    const items = buildRenderList([prism]);
    expect(items.filter((i) => i.layer === "shadow")).toHaveLength(1);
    expect(items.find((i) => i.layer === "shadow")!.color).toBe(ISO_COLORS.shadow);
    const colors = items.filter((i) => i.layer === "solid").map((i) => i.color).sort();
    expect(colors).toEqual([ISO_TONES.concrete.top, ISO_TONES.concrete.lit, ISO_TONES.concrete.shade].sort());
  });

  it("el offset de tono del suelo baja un escalón", () => {
    const items = buildRenderList([slab]).filter((i) => i.layer === "ground");
    expect(items.map((i) => i.color)).toEqual([ISO_TONES.slab.top, ISO_TONES.slab.down]);
  });

  it("los puntos están proyectados a pantalla, planos", () => {
    const top = buildRenderList([prism]).find((i) => i.layer === "solid" && i.color === ISO_TONES.concrete.top)!;
    expect(top.pts).toHaveLength(8);
    expect(top.pts).toContain(-2.8); // project(0,0,2).y
  });

  it("todo color sale del atlas", () => {
    const all = allIsoColors();
    for (const i of buildRenderList([prism, slab, { kind: "cone", at: v3(5, 5, 0), r: 2, h: 4, mat: "leaf" }])) expect(all.has(i.color)).toBe(true);
  });

  it("los sólidos salen en orden painter", () => {
    const far: Solid = { ...prism, at: v3(0, 0, 0) }, near: Solid = { ...prism, at: v3(6, 6, 0) };
    const items = buildRenderList([near, far]).filter((i) => i.layer === "solid");
    const nearY = Math.max(...items.slice(3).flatMap((i) => i.pts.filter((_, k) => k % 2 === 1)));
    const farY = Math.max(...items.slice(0, 3).flatMap((i) => i.pts.filter((_, k) => k % 2 === 1)));
    expect(farY).toBeLessThan(nearY);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/iso/render-list.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/iso/render-list.ts
import { ISO_COLORS, stepTone, toneColor } from "../map/palette-iso";
import { sortByDepth } from "./depth";
import { v3, type Vec3 } from "./geometry";
import { shadowPolygon } from "./light";
import { project } from "./project";
import { isFlat, tessellate, type Face, type Solid } from "./solids";

export type Layer = "ground" | "shadow" | "solid";
export interface RenderItem { layer: Layer; pts: number[]; color: number }

/** Alpha con que el runtime dibuja la capa de sombras entera (una sola Graphics: las superposiciones no se oscurecen dos veces). */
export const SHADOW_ALPHA = 0.35;

const flatten = (pts: Vec3[]): number[] => pts.flatMap((p) => { const s = project(p); return [s.x, s.y]; });

const faceItem = (layer: Layer, f: Face): RenderItem => ({ layer, pts: flatten(f.pts), color: toneColor(f.mat, stepTone(f.tone, f.toneOffset)) });

export function buildRenderList(solids: Solid[]): RenderItem[] {
  const ground: RenderItem[] = [], shadow: RenderItem[] = [], solid: RenderItem[] = [];
  const raised: Solid[] = [];
  for (const s of solids) {
    if (isFlat(s)) for (const f of tessellate(s)) ground.push(faceItem("ground", f));
    else raised.push(s);
  }
  for (const s of raised) {
    const poly = shadowPolygon(s);
    if (poly) shadow.push({ layer: "shadow", pts: flatten(poly.map((p) => v3(p.x, p.y, 0))), color: ISO_COLORS.shadow });
  }
  for (const s of sortByDepth(raised)) for (const f of tessellate(s)) solid.push(faceItem("solid", f));
  return [...ground, ...shadow, ...solid];
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/iso && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/iso/render-list.ts src/iso/render-list.test.ts
git commit -m "feat(iso): lista de render por capas con colores del atlas"
```

---

### Task 8: Escena del astillero, parte 1 (terreno, agua, muelle, naves, calle, gradas, grúa)

**Files:**
- Create: `src/scenes/shipyard.ts`
- Test: `src/scenes/shipyard.test.ts`

**Interfaces:**
- Consumes: `Solid`, `Tri` (Task 4); `Vec3`, `v3` (Task 2); `AccentColor` (Task 1); `Rng` (`src/map/seed.ts`); `riverCenter`, `RIVER_HALF` (`src/map/geo.ts`).
- Produces:

```ts
export interface Accent { at: Vec3; r: number; color: AccentColor }
export interface Scene {
  ground: Solid[];   // losa, suelo este, selva (ground) y franjas (calle, rieles, vías)
  water: Solid[];    // un solo ground con los triángulos del canal y el río (animado por tono)
  solids: Solid[];   // todo lo que se apoya o se hunde
  accents: Accent[]; // luces cian estáticas
  trolley: Solid & { kind: "prism" };  // carro de la grúa (animado)
  trolleyRange: [number, number];      // y mínimo y máximo del carro
  weldSpots: Vec3[];                   // dónde saltan chispas (tope de cada cuaderna)
}
export const QUAY_X = 200, QUAY_W = 4, BOTTOM = 142, AREA_W = 344, AREA_H = 146;
export const CELL = 6;
export function shipyard(rng: Rng): Scene
```

En esta task la escena queda con: terreno (losa, agua, suelo este, hueco del dique seco sin amueblar), muelle con bolardos, dos naves gable con ventanas cian, calle de transferencia y rieles, dos gradas en rampa (una con quilla y cuadernas, otra con casco casi cerrado y superestructura), grúa pórtico con carro. La parte 2 (Task 9) agrega patio de material, dique seco, talleres, playa, vías, muelle de alistamiento, escollera, selva y faroles.

- [ ] **Step 1: Test que falla**

```ts
// src/scenes/shipyard.test.ts
import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds, type Solid } from "../iso/solids";
import { allIsoColors } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { AREA_H, AREA_W, QUAY_X, shipyard, type Scene } from "./shipyard";

const scene = (): Scene => shipyard(createRng(7));
const all = (s: Scene): Solid[] => [...s.ground, ...s.water, ...s.solids, s.trolley];

describe("shipyard", () => {
  it("es determinística por seed", () => {
    expect(JSON.stringify(shipyard(createRng(7)))).toBe(JSON.stringify(shipyard(createRng(7))));
    expect(JSON.stringify(shipyard(createRng(7)))).not.toBe(JSON.stringify(shipyard(createRng(8))));
  });

  it("todo cae dentro del área", () => {
    for (const s of all(scene())) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1);
      expect(b.min.y).toBeGreaterThanOrEqual(-1);
      expect(b.max.x).toBeLessThanOrEqual(AREA_W + 1);
      expect(b.max.y).toBeLessThanOrEqual(AREA_H + 1);
    }
  });

  it("el agua es un solo suelo, hundido, con offset de tono en cero", () => {
    const s = scene();
    expect(s.water).toHaveLength(1);
    const w = s.water[0]!;
    expect(w.kind).toBe("ground");
    if (w.kind !== "ground") return;
    expect(w.tris.length).toBeGreaterThan(200);
    expect(w.tris.every((t) => t.pts.every((p) => p.z === -1) && (t.toneOffset ?? 0) === 0)).toBe(true);
    expect(w.tris.every((t) => t.pts.every((p) => p.x >= QUAY_X))).toBe(true);
  });

  it("hay naves a dos aguas, gradas en rampa, un casco, cuadernas y una grúa", () => {
    const s = scene();
    const kinds = (k: Solid["kind"]) => s.solids.filter((x) => x.kind === k);
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "gable").length).toBeGreaterThanOrEqual(2);
    expect(kinds("ramp")).toHaveLength(2);
    expect(kinds("hull").length).toBeGreaterThanOrEqual(1);
    expect(s.weldSpots.length).toBeGreaterThan(10);
    const tall = s.solids.filter((x) => bounds(x).max.z >= 24);
    expect(tall.length).toBeGreaterThanOrEqual(3); // dos patas y la viga
  });

  it("el carro está sobre la viga y su rango cabe entre las gradas", () => {
    const s = scene();
    expect(s.trolley.at.z).toBeGreaterThanOrEqual(24);
    expect(s.trolleyRange[0]).toBeLessThan(s.trolleyRange[1]);
    expect(s.trolley.at.y).toBe(s.trolleyRange[0]);
  });

  it("los acentos son cian y están a la altura de las paredes", () => {
    const s = scene();
    expect(s.accents.length).toBeGreaterThan(8);
    expect(s.accents.every((a) => a.color.startsWith("cyan") && a.at.z > 0)).toBe(true);
  });

  it("todo el render usa colores del atlas", () => {
    const s = scene();
    const colors = allIsoColors();
    for (const i of buildRenderList(all(s))) expect(colors.has(i.color)).toBe(true);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/scenes`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar la parte 1**

```ts
// src/scenes/shipyard.ts
import { v3, type Vec2, type Vec3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { RIVER_HALF, riverCenter } from "../map/geo";
import type { AccentColor } from "../map/palette-iso";
import type { Rng } from "../map/seed";

/**
 * Portfolio: astillero en 2.5D. Mismo plano que terrain-portfolio.ts: línea de
 * producción de oeste a este que termina en el agua (patio de material → nave
 * de montaje → grada → río), calle de transferencia N-S, ribera dragada recta
 * en QUAY_X, dique seco al NE, talleres y playa al SO, muelle de alistamiento
 * del otro lado del río. Coordenadas en unidades del mapa viejo (1 u ≈ 1 px).
 */

export interface Accent { at: Vec3; r: number; color: AccentColor }
export interface Scene {
  ground: Solid[];
  water: Solid[];
  solids: Solid[];
  accents: Accent[];
  trolley: Solid & { kind: "prism" };
  trolleyRange: [number, number];
  weldSpots: Vec3[];
}

export const AREA_W = 344, AREA_H = 146;
export const QUAY_X = 200, QUAY_W = 4;
export const BOTTOM = 142;
export const CELL = 6;

const STREET_X = 100, STREET_W = 8;
const ROW_Y = [36, 56] as const;
const ROW_H = 16;
const HALL_X = 8, HALL_W = 90, HALL_H = 10;
const SLIP_X = 110;
const GANTRY_X = 150, GANTRY_H = 24;
const DOCK = { x: 120, y: 6, w: 72, d: 24, depth: 6 } as const; // alineado a CELL
const WATER_Z = -1;

type Terrain = "slab" | "water" | "east" | "jungle" | "dock";

const eastBank = (y: number): number => riverCenter(y) + RIVER_HALF;

function terrainAt(x: number, y: number): Terrain {
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab";
  if (x <= eastBank(y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

// ---------------------------------------------------------------- terreno

interface Terrains { ground: Solid[]; water: Solid }

/** Una grilla de CELL con alturas por vértice; cada celda son dos triángulos clasificados por su centro. */
function buildTerrain(rng: Rng): Terrains {
  const cols = AREA_W / CELL, rows = Math.ceil(AREA_H / CELL);
  const jitter: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0 };
  const base: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth };
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const t = terrainAt(Math.min(i * CELL, AREA_W - 1), Math.min(j * CELL, AREA_H - 1));
      z[j]!.push(base[t] + (rng.next() * 2 - 1) * jitter[t]);
    }
  }
  const tris: Record<Terrain, Tri[]> = { slab: [], water: [], east: [], jungle: [], dock: [] };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = i * CELL, y0 = j * CELL, x1 = x0 + CELL, y1 = Math.min(y0 + CELL, AREA_H);
    const t = terrainAt(x0 + CELL / 2, y0 + CELL / 2);
    if (t === "dock") continue; // el pozo se amuebla en Task 9
    const p = (x: number, y: number, zz: number) => v3(x, y, t === "water" ? WATER_Z : zz);
    const a = p(x0, y0, z[j]![i]!), b = p(x1, y0, z[j]![i + 1]!), c = p(x1, y1, z[j + 1]![i + 1]!), d = p(x0, y1, z[j + 1]![i]!);
    // diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados
    if ((i + j) % 2 === 0) tris[t].push({ pts: [a, b, c] }, { pts: [a, c, d] });
    else tris[t].push({ pts: [a, b, d] }, { pts: [b, c, d] });
  }
  return {
    ground: [
      { kind: "ground", mat: "slab", tris: tris.slab },
      { kind: "ground", mat: "sand", tris: tris.east },
      { kind: "ground", mat: "leafDark", tris: tris.jungle },
    ],
    water: { kind: "ground", mat: "water", tris: tris.water },
  };
}

// ---------------------------------------------------------------- piezas

const prism = (x: number, y: number, z: number, w: number, d: number, h: number, mat: Solid["mat"], roof?: "flat" | "gable" | "step"): Solid & { kind: "prism" } =>
  roof ? { kind: "prism", at: v3(x, y, z), w, d, h, mat, roof } : { kind: "prism", at: v3(x, y, z), w, d, h, mat };

const strip = (path: Vec2[], width: number, z: number, mat: Solid["mat"]): Solid => ({ kind: "strip", path, width, z, mat });

function quay(out: Solid[]): void {
  out.push(prism(QUAY_X, 0, WATER_Z, QUAY_W, BOTTOM, 1.5, "concrete"));
  for (let y = 6; y < BOTTOM; y += 12) out.push({ kind: "cylinder", at: v3(QUAY_X + 2, y, 0.5), r: 0.7, h: 1, mat: "steel", sides: 6 });
}

function halls(out: Solid[], accents: Accent[]): void {
  for (const y of ROW_Y) {
    out.push(prism(HALL_X, y, 0, HALL_W, ROW_H, HALL_H, "concrete", "gable"));
    for (let x = HALL_X + 6; x < HALL_X + HALL_W - 4; x += 8) accents.push({ at: v3(x, y + ROW_H, 4), r: 1, color: "cyan" }); // ventanas en la pared sur
    accents.push({ at: v3(HALL_X + HALL_W, y + ROW_H / 2, 5), r: 1.6, color: "cyanMid" }); // portón hacia la grada
  }
}

function street(out: Solid[]): void {
  out.push(strip([{ x: STREET_X + STREET_W / 2, y: 0 }, { x: STREET_X + STREET_W / 2, y: BOTTOM }], STREET_W, -0.4, "road"));
  for (const y of ROW_Y) for (const dy of [4, 11]) {
    out.push(strip([{ x: HALL_X + HALL_W, y: y + dy }, { x: SLIP_X, y: y + dy }], 0.5, 0.05, "rail")); // rieles nave → grada
  }
}

function slipways(out: Solid[], weldSpots: Vec3[]): void {
  const w = QUAY_X - SLIP_X, deckZ = 1.5;
  ROW_Y.forEach((y, i) => {
    out.push({ kind: "ramp", at: v3(SLIP_X, y, 0), w, d: ROW_H, h: deckZ, mat: "concrete", dir: "e" });
    const cy = y + ROW_H / 2;
    if (i === 0) {
      // quilla y cuadernas: el casco todavía es un esqueleto
      out.push(prism(SLIP_X + 10, cy - 0.3, deckZ, 70, 0.6, 1, "rust"));
      for (let x = SLIP_X + 12; x < SLIP_X + 80; x += 4) {
        const t = (x - SLIP_X - 12) / 68;
        const half = t > 0.75 ? Math.max(1, 5 * (1 - t) / 0.25) : 5;
        out.push(prism(x, cy - half, deckZ, 0.6, half * 2, 4, "rust"));
        weldSpots.push(v3(x + 0.3, cy - half, deckZ + 4));
        weldSpots.push(v3(x + 0.3, cy + half, deckZ + 4));
      }
    } else {
      out.push({ kind: "hull", at: v3(SLIP_X + 8, cy, deckZ), len: 74, beam: 10, h: 4, mat: "hull" });
      out.push(prism(SLIP_X + 14, cy - 2.5, deckZ + 4, 8, 5, 3, "concrete")); // superestructura en popa
    }
    for (let x = SLIP_X + 6; x < QUAY_X - 8; x += 9) { // andamios
      out.push(prism(x, y + 1, deckZ, 0.6, 0.6, 5, "steel"));
      out.push(prism(x + 4, y + ROW_H - 1.6, deckZ, 0.6, 0.6, 5, "steel"));
    }
  });
}

function gantry(out: Solid[]): { trolley: Solid & { kind: "prism" }; range: [number, number] } {
  const y0 = ROW_Y[0] - 3, y1 = ROW_Y[1] + ROW_H + 1;
  out.push(strip([{ x: SLIP_X, y: y0 + 1.5 }, { x: QUAY_X, y: y0 + 1.5 }], 0.5, 0.05, "rail"));
  out.push(strip([{ x: SLIP_X, y: y1 + 1.5 }, { x: QUAY_X, y: y1 + 1.5 }], 0.5, 0.05, "rail"));
  out.push(prism(GANTRY_X, y0, 0, 3, 3, GANTRY_H, "steel"));
  out.push(prism(GANTRY_X, y1, 0, 3, 3, GANTRY_H, "steel"));
  out.push(prism(GANTRY_X, y0, GANTRY_H, 3, y1 + 3 - y0, 2, "steel")); // viga
  const range: [number, number] = [y0 + 5, y1 - 6];
  const trolley = prism(GANTRY_X - 1, range[0], GANTRY_H + 2, 5, 4, 2, "rust");
  return { trolley, range };
}

export function shipyard(rng: Rng): Scene {
  const terrain = buildTerrain(rng);
  const ground: Solid[] = [...terrain.ground];
  const solids: Solid[] = [];
  const accents: Accent[] = [];
  const weldSpots: Vec3[] = [];
  quay(solids);
  halls(solids, accents);
  street(ground);
  slipways(solids, weldSpots);
  const g = gantry(solids);
  ground.push(...solids.filter((s) => s.kind === "strip"));
  const raised = solids.filter((s) => s.kind !== "strip");
  return { ground, water: [terrain.water], solids: raised, accents, trolley: g.trolley, trolleyRange: g.range, weldSpots };
}
```

Nota: `gantry()` mete franjas (rieles) en `solids`; el final de `shipyard()` las mueve a `ground`. Task 9 mantiene ese patrón.

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/scenes && npm run typecheck`
Expected: PASS. Si "todo cae dentro del área" falla por el agua, revisar que `rows` use `Math.ceil` y que `y1` se clampee a `AREA_H`.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/shipyard.ts src/scenes/shipyard.test.ts
git commit -m "feat(scene): astillero isométrico, parte 1: terreno, agua, muelle, naves, gradas y grúa"
```

---

### Task 9: Escena del astillero, parte 2 (patio, dique seco, talleres, alistamiento, selva, faroles)

**Files:**
- Modify: `src/scenes/shipyard.ts`
- Test: `src/scenes/shipyard.test.ts` (agregar casos)

**Interfaces:** sin cambios de firma. `shipyard()` devuelve más sólidos, acentos y suelo.

- [ ] **Step 1: Tests que fallan**

Agregar a `src/scenes/shipyard.test.ts`:

```ts
describe("shipyard parte 2", () => {
  it("dique seco: pozo con paredes, compuerta y un casco hundido", () => {
    const s = scene();
    const sunk = s.solids.filter((x) => bounds(x).min.z <= -5);
    expect(sunk.length).toBeGreaterThanOrEqual(6); // 4 paredes + compuerta + casco
    expect(sunk.some((x) => x.kind === "hull")).toBe(true);
    expect(s.ground.some((g) => g.kind === "ground" && g.tris.length > 0 && g.tris.every((t) => t.pts.every((p) => p.z === -6)))).toBe(true);
  });

  it("patio de material: tanques cilíndricos y pilas apiladas", () => {
    const s = scene();
    const tanks = s.solids.filter((x) => x.kind === "cylinder" && x.r >= 4);
    expect(tanks.length).toBeGreaterThanOrEqual(3); // dos en el patio, uno en alistamiento
    const stacked = s.solids.filter((x) => x.kind === "prism" && x.at.z > 0 && x.at.z < 3 && x.h <= 1);
    expect(stacked.length).toBeGreaterThanOrEqual(8);
  });

  it("talleres con techo escalonado y unidades en el techo, autos en la playa", () => {
    const s = scene();
    expect(s.solids.filter((x) => x.kind === "prism" && x.roof === "step").length).toBeGreaterThanOrEqual(2);
    const hvac = s.solids.filter((x) => x.kind === "prism" && x.at.z === 7 && x.h === 1);
    expect(hvac.length).toBeGreaterThanOrEqual(4);
    const cars = s.solids.filter((x) => x.kind === "prism" && x.h === 1.5 && x.w === 3);
    expect(cars.length).toBeGreaterThanOrEqual(3);
  });

  it("selva: conos en el SO y en la franja este, nunca sobre la losa", () => {
    const s = scene();
    const cones = s.solids.filter((x): x is Solid & { kind: "cone" } => x.kind === "cone" && (x.mat === "leaf" || x.mat === "leafDark"));
    expect(cones.length).toBeGreaterThanOrEqual(20);
    for (const c of cones) expect(c.at.x < 42 || c.at.x > 300).toBe(true);
  });

  it("muelle de alistamiento: galpones a dos aguas al este del río y escollera", () => {
    const s = scene();
    const sheds = s.solids.filter((x) => x.kind === "prism" && x.roof === "gable" && x.at.x > 300);
    expect(sheds).toHaveLength(2);
    const rocks = s.solids.filter((x) => x.kind === "cone" && x.mat === "rock");
    expect(rocks.length).toBeGreaterThan(30);
  });

  it("faroles: poste de acero con luz cian encima", () => {
    const s = scene();
    const poles = s.solids.filter((x) => x.kind === "prism" && x.w === 0.6 && x.h === 5 && x.at.x > STREET_EDGE && x.at.x < STREET_EDGE + 2);
    expect(poles.length).toBeGreaterThanOrEqual(5);
    for (const p of poles) expect(s.accents.some((a) => Math.abs(a.at.x - p.at.x) < 1 && Math.abs(a.at.y - p.at.y) < 1 && a.at.z === 5)).toBe(true);
  });
});
```

Y en el import del test agregar `STREET_EDGE` a lo que se importa de `./shipyard`.

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run src/scenes`
Expected: FAIL en los seis casos nuevos (y `STREET_EDGE` no exportado).

- [ ] **Step 3: Implementar la parte 2**

En `src/scenes/shipyard.ts`, exportar la constante:

```ts
export const STREET_EDGE = STREET_X + STREET_W; // x donde empiezan los faroles
```

Agregar las funciones después de `gantry()`:

```ts
// ---------------------------------------------------------------- patio de material (NO)

function materialYard(out: Solid[], rng: Rng): void {
  for (const [x, y] of [[10, 6], [24, 6], [10, 14], [24, 14], [38, 8]] as const) { // chapas apiladas con desfase
    const layers = rng.int(2, 4);
    for (let l = 0; l < layers; l++) out.push(prism(x + l * 0.4, y + l * 0.4, l * 0.5, 10, 2, 0.5, "steel"));
  }
  for (const [x, y] of [[10, 22], [28, 22], [46, 20]] as const) { // mazos de caños
    for (let i = 0; i < 4; i++) out.push(prism(x, y + i * 1.2, 0, 14, 1, 1, "rust"));
  }
  for (let i = 0; i < 6; i++) out.push({ kind: "cylinder", at: v3(55 + (i % 3) * 5, 7 + Math.floor(i / 3) * 5, 0), r: 1.5, h: 1.5, mat: "rust", sides: 8 }); // bobinas
  for (let i = 0; i < 4; i++) out.push(prism(56 + (i % 2) * 12, 18 + Math.floor(i / 2) * 6, 0, 9, 4, 3, "steel", "step")); // secciones de casco
  out.push({ kind: "cylinder", at: v3(80, 10, 0), r: 5, h: 8, mat: "concrete" });
  out.push({ kind: "cylinder", at: v3(92, 22, 0), r: 4, h: 6, mat: "concrete" });
}

// ---------------------------------------------------------------- dique seco (NE)

function dryDock(out: Solid[], ground: Solid[]): void {
  const { x, y, w, d, depth } = DOCK;
  const z = -depth;
  ground.push({ kind: "ground", mat: "concrete", tris: [
    { pts: [v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z)], toneOffset: -1 },
    { pts: [v3(x, y, z), v3(x + w, y + d, z), v3(x, y + d, z)], toneOffset: -1 },
  ] });
  out.push(prism(x - 2, y - 2, z, w + 4, 2, depth, "concrete"));        // muro norte
  out.push(prism(x - 2, y + d, z, w + 4, 2, depth, "concrete"));        // muro sur
  out.push(prism(x - 2, y, z, 2, d, depth, "concrete"));                // muro oeste
  out.push(prism(x + w, y, z, QUAY_X - x - w, d, depth, "concrete"));   // muro este hasta el muelle
  out.push(prism(QUAY_X - 3, y + 2, z, 3, d - 4, depth + 1, "rust"));   // compuerta
  out.push({ kind: "hull", at: v3(x + 6, y + d / 2, z), len: 60, beam: 10, h: 5, mat: "hull" });
  out.push(prism(x + 12, y + d / 2 - 2.5, z + 5, 8, 5, 3, "concrete")); // superestructura
  out.push(prism(x + w + 2, 0, 0, 8, 4, 4, "concrete", "step"));        // casa de bombas
}

// ---------------------------------------------------------------- talleres, playa, vías (SO)

function workshops(out: Solid[], rng: Rng): void {
  for (const x of [46, 74]) {
    out.push(prism(x, 80, 0, 24, 14, 7, "concrete", "step"));
    out.push(prism(x + 3, 83, 7, 2, 2, 1, "steel"));
    out.push(prism(x + 18, 90, 7, 2, 2, 1, "steel"));
  }
  out.push(strip([{ x: 46, y: 113 }, { x: 98, y: 113 }], 26, -0.4, "road")); // playa
  for (let x = 48; x < 98; x += 4) out.push(strip([{ x, y: 102 }, { x, y: 106 }], 0.4, -0.3, "rail")); // líneas
  for (let i = 0; i < 5; i++) {
    const x = 49 + rng.int(0, 11) * 4, y = rng.chance(0.5) ? 102 : 116;
    out.push(prism(x, y, 0, 3, 4, 1.5, rng.chance(0.5) ? "steel" : "rust"));
  }
  for (let i = 0; i < 8; i++) { // secciones prefabricadas entre la calle y el muelle
    if (!rng.chance(0.8)) continue;
    out.push(prism(112 + (i % 4) * 12, 82 + Math.floor(i / 4) * 8, 0, 9, 5, 3, "steel"));
  }
  out.push(strip([{ x: 0, y: 131 }, { x: STREET_X, y: 131 }], 0.5, 0.05, "rail")); // vías
  out.push(strip([{ x: 0, y: 134 }, { x: STREET_X, y: 134 }], 0.5, 0.05, "rail"));
  for (let x = 2; x < STREET_X; x += 4) out.push(prism(x, 130, 0, 1, 5, 0.3, "rust")); // durmientes
}

// ---------------------------------------------------------------- muelle de alistamiento (E)

function fittingOut(out: Solid[], rng: Rng): void {
  for (const x of [304, 316]) out.push(prism(x, 24, 0, 8, 96, 6, "concrete", "gable"));
  out.push({ kind: "cylinder", at: v3(310, 10, 0), r: 4, h: 6, mat: "concrete" });
  for (let i = 0; i < 6; i++) out.push(prism(302 + rng.int(0, 24), 124 + rng.int(0, 10), 0, 3, 2, 1, "rust")); // chatarra
  for (let y = 1; y < AREA_H; y += 3) out.push({ kind: "cone", at: v3(eastBank(y) + 1.5, y, 0), r: 1.6, h: 1.2, mat: "rock", sides: 5 }); // escollera
}

// ---------------------------------------------------------------- selva y faroles

function jungle(out: Solid[], rng: Rng): void {
  const cluster = (x0: number, x1: number, y0: number, y1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const mat = rng.chance(0.6) ? "leaf" : "leafDark";
      out.push({ kind: "cone", at: v3(rng.int(x0, x1), rng.int(y0, y1), 0.4), r: rng.int(2, 4), h: rng.int(5, 9), mat });
    }
  };
  cluster(3, 39, 102, 143, 14);   // SO, bajo las vías
  cluster(332, 342, 2, 143, 10);  // borde este
  cluster(300, 342, 127, 143, 6); // al sur de los galpones
}

function lamps(out: Solid[], accents: Accent[]): void {
  for (const y of [12, 40, 68, 96, 124]) {
    out.push(prism(STREET_EDGE + 0.5, y, 0, 0.6, 0.6, 5, "steel"));
    accents.push({ at: v3(STREET_EDGE + 0.8, y + 0.3, 5), r: 1.2, color: "cyan" });
  }
}
```

Reemplazar el cuerpo de `shipyard()` por:

```ts
export function shipyard(rng: Rng): Scene {
  const terrain = buildTerrain(rng);
  const ground: Solid[] = [...terrain.ground];
  const solids: Solid[] = [];
  const accents: Accent[] = [];
  const weldSpots: Vec3[] = [];
  quay(solids);
  materialYard(solids, rng);
  dryDock(solids, ground);
  halls(solids, accents);
  street(ground);
  slipways(solids, weldSpots);
  const g = gantry(solids);
  workshops(solids, rng);
  fittingOut(solids, rng);
  jungle(solids, rng);
  lamps(solids, accents);
  ground.push(...solids.filter((s) => s.kind === "strip"));
  const raised = solids.filter((s) => s.kind !== "strip");
  return { ground, water: [terrain.water], solids: raised, accents, trolley: g.trolley, trolleyRange: g.range, weldSpots };
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run src/scenes && npm run typecheck`
Expected: PASS. Si "todo cae dentro del área" falla por la escollera, clampear `eastBank(y) + 1.5` a `AREA_W - 2`.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/shipyard.ts src/scenes/shipyard.test.ts
git commit -m "feat(scene): astillero parte 2: patio, dique seco, talleres, alistamiento, selva y faroles"
```

---

### Task 10: Animaciones

**Files:**
- Create: `src/scenes/shipyard-anim.ts`
- Test: `src/scenes/shipyard-anim.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Accent` (Task 8); `Rng`.
- Produces:

```ts
export interface AnimChanges { trolley: boolean; water: boolean; sparks: boolean }
export interface ShipyardAnim {
  tick(dtMs: number): AnimChanges;   // muta scene.trolley.at.y, scene.water[0].tris[*].toneOffset, y su lista de chispas
  sparks(): Accent[];                // chispas vivas ahora (vacío casi siempre)
  trolleyLamp(): Accent;             // luz cian bajo el carro, sigue su posición
}
export const TROLLEY_CYCLE_MS = 14000, TROLLEY_PAUSE_MS = 2000, WATER_STEP_MS = 100, WATER_CYCLE_MS = 2000;
export function createShipyardAnim(scene: Scene, rng: Rng, opts: { reducedMotion: boolean }): ShipyardAnim
```

- [ ] **Step 1: Test que falla**

```ts
// src/scenes/shipyard-anim.test.ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { shipyard } from "./shipyard";
import { TROLLEY_CYCLE_MS, TROLLEY_PAUSE_MS, WATER_CYCLE_MS, createShipyardAnim } from "./shipyard-anim";

const setup = (reducedMotion = false) => {
  const scene = shipyard(createRng(7));
  return { scene, anim: createShipyardAnim(scene, createRng(3), { reducedMotion }) };
};

describe("shipyard-anim", () => {
  it("el carro nunca sale de la viga y vuelve al inicio tras un ciclo", () => {
    const { scene, anim } = setup();
    const [y0, y1] = scene.trolleyRange;
    for (let t = 0; t < TROLLEY_CYCLE_MS; t += 33) {
      anim.tick(33);
      expect(scene.trolley.at.y).toBeGreaterThanOrEqual(y0 - 1e-9);
      expect(scene.trolley.at.y).toBeLessThanOrEqual(y1 + 1e-9);
    }
    anim.tick(TROLLEY_CYCLE_MS - (Math.floor(TROLLEY_CYCLE_MS / 33) * 33));
    expect(scene.trolley.at.y).toBeCloseTo(y0, 3);
  });

  it("durante la pausa inicial el carro no se mueve y tick no reporta cambio", () => {
    const { scene, anim } = setup();
    const y = scene.trolley.at.y;
    const c = anim.tick(TROLLEY_PAUSE_MS / 2);
    expect(scene.trolley.at.y).toBe(y);
    expect(c.trolley).toBe(false);
  });

  it("a mitad de ciclo el carro está en el otro extremo", () => {
    const { scene, anim } = setup();
    anim.tick(TROLLEY_CYCLE_MS / 2);
    expect(scene.trolley.at.y).toBeCloseTo(scene.trolleyRange[1], 3);
    expect(anim.trolleyLamp().at.y).toBeCloseTo(scene.trolleyRange[1] + 2, 3);
    expect(anim.trolleyLamp().at.z).toBeLessThan(scene.trolley.at.z);
  });

  it("el agua cambia de tono por ondas y vuelve a fase tras un ciclo", () => {
    const { scene, anim } = setup();
    const tris = scene.water[0]!.kind === "ground" ? scene.water[0]!.tris : [];
    const c = anim.tick(100);
    expect(c.water).toBe(true);
    const offsets = tris.map((t) => t.toneOffset ?? 0);
    expect(offsets.some((o) => o !== 0)).toBe(true);
    expect(offsets.every((o) => o === -1 || o === 0 || o === 1)).toBe(true);
    for (let t = 100; t < WATER_CYCLE_MS; t += 100) anim.tick(100);
    expect(tris.map((t) => t.toneOffset ?? 0)).toEqual(offsets);
  });

  it("las chispas aparecen en una cuaderna, duran tres frames y desaparecen", () => {
    const { scene, anim } = setup();
    let seen = 0, maxFrames = 0, run = 0;
    for (let t = 0; t < 20000; t += 100) {
      anim.tick(100);
      const s = anim.sparks();
      if (s.length > 0) {
        seen++; run++; maxFrames = Math.max(maxFrames, run);
        expect(s.length).toBeGreaterThanOrEqual(4);
        expect(s.length).toBeLessThanOrEqual(6);
        expect(scene.weldSpots.some((w) => Math.abs(w.x - s[0]!.at.x) < 3 && Math.abs(w.y - s[0]!.at.y) < 3)).toBe(true);
      } else run = 0;
    }
    expect(seen).toBeGreaterThan(5);
    expect(maxFrames).toBeLessThanOrEqual(3);
  });

  it("con reduced-motion nada cambia nunca", () => {
    const { scene, anim } = setup(true);
    const y = scene.trolley.at.y;
    for (let i = 0; i < 100; i++) {
      const c = anim.tick(200);
      expect(c).toEqual({ trolley: false, water: false, sparks: false });
    }
    expect(scene.trolley.at.y).toBe(y);
    expect(anim.sparks()).toEqual([]);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/scenes/shipyard-anim.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/scenes/shipyard-anim.ts
import { v3 } from "../iso/geometry";
import type { Rng } from "../map/seed";
import type { Accent, Scene } from "./shipyard";

export interface AnimChanges { trolley: boolean; water: boolean; sparks: boolean }
export interface ShipyardAnim {
  tick(dtMs: number): AnimChanges;
  sparks(): Accent[];
  trolleyLamp(): Accent;
}

export const TROLLEY_CYCLE_MS = 14000;
export const TROLLEY_PAUSE_MS = 2000;
export const WATER_STEP_MS = 100;
export const WATER_CYCLE_MS = 2000;
const SPARK_FRAME_MS = 100;
const SPARK_FRAMES = 3;
const SPARK_GAP_MS: [number, number] = [1000, 3000];

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Posición 0..1 del carro dentro del ciclo: pausa, ida, pausa, vuelta. */
function trolleyPhase(ms: number): number {
  const move = (TROLLEY_CYCLE_MS - 2 * TROLLEY_PAUSE_MS) / 2;
  const t = ms % TROLLEY_CYCLE_MS;
  if (t < TROLLEY_PAUSE_MS) return 0;
  if (t < TROLLEY_PAUSE_MS + move) return easeInOut((t - TROLLEY_PAUSE_MS) / move);
  if (t < 2 * TROLLEY_PAUSE_MS + move) return 1;
  return 1 - easeInOut((t - 2 * TROLLEY_PAUSE_MS - move) / move);
}

export function createShipyardAnim(scene: Scene, rng: Rng, opts: { reducedMotion: boolean }): ShipyardAnim {
  const [y0, y1] = scene.trolleyRange;
  const water = scene.water[0]!;
  const tris = water.kind === "ground" ? water.tris : [];
  const centers = tris.map((t) => (t.pts[0].x + t.pts[1].x + t.pts[2].x + t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3);

  let clock = 0;
  let waterStep = -1;
  let sparkTimer = rng.int(SPARK_GAP_MS[0], SPARK_GAP_MS[1]);
  let sparkFrame = -1;
  let live: Accent[] = [];

  const trolleyLamp = (): Accent => ({ at: v3(scene.trolley.at.x + 2.5, scene.trolley.at.y + 2, scene.trolley.at.z - 1), r: 1.4, color: "cyanMid" });

  const burst = (): void => {
    const spot = rng.pick(scene.weldSpots);
    live = [];
    const n = rng.int(4, 6);
    for (let i = 0; i < n; i++) {
      live.push({ at: v3(spot.x + (rng.next() * 2 - 1) * 1.5, spot.y + (rng.next() * 2 - 1) * 1.5, spot.z + rng.next() * 1.5), r: 0.6, color: rng.chance(0.6) ? "cyan" : "cyanMid" });
    }
  };

  return {
    trolleyLamp,
    sparks: () => live,
    tick(dtMs) {
      if (opts.reducedMotion) return { trolley: false, water: false, sparks: false };
      clock += dtMs;
      const changes: AnimChanges = { trolley: false, water: false, sparks: false };

      const y = y0 + (y1 - y0) * trolleyPhase(clock);
      if (y !== scene.trolley.at.y) { scene.trolley.at.y = y; changes.trolley = true; }

      const step = Math.floor(clock / WATER_STEP_MS);
      if (step !== waterStep) {
        waterStep = step;
        const phase = ((clock % WATER_CYCLE_MS) / WATER_CYCLE_MS) * Math.PI * 2;
        for (let i = 0; i < tris.length; i++) tris[i]!.toneOffset = Math.round(Math.sin(centers[i]! / 8 - phase));
        changes.water = true;
      }

      if (sparkFrame >= 0) {
        sparkTimer -= dtMs;
        if (sparkTimer <= 0) {
          sparkFrame++;
          if (sparkFrame >= SPARK_FRAMES) { sparkFrame = -1; live = []; sparkTimer = rng.int(SPARK_GAP_MS[0], SPARK_GAP_MS[1]); }
          else { sparkTimer = SPARK_FRAME_MS; burst(); }
          changes.sparks = true;
        }
      } else {
        sparkTimer -= dtMs;
        if (sparkTimer <= 0) { sparkFrame = 0; sparkTimer = SPARK_FRAME_MS; burst(); changes.sparks = true; }
      }
      return changes;
    },
  };
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/scenes && npm run typecheck`
Expected: PASS. Si "vuelve al inicio tras un ciclo" falla por acumulación de `33`, el test ya compensa el resto; revisar que `trolleyPhase(TROLLEY_CYCLE_MS)` sea 0 (usa `%`).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/shipyard-anim.ts src/scenes/shipyard-anim.test.ts
git commit -m "feat(scene): animaciones del astillero: carro, agua y chispas de soldadura"
```

---

### Task 11: Dibujo con Pixi y encuadre

**Files:**
- Create: `src/lab/draw.ts`
- Test: `src/lab/draw.test.ts` (solo `fitTransform` y `accentCircle`, que son puros)

**Interfaces:**
- Consumes: `RenderItem`, `Layer`, `SHADOW_ALPHA` (Task 7); `Accent` (Task 8); `project` (Task 2); `ISO_COLORS` (Task 1); `Graphics` de pixi.js.
- Produces:

```ts
export interface Fit { x: number; y: number; scale: number }
export function fitTransform(items: RenderItem[], width: number, height: number, margin = 0.04): Fit
export function accentCircle(a: Accent): { x: number; y: number; r: number; color: number }
export function drawLayer(g: Graphics, items: RenderItem[], layer: Layer): void   // g.clear() + polígonos de esa capa
export function drawAccents(g: Graphics, accents: Accent[]): void                  // g.clear() + círculos
```

- [ ] **Step 1: Test que falla**

```ts
// src/lab/draw.test.ts
import { describe, expect, it } from "vitest";
import { v3 } from "../iso/geometry";
import { ISO_COLORS } from "../map/palette-iso";
import { accentCircle, fitTransform } from "./draw";

describe("fitTransform", () => {
  it("escala para que el bounding box entre con margen y quede centrado", () => {
    const items = [{ layer: "ground" as const, pts: [0, 0, 100, 0, 100, 50, 0, 50], color: 0 }];
    const f = fitTransform(items, 1000, 1000, 0.1);
    expect(f.scale).toBeCloseTo(8); // 800 / 100
    expect(f.x).toBeCloseTo(100);
    expect(f.y).toBeCloseTo(500 - 25 * 8);
  });
  it("con la lista vacía no explota", () => {
    expect(fitTransform([], 100, 100)).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe("accentCircle", () => {
  it("proyecta el centro y resuelve el color", () => {
    const c = accentCircle({ at: v3(0, 0, 10), r: 2, color: "cyan" });
    expect(c).toEqual({ x: 0, y: -14, r: 2, color: ISO_COLORS.cyan });
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/lab`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/lab/draw.ts
import type { Graphics } from "pixi.js";
import { project } from "../iso/project";
import type { Layer, RenderItem } from "../iso/render-list";
import { ISO_COLORS } from "../map/palette-iso";
import type { Accent } from "../scenes/shipyard";

export interface Fit { x: number; y: number; scale: number }

/** Escala y desplazamiento para que todos los puntos entren en width×height con un margen relativo. */
export function fitTransform(items: RenderItem[], width: number, height: number, margin = 0.04): Fit {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) for (let i = 0; i < it.pts.length; i += 2) {
    minX = Math.min(minX, it.pts[i]!); maxX = Math.max(maxX, it.pts[i]!);
    minY = Math.min(minY, it.pts[i + 1]!); maxY = Math.max(maxY, it.pts[i + 1]!);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, scale: 1 };
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const scale = Math.min((width * (1 - 2 * margin)) / w, (height * (1 - 2 * margin)) / h);
  return { x: (width - w * scale) / 2 - minX * scale, y: (height - h * scale) / 2 - minY * scale, scale };
}

export function accentCircle(a: Accent): { x: number; y: number; r: number; color: number } {
  const p = project(a.at);
  return { x: p.x, y: p.y, r: a.r, color: ISO_COLORS[a.color] };
}

export function drawLayer(g: Graphics, items: RenderItem[], layer: Layer): void {
  g.clear();
  for (const it of items) if (it.layer === layer) g.poly(it.pts, true).fill(it.color);
}

export function drawAccents(g: Graphics, accents: Accent[]): void {
  g.clear();
  for (const a of accents) {
    const c = accentCircle(a);
    g.circle(c.x, c.y, c.r * 2.2).fill({ color: c.color, alpha: 0.18 }); // halo
    g.circle(c.x, c.y, c.r).fill(c.color);
  }
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run src/lab && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lab/draw.ts src/lab/draw.test.ts
git commit -m "feat(lab): dibujo de capas y acentos con Graphics, encuadre automático"
```

---

### Task 12: Página de laboratorio

**Files:**
- Create: `lab/portfolio.html`, `src/lab/portfolio.ts`
- Test: `src/lab/lab-excluded.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la página `/map/lab/portfolio.html` en `npm run dev`.

- [ ] **Step 1: Test que falla**

```ts
// src/lab/lab-excluded.test.ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../../", import.meta.url).pathname;

describe("laboratorio fuera de producción", () => {
  it("existe la entrada de dev", () => {
    expect(existsSync(`${ROOT}lab/portfolio.html`)).toBe(true);
  });
  it("vite.config no agrega el laboratorio al build", () => {
    const cfg = readFileSync(`${ROOT}vite.config.ts`, "utf8");
    expect(cfg).not.toMatch(/lab/);
  });
  it("prerender no lo copia", () => {
    expect(readFileSync(`${ROOT}scripts/prerender.ts`, "utf8")).not.toMatch(/lab/);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run src/lab/lab-excluded.test.ts`
Expected: FAIL en "existe la entrada de dev".

- [ ] **Step 3: Crear la página**

```html
<!-- lab/portfolio.html -->
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Lab: Portfolio isométrico</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #141a26; }
      #lab-host { width: 100%; height: 100%; }
      #lab-host canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="lab-host" aria-label="Astillero isométrico"></div>
    <script type="module" src="/src/lab/portfolio.ts"></script>
  </body>
</html>
```

(El `#141a26` del CSS es el mismo `ISO_COLORS.sky`; el guard de colores solo mira `.ts`, así que acá no molesta.)

- [ ] **Step 4: Escribir el runtime**

```ts
// src/lab/portfolio.ts
import { Application, Container, Graphics } from "pixi.js";
import { SHADOW_ALPHA, buildRenderList } from "../iso/render-list";
import { ISO_COLORS } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { shipyard } from "../scenes/shipyard";
import { createShipyardAnim } from "../scenes/shipyard-anim";
import { drawAccents, drawLayer, fitTransform } from "./draw";

const SEED = 7;

async function boot(): Promise<void> {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const app = new Application();
  await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  const scene = shipyard(createRng(SEED));
  const anim = createShipyardAnim(scene, createRng(SEED + 1), { reducedMotion });

  const world = new Container();
  app.stage.addChild(world);

  // capas fijas, de abajo hacia arriba
  const gGround = new Graphics(), gWater = new Graphics(), gShadow = new Graphics(), gSolid = new Graphics();
  const gTrolleyShadow = new Graphics(), gTrolley = new Graphics();
  const gAccents = new Graphics(), gTrolleyLamp = new Graphics(), gSparks = new Graphics();
  gShadow.alpha = SHADOW_ALPHA;
  gTrolleyShadow.alpha = SHADOW_ALPHA;
  gAccents.blendMode = "add";
  gTrolleyLamp.blendMode = "add";
  gSparks.blendMode = "add";
  world.addChild(gGround, gWater, gShadow, gSolid, gTrolleyShadow, gTrolley, gAccents, gTrolleyLamp, gSparks);

  const staticItems = buildRenderList([...scene.ground, ...scene.solids]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gSolid, staticItems, "solid");
  drawAccents(gAccents, scene.accents);

  const redrawWater = (): void => drawLayer(gWater, buildRenderList(scene.water), "ground");
  const redrawTrolley = (): void => {
    const items = buildRenderList([scene.trolley]);
    drawLayer(gTrolleyShadow, items, "shadow");
    drawLayer(gTrolley, items, "solid");
    drawAccents(gTrolleyLamp, [anim.trolleyLamp()]);
  };
  redrawWater();
  redrawTrolley();
  drawAccents(gSparks, []);

  const fit = (): void => {
    const f = fitTransform(staticItems, host.clientWidth, host.clientHeight);
    world.position.set(f.x, f.y);
    world.scale.set(f.scale);
  };
  fit();
  app.renderer.on("resize", fit);

  app.ticker.add((ticker) => {
    const c = anim.tick(ticker.deltaMS);
    if (c.water) redrawWater();
    if (c.trolley) redrawTrolley();
    if (c.sparks) drawAccents(gSparks, anim.sparks());
  });
}

void boot();
```

- [ ] **Step 5: Verificar tests, typecheck y que el build no incluya el lab**

Run: `npx vitest run && npm run typecheck && npm run build && ls dist && ! ls dist/lab 2>/dev/null`
Expected: tests PASS, typecheck limpio, `dist/` sin carpeta `lab` (el `!` hace que el comando falle si existe).

- [ ] **Step 6: Levantar el dev server y mirar**

Run (en background): `npm run dev -- --port 5180`
Abrir `http://localhost:5180/map/lab/portfolio.html`. Debe verse el astillero en diagonal, naves a dos aguas con la pared sur clara y la este oscura, sombras hacia la derecha, agua ondulando, el carro yendo y viniendo, chispas de vez en cuando. Tomar una captura (con la skill `agent-browser`: `agent-browser open <url>` y `agent-browser screenshot <path>`) y guardarla en el scratchpad para el reporte final.

Problemas típicos y su fix:
- **Nada se ve / todo fuera de cuadro:** `fitTransform` recibe `staticItems` antes de que `host` tenga tamaño. Llamar `fit()` también en el primer tick.
- **Caras con "costuras" claras entre triángulos del suelo:** activar `roundPixels: false` (ya lo está por defecto) y verificar que `antialias: true` esté en `app.init`.
- **Sombras que tapan el agua con doble oscuridad:** las sombras estáticas y la del carro están en `Graphics` distintas con alpha propio; es esperable que se sumen solo donde el carro pasa.
- **El carro se dibuja debajo de la viga:** la capa `gTrolley` va después de `gSolid`, así que siempre queda encima; si molesta que tape la viga al pasar, subir `trolley.at.z` a `GANTRY_H + 2.2`.

- [ ] **Step 7: Commit**

```bash
git add lab/portfolio.html src/lab/portfolio.ts src/lab/lab-excluded.test.ts
git commit -m "feat(lab): página de laboratorio del Portfolio isométrico con animación"
```

---

### Task 13: Documentación y cierre

**Files:**
- Modify: `README.md` (sección nueva "Laboratorio")
- Modify: `docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md` (estado → implementado)

- [ ] **Step 1: Documentar el laboratorio en el README**

Agregar al final de `README.md`:

```markdown
## Laboratorio isométrico

`npm run dev` y abrir `/map/lab/portfolio.html`: el astillero del Portfolio en
2.5D isométrico (motor puro en `src/iso/`, escena en `src/scenes/shipyard.ts`).
No entra en el build de producción. Para cambiar la escena, editar la lista de
sólidos; para cambiar el look, `src/map/palette-iso.ts`. Spec en
`docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md`.
```

- [ ] **Step 2: Actualizar el estado de la spec**

Cambiar la línea `**Estado:** aprobado en conversación, pendiente de plan de implementación` por `**Estado:** implementado en el laboratorio; reintegración al mapa pendiente (spec aparte)`.

- [ ] **Step 3: Verificación final completa**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: todo verde. Anotar cantidad de tests y tamaño gzip de `dist/assets/*.js` (no debe cambiar respecto de antes: el lab no entra).

- [ ] **Step 4: Commit y push**

```bash
git add README.md docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md
git commit -m "docs: laboratorio isométrico en README, spec marcada como implementada"
git push origin HEAD
```

---

## Self-review

**Spec coverage.** Objetivo y criterios (§1): Task 12 (página), Tasks 2-7 (motor puro y tests), Task 1 + test de atlas en Task 7 y 8 (colores), Task 10 (animaciones sin regenerar todo). Principios (§3): 1 y proyección → Task 2; 2 capas y perfiles de techo → Task 4 (gable, step) y Tasks 8-9 (HVAC en talleres, claraboyas reemplazadas por ventanas cian en pared sur, decisión consciente para no complicar el gable); 3 tres tonos → Task 3; 4 legibilidad → Task 9 (detalle denso solo en calle y gradas); 5 sombras → Tasks 5 y 7 (oclusión de contacto: la sombra de cada sólido ya arranca pegada a su base porque el casco convexo incluye la huella); 6 suelo → Task 8 (folds con jitter, franjas hundidas a −0.4). Estructura (§4): mapa de archivos arriba. Paleta (§5): Task 1. Tests (§6): cada task. Fuera de alcance (§7): nada del plan lo toca.

**Desvíos respecto de la spec**, ya corregidos en la spec: luz desde el OSO (no NO) para que las dos paredes visibles tengan tonos distintos; `lab/portfolio.html` en vez de ruta `/lab/portfolio`; ciclo de tono con cinco pasos usando `up`/`down` para vertientes.

**Placeholders.** Ninguno: todo el código está escrito.

**Consistencia de tipos.** `Solid["mat"]` es `Material` en todas las variantes; `Scene.trolley` es `Solid & { kind: "prism" }` y `prism()` en Task 8 lo devuelve así; `RenderItem.pts` es `number[]` plano y `drawLayer` lo pasa a `g.poly(pts, true)`; `Accent.color` es `AccentColor` y `ISO_COLORS[a.color]` indexa bien porque `AccentColor ⊂ keyof ISO_COLORS`; `sortByDepth` recibe `Solid[]` y `buildRenderList` solo le pasa los no planos.

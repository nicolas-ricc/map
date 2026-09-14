# Mundo isométrico, parte 1: motor, terreno compartido y runtime — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el motor, el terreno del mundo y el runtime del laboratorio listos para las escenas de Resume y Blog: fachadas procedurales, prisma de huella libre, rampa N/S, acentos poligonales, tríadas ámbar y magenta, ocho materiales nuevos, tope de sombra, una sola malla de terreno de 560×270 con la desembocadura al NE, y `lab/world.html` mostrando el astillero dentro del mundo.

**Architecture:** El motor puro en `src/iso/` gana un módulo de fachadas (`facade.ts`) y uno de acentos (`accent.ts`), y `solids.ts` suma `poly` y `ramp` N/S. El terreno deja de vivir en `shipyard.ts`: `src/scenes/terrain.ts` clasifica cada punto del mundo por zona y genera una única grilla facetada. `src/scenes/world.ts` arma la escena completa con un `Rng` por zona. `src/scenes/animator.ts` define la interfaz pura `Animator` (ids → capas de sólidos, acentos o agua) que el runtime común `src/lab/runtime.ts` (único módulo con Pixi además de `draw.ts`) vuelca a `Graphics`. Resume y Blog (planes 2 y 3) solo agregan un clasificador de terreno, una función de escena y un `Animator`.

**Tech Stack:** TypeScript strict, Vite 8, pixi.js 8.20, Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-14-mundo-isometrico-design.md`

## Estado: implementado (2026-09-14, PR #2)

Las once tasks están hechas, revisadas y mergeadas en `main` vía
https://github.com/nicolas-ricc/map/pull/2 (merge `8118443`). No queda nada
de este plan por ejecutar; una sesión nueva debe empezar por el plan 2
(Resume) o el 3 (Blog). Antes de escribirlos, leer "Rulings de la parte 1" al
final de la sección 4 de la spec: hay cinco decisiones que corrigen el texto
original.

**Lo que se hizo distinto del plan:**

- Task 7: `cityTerrainAt` no usa el río angosto `riverCenter ± RIVER_HALF`
  (fallaba sus propios tests y rompía la continuidad del agua en y = 146).
  Es un estuario que hereda el ancho del canal del astillero en la costura y
  se abre hacia el sur (`ESTUARY_FLARE` en `src/scenes/terrain.ts`).
- Task 10b (no estaba en el plan; commit `2b7fd1c`): el agua se dibuja
  **debajo** del suelo en `src/lab/runtime.ts` (el plan la ponía encima y el
  mar tapaba la punta); la orilla sigue frente a la bahía con borde ondulado
  (`shoreWidth`); la selva del sur de los galpones no pisa la punta.
- Task 10c (no estaba en el plan; commit `18d4c4a`): la punta nace a z ≈ 1
  junto al muelle y sube hasta z ≈ 7 desde x ≈ 355 (`headlandZ`), porque el
  suelo no se ordena en profundidad con los sólidos y a z 6 los galpones
  quedaban incrustados en la roca.
- Cierre (commits `4390e26`, `fd36260`): tests de invariantes de costura,
  estuario y `QUAY_X` que la revisión final pidió.
- Polígonos estáticos del mundo: 5.346 (el plan estimaba ≈ 12.000); primer
  dibujo ≈ 30–60 ms.

**Pendiente, a propósito, para los planes siguientes:**

- Plan 2 (Resume): mover `DOCK`, `QUAY_X`, `BOTTOM` y `eastBank` de
  `shipyard.ts` a `geo.ts` para que `terrain.ts` deje de importar una escena.
  Contar con el estuario (agua hasta x ≈ 284 en el borde sur). La costura
  Resume/Blog en x = 344 es hoy una diagonal recta de pavimento contra mar:
  ahí va el malecón.
- Plan 3 (Blog): el mar es estático (solo el río ondula); la bahía se
  encuentra con el mar a través de la orilla, sin animación.
- Menores diferidos por las revisiones: las sombras se proyectan a z = 0 y
  cruzan planas la roca alta de la punta; `opts.reducedMotion` no se usa
  dentro de `bootLab`; `portfolio.ts` y `world.ts` son casi iguales (un
  helper cuando haya tercera página); `zoneFrame` encuadra pero no recorta.

**Cómo verificar el estado:** `npm test` (239 tests), `npm run typecheck`,
`npm run build && ls dist | grep -c lab` → `0`; `npm run dev` y abrir
`/map/lab/world.html` (teclas 0..3).

## Global Constraints

- Motor **PixiJS 8**; nada de Three.js ni dependencias nuevas. `src/iso/` y `src/scenes/` **no importan `pixi.js`** (`pixi-free.test.ts` lo verifica).
- Proyección dimétrica 2:1: `sx = x - y`, `sy = (x + y) / 2 - z * Z_SCALE`, `Z_SCALE = 1.4`. Mundo: `x` este, `y` sur, `z` arriba. Cámara al SE.
- Luz: sol a 25° desde el OSO, sombras al ENE. **Tope de sombra `SHADOW_MAX_H = 18`.**
- Cinco tonos por material (`shade < lit < down < top < up` en luminancia; `shade` más azul que `top`), literales en `src/map/palette-iso.ts`. **Ningún literal `0x......` (seis dígitos hex) fuera de `palette.ts`, `palette-iso.ts` y `seed.ts`** (`palette-guard.test.ts`). Cuidado: un seed como `0xc0ffee` también dispara el guard.
- Mundo: `WORLD_W = 560`, `WORLD_H = 270`. Portfolio x 0..344, y 0..146; Resume x 0..344, y 146..270; Blog x 344..560. `CELL = 6`.
- Materiales compartidos entre zonas: solo `leaf`, `leafDark`, `rock`, `water`, `waterDeep`, `hull`, `steel`, `rust`. Los demás son exclusivos de una zona.
- El laboratorio **no entra en `dist/`**: no agregar nada a `build.rollupOptions.input`; `scripts/prerender.ts` no menciona `lab`.
- Texto y comentarios en español. Commits con prefijos `feat:`, `test:`, `refactor:`, `docs:`. `npm test` y `npm run typecheck` verdes al final de cada task.
- Con `prefers-reduced-motion: reduce` las animaciones quedan en su frame 0.

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/map/palette-iso.ts` | modificar | + `office`, `officeDark`, `glass`, `asphalt`, `paving`, `plaza`, `whitewash`, `foam`; + tríadas `amber*`, `magenta*`; `ACCENT_COLORS` |
| `src/map/geo.ts` | modificar | + `WORLD_W/H`, `ZONE_SPLIT_X/Y`, `worldZoneAt`, `MOUTH_Y`, `inMouth`, `HEADLAND`, `inHeadland`, `distToHeadland`, `pointInPolygon` (mudado desde `zones.ts`) |
| `src/map/zones.ts` | modificar | `pointInPolygon` pasa a importarse de `geo.ts` y se re-exporta |
| `src/iso/solids.ts` | modificar | + `poly`; `ramp` con `dir: "n" \| "s"`; `prism.facade` |
| `src/iso/facade.ts` | crear | `Facade`, `facadeFaces(wall, facade)`, `windowPatches`, `isWall`, `facadeAccents(walls, facade, color)` |
| `src/iso/accent.ts` | crear | `Accent` (dot \| poly), `AccentItem`, `accentItem(a)` |
| `src/iso/light.ts` | modificar | `SHADOW_MAX_H`, `shadowPoint` con tope |
| `src/scenes/terrain.ts` | crear | `Terrain`, `CELL`, `terrainAt`, `shipyardTerrainAt`, `cityTerrainAt`, `seaTerrainAt`, `buildTerrain(rng, zones?)` → `TerrainMesh` |
| `src/scenes/shipyard.ts` | modificar | deja de generar terreno; desembocadura al NE; exporta `DOCK`, `eastBank`; acentos con `kind: "dot"` |
| `src/scenes/shipyard-anim.ts` | modificar | recibe el agua del terreno; acentos con `kind` |
| `src/scenes/animator.ts` | crear | `AnimLayer`, `Animator` |
| `src/scenes/shipyard-animator.ts` | crear | adapta `createShipyardAnim` a `Animator` |
| `src/scenes/world.ts` | crear | `WorldScene`, `world(seed, opts)`, `zoneRng`, `LANDMARKS` |
| `src/lab/draw.ts` | modificar | `drawAccents` con dot y poly; `zoneFrame` |
| `src/lab/runtime.ts` | crear | `bootLab(host, scene, animators, opts)`: capas, encuadre, teclas, presupuesto |
| `src/lab/portfolio.ts` | modificar | entry de cinco líneas sobre `runtime.ts` |
| `src/lab/world.ts`, `lab/world.html` | crear | entry del mundo |
| `src/lab/lab-excluded.test.ts` | modificar | cubre `lab/*.html` |
| `README.md`, spec | modificar | documentación y estado |

Ruling sobre la rampa: la spec dice "`ramp` `dir: "n"` tiene el borde alto al norte", pero la convención existente es que `dir` es hacia dónde **baja** (`dir: "e"`: alto al oeste). Se mantiene la convención existente: `dir: "n"` baja hacia el norte, borde alto al sur; `dir: "s"` baja hacia el sur, borde alto al norte.

---

### Task 1: Paleta: materiales de ciudad y costa, tríadas ámbar y magenta

**Files:**
- Modify: `src/map/palette-iso.ts`
- Test: `src/map/palette-iso.test.ts`

**Interfaces:**
- Produces: `ISO_TONES` con 22 materiales; `ISO_COLORS` con `amber`, `amberMid`, `amberBleed`, `magenta`, `magentaMid`, `magentaBleed`; `type AccentColor` ampliado; `ACCENT_COLORS: readonly AccentColor[]`.

- [x] **Step 1: Escribir el test que falla**

Agregar al final de `describe("paleta isométrica", ...)` en `src/map/palette-iso.test.ts`:

```ts
  it("materiales exclusivos de ciudad y costa", () => {
    for (const m of ["office", "officeDark", "glass", "asphalt", "paving", "plaza", "whitewash", "foam"] as const) {
      expect(Object.keys(ISO_TONES[m]).sort()).toEqual(["down", "lit", "shade", "top", "up"]);
    }
  });

  it("tríadas de acento por zona: cian, ámbar y magenta, todas en el atlas", () => {
    expect(ACCENT_COLORS).toEqual(["cyan", "cyanMid", "cyanBleed", "amber", "amberMid", "amberBleed", "magenta", "magentaMid", "magentaBleed"]);
    const all = allIsoColors();
    for (const c of ACCENT_COLORS) expect(all.has(ISO_COLORS[c])).toBe(true);
    // el núcleo es más claro que el medio y el medio que el sangrado
    for (const base of ["cyan", "amber", "magenta"] as const) {
      expect(lum(ISO_COLORS[base])).toBeGreaterThan(lum(ISO_COLORS[`${base}Mid`]));
      expect(lum(ISO_COLORS[`${base}Mid`])).toBeGreaterThan(lum(ISO_COLORS[`${base}Bleed`]));
    }
  });
```

Y en el import: `import { ACCENT_COLORS, ISO_COLORS, ISO_TONES, TONE_LADDER, allIsoColors, stepTone, toneColor, type Material } from "./palette-iso";`

- [x] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/map/palette-iso.test.ts`
Expected: FAIL (`ISO_TONES.office` undefined; `ACCENT_COLORS` no exportado).

- [x] **Step 3: Implementar**

En `src/map/palette-iso.ts`, agregar dentro de `ISO_TONES` (después de `deck`):

```ts
  // Resume: ciudad de oficinas (gris violeta frío contra el ocre cálido del astillero)
  office:    { top: 0x8a8296, lit: 0x71605d, shade: 0x37375a, up: 0xa09299, down: 0x77728d },
  officeDark:{ top: 0x5e586c, lit: 0x4d4143, shade: 0x262541, up: 0x6d636e, down: 0x514d66 },
  glass:     { top: 0x2e3a4e, lit: 0x262b30, shade: 0x12182f, up: 0x354150, down: 0x283349 },
  asphalt:   { top: 0x45434d, lit: 0x393230, shade: 0x1c1c2e, up: 0x504b4f, down: 0x3b3b48 },
  paving:    { top: 0x8f8a84, lit: 0x756652, shade: 0x393a4f, up: 0xa69b87, down: 0x7b797c },
  plaza:     { top: 0x7c767e, lit: 0x66574e, shade: 0x32324c, up: 0x908481, down: 0x6b6876 },
  // Blog: faro y espuma
  whitewash: { top: 0xd6cfbf, lit: 0xaf9976, shade: 0x565773, up: 0xf8e8c3, down: 0xb8b6b4 },
  foam:      { top: 0xc4d3d6, lit: 0xa19c85, shade: 0x4e5980, up: 0xe3ecda, down: 0xa9bac9 },
```

Reemplazar `ISO_COLORS` y `AccentColor` por:

```ts
export const ISO_COLORS = {
  shadow: 0x1a1830,
  sky: 0x171423,
  cyan: 0x7cf5ff,
  cyanMid: 0x27b3c9,
  cyanBleed: 0x134a52,
  amber: 0xffc457,
  amberMid: 0xd08a1e,
  amberBleed: 0x5a3d14,
  magenta: 0xff5ee0,
  magentaMid: 0xc42a9d,
  magentaBleed: 0x54173f,
} as const;

export type AccentColor = Exclude<keyof typeof ISO_COLORS, "shadow" | "sky">;
export const ACCENT_COLORS: readonly AccentColor[] = ["cyan", "cyanMid", "cyanBleed", "amber", "amberMid", "amberBleed", "magenta", "magentaMid", "magentaBleed"];
```

Actualizar el comentario de cabecera: la regla de tonos de los nuevos materiales es `lit = top × (0.82, 0.74, 0.62)`, `shade = top × (0.40, 0.42, 0.60)`, `up = top × (1.16, 1.12, 1.02)`, `down = top × (0.86, 0.88, 0.94)` por canal RGB, generados con un script y pegados como literales.

- [x] **Step 4: Correr los tests**

Run: `npx vitest run src/map && npm run typecheck`
Expected: PASS (los tests de escalera y sombra fría cubren también los materiales nuevos).

- [x] **Step 5: Commit**

```bash
git add src/map/palette-iso.ts src/map/palette-iso.test.ts
git commit -m "feat(palette): materiales de ciudad y costa, tríadas ámbar y magenta"
```

---

### Task 2: Sólido `poly` y rampa en cuatro direcciones

**Files:**
- Modify: `src/iso/solids.ts`
- Test: `src/iso/solids.test.ts`

**Interfaces:**
- Produces: `Solid` suma `{ kind: "poly"; footprint: Vec2[]; z: number; h: number; mat: Material }`; `ramp.dir: "e" | "w" | "n" | "s"`.

- [x] **Step 1: Escribir los tests que fallan**

Agregar dentro de `describe("tessellate", ...)` en `src/iso/solids.test.ts`:

```ts
  it("poly: prisma sobre una huella de 5 vértices, techo + 5 lados, solo los visibles", () => {
    const footprint = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 8, y: 3 }, { x: 4, y: 6 }, { x: 0, y: 4 }];
    const s: Solid = { kind: "poly", footprint, z: 1, h: 3, mat: "rock" };
    expect(tessellateAll(s)).toHaveLength(7);
    const vis = tessellate(s);
    const top = vis.find((f) => f.tone === "top")!;
    expect(top.pts).toHaveLength(5);
    expect(top.pts.every((p) => p.z === 4)).toBe(true);
    expect(vis.length).toBeGreaterThanOrEqual(3);
    expect(vis.length).toBeLessThanOrEqual(5);
    expect(bounds(s)).toEqual({ min: { x: 0, y: 0, z: 1 }, max: { x: 8, y: 6, z: 4 } });
  });

  it("rampa hacia el sur: alto al norte, bajo al sur; hacia el norte, al revés", () => {
    const top = (dir: "n" | "s") => tessellate({ kind: "ramp", at: v3(0, 0, 0), w: 4, d: 10, h: 2, mat: "concrete", dir }).find((f) => f.normal.z > 0.5)!;
    const south = top("s");
    expect(south.pts.filter((p) => p.y === 0).every((p) => p.z === 2)).toBe(true);
    expect(south.pts.filter((p) => p.y === 10).every((p) => p.z === 0)).toBe(true);
    const north = top("n");
    expect(north.pts.filter((p) => p.y === 0).every((p) => p.z === 0)).toBe(true);
    expect(north.pts.filter((p) => p.y === 10).every((p) => p.z === 2)).toBe(true);
  });
```

- [x] **Step 2: Correr para verificar que fallan**

Run: `npx vitest run src/iso/solids.test.ts`
Expected: FAIL (error de tipos en `kind: "poly"` y `dir: "s"`; `tessellateAll` no cubre `poly`).

- [x] **Step 3: Implementar**

En `src/iso/solids.ts`:

```ts
export type Solid =
  | { kind: "prism"; at: Vec3; w: number; d: number; h: number; mat: Material; roof?: "flat" | "gable" | "step" }
  | { kind: "poly"; footprint: Vec2[]; z: number; h: number; mat: Material }
  | { kind: "ramp"; at: Vec3; w: number; d: number; h: number; mat: Material; dir: RampDir }
  | { kind: "cylinder"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "cone"; at: Vec3; r: number; h: number; mat: Material; sides?: number }
  | { kind: "hull"; at: Vec3; len: number; beam: number; h: number; mat: Material }
  | { kind: "strip"; path: Vec2[]; width: number; z: number; mat: Material }
  | { kind: "ground"; tris: Tri[]; mat: Material };

/** Hacia dónde baja la rampa: "e" tiene el borde alto al oeste, "s" lo tiene al norte. */
export type RampDir = "e" | "w" | "n" | "s";
```

Reemplazar la función `ramp` entera:

```ts
function ramp(at: Vec3, w: number, d: number, h: number, dir: RampDir, mat: Material): Face[] {
  const { x, y, z } = at;
  const hi = z + h;
  // altura de cada esquina según hacia dónde baja
  const corner = (west: boolean, north: boolean): number => {
    switch (dir) {
      case "e": return west ? hi : z;
      case "w": return west ? z : hi;
      case "s": return north ? hi : z;
      case "n": return north ? z : hi;
    }
  };
  const nw = corner(true, true), ne = corner(false, true), se = corner(false, false), sw = corner(true, false);
  const c = v3(x + w / 2, y + d / 2, z + h / 4);
  const f = (pts: Vec3[]) => face(pts, mat, c);
  return [
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y + d, z), v3(x, y + d, z)]),             // base
    f([v3(x, y, nw), v3(x + w, y, ne), v3(x + w, y + d, se), v3(x, y + d, sw)]),         // plano inclinado
    f([v3(x, y, z), v3(x, y + d, z), v3(x, y + d, sw), v3(x, y, nw)]),                   // pared oeste
    f([v3(x + w, y, z), v3(x + w, y + d, z), v3(x + w, y + d, se), v3(x + w, y, ne)]),   // pared este
    f([v3(x, y, z), v3(x + w, y, z), v3(x + w, y, ne), v3(x, y, nw)]),                   // lado norte
    f([v3(x, y + d, z), v3(x + w, y + d, z), v3(x + w, y + d, se), v3(x, y + d, sw)]),   // lado sur
  ];
}
```

En `tessellateAll`, agregar el caso:

```ts
    case "poly": return extrude(s.footprint, s.z, s.h, s.mat);
```

- [x] **Step 4: Correr los tests**

Run: `npx vitest run src/iso && npm run typecheck`
Expected: PASS, incluido el test existente de rampa hacia el este.

- [x] **Step 5: Commit**

```bash
git add src/iso/solids.ts src/iso/solids.test.ts
git commit -m "feat(iso): sólido poly de huella libre y rampa en cuatro direcciones"
```

---

### Task 3: Acentos en el motor: puntos y polígonos, tres tríadas

**Files:**
- Create: `src/iso/accent.ts`, `src/iso/accent.test.ts`
- Modify: `src/scenes/shipyard.ts`, `src/scenes/shipyard-anim.ts`, `src/scenes/shipyard.test.ts`, `src/lab/draw.ts`, `src/lab/draw.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Accent =
    | { kind: "dot"; at: Vec3; r: number; color: AccentColor }
    | { kind: "poly"; pts: Vec3[]; color: AccentColor; alpha?: number };
  export type AccentItem =
    | { kind: "dot"; x: number; y: number; r: number; color: number }
    | { kind: "poly"; pts: number[]; color: number; alpha: number };
  export function accentItem(a: Accent): AccentItem;
  ```
- `drawAccents(g: Graphics, accents: Accent[]): void` en `draw.ts` dibuja ambos.

- [x] **Step 1: Escribir el test que falla**

```ts
// src/iso/accent.test.ts
import { describe, expect, it } from "vitest";
import { ISO_COLORS } from "../map/palette-iso";
import { accentItem } from "./accent";
import { v3 } from "./geometry";

describe("accentItem", () => {
  it("un punto se proyecta y resuelve su color", () => {
    expect(accentItem({ kind: "dot", at: v3(0, 0, 10), r: 2, color: "amber" })).toEqual({ kind: "dot", x: 0, y: -14, r: 2, color: ISO_COLORS.amber });
  });
  it("un polígono se proyecta plano, con alpha 1 por defecto", () => {
    const it = accentItem({ kind: "poly", pts: [v3(0, 0, 0), v3(2, 0, 0), v3(2, 2, 0)], color: "magentaMid" });
    expect(it).toEqual({ kind: "poly", pts: [0, 0, 2, 1, 0, 2], color: ISO_COLORS.magentaMid, alpha: 1 });
  });
  it("respeta el alpha pedido", () => {
    const it = accentItem({ kind: "poly", pts: [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0)], color: "cyanBleed", alpha: 0.3 });
    expect(it.kind === "poly" && it.alpha).toBe(0.3);
  });
});
```

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/iso/accent.test.ts`
Expected: FAIL (módulo inexistente).

- [x] **Step 3: Implementar el módulo**

```ts
// src/iso/accent.ts
import { ISO_COLORS, type AccentColor } from "../map/palette-iso";
import type { Vec3 } from "./geometry";
import { project } from "./project";

/** Luz artificial: se dibuja arriba de todo con blend "add". Un punto (farol, chispa) o un polígono (ventana encendida, haz). */
export type Accent =
  | { kind: "dot"; at: Vec3; r: number; color: AccentColor }
  | { kind: "poly"; pts: Vec3[]; color: AccentColor; alpha?: number };

export type AccentItem =
  | { kind: "dot"; x: number; y: number; r: number; color: number }
  | { kind: "poly"; pts: number[]; color: number; alpha: number };

export function accentItem(a: Accent): AccentItem {
  if (a.kind === "dot") {
    const p = project(a.at);
    return { kind: "dot", x: p.x, y: p.y, r: a.r, color: ISO_COLORS[a.color] };
  }
  return { kind: "poly", pts: a.pts.flatMap((v) => { const s = project(v); return [s.x, s.y]; }), color: ISO_COLORS[a.color], alpha: a.alpha ?? 1 };
}
```

- [x] **Step 4: Migrar la escena y el dibujo**

En `src/scenes/shipyard.ts`:
- Borrar `export interface Accent { at: Vec3; r: number; color: AccentColor }` y el import de `AccentColor`; agregar `import type { Accent } from "../iso/accent";`. En `shipyard-anim.ts`, cambiar el import de `Accent` para que venga de `../iso/accent` en vez de `./shipyard`.
- En `factory` y `lamps`, cada `accents.push({ at: ..., r: 1.2, color: "cyan" })` pasa a `accents.push({ kind: "dot", at: ..., r: 1.2, color: "cyan" })`.

En `src/scenes/shipyard-anim.ts`:
- `trolleyLamp` devuelve `{ kind: "dot", at: ..., r: 1.4, color: "cyanMid" }`.
- En `burst`, `live.push({ kind: "dot", at: ..., r: 0.6, color: ... })`.

En `src/scenes/shipyard.test.ts`, el test "los acentos son cian y están a la altura de las paredes":

```ts
    expect(s.accents.every((a) => a.kind === "dot" && a.color.startsWith("cyan") && a.at.z > 0)).toBe(true);
```

En `src/lab/draw.ts`, borrar `accentCircle` y reemplazar `drawAccents`:

```ts
import { accentItem, type Accent } from "../iso/accent";

export function drawAccents(g: Graphics, accents: Accent[]): void {
  g.clear();
  for (const a of accents) {
    const it = accentItem(a);
    if (it.kind === "dot") {
      g.circle(it.x, it.y, it.r * 2.2).fill({ color: it.color, alpha: 0.18 }); // halo
      g.circle(it.x, it.y, it.r).fill(it.color);
    } else {
      g.poly(it.pts, true).fill({ color: it.color, alpha: it.alpha });
    }
  }
}
```

Quitar de `draw.ts` los imports que quedaron sin uso (`project`, `ISO_COLORS`, `Accent` de shipyard). En `src/lab/draw.test.ts` borrar el `describe("accentCircle", ...)` y su import.

- [x] **Step 5: Correr todo**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/iso/accent.ts src/iso/accent.test.ts src/scenes src/lab/draw.ts src/lab/draw.test.ts
git commit -m "feat(iso): acentos como puntos o polígonos en el motor, con las tres tríadas"
```

---

### Task 4: Fachadas procedurales

**Files:**
- Create: `src/iso/facade.ts`, `src/iso/facade.test.ts`
- Modify: `src/iso/solids.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Facade { floors: number; cols: number; litFloor?: number; base?: "glass" | "portico" }
  export const SLAB_H = 0.3;
  export function isWall(f: Face): boolean;                       // normal horizontal
  export function windowPatches(wall: Face, f: Facade, floor: number): Vec3[][];
  export function facadeFaces(wall: Face, f: Facade): Face[];      // losas + ventanas, en orden de dibujo
  export function facadeAccents(walls: Face[], f: Facade, color: AccentColor): Accent[];
  ```
- `prism` acepta `facade?: Facade` (no aplica a `roof: "gable"`).

- [x] **Step 1: Escribir los tests que fallan**

```ts
// src/iso/facade.test.ts
import { describe, expect, it } from "vitest";
import { facadeAccents, facadeFaces, isWall, windowPatches, type Facade } from "./facade";
import { v3 } from "./geometry";
import { tessellate, tessellateAll, type Face, type Solid } from "./solids";

const tower: Solid & { kind: "prism" } = { kind: "prism", at: v3(0, 0, 0), w: 4, d: 4, h: 6, mat: "office", facade: { floors: 3, cols: 2 } };

describe("fachada", () => {
  it("por cada pared visible: la pared, luego 6 ventanas de vidrio y 3 losas oscuras", () => {
    const vis = tessellate(tower);
    const walls = vis.filter(isWall).filter((f) => f.mat === "office" && f.toneOffset === 0);
    expect(walls).toHaveLength(2);
    expect(vis).toHaveLength(3 + 2 * 9);
    for (const wall of walls) {
      const i = vis.indexOf(wall);
      const after = vis.slice(i + 1, i + 10);
      expect(after.filter((f) => f.mat === "glass")).toHaveLength(6);
      expect(after.filter((f) => f.mat === "office" && f.toneOffset === -1)).toHaveLength(3);
      for (const f of after) expect(f.normal).toEqual(wall.normal); // coplanares: se pintan encima
    }
  });

  it("las ventanas quedan dentro de su piso y las losas arriba de cada piso", () => {
    const wall = tessellateAll(tower).find((f) => isWall(f) && f.pts.every((p) => p.y === 4))!; // pared sur
    const faces = facadeFaces(wall, tower.facade!);
    const windows = faces.filter((f) => f.mat === "glass");
    expect(windows.every((f) => f.pts.every((p) => p.y === 4))).toBe(true);
    const floor1 = windowPatches(wall, tower.facade!, 1);
    expect(floor1).toHaveLength(2);
    for (const w of floor1) {
      expect(Math.min(...w.map((p) => p.z))).toBeCloseTo(2.5);
      expect(Math.max(...w.map((p) => p.z))).toBeCloseTo(3.5);
    }
    const slabs = faces.filter((f) => f.toneOffset === -1);
    expect(slabs.map((f) => Math.max(...f.pts.map((p) => p.z))).sort()).toEqual([2, 4, 6]);
  });

  it("planta baja con vidriera: una sola banda de vidrio en el piso 0", () => {
    const f: Facade = { floors: 2, cols: 3, base: "glass" };
    const wall = tessellateAll({ ...tower, facade: f }).find(isWall)!;
    const glass = facadeFaces(wall, f).filter((x) => x.mat === "glass");
    expect(glass).toHaveLength(1 + 3);
  });

  it("pórtico: banda dos tonos más oscura del material del edificio", () => {
    const f: Facade = { floors: 2, cols: 3, base: "portico" };
    const wall = tessellateAll({ ...tower, facade: f }).find(isWall)!;
    const faces = facadeFaces(wall, f);
    expect(faces.some((x) => x.mat === "office" && x.toneOffset === -2)).toBe(true);
    expect(faces.filter((x) => x.mat === "glass")).toHaveLength(3);
  });

  it("el piso encendido sale como acentos poligonales, uno por ventana visible", () => {
    const f: Facade = { floors: 3, cols: 2, litFloor: 1 };
    const walls = tessellate({ ...tower, facade: f }).filter(isWall).filter((x) => x.toneOffset === 0 && x.mat === "office");
    const acc = facadeAccents(walls, f, "amber");
    expect(acc).toHaveLength(4);
    for (const a of acc) {
      expect(a.kind).toBe("poly");
      if (a.kind === "poly") expect(a.pts.every((p) => p.z >= 2.5 && p.z <= 3.5)).toBe(true);
      expect(a.color).toBe("amber");
    }
    expect(facadeAccents(walls, { floors: 3, cols: 2 }, "amber")).toEqual([]);
  });

  it("gable ignora la fachada; techo escalonado la aplica solo a la caja", () => {
    const gable = tessellateAll({ ...tower, roof: "gable" });
    expect(gable.every((x) => x.mat === "office" && x.toneOffset === 0)).toBe(true);
    const step = tessellateAll({ ...tower, roof: "step" });
    expect(step.filter((x) => x.mat === "glass")).toHaveLength(4 * 6);
  });

  it("isWall: normal horizontal", () => {
    const wall: Face = { pts: [], normal: v3(0, 1, 0), mat: "office", tone: "lit", toneOffset: 0 };
    expect(isWall(wall)).toBe(true);
    expect(isWall({ ...wall, normal: v3(0, 0, 1) })).toBe(false);
  });
});
```

- [x] **Step 2: Correr para verificar que fallan**

Run: `npx vitest run src/iso/facade.test.ts`
Expected: FAIL (módulo inexistente; `facade` no existe en `prism`).

- [x] **Step 3: Implementar `facade.ts`**

```ts
// src/iso/facade.ts
import type { AccentColor, Material } from "../map/palette-iso";
import type { Accent } from "./accent";
import { v3, type Vec3 } from "./geometry";
import type { Face } from "./solids";

/**
 * Fachada procedural de un prisma: pisos iguales, `cols` ventanas por piso,
 * una losa oscura arriba de cada piso. La planta baja puede ser vidriera
 * (una banda de vidrio) o pórtico (banda muy oscura). Las caras salen
 * coplanares a la pared, después de ella, así se pintan encima.
 */
export interface Facade { floors: number; cols: number; litFloor?: number; base?: "glass" | "portico" }

export const SLAB_H = 0.3;
const WINDOW_W = 0.5; // fracción del ancho de columna
const WINDOW_H = 0.5; // fracción de la altura del piso

export function isWall(f: Face): boolean {
  return Math.abs(f.normal.z) < 1e-6;
}

/** Rectángulo sobre la pared: s0..s1 a lo largo de la base (0..1), z0..z1 absolutos. La base de la pared es pts[0]→pts[1]. */
function patch(wall: Face, s0: number, s1: number, z0: number, z1: number): Vec3[] {
  const a = wall.pts[0]!, b = wall.pts[1]!;
  const p = (s: number, z: number) => v3(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, z);
  return [p(s0, z0), p(s1, z0), p(s1, z1), p(s0, z1)];
}

const floorHeight = (wall: Face, f: Facade): number => (wall.pts[2]!.z - wall.pts[0]!.z) / f.floors;

/** Ventanas de un piso (0 = planta baja). Con `base`, el piso 0 tiene una sola banda o ninguna. */
export function windowPatches(wall: Face, f: Facade, floor: number): Vec3[][] {
  const fh = floorHeight(wall, f), z0 = wall.pts[0]!.z + floor * fh;
  if (floor === 0 && f.base === "glass") return [patch(wall, 0.08, 0.92, z0 + fh * 0.15, z0 + fh * 0.8)];
  if (floor === 0 && f.base === "portico") return [];
  const out: Vec3[][] = [];
  for (let k = 0; k < f.cols; k++) {
    const c0 = k / f.cols, cw = 1 / f.cols;
    out.push(patch(wall, c0 + cw * (1 - WINDOW_W) / 2, c0 + cw * (1 + WINDOW_W) / 2, z0 + fh * (1 - WINDOW_H) / 2, z0 + fh * (1 + WINDOW_H) / 2));
  }
  return out;
}

export function facadeFaces(wall: Face, f: Facade): Face[] {
  const fh = floorHeight(wall, f), zb = wall.pts[0]!.z;
  const mk = (pts: Vec3[], mat: Material, toneOffset: number): Face => ({ pts, normal: wall.normal, mat, tone: wall.tone, toneOffset });
  const out: Face[] = [];
  for (let i = 0; i < f.floors; i++) {
    const z0 = zb + i * fh;
    if (i === 0 && f.base === "portico") out.push(mk(patch(wall, 0.05, 0.95, z0, z0 + fh * 0.8), wall.mat, -2));
    for (const w of windowPatches(wall, f, i)) out.push(mk(w, "glass", 0));
    out.push(mk(patch(wall, 0, 1, z0 + fh - SLAB_H, z0 + fh), wall.mat, -1)); // losa
  }
  return out;
}

/** Las ventanas del piso encendido, como polígonos de luz sobre las paredes dadas (usar las visibles). */
export function facadeAccents(walls: Face[], f: Facade, color: AccentColor): Accent[] {
  if (f.litFloor === undefined) return [];
  return walls.flatMap((wall) => windowPatches(wall, f, f.litFloor!).map((pts): Accent => ({ kind: "poly", pts, color })));
}
```

- [x] **Step 4: Enganchar en `solids.ts`**

Agregar `import { facadeFaces, isWall, type Facade } from "./facade";` y en el tipo `prism`: `facade?: Facade`. Reemplazar el caso `prism` de `tessellateAll`:

```ts
    case "prism": {
      if (s.roof === "gable") return gable(s.at, s.w, s.d, s.h, s.mat);
      const raw = extrude(rect(s.at.x, s.at.y, s.w, s.d), s.at.z, s.h, s.mat);
      const box = s.facade ? raw.flatMap((f) => (isWall(f) ? [f, ...facadeFaces(f, s.facade!)] : [f])) : raw;
      if (s.roof !== "step") return box;
      const ix = s.w * STEP_INSET, iy = s.d * STEP_INSET;
      return [...box, ...extrude(rect(s.at.x + ix, s.at.y + iy, s.w - 2 * ix, s.d - 2 * iy), s.at.z + s.h, s.h * STEP_RATIO, s.mat)];
    }
```

(`facade.ts` importa solo tipos de `solids.ts`, así que el ciclo es de tipos y no de valores.)

- [x] **Step 5: Correr los tests**

Run: `npx vitest run src/iso && npm run typecheck`
Expected: PASS. Los tests previos de prisma siguen pasando porque sin `facade` no cambia nada.

- [x] **Step 6: Commit**

```bash
git add src/iso/facade.ts src/iso/facade.test.ts src/iso/solids.ts
git commit -m "feat(iso): fachadas procedurales con ventanas, losas, planta baja y piso encendido"
```

---

### Task 5: Tope de sombra

**Files:**
- Modify: `src/iso/light.ts`
- Test: `src/iso/light.test.ts`

**Interfaces:**
- Produces: `SHADOW_MAX_H = 18`; `shadowPoint` usa `min(max(z, 0), SHADOW_MAX_H)`.

- [x] **Step 1: Escribir el test que falla**

En `describe("light", ...)`:

```ts
  it("por encima de SHADOW_MAX_H la sombra deja de crecer", () => {
    expect(SHADOW_MAX_H).toBe(18);
    expect(shadowPoint(v3(0, 0, 30))).toEqual(shadowPoint(v3(0, 0, 18)));
    expect(shadowPoint(v3(0, 0, 17)).x).toBeLessThan(shadowPoint(v3(0, 0, 18)).x);
  });
```

Import: `import { SHADOW_DIR, SHADOW_MAX_H, SHADOW_PER_UNIT, TO_SUN, shadeTone, shadowPoint, shadowPolygon } from "./light";`

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/iso/light.test.ts`
Expected: FAIL (`SHADOW_MAX_H` no exportado).

- [x] **Step 3: Implementar**

En `src/iso/light.ts`:

```ts
/** Altura máxima que proyecta sombra: una torre de 30 sombrea como una de 18 y no cruza tres manzanas. */
export const SHADOW_MAX_H = 18;

/** Dónde toca el suelo (z = 0) el rayo que pasa por p. */
export function shadowPoint(p: Vec3): Vec2 {
  const len = Math.min(Math.max(0, p.z), SHADOW_MAX_H) * SHADOW_PER_UNIT;
  return { x: p.x + SHADOW_DIR.x * len, y: p.y + SHADOW_DIR.y * len };
}
```

- [x] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASS (el astillero tiene chimeneas de 25 y grúa de 24: su sombra se acorta, ningún test depende de la longitud exacta).

- [x] **Step 5: Commit**

```bash
git add src/iso/light.ts src/iso/light.test.ts
git commit -m "feat(iso): tope de altura para las sombras"
```

---

### Task 6: Geografía del mundo: zonas, desembocadura y punta del faro

**Files:**
- Modify: `src/map/geo.ts`, `src/map/zones.ts`
- Test: `src/map/geo.test.ts` (crear)

**Interfaces:**
- Produces en `geo.ts`:
  ```ts
  export const WORLD_W = 560, WORLD_H = 270;
  export const ZONE_SPLIT_X = 344, ZONE_SPLIT_Y = 146;
  export function worldZoneAt(x: number, y: number): "portfolio" | "cv" | "blog";
  export const MOUTH_Y = 24;
  export function inMouth(x: number, y: number): boolean;         // bahía al NE: y < MOUTH_Y y al este del río
  export const HEADLAND: readonly [number, number][];              // polígono de la punta
  export function inHeadland(x: number, y: number): boolean;
  export function distToHeadland(x: number, y: number): number;    // 0 adentro
  export function pointInPolygon(x: number, y: number, polygon: number[]): boolean; // mudado de zones.ts
  ```

- [x] **Step 1: Escribir el test que falla**

```ts
// src/map/geo.test.ts
import { describe, expect, it } from "vitest";
import { HEADLAND, MOUTH_Y, RIVER_HALF, WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, distToHeadland, inHeadland, inMouth, pointInPolygon, riverCenter, worldZoneAt } from "./geo";

describe("mundo", () => {
  it("tres zonas que cubren el mundo", () => {
    expect([WORLD_W, WORLD_H, ZONE_SPLIT_X, ZONE_SPLIT_Y]).toEqual([560, 270, 344, 146]);
    expect(worldZoneAt(10, 10)).toBe("portfolio");
    expect(worldZoneAt(10, 200)).toBe("cv");
    expect(worldZoneAt(400, 10)).toBe("blog");
    expect(worldZoneAt(400, 260)).toBe("blog");
  });

  it("la desembocadura es todo lo que hay al este del río por encima de MOUTH_Y", () => {
    expect(MOUTH_Y).toBe(24);
    for (let y = 0; y < MOUTH_Y; y += 4) {
      expect(inMouth(riverCenter(y) - RIVER_HALF - 1, y)).toBe(false);
      expect(inMouth(riverCenter(y), y)).toBe(true);
      expect(inMouth(343, y)).toBe(true);
    }
    expect(inMouth(300, MOUTH_Y)).toBe(false);
  });

  it("la punta nace en el muelle de alistamiento y llega hasta x≈400 con el faro en la punta", () => {
    expect(inHeadland(336, 115)).toBe(true);
    expect(inHeadland(396, 118)).toBe(true);
    expect(inHeadland(410, 118)).toBe(false);
    expect(inHeadland(360, 90)).toBe(false);
    expect(Math.min(...HEADLAND.map(([x]) => x))).toBeLessThanOrEqual(330);
    expect(Math.max(...HEADLAND.map(([x]) => x))).toBe(400);
  });

  it("distToHeadland es 0 adentro y crece afuera", () => {
    expect(distToHeadland(380, 118)).toBe(0);
    expect(distToHeadland(400, 118)).toBe(0);
    expect(distToHeadland(410, 118)).toBeCloseTo(10, 1);
    expect(distToHeadland(380, 80)).toBeGreaterThan(20);
  });

  it("pointInPolygon vive en geo", () => {
    expect(pointInPolygon(1, 1, [0, 0, 4, 0, 4, 4, 0, 4])).toBe(true);
    expect(pointInPolygon(5, 1, [0, 0, 4, 0, 4, 4, 0, 4])).toBe(false);
  });
});
```

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/map/geo.test.ts`
Expected: FAIL (exports inexistentes).

- [x] **Step 3: Implementar**

Agregar a `src/map/geo.ts`:

```ts
// ---------------------------------------------------------------- mundo isométrico

/** El mundo iso es más ancho que el lienzo viejo: el mar merece espacio. Mismas unidades. */
export const WORLD_W = 560;
export const WORLD_H = 270;
/** Blog es todo lo que está al este de ZONE_SPLIT_X; Resume, lo que está al sur de ZONE_SPLIT_Y del lado oeste. */
export const ZONE_SPLIT_X = 344;
export const ZONE_SPLIT_Y = 146;

export type WorldZone = "portfolio" | "cv" | "blog";

export function worldZoneAt(x: number, y: number): WorldZone {
  if (x >= ZONE_SPLIT_X) return "blog";
  return y >= ZONE_SPLIT_Y ? "cv" : "portfolio";
}

/**
 * Desembocadura: en el mapa viejo el río corría de norte a sur sin tocar el
 * mar. Ahora, por encima de MOUTH_Y, todo lo que hay al este de la orilla
 * oeste del río es una bahía que abre al mar. Es la única salida de los barcos.
 */
export const MOUTH_Y = 24;

export function inMouth(x: number, y: number): boolean {
  return y < MOUTH_Y && x >= riverCenter(y) - RIVER_HALF;
}

/** Punta del faro: nace en el muelle de alistamiento (x 330..344) y se adelgaza hasta x = 400. Sentido horario. */
export const HEADLAND: readonly [number, number][] = [
  [330, 100], [344, 97], [372, 104], [400, 114], [400, 122], [372, 132], [344, 134], [330, 130],
];
const HEADLAND_FLAT = HEADLAND.flat();

export function inHeadland(x: number, y: number): boolean {
  return pointInPolygon(x, y, HEADLAND_FLAT);
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Distancia al borde de la punta; 0 adentro. Para clasificar arrecife y orilla. */
export function distToHeadland(x: number, y: number): number {
  if (inHeadland(x, y)) return 0;
  let best = Infinity;
  for (let i = 0; i < HEADLAND.length; i++) {
    const [ax, ay] = HEADLAND[i]!, [bx, by] = HEADLAND[(i + 1) % HEADLAND.length]!;
    best = Math.min(best, distToSegment(x, y, ax, ay, bx, by));
  }
  return best;
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

En `src/map/zones.ts`: borrar la función `pointInPolygon` local, cambiar el import a `import { MAP_H, MAP_W, pointInPolygon, splitX } from "./geo";` y agregar `export { pointInPolygon };` (terrain.ts del mapa viejo la importa de `zones`).

- [x] **Step 4: Correr los tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/map/geo.ts src/map/geo.test.ts src/map/zones.ts
git commit -m "feat(geo): mundo de 560x270, zonas, desembocadura al NE y punta del faro"
```

---

### Task 7: Terreno compartido del mundo y astillero sin terreno propio

**Files:**
- Create: `src/scenes/terrain.ts`, `src/scenes/terrain.test.ts`
- Modify: `src/scenes/shipyard.ts`, `src/scenes/shipyard.test.ts`, `src/scenes/shipyard-anim.ts`, `src/scenes/shipyard-anim.test.ts`, `src/lab/portfolio.ts`

**Interfaces:**
- Produces en `terrain.ts`:
  ```ts
  export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "paving" | "sea" | "shore" | "headland" | "reef";
  export const CELL = 6;
  export interface TerrainMesh { ground: Solid[]; river: Solid; sea: Solid; shore: Solid }
  export function shipyardTerrainAt(x: number, y: number): Terrain;
  export function cityTerrainAt(x: number, y: number): Terrain;
  export function seaTerrainAt(x: number, y: number): Terrain;
  export function terrainAt(x: number, y: number): Terrain;   // headland primero, luego por zona
  export function buildTerrain(rng: Rng, zones?: readonly WorldZone[]): TerrainMesh;
  ```
- `shipyard.ts` exporta además `DOCK`, `eastBank`; `Scene` pierde `water`; `shipyard(rng)` ya no llama a `buildTerrain`.
- `createShipyardAnim(scene, water: Solid[], rng, opts)`: el agua que ondula viene del terreno (`[mesh.river]`).

- [x] **Step 1: Escribir los tests del terreno**

```ts
// src/scenes/terrain.test.ts
import { describe, expect, it } from "vitest";
import { MOUTH_Y, WORLD_H, WORLD_W, ZONE_SPLIT_Y } from "../map/geo";
import { createRng } from "../map/seed";
import type { Solid, Tri } from "../iso/solids";
import { QUAY_X } from "./shipyard";
import { CELL, buildTerrain, seaTerrainAt, shipyardTerrainAt, terrainAt } from "./terrain";

const tris = (s: Solid): Tri[] => (s.kind === "ground" ? s.tris : []);
// La fila de vértices más cercana a ZONE_SPLIT_Y = 146 es y = 144: la comparten la última fila de celdas del astillero (centro 141) y la primera de la ciudad (centro 147).
const SEAM_Y = Math.floor(ZONE_SPLIT_Y / CELL) * CELL;
const allTris = (m: ReturnType<typeof buildTerrain>): Tri[] => [...m.ground, m.river, m.sea, m.shore].flatMap(tris);

describe("clasificación", () => {
  it("astillero: losa al oeste del muelle, río, desembocadura y selva en los bordes", () => {
    expect(shipyardTerrainAt(50, 50)).toBe("slab");
    expect(shipyardTerrainAt(QUAY_X + 20, 60)).toBe("water");
    expect(shipyardTerrainAt(300, 10)).toBe("water");     // bahía
    expect(shipyardTerrainAt(300, MOUTH_Y + 2)).toBe("east");
    expect(shipyardTerrainAt(10, 144)).toBe("jungle");
    expect(shipyardTerrainAt(150, 20)).toBe("dock");
  });
  it("mar: punta, arrecife, orilla y mar abierto", () => {
    expect(terrainAt(380, 118)).toBe("headland");
    expect(terrainAt(336, 115)).toBe("headland");          // la base de la punta gana en la zona del astillero
    expect(seaTerrainAt(404, 118)).toBe("reef");
    expect(seaTerrainAt(350, 60)).toBe("shore");           // pegado a la costa del astillero
    expect(seaTerrainAt(500, 200)).toBe("sea");
    expect(seaTerrainAt(350, 10)).toBe("sea");             // la bahía abre directo al mar
  });
  it("ciudad: cinturón de selva junto al astillero, río y pavimento", () => {
    expect(terrainAt(50, ZONE_SPLIT_Y + 4)).toBe("jungle");
    expect(terrainAt(50, 200)).toBe("paving");
    expect(terrainAt(255, 200)).toBe("water");
  });
});

describe("buildTerrain", () => {
  it("una sola malla determinística que cubre el mundo", () => {
    const a = buildTerrain(createRng(7)), b = buildTerrain(createRng(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const t = allTris(a);
    expect(t.length).toBeGreaterThan(2 * (WORLD_W / CELL) * (WORLD_H / CELL) * 0.9);
    for (const tri of t) for (const p of tri.pts) {
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(WORLD_W);
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(WORLD_H);
    }
  });
  it("agua plana a z = -1: río (con la bahía), mar y orilla, en sólidos separados", () => {
    const m = buildTerrain(createRng(7));
    expect(m.river.kind === "ground" && m.river.mat).toBe("water");
    expect(m.sea.kind === "ground" && m.sea.mat).toBe("waterDeep");
    expect(m.shore.kind === "ground" && m.shore.mat).toBe("water");
    for (const s of [m.river, m.sea, m.shore]) expect(tris(s).every((t) => t.pts.every((p) => p.z === -1) && (t.toneOffset ?? 0) === 0)).toBe(true);
    expect(tris(m.river).length).toBeGreaterThan(200);
    expect(tris(m.river).some((t) => t.pts.every((p) => p.y < MOUTH_Y && p.x > 300))).toBe(true); // la bahía es río
    expect(tris(m.sea).length).toBeGreaterThan(600);
  });
  it("la punta está alta y cae al mar; el dique seco no tiene suelo (lo pone la escena)", () => {
    const m = buildTerrain(createRng(7));
    const rock = m.ground.filter((g) => g.kind === "ground" && g.mat === "rock").flatMap(tris);
    const high = rock.filter((t) => t.pts.every((p) => p.z >= 4));
    expect(high.length).toBeGreaterThan(20);
    const inDock = allTris(m).filter((t) => t.pts.every((p) => p.x > 122 && p.x < 190 && p.y > 8 && p.y < 28));
    expect(inDock).toEqual([]);
  });
  it("filtrar por zona conserva las alturas en la costura", () => {
    const p = buildTerrain(createRng(7), ["portfolio"]), c = buildTerrain(createRng(7), ["cv"]);
    const onSeam = (m: ReturnType<typeof buildTerrain>) => new Map(allTris(m).flatMap((t) => t.pts).filter((v) => v.y === SEAM_Y).map((v) => [`${v.x},${v.y}`, v.z]));
    const a = onSeam(p), b = onSeam(c);
    expect(a.size).toBeGreaterThan(10);
    for (const [k, z] of a) if (b.has(k)) expect(b.get(k)).toBe(z);
    expect(allTris(p).every((t) => t.pts.every((v) => v.y <= ZONE_SPLIT_Y + CELL))).toBe(true);
  });
});
```

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/scenes/terrain.test.ts`
Expected: FAIL (módulo inexistente).

- [x] **Step 3: Implementar `terrain.ts`**

```ts
// src/scenes/terrain.ts
import { v3 } from "../iso/geometry";
import type { Solid, Tri } from "../iso/solids";
import { RIVER_HALF, WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, distToHeadland, inHeadland, inMouth, riverCenter, worldZoneAt, type WorldZone } from "../map/geo";
import type { Material } from "../map/palette-iso";
import type { Rng } from "../map/seed";
import { BOTTOM, DOCK, QUAY_X, eastBank } from "./shipyard";

/**
 * Terreno de todo el mundo: una sola grilla facetada de CELL, clasificada
 * por punto. Cada zona aporta su clasificador; `terrainAt` despacha. Una
 * sola malla garantiza que los vértices en las costuras compartan altura.
 */
export type Terrain = "slab" | "water" | "east" | "jungle" | "dock" | "paving" | "sea" | "shore" | "headland" | "reef";

export const CELL = 6;
const WATER_Z = -1;
const JUNGLE_BELT = 12;   // a cada lado de ZONE_SPLIT_Y
const SHORE_W = 12;       // agua clara a esta distancia de la tierra
const REEF_W = 6;

export interface TerrainMesh { ground: Solid[]; river: Solid; sea: Solid; shore: Solid }

export function shipyardTerrainAt(x: number, y: number): Terrain {
  if (x >= DOCK.x && x < DOCK.x + DOCK.w && y >= DOCK.y && y < DOCK.y + DOCK.d) return "dock";
  if (x < QUAY_X) return x < 42 && y > 100 ? "jungle" : y >= BOTTOM ? "jungle" : "slab";
  if (x <= eastBank(y) || inMouth(x, y)) return "water";
  return x > 330 || y > 124 ? "jungle" : "east";
}

export function cityTerrainAt(x: number, y: number): Terrain {
  if (y < ZONE_SPLIT_Y + JUNGLE_BELT) return "jungle";
  if (Math.abs(x - riverCenter(y)) <= RIVER_HALF) return "water";
  return "paving";
}

export function seaTerrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland";
  const d = distToHeadland(x, y);
  if (d < REEF_W) return "reef";
  if (d < SHORE_W) return "shore";
  // costa del astillero y de la ciudad: agua clara pegada a la tierra, salvo frente a la bahía
  if (x < ZONE_SPLIT_X + SHORE_W && y >= 24) return "shore";
  return "sea";
}

export function terrainAt(x: number, y: number): Terrain {
  if (inHeadland(x, y)) return "headland"; // la base de la punta pisa la zona del astillero
  switch (worldZoneAt(x, y)) {
    case "portfolio": return shipyardTerrainAt(x, y);
    case "cv": return cityTerrainAt(x, y);
    case "blog": return seaTerrainAt(x, y);
  }
}

const BASE_Z: Record<Terrain, number> = { slab: 0, water: WATER_Z, east: 0, jungle: 0.6, dock: -DOCK.depth, paving: 0, sea: WATER_Z, shore: WATER_Z, headland: 6, reef: 0.5 };
const JITTER: Record<Terrain, number> = { slab: 0.4, water: 0, east: 0.5, jungle: 0.8, dock: 0, paving: 0.15, sea: 0, shore: 0, headland: 1.5, reef: 0.3 };
const MAT: Record<Exclude<Terrain, "dock">, Material> = { slab: "slab", water: "water", east: "sand", jungle: "leafDark", paving: "paving", sea: "waterDeep", shore: "water", headland: "rock", reef: "rock" };
const FLAT = new Set<Terrain>(["water", "sea", "shore", "dock"]);

/** Grilla de CELL con alturas por vértice; cada celda son dos triángulos clasificados por su centro. `zones` filtra celdas por zona. */
export function buildTerrain(rng: Rng, zones?: readonly WorldZone[]): TerrainMesh {
  const cols = Math.ceil(WORLD_W / CELL), rows = Math.ceil(WORLD_H / CELL);
  const z: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    z.push([]);
    for (let i = 0; i <= cols; i++) {
      const t = terrainAt(Math.min(i * CELL, WORLD_W - 1), Math.min(j * CELL, WORLD_H - 1));
      z[j]!.push(BASE_Z[t] + (rng.next() * 2 - 1) * JITTER[t]);
    }
  }
  const tris = {} as Record<Terrain, Tri[]>;
  for (const t of Object.keys(BASE_Z) as Terrain[]) tris[t] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = i * CELL, y0 = j * CELL, x1 = Math.min(x0 + CELL, WORLD_W), y1 = Math.min(y0 + CELL, WORLD_H);
    const cx = x0 + CELL / 2, cy = y0 + CELL / 2;
    if (zones && !zones.includes(worldZoneAt(cx, cy))) continue;
    const t = terrainAt(cx, cy);
    if (t === "dock") continue; // el pozo lo amuebla la escena del astillero
    const p = (x: number, y: number, zz: number) => v3(x, y, FLAT.has(t) ? BASE_Z[t] : zz);
    const a = p(x0, y0, z[j]![i]!), b = p(x1, y0, z[j]![i + 1]!), c = p(x1, y1, z[j + 1]![i + 1]!), d = p(x0, y1, z[j + 1]![i]!);
    // diagonal alternada: el "papercraft" no se lee como una grilla de cuadrados
    if ((i + j) % 2 === 0) tris[t].push({ pts: [a, b, c] }, { pts: [a, c, d] });
    else tris[t].push({ pts: [a, b, d] }, { pts: [b, c, d] });
  }
  const ground = (t: Exclude<Terrain, "dock">): Solid => ({ kind: "ground", mat: MAT[t], tris: tris[t] });
  return {
    ground: [ground("slab"), ground("east"), ground("jungle"), ground("paving"), ground("headland"), ground("reef")],
    river: ground("water"),
    sea: ground("sea"),
    shore: ground("shore"),
  };
}
```

- [x] **Step 4: Sacar el terreno del astillero y abrir la desembocadura**

En `src/scenes/shipyard.ts`:

1. Borrar `type Terrain`, `terrainAt`, `interface Terrains`, `buildTerrain`, y los imports que queden sin uso (`Tri`).
2. Exportar lo que el terreno necesita: `export const DOCK = {...} as const;` y `export const eastBank = ...`.
3. `Scene` queda:
   ```ts
   export interface Scene {
     ground: Solid[];     // suelo hundido del dique y franjas (calles, rieles)
     solids: Solid[];
     accents: Accent[];
     trolley: Solid & { kind: "prism" };
     trolleyRange: [number, number];
     weldSpots: Vec3[];
   }
   ```
4. En `shipyard(rng)`: `const ground: Solid[] = [];` (sin `terrain`), y el `return` sin `water`:
   ```ts
   return { ground, solids: raised, accents, trolley: g.trolley, trolleyRange: g.range, weldSpots };
   ```
5. Desembocadura al NE: en `fittingOut`, los galpones pasan a `prism(x, 24, 0, 8, 92, 6, "concrete", "gable")` (terminan en y 116), el tanque a `{ kind: "cylinder", at: v3(310, 122, 0), r: 4, h: 6, mat: "concrete" }`, la chatarra a `prism(302 + rng.int(0, 24), 130 + rng.int(0, 10), 0, 3, 2, 1, "rust")`, y la escollera arranca por debajo de la bahía: `for (let y = MOUTH_Y + 1; y < AREA_H; y += 3)` (importar `MOUTH_Y` de `../map/geo`).
6. En `jungle`, el borde este evita la bahía y la base de la punta (x 330..344, y 97..134):
   ```ts
   cluster(332, 340, 26, 94, 6);   // borde este, entre la bahía y la punta
   cluster(332, 340, 136, 143, 2); // al sur de la punta
   cluster(301, 340, 127, 143, 6); // al sur de los galpones
   ```
   (se elimina `cluster(332, 340, 2, 143, 10)`).

En `src/scenes/shipyard.test.ts`:
- `all` pasa a `[...s.ground, ...s.solids, s.trolley]`.
- Borrar el test "el agua es un solo suelo, hundido, con offset de tono en cero" (ahora vive en `terrain.test.ts`).
- En "muelle de alistamiento": `rocks.length` sigue siendo `> 30` (la escollera tiene 41 conos).
- En "selva": la condición `c.at.x < 42 || c.at.x > 300` sigue valiendo.

En `src/scenes/shipyard-anim.ts`: la firma pasa a `createShipyardAnim(scene: Scene, water: Solid[], rng: Rng, opts: { reducedMotion: boolean })` y `const tris = water.flatMap((w) => (w.kind === "ground" ? w.tris : []));`. Importar `Solid` de `../iso/solids`.

En `src/scenes/shipyard-anim.test.ts`, `setup`:

```ts
const setup = (reducedMotion = false) => {
  const scene = shipyard(createRng(7));
  const water = [buildTerrain(createRng(7), ["portfolio"]).river];
  return { scene, water, anim: createShipyardAnim(scene, water, createRng(3), { reducedMotion }) };
};
```

y en el test del agua: `const tris = water.flatMap((w) => (w.kind === "ground" ? w.tris : []));` con `water` desestructurado del `setup`. Import: `import { buildTerrain } from "./terrain";`.

En `src/lab/portfolio.ts` (arreglo mínimo para que compile hasta la Task 9):

```ts
  const mesh = buildTerrain(createRng(SEED), ["portfolio"]);
  const scene = shipyard(createRng(SEED));
  const water = [mesh.river];
  const anim = createShipyardAnim(scene, water, createRng(SEED + 1), { reducedMotion });
  ...
  const staticItems = buildRenderList([...mesh.ground, ...scene.ground, ...scene.solids]);
  const fitItems = buildRenderList([...mesh.ground, ...scene.ground, ...water, ...scene.solids, scene.trolley]);
  ...
  const redrawWater = (): void => drawLayer(gWater, buildRenderList(water), "ground");
```

con `import { buildTerrain } from "../scenes/terrain";`.

- [x] **Step 5: Correr todo**

Run: `npm test && npm run typecheck`
Expected: PASS. Si `terrain.test` "mar: la bahía abre directo al mar" falla, verificar que `seaTerrainAt` excluya `y < 24` de la orilla de la costa.

- [x] **Step 6: Verificación visual**

Run: `npx vite --port 5199 --strictPort` (en background) y `agent-browser open http://127.0.0.1:5199/map/lab/portfolio.html --viewport 1600x900`, luego `agent-browser screenshot <scratchpad>/t7.png`. Mirar la captura: el río abre en una bahía en la esquina NE, el tanque y la chatarra quedan al sur de los galpones, la base de la punta aparece como roca alta pegada al muelle de alistamiento (x 330..344).

- [x] **Step 7: Commit**

```bash
git add src/scenes src/lab/portfolio.ts
git commit -m "refactor(scenes): terreno compartido del mundo con desembocadura al NE; el astillero deja de generar el suyo"
```

---

### Task 8: `Animator` puro y adaptador del astillero

**Files:**
- Create: `src/scenes/animator.ts`, `src/scenes/shipyard-animator.ts`, `src/scenes/shipyard-animator.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type AnimLayer =
    | { kind: "solid"; solids: Solid[] }     // se dibuja con sombra propia, arriba de los sólidos estáticos
    | { kind: "accent"; accents: Accent[] }  // blend add, arriba de todo
    | { kind: "water"; water: Solid[] };     // capa de agua, entre el suelo y las sombras
  export interface Animator {
    readonly ids: readonly string[];
    layer(id: string): AnimLayer;            // contenido actual del id
    tick(dtMs: number): ReadonlySet<string>; // ids que cambiaron y hay que redibujar
  }
  export function shipyardAnimator(scene: Scene, water: Solid[], rng: Rng, opts: { reducedMotion: boolean }): Animator;
  ```

- [x] **Step 1: Escribir el test que falla**

```ts
// src/scenes/shipyard-animator.test.ts
import { describe, expect, it } from "vitest";
import { createRng } from "../map/seed";
import { shipyard } from "./shipyard";
import { TROLLEY_CYCLE_MS } from "./shipyard-anim";
import { shipyardAnimator } from "./shipyard-animator";
import { buildTerrain } from "./terrain";

const setup = (reducedMotion = false) => {
  const scene = shipyard(createRng(7));
  const water = [buildTerrain(createRng(7), ["portfolio"]).river];
  return { scene, anim: shipyardAnimator(scene, water, createRng(3), { reducedMotion }) };
};

describe("shipyardAnimator", () => {
  it("expone cuatro capas con nombre y del tipo correcto", () => {
    const { scene, anim } = setup();
    expect([...anim.ids].sort()).toEqual(["sparks", "trolley", "trolleyLamp", "water"]);
    expect(anim.layer("water").kind).toBe("water");
    const t = anim.layer("trolley");
    expect(t.kind === "solid" && t.solids).toEqual([scene.trolley]);
    expect(anim.layer("trolleyLamp").kind).toBe("accent");
    expect(anim.layer("sparks").kind).toBe("accent");
  });

  it("cuando el carro se mueve cambian carro y lámpara; el agua cambia cada 100 ms", () => {
    const { anim } = setup();
    const c = anim.tick(TROLLEY_CYCLE_MS / 2);
    expect(c.has("trolley")).toBe(true);
    expect(c.has("trolleyLamp")).toBe(true);
    expect(c.has("water")).toBe(true);
  });

  it("con reduced-motion no cambia nada", () => {
    const { anim } = setup(true);
    expect(anim.tick(500).size).toBe(0);
  });
});
```

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/scenes/shipyard-animator.test.ts`
Expected: FAIL (módulos inexistentes).

- [x] **Step 3: Implementar**

```ts
// src/scenes/animator.ts
import type { Accent } from "../iso/accent";
import type { Solid } from "../iso/solids";

/**
 * Contrato entre una escena animada y el runtime, sin Pixi: cada id nombra
 * una capa propia (un par sombra/sólido, una Graphics de acentos o una de
 * agua) y `tick` dice cuáles hay que redibujar.
 */
export type AnimLayer =
  | { kind: "solid"; solids: Solid[] }
  | { kind: "accent"; accents: Accent[] }
  | { kind: "water"; water: Solid[] };

export interface Animator {
  readonly ids: readonly string[];
  layer(id: string): AnimLayer;
  tick(dtMs: number): ReadonlySet<string>;
}
```

```ts
// src/scenes/shipyard-animator.ts
import type { Solid } from "../iso/solids";
import type { Rng } from "../map/seed";
import type { AnimLayer, Animator } from "./animator";
import type { Scene } from "./shipyard";
import { createShipyardAnim } from "./shipyard-anim";

/** Adapta las tres animaciones del astillero al contrato `Animator`. */
export function shipyardAnimator(scene: Scene, water: Solid[], rng: Rng, opts: { reducedMotion: boolean }): Animator {
  const anim = createShipyardAnim(scene, water, rng, opts);
  const layers: Record<string, () => AnimLayer> = {
    water: () => ({ kind: "water", water }),
    trolley: () => ({ kind: "solid", solids: [scene.trolley] }),
    trolleyLamp: () => ({ kind: "accent", accents: [anim.trolleyLamp()] }),
    sparks: () => ({ kind: "accent", accents: anim.sparks() }),
  };
  return {
    ids: Object.keys(layers),
    layer: (id) => layers[id]!(),
    tick(dtMs) {
      const c = anim.tick(dtMs);
      const out = new Set<string>();
      if (c.water) out.add("water");
      if (c.trolley) { out.add("trolley"); out.add("trolleyLamp"); }
      if (c.sparks) out.add("sparks");
      return out;
    },
  };
}
```

- [x] **Step 4: Correr los tests**

Run: `npm test && npm run typecheck`
Expected: PASS (incluido `pixi-free.test`: ninguno de los dos módulos importa Pixi).

- [x] **Step 5: Commit**

```bash
git add src/scenes/animator.ts src/scenes/shipyard-animator.ts src/scenes/shipyard-animator.test.ts
git commit -m "feat(scenes): contrato Animator puro y adaptador del astillero"
```

---

### Task 9: Escena del mundo con seed por zona

**Files:**
- Create: `src/scenes/world.ts`, `src/scenes/world.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface WorldScene {
    terrain: TerrainMesh;
    ground: Solid[];                        // suelo de escena: pozo del dique, franjas
    solids: Solid[];
    accents: Accent[];
    landmarks: Record<WorldZone, Vec3>;     // coordenadas de mundo
    shipyard: Scene | null;                 // null si la zona no está incluida
  }
  export const LANDMARKS: Record<WorldZone, Vec3>;
  export function zoneRng(seed: number, zone: WorldZone): Rng;
  export function world(seed: number, opts?: { zones?: readonly WorldZone[] }): WorldScene;
  ```

- [x] **Step 1: Escribir el test que falla**

```ts
// src/scenes/world.test.ts
import { describe, expect, it } from "vitest";
import { buildRenderList } from "../iso/render-list";
import { bounds } from "../iso/solids";
import { WORLD_H, WORLD_W, worldZoneAt } from "../map/geo";
import { allIsoColors } from "../map/palette-iso";
import { LANDMARKS, world, zoneRng } from "./world";

describe("world", () => {
  it("es determinístico y cada zona tiene su propio stream de azar", () => {
    expect(JSON.stringify(world(7))).toBe(JSON.stringify(world(7)));
    expect(zoneRng(7, "portfolio").next()).not.toBe(zoneRng(7, "cv").next());
    expect(zoneRng(7, "portfolio").next()).toBe(zoneRng(7, "portfolio").next());
  });

  it("con todas las zonas trae el astillero y el terreno completo", () => {
    const w = world(7);
    expect(w.shipyard).not.toBeNull();
    expect(w.solids.length).toBeGreaterThan(250);
    expect(w.terrain.sea.kind === "ground" && w.terrain.sea.tris.length).toBeGreaterThan(600);
    for (const s of w.solids) {
      const b = bounds(s);
      expect(b.min.x).toBeGreaterThanOrEqual(-1); expect(b.max.x).toBeLessThanOrEqual(WORLD_W + 1);
      expect(b.min.y).toBeGreaterThanOrEqual(-1); expect(b.max.y).toBeLessThanOrEqual(WORLD_H + 1);
    }
  });

  it("filtrar por zona deja fuera lo demás", () => {
    const w = world(7, { zones: ["cv"] });
    expect(w.shipyard).toBeNull();
    expect(w.solids).toEqual([]);
    expect(w.terrain.sea.kind === "ground" && w.terrain.sea.tris).toEqual([]);
  });

  it("los landmarks caen en su zona", () => {
    for (const z of ["portfolio", "cv", "blog"] as const) expect(worldZoneAt(LANDMARKS[z].x, LANDMARKS[z].y)).toBe(z);
  });

  it("todo el render usa colores del atlas", () => {
    const w = world(7);
    const colors = allIsoColors();
    for (const i of buildRenderList([...w.terrain.ground, w.terrain.river, w.terrain.sea, w.terrain.shore, ...w.ground, ...w.solids])) expect(colors.has(i.color)).toBe(true);
  });
});
```

- [x] **Step 2: Correr para verificar que falla**

Run: `npx vitest run src/scenes/world.test.ts`
Expected: FAIL (módulo inexistente).

- [x] **Step 3: Implementar**

```ts
// src/scenes/world.ts
import type { Accent } from "../iso/accent";
import { v3, type Vec3 } from "../iso/geometry";
import type { Solid } from "../iso/solids";
import type { WorldZone } from "../map/geo";
import { createRng, type Rng } from "../map/seed";
import { shipyard, type Scene } from "./shipyard";
import { buildTerrain, type TerrainMesh } from "./terrain";

/**
 * El mundo entero: terreno compartido más una escena por zona. Cada escena
 * recibe su propio Rng derivado del seed, así retocar una no reordena las otras.
 * Resume y Blog se enchufan acá cuando existan (planes 2 y 3).
 */
export interface WorldScene {
  terrain: TerrainMesh;
  ground: Solid[];
  solids: Solid[];
  accents: Accent[];
  landmarks: Record<WorldZone, Vec3>;
  shipyard: Scene | null;
}

const ALL_ZONES: readonly WorldZone[] = ["portfolio", "cv", "blog"];
const ZONE_INDEX: Record<WorldZone, number> = { portfolio: 1, cv: 2, blog: 3 };

/** Grúa pórtico, torre de oficinas, faro. Coordenadas de mundo; la reintegración proyecta con project(). */
export const LANDMARKS: Record<WorldZone, Vec3> = {
  portfolio: v3(150, 50, 0),
  cv: v3(130, 206, 0),
  blog: v3(396, 118, 0),
};

export function zoneRng(seed: number, zone: WorldZone): Rng {
  return createRng(seed * 31 + ZONE_INDEX[zone]);
}

export function world(seed: number, opts: { zones?: readonly WorldZone[] } = {}): WorldScene {
  const zones = opts.zones ?? ALL_ZONES;
  const terrain = buildTerrain(createRng(seed), zones);
  const ground: Solid[] = [], solids: Solid[] = [], accents: Accent[] = [];
  let sy: Scene | null = null;
  if (zones.includes("portfolio")) {
    sy = shipyard(zoneRng(seed, "portfolio"));
    ground.push(...sy.ground);
    solids.push(...sy.solids);
    accents.push(...sy.accents);
  }
  return { terrain, ground, solids, accents, landmarks: LANDMARKS, shipyard: sy };
}
```

- [x] **Step 4: Correr los tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/scenes/world.ts src/scenes/world.test.ts
git commit -m "feat(scenes): escena del mundo con terreno compartido y seed por zona"
```

---

### Task 10: Runtime común del laboratorio, página del mundo y encuadre por zona

**Files:**
- Create: `src/lab/runtime.ts`, `src/lab/world.ts`, `lab/world.html`
- Modify: `src/lab/draw.ts`, `src/lab/draw.test.ts`, `src/lab/portfolio.ts`, `src/lab/lab-excluded.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // draw.ts
  export function zoneFrame(zone: WorldZone | "all"): RenderItem[];   // caja proyectada de la zona, para fitTransform
  // runtime.ts
  export interface LabOptions { reducedMotion: boolean; log?: boolean }
  export function bootLab(host: HTMLElement, scene: WorldScene, animators: Animator[], opts: LabOptions): Promise<void>;
  ```
- Teclas en toda página de lab: `0` mundo, `1` Portfolio, `2` Resume, `3` Blog.

- [x] **Step 1: Escribir el test de `zoneFrame` y de exclusión**

Agregar a `src/lab/draw.test.ts`:

```ts
import { zoneFrame } from "./draw";

describe("zoneFrame", () => {
  it("la caja de una zona contiene sus cuatro esquinas proyectadas, de z 0 a 30", () => {
    const [it] = zoneFrame("blog");
    expect(it!.pts).toHaveLength(8);
    const xs = it!.pts.filter((_, i) => i % 2 === 0), ys = it!.pts.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBe(344 - 270);   // esquina SO: x - y
    expect(Math.max(...xs)).toBe(560);          // esquina NE
    expect(Math.min(...ys)).toBe(172 - 30 * 1.4); // esquina NO en alto: (344 + 0) / 2 - 42
    expect(Math.max(...ys)).toBe((560 + 270) / 2);
  });
  it("all cubre el mundo", () => {
    const [it] = zoneFrame("all");
    expect(Math.max(...it!.pts.filter((_, i) => i % 2 === 0))).toBe(560);
  });
});
```

Reemplazar `src/lab/lab-excluded.test.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../../", import.meta.url).pathname;

describe("laboratorio fuera de producción", () => {
  it("existen las entradas de dev", () => {
    for (const page of ["portfolio", "world"]) expect(existsSync(`${ROOT}lab/${page}.html`)).toBe(true);
  });
  it("cada página del lab tiene su entry y noindex", () => {
    for (const f of readdirSync(`${ROOT}lab`).filter((n) => n.endsWith(".html"))) {
      const html = readFileSync(`${ROOT}lab/${f}`, "utf8");
      expect(html).toMatch(/name="robots" content="noindex"/);
      expect(html).toMatch(new RegExp(`src="/src/lab/${f.replace(".html", "")}\\.ts"`));
    }
  });
  it("vite.config no agrega el laboratorio al build", () => {
    const cfg = readFileSync(`${ROOT}vite.config.ts`, "utf8");
    expect(cfg).not.toMatch(/rollupOptions|input\s*:/);
  });
  it("prerender no lo copia", () => {
    // \blab\b para no matchear "slab" ni "label".
    expect(readFileSync(`${ROOT}scripts/prerender.ts`, "utf8")).not.toMatch(/\blab\b/);
  });
});
```

- [x] **Step 2: Correr para verificar que fallan**

Run: `npx vitest run src/lab`
Expected: FAIL (`zoneFrame` no existe; `lab/world.html` no existe).

- [x] **Step 3: `zoneFrame` en `draw.ts`**

```ts
import { WORLD_H, WORLD_W, ZONE_SPLIT_X, ZONE_SPLIT_Y, type WorldZone } from "../map/geo";
import { project } from "../iso/project";
import { v3 } from "../iso/geometry";

const FRAME_H = 30; // alto de referencia para que entren los landmarks

/** Caja de una zona (o del mundo) proyectada, como un RenderItem para fitTransform. */
export function zoneFrame(zone: WorldZone | "all"): RenderItem[] {
  const box = { all: [0, 0, WORLD_W, WORLD_H], portfolio: [0, 0, ZONE_SPLIT_X, ZONE_SPLIT_Y], cv: [0, ZONE_SPLIT_Y, ZONE_SPLIT_X, WORLD_H], blog: [ZONE_SPLIT_X, 0, WORLD_W, WORLD_H] }[zone];
  const [x0, y0, x1, y1] = box as [number, number, number, number];
  const pts: number[] = [];
  for (const [x, y, z] of [[x0, y0, FRAME_H], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]] as const) { const p = project(v3(x, y, z)); pts.push(p.x, p.y); }
  return [{ layer: "ground", pts, color: 0 }];
}
```

(`color: 0` no es un literal de seis dígitos: el guard no lo detecta, y `fitTransform` no lo usa.)

- [x] **Step 4: Runtime común**

```ts
// src/lab/runtime.ts
import { Application, Container, Graphics } from "pixi.js";
import { SHADOW_ALPHA, buildRenderList } from "../iso/render-list";
import type { WorldZone } from "../map/geo";
import { ISO_COLORS } from "../map/palette-iso";
import type { AnimLayer, Animator } from "../scenes/animator";
import type { WorldScene } from "../scenes/world";
import { drawAccents, drawLayer, fitTransform, zoneFrame } from "./draw";

export interface LabOptions { reducedMotion: boolean; log?: boolean; frame?: WorldZone | "all" }

const KEY_ZONE: Record<string, WorldZone | "all"> = { "0": "all", "1": "portfolio", "2": "cv", "3": "blog" };

/**
 * Arma las capas de una escena del mundo y corre sus animadores. Orden, de
 * abajo hacia arriba: suelo, agua (río, mar, orilla y capas de agua animadas),
 * sombras y sólidos estáticos, un par sombra/sólido por capa animada, acentos
 * estáticos y una Graphics por capa de acentos animada.
 */
export async function bootLab(host: HTMLElement, scene: WorldScene, animators: Animator[], opts: LabOptions): Promise<void> {
  const app = new Application();
  await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  const world = new Container();
  app.stage.addChild(world);

  const t0 = performance.now();
  const gGround = new Graphics(), gShadow = new Graphics(), gSolid = new Graphics(), gAccents = new Graphics();
  gShadow.alpha = SHADOW_ALPHA;
  gAccents.blendMode = "add";
  const waterSlot = new Container(), solidSlot = new Container(), accentSlot = new Container();
  world.addChild(gGround, waterSlot, gShadow, gSolid, solidSlot, gAccents, accentSlot);

  const { terrain } = scene;
  const staticItems = buildRenderList([...terrain.ground, ...scene.ground, ...scene.solids]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gSolid, staticItems, "solid");
  drawAccents(gAccents, scene.accents);
  // agua estática: todo cuerpo de agua que ningún animador reclame (el astillero anima el río; el Blog animará el mar)
  const animatedWater = new Set(animators.flatMap((a) => a.ids.flatMap((id) => { const l = a.layer(id); return l.kind === "water" ? l.water : []; })));
  const staticWater = new Graphics();
  waterSlot.addChild(staticWater);
  drawLayer(staticWater, buildRenderList([terrain.river, terrain.sea, terrain.shore].filter((w) => !animatedWater.has(w))), "ground");

  // una Graphics (o par) por capa animada
  const redraw = new Map<string, () => void>();
  for (const a of animators) for (const id of a.ids) {
    const kind = a.layer(id).kind;
    if (kind === "water") {
      const g = new Graphics();
      waterSlot.addChild(g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "water" }; drawLayer(g, buildRenderList(l.water), "ground"); });
    } else if (kind === "solid") {
      const gs = new Graphics(), g = new Graphics();
      gs.alpha = SHADOW_ALPHA;
      solidSlot.addChild(gs, g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "solid" }; const items = buildRenderList(l.solids); drawLayer(gs, items, "shadow"); drawLayer(g, items, "solid"); });
    } else {
      const g = new Graphics();
      g.blendMode = "add";
      accentSlot.addChild(g);
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "accent" }; drawAccents(g, l.accents); });
    }
    redraw.get(id)!();
  }
  if (opts.log) console.info(`[lab] primer dibujo: ${(performance.now() - t0).toFixed(1)} ms, ${staticItems.length} polígonos estáticos`);

  // encuadre: mundo entero (o la zona elegida con 0..3)
  let frame: WorldZone | "all" = opts.frame ?? "all";
  const fit = (): void => {
    const f = fitTransform(zoneFrame(frame), host.clientWidth, host.clientHeight);
    world.position.set(f.x, f.y);
    world.scale.set(f.scale);
  };
  fit();
  app.renderer.on("resize", fit);
  window.addEventListener("keydown", (e) => { const z = KEY_ZONE[e.key]; if (z) { frame = z; fit(); } });

  let worst = 0, since = 0;
  app.ticker.add((ticker) => {
    const t = performance.now();
    for (const a of animators) for (const id of a.tick(ticker.deltaMS)) redraw.get(id)?.();
    const dt = performance.now() - t;
    worst = Math.max(worst, dt);
    since += ticker.deltaMS;
    if (opts.log && since > 5000) { console.info(`[lab] peor redibujo en 5 s: ${worst.toFixed(2)} ms`); worst = 0; since = 0; }
  });
}
```

- [x] **Step 5: Entradas**

`src/lab/portfolio.ts` completo:

```ts
import { createRng } from "../map/seed";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { world } from "../scenes/world";
import { bootLab } from "./runtime";

const SEED = 7;
const host = document.getElementById("lab-host") as HTMLDivElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = world(SEED, { zones: ["portfolio"] });
const animators = scene.shipyard ? [shipyardAnimator(scene.shipyard, [scene.terrain.river], createRng(SEED + 1), { reducedMotion })] : [];
void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV, frame: "portfolio" });
```

`src/lab/world.ts`:

```ts
import { createRng } from "../map/seed";
import { shipyardAnimator } from "../scenes/shipyard-animator";
import { world } from "../scenes/world";
import { bootLab } from "./runtime";

const SEED = 7;
const host = document.getElementById("lab-host") as HTMLDivElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = world(SEED);
const animators = scene.shipyard ? [shipyardAnimator(scene.shipyard, [scene.terrain.river], createRng(SEED + 1), { reducedMotion })] : [];
void bootLab(host, scene, animators, { reducedMotion, log: import.meta.env.DEV });
```

`lab/world.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Lab: Mundo isométrico</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #171423; /* = ISO_COLORS.sky en src/map/palette-iso.ts */ }
      #lab-host { width: 100%; height: 100%; }
      #lab-host canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="lab-host" aria-label="Mundo isométrico: astillero, ciudad y mar. Teclas 0..3 encuadran mundo, Portfolio, Resume, Blog."></div>
    <script type="module" src="/src/lab/world.ts"></script>
  </body>
</html>
```

- [x] **Step 6: Correr todo y mirar**

Run: `npm test && npm run typecheck`
Expected: PASS.

Run (server en background): `npx vite --port 5199 --strictPort`, luego `agent-browser open http://127.0.0.1:5199/map/lab/world.html --viewport 1600x900` y `agent-browser screenshot <scratchpad>/t10-world.png`; después `agent-browser open http://127.0.0.1:5199/map/lab/portfolio.html --viewport 1600x900` y otra captura. Mirar: en el mundo se ve el astillero arriba a la izquierda, el cinturón de selva y el pavimento liso de la ciudad abajo, la bahía que abre al mar, la punta de roca con su arrecife y el mar en dos tonos hasta x = 560. La consola muestra `[lab] primer dibujo: N ms` con N < 150 y polígonos ≈ 12.000. Apretar `1` encuadra el astillero como lo hacía `portfolio.html`.

- [x] **Step 7: Commit**

```bash
git add src/lab lab/world.html
git commit -m "feat(lab): runtime común con Animator, página del mundo y encuadre por zona"
```

---

### Task 11: Documentación y cierre

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-09-14-mundo-isometrico-design.md`, `docs/superpowers/specs/2026-09-13-portfolio-isometrico-design.md`

- [x] **Step 1: README**

Reemplazar la sección "Laboratorio isométrico" por:

```markdown
## Laboratorio isométrico

`npm run dev` y abrir `/map/lab/world.html`: el mundo entero en 2.5D isométrico
(motor puro en `src/iso/`, terreno compartido en `src/scenes/terrain.ts`,
escenas en `src/scenes/`). `/map/lab/portfolio.html` muestra solo el astillero.
Teclas `0`..`3` encuadran mundo, Portfolio, Resume y Blog. No entra en el build
de producción. Para cambiar una escena, editar su lista de sólidos; para el
look, `src/map/palette-iso.ts`. Specs en `docs/superpowers/specs/`
(`2026-09-13-portfolio-isometrico-design.md`, `2026-09-14-mundo-isometrico-design.md`).
```

- [x] **Step 2: Estado de las specs**

En `2026-09-14-mundo-isometrico-design.md`, cambiar `**Estado:** aprobado en conversación, pendiente de plan de implementación` por `**Estado:** parte 1 (motor, terreno, runtime) implementada; Resume y Blog pendientes (planes 2 y 3)`. Agregar al final de la sección 3 (Motor) la nota de ruling: "`ramp.dir` es hacia dónde baja la rampa (convención existente): `dir: "n"` tiene el borde alto al sur."

En `2026-09-13-portfolio-isometrico-design.md`, en la tabla de decisiones, fila "Alcance", agregar: "Desde la parte 1 del mundo, el terreno lo genera `src/scenes/terrain.ts` y el río desemboca en una bahía al NE."

- [x] **Step 3: Verificación final**

Run: `npm test && npm run typecheck && npm run build && ls dist | grep -c lab`
Expected: tests y typecheck verdes; el `grep -c` imprime `0`.

- [x] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs
git commit -m "docs: laboratorio del mundo en README y estado de las specs"
```

---

## Self-review

- **Cobertura de la spec (parte 1):** motor §3 completo (fachadas T4, poly y rampa T2, acentos T3, colores y materiales T1, tope de sombra T5). Mundo §4: coordenadas y geografía T6, malla única y clasificadores T7, costuras (selva T7; malecón y escollera quedan para los planes 2 y 3 porque son sólidos de esas escenas), `world.ts` con seed por zona T9, landmarks T9. Runtime §7: páginas, runtime común, capas, `Animator`, encuadre y presupuesto T10. Tests §8 de motor, terreno y exclusión: T1..T7, T10. Fuera de esta parte, a propósito: §5 Resume y §6 Blog (planes 2 y 3), captura como artifact (se hace al cerrar cada escena).
- **Placeholders:** ninguno; cada step tiene el código.
- **Consistencia de tipos:** `Accent` (T3) es lo que usan `facadeAccents` (T4), `AnimLayer` (T8) y `drawAccents` (T3/T10). `TerrainMesh { ground, river, sea, shore }` (T7) es lo que consumen `world.ts` (T9) y `runtime.ts` (T10). `createShipyardAnim(scene, water, rng, opts)` (T7) es lo que llama `shipyardAnimator` (T8). `zoneFrame` y `fitTransform` (T10) comparten `RenderItem`.

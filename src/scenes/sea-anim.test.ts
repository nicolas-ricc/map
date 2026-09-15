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
    expect(ROUTE[0]).toEqual({ x: 326, y: -24 });
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
    expect(routeAt(0).heading).toBeCloseTo(Math.atan2(34, 24), 6);
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

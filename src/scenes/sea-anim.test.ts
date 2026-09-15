import { describe, expect, it } from "vitest";
import { depthAt } from "./depth-map";
import { isBehind, overlaps, screenBounds } from "../iso/depth";
import { v3 } from "../iso/geometry";
import { bounds, isFlat } from "../iso/solids";
import { WORLD } from "../map/geo";
import { BEAM_PERIOD_MS, FADE_U, FERRY_PAUSE_MS, FERRY_ROUTE, FERRY_SPEED, ROUTE, SHIPS, createSeaAnim, routeAt, routeLength } from "./sea-anim";
import { ship } from "./ships";
import { bleedTerrainAt, terrainAt } from "./terrain";
import { world } from "./world";

const WATER = new Set(["water", "sea", "shore", "abyss"]);
const setup = (reducedMotion = false) => { const w = world(7); return { w, a: createSeaAnim(w.sea!, { reducedMotion }) }; };

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

describe("lancha de la feria", () => {
  it("la lancha va del muelle de la feria al de graneles y vuelve, parando 4 s en cada punta, siempre sobre agua y nunca detrás de un sólido estático", () => {
    const { a: anim } = setup(false);
    const [fa, fb] = FERRY_ROUTE, L = Math.hypot(fb.x - fa.x, fb.y - fa.y);
    const f0 = anim.ferry();
    expect(f0.alpha).toBe(1);
    const hull0 = f0.solids.find((s) => s.kind === "hull")!;
    expect(hull0.kind === "hull" && hull0.at).toMatchObject({ x: fa.x, y: fa.y });
    anim.tick(FERRY_PAUSE_MS + 100); // arranca
    const seen: { x: number; y: number }[] = [];
    for (let t = 0; t < (2 * L) / FERRY_SPEED + 10; t += 1) { anim.tick(1000); const h = anim.ferry().solids.find((s) => s.kind === "hull")!; if (h.kind === "hull") seen.push({ x: h.at.x, y: h.at.y }); }
    expect(seen.some((p) => Math.hypot(p.x - fb.x, p.y - fb.y) < FERRY_SPEED)).toBe(true); // llegó al otro muelle
    expect(seen.some((p) => Math.hypot(p.x - fa.x, p.y - fa.y) < FERRY_SPEED)).toBe(true); // y volvió
    for (const p of seen) expect(depthAt(p.x, p.y)).toBeGreaterThanOrEqual(6);
    const statics = world(7).solids.filter((s) => !isFlat(s));
    for (let t = 0; t <= 1; t += 0.05) {
      const p = { x: fa.x + (fb.x - fa.x) * t, y: fa.y + (fb.y - fa.y) * t };
      const box = bounds({ kind: "hull", at: v3(p.x, p.y, -1), len: 26, beam: 7, h: 3, mat: "hull" });
      for (const s of statics) { const sb = bounds(s); if (overlaps(screenBounds(box), screenBounds(sb))) expect(isBehind(box, sb)).toBe(false); }
    }
  });
});

describe("mar, haz y boyas", () => {
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
    expect(r.tick(500)).toEqual({ ships: false, beam: false, buoys: false, ferry: false });
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

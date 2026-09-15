import { AlphaFilter, Application, Container, Graphics } from "pixi.js";
import { SHADOW_BAND_ALPHA, buildRenderList } from "../iso/render-list";
import { ISO_COLORS } from "../map/palette-iso";
import type { AnimLayer, Animator } from "../scenes/animator";
import type { WorldScene } from "../scenes/world";
import { drawAccents, drawLayer, fitTransform, type LabFrame, zoneFrame } from "./draw";

export interface LabOptions { reducedMotion: boolean; log?: boolean; frame?: LabFrame }

const KEY_ZONE: Record<string, LabFrame> = { "0": "all", "1": "portfolio", "2": "cv", "3": "blog", "4": "cover" };

/**
 * Arma las capas de una escena del mundo y corre sus animadores. Orden, de
 * abajo hacia arriba: agua (río, mar, orilla y capas animadas), suelo, banda
 * completa de sombras, núcleo de sombras, sólidos estáticos, sólidos
 * animados, acentos estáticos y una Graphics por capa de acentos animada.
 */
export async function bootLab(host: HTMLElement, scene: WorldScene, animators: Animator[], opts: LabOptions): Promise<void> {
  const app = new Application();
  await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  const world = new Container();
  app.stage.addChild(world);

  const t0 = performance.now();
  const gBleed = new Graphics(), gGround = new Graphics(), gShadow = new Graphics(), gCore = new Graphics(), gSolid = new Graphics(), gAccents = new Graphics();
  gAccents.blendMode = "add";
  const waterSlot = new Container(), shadowSlot = new Container(), coreSlot = new Container(), solidSlot = new Container(), accentSlot = new Container();
  // cada banda de sombra es una unión: el filtro aplica el alpha al conjunto,
  // no a cada polígono, así dos sombras superpuestas no se oscurecen dos veces
  shadowSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  coreSlot.filters = [new AlphaFilter({ alpha: SHADOW_BAND_ALPHA })];
  shadowSlot.addChild(gShadow);
  coreSlot.addChild(gCore);
  world.addChild(gBleed, waterSlot, gGround, shadowSlot, coreSlot, gSolid, solidSlot, gAccents, accentSlot);

  const { terrain } = scene;
  drawLayer(gBleed, buildRenderList(terrain.bleed), "ground");
  const staticItems = buildRenderList([...terrain.ground, ...scene.ground, ...scene.solids]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gCore, staticItems, "shadowCore");
  drawLayer(gSolid, staticItems, "solid");
  drawAccents(gAccents, scene.accents);
  // agua estática: todo cuerpo de agua que ningún animador reclame (el astillero anima el río; el Blog animará el mar)
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
      redraw.set(id, () => { const l = a.layer(id) as AnimLayer & { kind: "accent" }; drawAccents(g, l.accents); g.alpha = l.alpha ?? 1; });
    }
    redraw.get(id)!();
  }
  if (opts.log) console.info(`[lab] primer dibujo: ${(performance.now() - t0).toFixed(1)} ms, ${staticItems.length} polígonos estáticos`);

  // encuadre: mundo entero, la zona elegida con 0..3, o el cover 16:9 con 4
  let frame: LabFrame = opts.frame ?? "all";
  const fit = (): void => {
    // cover toca el borde del sangrado en sus cuatro esquinas: con margen se asoma el cielo justo ahí.
    const f = fitTransform(zoneFrame(frame), host.clientWidth, host.clientHeight, frame === "cover" ? 0 : undefined);
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

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
 * abajo hacia arriba: agua (río, mar, orilla y capas animadas), suelo,
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
  world.addChild(waterSlot, gGround, gShadow, gSolid, solidSlot, gAccents, accentSlot);

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

import { Application, Container, Graphics } from "pixi.js";
import { SHADOW_ALPHA, buildRenderList } from "../iso/render-list";
import { ISO_COLORS } from "../map/palette-iso";
import { createRng } from "../map/seed";
import { shipyard } from "../scenes/shipyard";
import { createShipyardAnim } from "../scenes/shipyard-anim";
import { buildTerrain } from "../scenes/terrain";
import { drawAccents, drawLayer, fitTransform } from "./draw";

const SEED = 7;

async function boot(): Promise<void> {
  const host = document.getElementById("lab-host") as HTMLDivElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const app = new Application();
  await app.init({ resizeTo: host, background: ISO_COLORS.sky, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
  host.appendChild(app.canvas);
  app.ticker.maxFPS = 30;

  const mesh = buildTerrain(createRng(SEED), ["portfolio"]);
  const scene = shipyard(createRng(SEED));
  const water = [mesh.river];
  const anim = createShipyardAnim(scene, water, createRng(SEED + 1), { reducedMotion });

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
  world.addChild(gGround, gWater, gShadow, gTrolleyShadow, gSolid, gTrolley, gAccents, gTrolleyLamp, gSparks);

  const staticItems = buildRenderList([...mesh.ground, ...scene.ground, ...scene.solids]);
  // Encuadre con todo lo que puede aparecer en pantalla (agua y carro incluidos), calculado una sola vez al boot.
  const fitItems = buildRenderList([...mesh.ground, ...scene.ground, ...water, ...scene.solids, scene.trolley]);
  drawLayer(gGround, staticItems, "ground");
  drawLayer(gShadow, staticItems, "shadow");
  drawLayer(gSolid, staticItems, "solid");
  drawAccents(gAccents, scene.accents);

  const redrawWater = (): void => drawLayer(gWater, buildRenderList(water), "ground");
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
    const f = fitTransform(fitItems, host.clientWidth, host.clientHeight);
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
